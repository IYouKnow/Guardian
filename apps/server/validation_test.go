package main

import (
	"strings"
	"testing"
)

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name     string
		username string
		wantErr  bool
	}{
		{"simple", "alice", false},
		{"dots underscores dashes", "j.doe_1-2", false},
		{"exactly min length", "abc", false},
		{"exactly max length", strings.Repeat("a", 32), false},
		{"empty", "", true},
		{"too short", "ab", true},
		{"too long", strings.Repeat("a", 33), true},
		{"contains space", "al ice", true},
		{"contains at", "al@ce", true},
		{"contains slash", "a/b", true},
		{"non-ascii", "álice", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateUsername(tt.username)
			if tt.wantErr && err == nil {
				t.Fatalf("validateUsername(%q) = nil, want error", tt.username)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("validateUsername(%q) = %v, want nil", tt.username, err)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{"passphrase", "correct horse battery", false},
		{"mixed symbols", "Tr0ub4dour&3", false},
		{"exactly min length", "abcd1234", false},
		{"exactly max bytes", strings.Repeat("aB3!", 18), false}, // 72 bytes
		{"too short", "short", true},
		{"one under min", "1234567", true},
		{"common password", "password", true},
		{"common password case-insensitive", "PASSWORD", true},
		{"common password qwerty123", "qwerty123", true},
		{"all same char not denylisted", "zzzzzzzz", true},
		{"over 72 bytes", strings.Repeat("aB3!", 19), true}, // 76 bytes
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePassword(tt.password)
			if tt.wantErr && err == nil {
				t.Fatalf("validatePassword(%q) = nil, want error", tt.password)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("validatePassword(%q) = %v, want nil", tt.password, err)
			}
		})
	}
}

func TestAllSameRune(t *testing.T) {
	tests := []struct {
		in   string
		want bool
	}{
		{"", true},
		{"a", true},
		{"aaaa", true},
		{"ab", false},
		{"aab", false},
	}
	for _, tt := range tests {
		if got := allSameRune(tt.in); got != tt.want {
			t.Errorf("allSameRune(%q) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
