package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCorsHandler(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		origin     string
		host       string
		extra      string
		wantStatus int
		wantACAO   string // "" means Access-Control-Allow-Origin must be absent
	}{
		{"no origin", http.MethodGet, "", "example.com", "", http.StatusOK, ""},
		{"disallowed origin", http.MethodGet, "https://evil.com", "example.com", "", http.StatusOK, ""},
		{"null origin", http.MethodGet, "null", "example.com", "", http.StatusOK, ""},
		{"default native origin", http.MethodGet, "tauri://localhost", "example.com", "", http.StatusOK, "tauri://localhost"},
		{"default extension origin", http.MethodGet, "chrome-extension://abcdef", "example.com", "", http.StatusOK, "chrome-extension://abcdef"},
		{"loopback any port", http.MethodGet, "http://localhost:5173", "example.com", "", http.StatusOK, "http://localhost:5173"},
		{"loopback spoof rejected", http.MethodGet, "http://localhost.attacker.tld", "example.com", "", http.StatusOK, ""},
		{"same origin", http.MethodGet, "http://example.com", "example.com", "", http.StatusOK, "http://example.com"},
		{"configured origin", http.MethodGet, "https://vault.example.com", "example.com", "https://vault.example.com", http.StatusOK, "https://vault.example.com"},
		{"preflight disallowed", http.MethodOptions, "https://evil.com", "example.com", "", http.StatusForbidden, ""},
		{"preflight default origin", http.MethodOptions, "tauri://localhost", "example.com", "", http.StatusNoContent, "tauri://localhost"},
		{"preflight no origin", http.MethodOptions, "", "example.com", "", http.StatusNoContent, ""},
		{"preflight configured origin", http.MethodOptions, "https://vault.example.com", "example.com", "https://vault.example.com", http.StatusNoContent, "https://vault.example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newOriginTestServer(t, tt.extra)
			next := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
			handler := s.corsHandler(http.HandlerFunc(next))

			r := httptest.NewRequest(tt.method, "http://"+tt.host+"/health", nil)
			if tt.origin != "" {
				r.Header.Set("Origin", tt.origin)
			}
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, r)

			if rr.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rr.Code, tt.wantStatus)
			}
			if got := rr.Header().Get("Access-Control-Allow-Origin"); got != tt.wantACAO {
				t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, tt.wantACAO)
			}
			if got := rr.Header().Get("Vary"); got != "Origin" {
				t.Errorf("Vary = %q, want %q", got, "Origin")
			}
		})
	}
}
