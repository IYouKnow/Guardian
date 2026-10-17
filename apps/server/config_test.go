package main

import (
	"strings"
	"testing"
)

func TestValidateSecret(t *testing.T) {
	tests := []struct {
		name    string
		secret  string
		wantErr bool
	}{
		{"valid 44-char base64 secret", "Xq7b1s9fT2mZ8pL4vR6nC0yD3kH5jW1uA9eG2iS8oP=", false},
		{"valid exactly min length", strings.Repeat("A", minSecretLen), false},
		{"empty", "", true},
		{"whitespace only", "   ", true},
		{"compose placeholder", "CHANGE_ME_TO_A_RANDOM_SECRET", true},
		{"compose placeholder lowercase", "change_me_to_a_random_secret", true},
		{"env example placeholder", "replace_with_a_secure_random_string", true},
		{"common bad secret", "changeme", true},
		{"too short", strings.Repeat("A", minSecretLen-1), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSecret(tt.secret)
			if tt.wantErr && err == nil {
				t.Fatalf("validateSecret(%q) = nil, want error", tt.secret)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("validateSecret(%q) = %v, want nil", tt.secret, err)
			}
		})
	}
}

func TestValidateAdminSetup(t *testing.T) {
	tests := []struct {
		name      string
		userCount int
		code      string
		wantErr   bool
	}{
		{"no users and no code", 0, "", true},
		{"no users and whitespace code", 0, "   ", true},
		{"no users with code", 0, "s3cret", false},
		{"existing users and no code", 3, "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAdminSetup(tt.userCount, tt.code)
			if tt.wantErr && err == nil {
				t.Fatalf("validateAdminSetup(%d, %q) = nil, want error", tt.userCount, tt.code)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("validateAdminSetup(%d, %q) = %v, want nil", tt.userCount, tt.code, err)
			}
		})
	}
}
