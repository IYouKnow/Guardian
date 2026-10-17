package main

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
)

// newHeaderTestServer returns a bare Server (no DB) for exercising middleware
// that only relies on the trusted-proxy defaults.
func newHeaderTestServer() *Server {
	return &Server{logger: log.New(io.Discard, "", 0)}
}

func TestSecurityHeaders(t *testing.T) {
	tests := []struct {
		name       string
		target     string
		remoteAddr string
		xfp        string
		wantHSTS   bool
	}{
		{"plain http from public peer", "http://example.com/", "192.0.2.1:1234", "", false},
		{"direct tls", "https://example.com/", "192.0.2.1:1234", "", true},
		{"trusted proxy forwards https", "http://example.com/", "127.0.0.1:1234", "https", true},
		{"trusted proxy forwards http", "http://example.com/", "127.0.0.1:1234", "http", false},
		{"untrusted peer cannot spoof proto", "http://example.com/", "192.0.2.1:1234", "https", false},
		{"first proto value wins", "http://example.com/", "127.0.0.1:1234", "https, http", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			next := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
			handler := newHeaderTestServer().securityHeaders(http.HandlerFunc(next))

			r := httptest.NewRequest(http.MethodGet, tt.target, nil)
			r.RemoteAddr = tt.remoteAddr
			if tt.xfp != "" {
				r.Header.Set("X-Forwarded-Proto", tt.xfp)
			}
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, r)

			if got := rr.Header().Get("Content-Security-Policy"); got == "" {
				t.Error("missing Content-Security-Policy")
			}
			if got := rr.Header().Get("X-Content-Type-Options"); got != "nosniff" {
				t.Errorf("X-Content-Type-Options = %q, want %q", got, "nosniff")
			}
			if got := rr.Header().Get("X-Frame-Options"); got != "DENY" {
				t.Errorf("X-Frame-Options = %q, want %q", got, "DENY")
			}
			if got := rr.Header().Get("Referrer-Policy"); got == "" {
				t.Error("missing Referrer-Policy")
			}
			if got := rr.Header().Get("Permissions-Policy"); got == "" {
				t.Error("missing Permissions-Policy")
			}

			gotHSTS := rr.Header().Get("Strict-Transport-Security")
			if tt.wantHSTS && gotHSTS == "" {
				t.Error("expected Strict-Transport-Security, got none")
			}
			if !tt.wantHSTS && gotHSTS != "" {
				t.Errorf("unexpected Strict-Transport-Security = %q", gotHSTS)
			}
		})
	}
}

// TestSecurityHeadersOnErrorResponses verifies headers are present even when a
// downstream handler returns early with an error status (e.g. auth failures).
func TestSecurityHeadersOnErrorResponses(t *testing.T) {
	next := func(w http.ResponseWriter, r *http.Request) { http.Error(w, "nope", http.StatusUnauthorized) }
	handler := newHeaderTestServer().securityHeaders(http.HandlerFunc(next))

	r := httptest.NewRequest(http.MethodGet, "http://example.com/vault/items", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, r)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
	}
	if got := rr.Header().Get("Content-Security-Policy"); got != cspPolicy {
		t.Errorf("Content-Security-Policy = %q, want %q", got, cspPolicy)
	}
	if got := rr.Header().Get("X-Frame-Options"); got != "DENY" {
		t.Errorf("X-Frame-Options = %q, want %q", got, "DENY")
	}
}
