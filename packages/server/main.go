package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

// --- Configuration ---
const (
	SecretKey     = "super-secret-change-me" // In production, load from ENV
	TokenDuration = 24 * time.Hour
)

type Config struct {
	Port    string
	DataDir string
}

// --- Models ---
type User struct {
	ID           int
	Username     string
	PasswordHash string
	IsAdmin      bool
	DBPath       string // UUID filename
	FriendlyName string // e.g., "My Home Vault"
}

type Invite struct {
	ID        int
	Token     string
	CreatedBy int
	UsedBy    *int
	ExpiresAt time.Time
	CreatedAt time.Time
}

type RegisterRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	InviteToken string `json:"invite_token"`
	DBName      string `json:"db_name"` // Friendly name
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

type VaultItem struct {
	ID            string `json:"id"`
	EncryptedBlob string `json:"encrypted_blob"`
	Revision      int    `json:"revision"`
	UpdatedAt     string `json:"updated_at,omitempty"`
}

// --- Server ---
type Server struct {
	systemDB *sql.DB
	config   Config
	logger   *log.Logger
}

func main() {
	// 1. Configuration
	config := Config{
		Port:    "8080",
		DataDir: "./data",
	}

	// 2. Setup Logger
	logger := log.New(os.Stdout, "[GUARDIAN-API] ", log.LstdFlags)
	logger.Println("Starting Guardian Server (Multi-Tenant)...")

	// 3. Ensure Data Directory
	if err := os.MkdirAll(config.DataDir, 0755); err != nil {
		logger.Fatalf("Failed to create data directory: %v", err)
	}

	// 4. Setup System Database
	systemDBPath := filepath.Join(config.DataDir, "system.db")
	sysDB, err := initSystemDB(systemDBPath)
	if err != nil {
		logger.Fatalf("Failed to initialize system database: %v", err)
	}
	defer sysDB.Close()
	logger.Println("System Database connected at", systemDBPath)

	// 5. Setup Server
	server := &Server{
		systemDB: sysDB,
		config:   config,
		logger:   logger,
	}

	mux := http.NewServeMux()

	// 6. Define Routes
	mux.HandleFunc("GET /health", server.handleHealth)

	// Auth
	mux.HandleFunc("POST /auth/register", server.handleRegister)
	mux.HandleFunc("POST /auth/login", server.handleLogin)
	mux.HandleFunc("GET /auth/setup-status", server.handleSetupStatus) // New: Check if first run is needed

	// Admin / Invites
	mux.HandleFunc("POST /api/admin/invites", server.withAdminAuth(server.handleGenerateInvite))

	// Vault Operations (Protected)
	mux.HandleFunc("GET /vault/items", server.withUserAuth(server.handleListItems))
	mux.HandleFunc("PUT /vault/items", server.withUserAuth(server.handleUpsertItems))

	// 7. Start Server with CORS
	logger.Printf("Server listening on http://localhost:%s", config.Port)
	if err := http.ListenAndServe(":"+config.Port, corsHandler(mux)); err != nil {
		logger.Fatalf("Server failed: %v", err)
	}
}

// --- DB Init ---

func initSystemDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	// Enable WAL for concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("failed to support WAL mode: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		is_admin BOOLEAN DEFAULT 0,
		db_path TEXT NOT NULL,
		friendly_name TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS invites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT UNIQUE NOT NULL,
		created_by INTEGER NOT NULL,
		used_by INTEGER,
		expires_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(created_by) REFERENCES users(id),
		FOREIGN KEY(used_by) REFERENCES users(id)
	);
	`
	_, err = db.Exec(query)
	return db, err
}

func initUserDB(path string) error {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return err
	}
	defer db.Close()

	// Enable WAL
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return fmt.Errorf("failed to support WAL mode: %w", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS vault_items (
		id TEXT PRIMARY KEY,
		encrypted_blob TEXT NOT NULL,
		revision INTEGER DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err = db.Exec(query)
	return err
}

// --- Middleware ---

func corsHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// withUserAuth validates JWT and adds user_id to context
func (s *Server) withUserAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := s.validateToken(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), "user_id", userID)
		next(w, r.WithContext(ctx))
	}
}

// withAdminAuth validates JWT AND checks if user is admin
func (s *Server) withAdminAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := s.validateToken(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check Admin Status in DB
		var isAdmin bool
		err = s.systemDB.QueryRow("SELECT is_admin FROM users WHERE id = ?", userID).Scan(&isAdmin)
		if err != nil || !isAdmin {
			http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", userID)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) validateToken(r *http.Request) (int, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return 0, fmt.Errorf("missing header")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(SecretKey), nil
	})

	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, fmt.Errorf("invalid claims")
	}

	userIDFloat, ok := claims["sub"].(float64)
	if !ok {
		return 0, fmt.Errorf("invalid user id")
	}

	return int(userIDFloat), nil
}

// --- Handlers ---

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "version": "0.4.0-multi"})
}

func (s *Server) handleSetupStatus(w http.ResponseWriter, r *http.Request) {
	var count int
	s.systemDB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	status := "READY"
	if count == 0 {
		status = "SETUP" // Needs first admin
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 1. Check User Count
	var userCount int
	s.systemDB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)

	isAdmin := false
	if userCount == 0 {
		// First user is Admin
		isAdmin = true
		s.logger.Println("Registering first user as ADMIN:", req.Username)
	} else {
		// Validate Invite
		if req.InviteToken == "" {
			http.Error(w, "Invite token required", http.StatusForbidden)
			return
		}
		var inviteID int
		err := s.systemDB.QueryRow(`
			SELECT id FROM invites 
			WHERE token = ? AND used_by IS NULL AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
		`, req.InviteToken).Scan(&inviteID)

		if err == sql.ErrNoRows {
			http.Error(w, "Invalid or expired invite", http.StatusForbidden)
			return
		} else if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	// 2. Hash Password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	// 3. Generate DB Path (UUID)
	userUUID := uuid.New().String()
	dbFilename := userUUID + ".db"
	dbPath := filepath.Join(s.config.DataDir, dbFilename)

	friendlyName := req.DBName
	if friendlyName == "" {
		friendlyName = req.Username
	}

	// 4. Create User in System DB
	res, err := s.systemDB.Exec(`
		INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name) 
		VALUES (?, ?, ?, ?, ?)
	`, req.Username, string(hashed), isAdmin, dbFilename, friendlyName)

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			http.Error(w, "Username taken", http.StatusConflict)
		} else {
			s.logger.Println("Register error:", err)
			http.Error(w, "Registration failed", http.StatusInternalServerError)
		}
		return
	}

	userID, _ := res.LastInsertId()

	// 5. Mark Invite Used (if applicable)
	if !isAdmin {
		_, err := s.systemDB.Exec("UPDATE invites SET used_by = ? WHERE token = ?", userID, req.InviteToken)
		if err != nil {
			s.logger.Println("Warning: Failed to mark invite used:", err)
		}
	}

	// 6. Init User Database
	if err := initUserDB(dbPath); err != nil {
		// Rollback user creation ideally, but for now just log error
		s.logger.Println("CRITICAL: Failed to init user db:", err)
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"message": "User registered successfully"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var id int
	var passwordHash string
	var isAdmin bool
	err := s.systemDB.QueryRow("SELECT id, password_hash, is_admin FROM users WHERE username = ?", req.Username).Scan(&id, &passwordHash, &isAdmin)
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

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, Username: req.Username, IsAdmin: isAdmin})
}

// --- Vault Handlers ---

func (s *Server) getUserDB(ctx context.Context) (*sql.DB, error) {
	userID := ctx.Value("user_id").(int)

	var dbFilename string
	err := s.systemDB.QueryRow("SELECT db_path FROM users WHERE id = ?", userID).Scan(&dbFilename)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	fullPath := filepath.Join(s.config.DataDir, dbFilename)
	db, err := sql.Open("sqlite", fullPath)
	if err != nil {
		return nil, err
	}
	// Need to ensure WAL here too if not persistent
	db.Exec("PRAGMA journal_mode=WAL;")

	return db, nil
}

func (s *Server) handleListItems(w http.ResponseWriter, r *http.Request) {
	db, err := s.getUserDB(r.Context())
	if err != nil {
		http.Error(w, "Storage access failed", http.StatusInternalServerError)
		return
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, encrypted_blob, revision, updated_at FROM vault_items")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []VaultItem{}
	for rows.Next() {
		var item VaultItem
		if err := rows.Scan(&item.ID, &item.EncryptedBlob, &item.Revision, &item.UpdatedAt); err != nil {
			continue
		}
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleUpsertItems(w http.ResponseWriter, r *http.Request) {
	var items []VaultItem
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	db, err := s.getUserDB(r.Context())
	if err != nil {
		http.Error(w, "Storage access failed", http.StatusInternalServerError)
		return
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	stmt, err := tx.Prepare(`
		INSERT INTO vault_items (id, encrypted_blob, revision, updated_at) 
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
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
		_, err := stmt.Exec(item.ID, item.EncryptedBlob, item.Revision)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Save failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Items synced"})
}

// --- Admin Handlers ---

func (s *Server) handleGenerateInvite(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int)

	// Generate random token
	bytes := make([]byte, 16)
	rand.Read(bytes)
	token := hex.EncodeToString(bytes)

	_, err := s.systemDB.Exec("INSERT INTO invites (token, created_by) VALUES (?, ?)", token, userID)
	if err != nil {
		http.Error(w, "Failed to create invite", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"token": token})
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
