package main

import (
	"encoding/json"
	"sync"
	"time"
)

// SSEEvent represents a single payload sent to a client
type SSEEvent struct {
	Type      string `json:"type"`
	Timestamp int64  `json:"timestamp"`
}

// SSEHub manages all active WebSocket and any future event-stream connections.
// Despite the name, it is no longer SSE-specific — it is used by WebSocket connections.
type SSEHub struct {
	clients    map[int]map[chan string]bool
	mu         sync.RWMutex
	shutdowned bool
}

// NewSSEHub creates a new SSEHub
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[int]map[chan string]bool),
	}
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
		default:
		}
	}
}

// shutdown closes all client channels to unblock connections
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
