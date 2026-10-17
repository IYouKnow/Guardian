package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

// --- Configuration ---
var (
	SecretKey     string
	TokenDuration = 24 * time.Hour
	Version       = "dev" // Default version, will be overridden by CI/CD during tagged builds
)

// minSecretLen is the minimum accepted length for JWT_SECRET. Shorter secrets are
// brute-forceable, which would let an attacker forge authentication tokens.
const minSecretLen = 32

// insecureSecrets are well-known placeholder values that must never be used to
// sign tokens. They are compared case-insensitively.
var insecureSecrets = map[string]struct{}{
	"change_me_to_a_random_secret":        {},
	"replace_with_a_secure_random_string": {},
	"changeme":                            {},
	"change_me":                           {},
	"secret":                              {},
	"password":                            {},
	"jwt_secret":                          {},
	"your_secret_here":                    {},
}

func init() {
	// Try to load .env file if it exists
	loadEnv()
}

// validateSecret rejects missing, placeholder, or too-short JWT secrets so the
// server fails closed instead of running with a guessable signing key.
func validateSecret(secret string) error {
	trimmed := strings.TrimSpace(secret)
	if trimmed == "" {
		return errors.New("JWT_SECRET is not set")
	}
	if _, insecure := insecureSecrets[strings.ToLower(trimmed)]; insecure {
		return errors.New("JWT_SECRET is set to a known placeholder value")
	}
	if len(trimmed) < minSecretLen {
		return fmt.Errorf("JWT_SECRET must be at least %d characters", minSecretLen)
	}
	return nil
}

// loadEnv is a simple helper to load .env files without external dependencies
func loadEnv() {
	f, err := os.Open(".env")
	if err != nil {
		return // No .env file, skip
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			// Only set if not already set in environment
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

type Config struct {
	Port    string
	DataDir string
}
