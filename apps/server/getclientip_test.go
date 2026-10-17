package main

import (
	"net/http"
	"net/http/httptest"
	"net/netip"
	"testing"
)

func mustParseTrustedProxies(t *testing.T, s string) []netip.Prefix {
	t.Helper()
	p, err := parseTrustedProxies(s)
	if err != nil {
		t.Fatalf("parseTrustedProxies(%q): %v", s, err)
	}
	return p
}

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		xff        string
		configured string
		want       string
	}{
		{
			name:       "no xff uses remote addr",
			remoteAddr: "203.0.113.7:12345",
			want:       "203.0.113.7",
		},
		{
			name:       "public peer ignores spoofed xff",
			remoteAddr: "203.0.113.7:12345",
			xff:        "9.9.9.9",
			want:       "203.0.113.7",
		},
		{
			name:       "local peer auto-trusted without config",
			remoteAddr: "10.0.0.5:12345",
			xff:        "1.2.3.4",
			want:       "1.2.3.4",
		},
		{
			name:       "cloudflare tunnel same host uses rightmost non-proxy hop",
			remoteAddr: "127.0.0.1:12345",
			xff:        "9.9.9.9, 203.0.113.7",
			want:       "203.0.113.7",
		},
		{
			name:       "cloudflare tunnel in docker (private bridge) auto-trusted",
			remoteAddr: "172.17.0.3:12345",
			xff:        "203.0.113.7",
			want:       "203.0.113.7",
		},
		{
			name:       "configured public proxy honoured",
			remoteAddr: "198.51.100.20:12345",
			xff:        "203.0.113.7",
			configured: "198.51.100.20",
			want:       "203.0.113.7",
		},
		{
			name:       "public peer not in configured list ignored",
			remoteAddr: "198.51.100.20:12345",
			xff:        "203.0.113.7",
			configured: "203.0.113.0/24",
			want:       "198.51.100.20",
		},
		{
			name:       "all xff hops trusted falls back to remote",
			remoteAddr: "10.0.0.5:12345",
			xff:        "10.0.0.9, 10.0.0.10",
			want:       "10.0.0.5",
		},
		{
			name:       "ipv6 public peer",
			remoteAddr: "[2001:db8::1]:443",
			want:       "2001:db8::1",
		},
		{
			name:       "ipv6 ula peer auto-trusted",
			remoteAddr: "[fd00::1]:443",
			xff:        "2001:db8::99",
			want:       "2001:db8::99",
		},
		{
			name:       "unparsable peer falls back to raw",
			remoteAddr: "not-an-ip",
			want:       "not-an-ip",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &Server{trustedProxies: mustParseTrustedProxies(t, tt.configured)}
			r := httptest.NewRequest(http.MethodGet, "/", nil)
			r.RemoteAddr = tt.remoteAddr
			if tt.xff != "" {
				r.Header.Set("X-Forwarded-For", tt.xff)
			}
			if got := s.getClientIP(r); got != tt.want {
				t.Fatalf("getClientIP = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseTrustedProxies(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    []string
		wantErr bool
	}{
		{"empty", "", nil, false},
		{"whitespace only", "  ,  ", nil, false},
		{"cidr and bare ip", "203.0.113.0/24,198.51.100.7", []string{"203.0.113.0/24", "198.51.100.7/32"}, false},
		{"bare ipv6", "2001:db8::1", []string{"2001:db8::1/128"}, false},
		{"hostname rejected", "vault.example.com", nil, true},
		{"bad prefix length rejected", "10.0.0.0/999", nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseTrustedProxies(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("parseTrustedProxies(%q) = %v, want error", tt.input, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseTrustedProxies(%q): %v", tt.input, err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i].String() != tt.want[i] {
					t.Fatalf("got %v, want %v", got, tt.want)
				}
			}
		})
	}
}
