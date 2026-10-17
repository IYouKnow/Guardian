package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWSCheckOrigin(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		host   string
		extra  string
		want   bool
	}{
		{"no origin allowed", "", "example.com", "", true},
		{"same origin", "http://example.com", "example.com", "", true},
		{"default native origin", "tauri://localhost", "example.com", "", true},
		{"loopback any port", "http://localhost:5173", "example.com", "", true},
		{"configured origin", "https://vault.example.com", "example.com", "https://vault.example.com", true},
		{"unrelated origin rejected", "https://evil.com", "example.com", "", false},
		{"localhost suffix spoof rejected", "http://localhost.attacker.tld", "example.com", "", false},
		{"host suffix spoof rejected", "https://example.com.attacker.tld", "example.com", "", false},
		{"null rejected", "null", "example.com", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newOriginTestServer(t, tt.extra)
			r := httptest.NewRequest(http.MethodGet, "http://"+tt.host+"/ws/events", nil)
			if tt.origin != "" {
				r.Header.Set("Origin", tt.origin)
			}
			if got := s.wsCheckOrigin(r); got != tt.want {
				t.Errorf("wsCheckOrigin(%q) = %v, want %v", tt.origin, got, tt.want)
			}
		})
	}
}
