package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	wsNonceTTL       = 30 * time.Second
	wsPingInterval   = 30 * time.Second
	wsAuthTimeout    = 10 * time.Second
	wsWriteTimeout   = 10 * time.Second
	wsNonceCleanup   = 15 * time.Second
	wsDefaultMaxPerIP = 5
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" || origin == "null" {
			return true
		}
		// Allow same-origin (web admin panel) and common dev patterns
		if strings.Contains(origin, r.Host) ||
			strings.Contains(origin, "://localhost") ||
			strings.Contains(origin, "://tauri") ||
			strings.Contains(origin, "://capacitor") ||
			strings.HasPrefix(origin, "chrome-extension://") ||
			strings.HasPrefix(origin, "moz-extension://") {
			return true
		}
		return false
	},
}

type pendingChallenge struct {
	nonce     string
	createdAt time.Time
}

var (
	pendingChallenges   = make(map[string]pendingChallenge)
	pendingChallengeMu  sync.Mutex
	wsConnCounts        = make(map[string]int)
	wsConnCountsMu      sync.Mutex
	wsNonceCleanupOnce  sync.Once
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

// getClientIP returns the rate-limit/connection key for a request. X-Forwarded-For
// is only honoured when the direct peer is a trusted proxy (local/private by default,
// or configured via TRUSTED_PROXIES); the chain is walked right-to-left and the first
// non-proxy hop is returned.
func (s *Server) getClientIP(r *http.Request) string {
	remote, ok := parseIP(r.RemoteAddr)
	if !ok {
		return r.RemoteAddr // unparsable peer: fall back to raw, non-empty key
	}
	if !s.isTrustedProxy(remote) {
		return remote.String()
	}
	var hops []string
	for _, raw := range r.Header.Values("X-Forwarded-For") {
		hops = append(hops, strings.Split(raw, ",")...)
	}
	// Walk right-to-left, skipping trusted proxies: the first untrusted hop is the
	// real client (a client-supplied leftmost entry can't spoof its way through).
	for i := len(hops) - 1; i >= 0; i-- {
		ip, ok := parseIP(strings.TrimSpace(hops[i]))
		if !ok || s.isTrustedProxy(ip) {
			continue
		}
		return ip.String()
	}
	return remote.String() // all hops trusted (or none present)
}

// isTrustedProxy reports whether addr is a local/private address or matched a
// configured TRUSTED_PROXIES range.
func (s *Server) isTrustedProxy(addr netip.Addr) bool {
	addr = addr.Unmap()
	for _, p := range defaultTrustedProxyNets {
		if p.Contains(addr) {
			return true
		}
	}
	for _, p := range s.trustedProxies {
		if p.Contains(addr) {
			return true
		}
	}
	return false
}

// parseIP accepts "1.2.3.4", "1.2.3.4:80", "[2001:db8::1]:443", "2001:db8::1".
func parseIP(host string) (netip.Addr, bool) {
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	} else {
		host = strings.Trim(host, "[]")
	}
	addr, err := netip.ParseAddr(host)
	if err != nil {
		return netip.Addr{}, false
	}
	return addr.Unmap(), true
}

func (s *Server) getMaxWsPerIP() int {
	var val string
	err := s.systemDB.QueryRow("SELECT value FROM server_settings WHERE key = 'max_ws_per_ip_default'").Scan(&val)
	if err != nil || err == sql.ErrNoRows {
		return wsDefaultMaxPerIP
	}
	n, err := strconv.Atoi(val)
	if err != nil || n <= 0 {
		return wsDefaultMaxPerIP
	}
	return n
}

