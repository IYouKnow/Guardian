package main

import (
	"io"
	"log"
	"testing"
)

// newOriginTestServer returns a Server with the default origin allowlist plus
// any extra ALLOWED_ORIGINS-syntax entries. No database is needed for origin checks.
func newOriginTestServer(t *testing.T, extra string) *Server {
	t.Helper()
	parsed, err := parseAllowedOrigins(extra)
	if err != nil {
		t.Fatalf("parseAllowedOrigins(%q): %v", extra, err)
	}
	return &Server{
		logger:         log.New(io.Discard, "", 0),
		allowedOrigins: defaultOriginAllowlist().withExtra(parsed),
	}
}

func TestOriginAllowlistAllows(t *testing.T) {
	list := defaultOriginAllowlist()

	tests := []struct {
		origin string
		want   bool
	}{
		{"tauri://localhost", true},
		{"http://tauri.localhost", true},
		{"capacitor://localhost", true},
		{"chrome-extension://abcdefghijklmnop", true},
		{"moz-extension://some-id", true},
		{"http://localhost:5173", true},
		{"http://127.0.0.1:8080", true},
		{"https://[::1]:3000", true},
		{"TAURI://LOCALHOST", true},
		{"tauri://localhost/", true},
		{"http://localhost.attacker.tld", false},
		{"https://localhost.attacker.tld", false},
		{"null", false},
		{"", false},
		{"https://evil.com", false},
		{"https://<host>.attacker.tld", false},
	}

	for _, tt := range tests {
		if got := list.allows(tt.origin); got != tt.want {
			t.Errorf("allows(%q) = %v, want %v", tt.origin, got, tt.want)
		}
	}
}

func TestParseAllowedOrigins(t *testing.T) {
	t.Run("empty", func(t *testing.T) {
		list, err := parseAllowedOrigins("")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(list.exact) != 0 || len(list.schemes) != 0 {
			t.Fatalf("expected empty allowlist, got %+v", list)
		}
	})

	t.Run("mixed exact and scheme", func(t *testing.T) {
		list, err := parseAllowedOrigins(" https://vault.example.com , chrome-extension:// , https://admin.example.com ")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if _, ok := list.exact["https://vault.example.com"]; !ok {
			t.Errorf("missing vault.example.com in %v", list.exact)
		}
		if _, ok := list.exact["https://admin.example.com"]; !ok {
			t.Errorf("missing admin.example.com in %v", list.exact)
		}
		if len(list.schemes) != 1 || list.schemes[0] != "chrome-extension://" {
			t.Errorf("schemes = %v, want [chrome-extension://]", list.schemes)
		}
	})

	t.Run("normalizes case and trailing slash", func(t *testing.T) {
		list, err := parseAllowedOrigins("https://Vault.Example.com/")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if _, ok := list.exact["https://vault.example.com"]; !ok {
			t.Errorf("expected normalized origin, got %v", list.exact)
		}
	})

	t.Run("malformed entries fail closed", func(t *testing.T) {
		for _, bad := range []string{"vault.example.com", "not a url", "://missing-scheme"} {
			if _, err := parseAllowedOrigins(bad); err == nil {
				t.Errorf("parseAllowedOrigins(%q) = nil error, want error", bad)
			}
		}
	})
}

func TestOriginAllowlistWithExtraRetainsDefaults(t *testing.T) {
	extra, err := parseAllowedOrigins("https://vault.example.com")
	if err != nil {
		t.Fatalf("parseAllowedOrigins: %v", err)
	}
	merged := defaultOriginAllowlist().withExtra(extra)

	if !merged.allows("https://vault.example.com") {
		t.Error("merged allowlist should allow the configured origin")
	}
	if !merged.allows("tauri://localhost") {
		t.Error("merged allowlist should retain the default native origin")
	}
	if !merged.allows("chrome-extension://abc") {
		t.Error("merged allowlist should retain the default extension scheme")
	}
}
