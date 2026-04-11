package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// SSEEvent represents a single payload sent to the client
type SSEEvent struct {
	Type      string `json:"type"`
	Timestamp int64  `json:"timestamp"`
}

// SSEHub manages all active SSE connections
type SSEHub struct {
	clients    map[int]map[chan string]bool
	mu         sync.RWMutex
	shutdowned bool
}

// NewSSEHub creates a new SSEHub and starts the heartbeat goroutine
func NewSSEHub() *SSEHub {
	hub := &SSEHub{
		clients: make(map[int]map[chan string]bool),
	}

	// Start the heartbeat goroutine
	go hub.startHeartbeat()

	return hub
}

// AddClient registers a new client channel for a specific user ID
func (h *SSEHub) AddClient(userID int, ch chan string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = make(map[chan string]bool)
	}
	h.clients[userID][ch] = true
}

// RemoveClient unregisters a client channel
func (h *SSEHub) RemoveClient(userID int, ch chan string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if userClients, ok := h.clients[userID]; ok {
		delete(userClients, ch)
		if len(userClients) == 0 {
			delete(h.clients, userID)
		}
	}
	if !h.shutdowned {
		close(ch)
	}
}

// BroadcastToUser sends an event to all connected devices of a specific user
func (h *SSEHub) BroadcastToUser(userID int, eventType string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	userClients, ok := h.clients[userID]
	if !ok {
		return
	}

	event := SSEEvent{
		Type:      eventType,
		Timestamp: time.Now().Unix(),
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return
	}

	for ch := range userClients {
		select {
		case ch <- string(eventData):
			// Successfully sent
		default:
			// Channel is blocked/full, we could forcefully remove it or log it
		}
	}
}

// broadcastToAll sends an event to every single connected client
func (h *SSEHub) broadcastToAll(eventType string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	event := SSEEvent{
		Type:      eventType,
		Timestamp: time.Now().Unix(),
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return
	}

	for _, userClients := range h.clients {
		for ch := range userClients {
			select {
			case ch <- string(eventData):
			default:
			}
		}
	}
}

// shutdown closes all client channels to unblock SSE connections
func (h *SSEHub) shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.shutdowned = true

	for _, userClients := range h.clients {
		for ch := range userClients {
			close(ch)
		}
	}
	h.clients = make(map[int]map[chan string]bool)
}

// startHeartbeat sends a ping event every 30 seconds to keep proxies awake (e.g. Cloudflare tunnels)
func (h *SSEHub) startHeartbeat() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		<-ticker.C
		h.broadcastToAll("ping")
	}
}

// handleEvents is the HTTP handler for the /api/events endpoint
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	// SSE requires specific headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// Allowing CORS if needed, though usually handled by middleware
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Verify authentication.
	// EventSource in browsers cannot send custom headers (like Authorization).
	// So we must pass the token in the URL query parameters: ?token=...
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// We'll temporarily set the Authorization header so our existing validateToken method works
	r.Header.Set("Authorization", "Bearer "+tokenStr)

	userID, err := s.validateToken(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Create a channel for this client
	ch := make(chan string, 10) // Small buffer

	// Register with hub
	s.sseHub.AddClient(userID, ch)

	// Ensure we clean up when the connection closes
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	defer s.sseHub.RemoveClient(userID, ch)

	// Send an initial connected event
	fmt.Fprintf(w, "data: {\"type\": \"connected\", \"timestamp\": %d}\n\n", time.Now().Unix())
	w.(http.Flusher).Flush()

	// Wait for messages from the hub and write them to the connection
	for {
		select {
		case <-ctx.Done():
			// Client disconnected
			return
		case msg, ok := <-ch:
			if !ok {
				// Channel closed
				return
			}
			// SSE format requires "data: <payload>\n\n"
			fmt.Fprintf(w, "data: %s\n\n", msg)

			// Flush the response writer to send data immediately
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
	}
}
