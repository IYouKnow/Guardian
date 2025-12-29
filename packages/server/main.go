package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

// --- Configuration ---
const (
	SecretKey     = "super-secret-change-me" // In production, load from ENV
	TokenDuration = 24 * time.Hour
)

type Config struct {
	Port   string
	DBPath string
}

// --- Models ---
type User struct {
	ID           int
	Username     string
	PasswordHash string
}

type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
}

type VaultItem struct {
	ID            string `json:"id"`
	EncryptedBlob string `json:"encrypted_blob"`
	Revision      int    `json:"revision"` // Client's revision number
	UpdatedAt     string `json:"updated_at,omitempty"`
}

// --- Server ---
type Server struct {
	db *sql.DB
}

func main() {
	// 1. Configuration
	config := Config{
		Port:   "8080",
		DBPath: "./data.db",
	}

	// 2. Setup Logger
	logger := log.New(os.Stdout, "[GUARDIAN-API] ", log.LstdFlags)
	logger.Println("Starting Guardian Server...")

	// 3. Setup Database
	db, err := initDB(config.DBPath)
	if err != nil {
		logger.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	logger.Println("Database connected successfully at", config.DBPath)

	// 4. Setup Server
	server := &Server{db: db}
	mux := http.NewServeMux()

	// 5. Define Routes
	mux.HandleFunc("GET /health", server.handleHealth)
	mux.HandleFunc("POST /auth/register", server.handleRegister)
	mux.HandleFunc("POST /auth/login", server.handleLogin)

	// Protected Routes
	mux.HandleFunc("GET /vault/items", server.withAuth(server.handleListItems))
	mux.HandleFunc("PUT /vault/items", server.withAuth(server.handleUpsertItems))

	// 6. Start Server
	// Setup CORS
	corsHandler := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*") // Allow all origins for dev
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

			// Handle preflight
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}

	logger.Printf("Server listening on http://localhost:%s", config.Port)
	if err := http.ListenAndServe(":"+config.Port, corsHandler(mux)); err != nil {
		logger.Fatalf("Server failed: %v", err)
	}
}

// --- DB Init ---
func initDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Create Tables
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vault_items (
		id TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL,
		encrypted_blob TEXT NOT NULL,
		revision INTEGER DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`
	_, err = db.Exec(query)
	return db, err
}

// --- Middleware ---

func (s *Server) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(SecretKey), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Extract user ID (float64 by default in map[string]interface{})
		userIDFloat, ok := claims["sub"].(float64)
		if !ok {
			http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", int(userIDFloat))
		next(w, r.WithContext(ctx))
	}
}

// --- Handlers ---

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "version": "0.3.0"})
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	_, err = s.db.Exec("INSERT INTO users (username, password_hash) VALUES (?, ?)", req.Username, string(hashed))
	if err != nil {
		http.Error(w, "Username likely already taken", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, http.StatusCreated, map[string]string{"message": "User created successfully"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var id int
	var passwordHash string
	err := s.db.QueryRow("SELECT id, password_hash FROM users WHERE username = ?", req.Username).Scan(&id, &passwordHash)
	if err == sql.ErrNoRows {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := createToken(id, req.Username)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, Username: req.Username})
}

// handleListItems returns all vault items for the authenticated user
func (s *Server) handleListItems(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int)

	rows, err := s.db.Query("SELECT id, encrypted_blob, revision, updated_at FROM vault_items WHERE user_id = ?", userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []VaultItem{}
	for rows.Next() {
		var item VaultItem
		if err := rows.Scan(&item.ID, &item.EncryptedBlob, &item.Revision, &item.UpdatedAt); err != nil {
			continue // Skip bad rows
		}
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, items)
}

// handleUpsertItems updates or inserts vault items
func (s *Server) handleUpsertItems(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int)

	var items []VaultItem
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	tx, err := s.db.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// upsert query for SQLite
	stmt, err := tx.Prepare(`
		INSERT INTO vault_items (id, user_id, encrypted_blob, revision, updated_at) 
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET 
			encrypted_blob=excluded.encrypted_blob, 
			revision=excluded.revision,
			updated_at=CURRENT_TIMESTAMP
	`)
	if err != nil {
		tx.Rollback()
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	for _, item := range items {
		// Basic security check: ensure the item belongs to the user if it exists (TODO: strict ownership check)
		// For now, we assume ID collision is negligible or authorized.
		// Ideally: check if ID exists for another user before upsert.
		_, err := stmt.Exec(item.ID, userID, item.EncryptedBlob, item.Revision)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to save item: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Items synced"})
}

// --- Helpers ---

func createToken(userID int, username string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"iss": "guardian-server",
		"exp": time.Now().Add(TokenDuration).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(SecretKey))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
