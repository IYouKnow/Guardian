package main

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const wsNonceTTL = 30 * time.Second
const wsPingInterval = 30 * time.Second
const wsAuthTimeout = 10 * time.Second

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type pendingChallenge struct {
	nonce     string
	createdAt time.Time
}

var (
	pendingChallenges  = make(map[string]pendingChallenge)
	pendingChallengeMu sync.Mutex
)

func generateWSNonce() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

type wsMessage struct {
	Type      string `json:"type"`
	Nonce     string `json:"nonce,omitempty"`
	Token     string `json:"token,omitempty"`
	Timestamp int64  `json:"timestamp,omitempty"`
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Println("WebSocket upgrade failed:", err)
		return
	}

	// 1. Challenge
	nonce := generateWSNonce()
	pendingChallengeMu.Lock()
	pendingChallenges[nonce] = pendingChallenge{nonce: nonce, createdAt: time.Now()}
	pendingChallengeMu.Unlock()

	if err := conn.WriteJSON(wsMessage{Type: "challenge", Nonce: nonce, Timestamp: time.Now().Unix()}); err != nil {
		s.logger.Println("WebSocket write challenge failed:", err)
		conn.Close()
		return
	}

	// 2. Auth with timeout
	conn.SetReadDeadline(time.Now().Add(wsAuthTimeout))
	var auth wsMessage
	if err := conn.ReadJSON(&auth); err != nil {
		conn.Close()
		return
	}
	conn.SetReadDeadline(time.Time{})

	if auth.Type != "auth" || auth.Nonce == "" || auth.Token == "" {
		conn.WriteJSON(wsMessage{Type: "auth_error"})
		conn.Close()
		return
	}

	pendingChallengeMu.Lock()
	challengeData, exists := pendingChallenges[auth.Nonce]
	if exists {
		delete(pendingChallenges, auth.Nonce)
	}
	pendingChallengeMu.Unlock()

	if !exists || time.Since(challengeData.createdAt) > wsNonceTTL {
		conn.WriteJSON(wsMessage{Type: "auth_error"})
		conn.Close()
		return
	}

	r.Header.Set("Authorization", "Bearer "+auth.Token)
	userID, err := s.validateToken(r)
	if err != nil {
		conn.WriteJSON(wsMessage{Type: "auth_error"})
		conn.Close()
		return
	}

	conn.WriteJSON(wsMessage{Type: "auth_ok"})

	// 3. Subscribe
	eventCh := make(chan string, 10)
	s.sseHub.AddClient(userID, eventCh)

	// Pong handler resets read deadline
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(wsPingInterval * 2))
		return nil
	})

	// Read goroutine — detects disconnects
	ctx := r.Context()
	readDone := make(chan struct{})
	go func() {
		defer close(readDone)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	// Write loop + ping ticker
	pingTicker := time.NewTicker(wsPingInterval)

	cleanup := func() {
		pingTicker.Stop()
		s.sseHub.RemoveClient(userID, eventCh)
		conn.Close()
	}

	for {
		select {
		case <-ctx.Done():
			cleanup()
			<-readDone
			return
		case <-readDone:
			cleanup()
			return
		case msg, ok := <-eventCh:
			if !ok {
				cleanup()
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
				cleanup()
				<-readDone
				return
			}
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				cleanup()
				<-readDone
				return
			}
		}
	}
}