func (s *Server) getUserMaxWsPerIP(userID int) int {
	var val int
	err := s.systemDB.QueryRow("SELECT max_ws_per_ip FROM users WHERE id = ?", userID).Scan(&val)
	if err != nil || val <= 0 {
		return 0
	}
	return val
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Read global default from DB
	maxConns := s.getMaxWsPerIP()

	clientIP := s.getClientIP(r)

	// Pre-auth: check against global default
	wsConnCountsMu.Lock()
	currentCount := wsConnCounts[clientIP]
	if maxConns > 0 && currentCount >= maxConns {
		wsConnCountsMu.Unlock()
		http.Error(w, "Too many connections", http.StatusTooManyRequests)
		return
	}
	wsConnCounts[clientIP] = currentCount + 1
	wsConnCountsMu.Unlock()

	// Periodic cleanup of stale nonces (runs once)
	wsNonceCleanupOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(wsNonceCleanup)
			defer ticker.Stop()
			for range ticker.C {
				now := time.Now()
				pendingChallengeMu.Lock()
				for k, v := range pendingChallenges {
					if now.Sub(v.createdAt) > wsNonceTTL {
						delete(pendingChallenges, k)
					}
				}
				pendingChallengeMu.Unlock()
			}
		}()
	})

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Println("WebSocket upgrade failed:", err)
		wsConnCountsMu.Lock()
		wsConnCounts[clientIP]--
		wsConnCountsMu.Unlock()
		return
	}

	cleanupConn := func() {
		wsConnCountsMu.Lock()
		wsConnCounts[clientIP]--
		wsConnCountsMu.Unlock()
	}

	// 1. Challenge
	nonce := generateWSNonce()
	pendingChallengeMu.Lock()
	pendingChallenges[nonce] = pendingChallenge{nonce: nonce, createdAt: time.Now()}
	pendingChallengeMu.Unlock()

	conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
	if err := conn.WriteJSON(wsMessage{Type: "challenge", Nonce: nonce, Timestamp: time.Now().Unix()}); err != nil {
		cleanupConn()
		conn.Close()
		return
	}

	// 2. Auth with timeout
	conn.SetReadDeadline(time.Now().Add(wsAuthTimeout))
	var auth wsMessage
	if err := conn.ReadJSON(&auth); err != nil {
		cleanupConn()
		conn.Close()
		return
	}
	conn.SetReadDeadline(time.Time{})

	if auth.Type != "auth" || auth.Nonce == "" || auth.Token == "" {
		conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
		conn.WriteJSON(wsMessage{Type: "auth_error"})
		cleanupConn()
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
		conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
		conn.WriteJSON(wsMessage{Type: "auth_error"})
		cleanupConn()
		conn.Close()
		return
	}

	r.Header.Set("Authorization", "Bearer "+auth.Token)
	userID, err := s.validateToken(r)
	if err != nil {
		conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
		conn.WriteJSON(wsMessage{Type: "auth_error"})
		cleanupConn()
		conn.Close()
		return
	}

	// Post-auth: check per-user override (if set, it always applies)
	userMax := s.getUserMaxWsPerIP(userID)
	if userMax > 0 {
		wsConnCountsMu.Lock()
		if wsConnCounts[clientIP] > userMax {
			wsConnCountsMu.Unlock()
			conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
			conn.WriteJSON(wsMessage{Type: "auth_error"})
			cleanupConn()
			conn.Close()
			return
		}
		wsConnCountsMu.Unlock()
	}

	conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
	conn.WriteJSON(wsMessage{Type: "auth_ok"})

	// 3. Subscribe
	eventCh := make(chan string, 10)
	s.sseHub.AddClient(userID, eventCh)

	// Pong handler re-arms read deadline
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
			conn.SetReadDeadline(time.Now().Add(wsPingInterval * 2))
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	// Write loop + ping ticker
	pingTicker := time.NewTicker(wsPingInterval)

	doCleanup := func() {
		pingTicker.Stop()
		s.sseHub.RemoveClient(userID, eventCh)
		conn.Close()
		cleanupConn()
	}

	for {
		select {
		case <-ctx.Done():
			doCleanup()
			<-readDone
			return
		case <-readDone:
			doCleanup()
			return
		case msg, ok := <-eventCh:
			if !ok {
				doCleanup()
				return
			}
			conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
			if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
				doCleanup()
				<-readDone
				return
			}
		case <-pingTicker.C:
			conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				doCleanup()
				<-readDone
				return
			}
		}
	}
}
