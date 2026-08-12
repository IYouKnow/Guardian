package main

import (
	"bufio"
	"log"
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

func init() {
	// Try to load .env file if it exists
	loadEnv()

	SecretKey = os.Getenv("JWT_SECRET")
	if SecretKey == "" {
		log.Println("WARNING: JWT_SECRET environment variable is not set.")
		log.Fatal("Please set JWT_SECRET in your .env file or environment variables to secure your tokens.")
	}
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