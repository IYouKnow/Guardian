package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

//go:embed dist
var content embed.FS

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const userIDKey contextKey = "user_id"

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

// --- Models ---
type User struct {
	ID           int        `json:"id"`
	Username     string     `json:"username"`
	PasswordHash string     `json:"-"`
	IsAdmin      bool       `json:"is_admin"`
	DBPath       string     `json:"db_path"`
	FriendlyName string     `json:"friendly_name"`
	Status       string     `json:"status"` // "ACTIVE", "INACTIVE", "SUSPENDED"
	Role         string     `json:"role"`   // "Admin", "User"
	CreatedAt    time.Time  `json:"created_at"`
	LastLogin    *time.Time `json:"last_login"`
}

type AdminUserResponse struct {
	ID                int        `json:"id"`
	Username          string     `json:"username"`
	IsAdmin           bool       `json:"is_admin"`
	FriendlyName      string     `json:"friendly_name"`
	Status            string     `json:"status"`
	Role              string     `json:"role"`
	VaultItems        int        `json:"vault_items"`
	UsedSpace         string     `json:"used_space"`
	UsedSpaceOverhead string     `json:"used_space_overhead"`
	CreatedAt         time.Time  `json:"created_at"`
	LastLogin         *time.Time `json:"last_login"`
}

type Invite struct {
	ID        int        `json:"id"`
	Token     string     `json:"token"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at"`
	ExpiresIn string     `json:"expires_in"` // Original duration string
	UsedAt    *time.Time `json:"used_at"`
	UseCount  int        `json:"use_count"`
	MaxUses   int        `json:"max_uses"` // 0 for unlimited
	CreatedBy int        `json:"created_by"`
	Note      string     `json:"note"`
	Status    string     `json:"status"`  // "ACTIVE", "USED", "EXPIRED", "REVOKED"
	UsedBy    string     `json:"used_by"` // Comma-separated list of user IDs
}

type RegisterRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	InviteToken string `json:"invite_token"`
	DBName      string `json:"db_name"` // Friendly name
}

type CreateInviteRequest struct {
	MaxUses   int    `json:"max_uses"`
	ExpiresIn string `json:"expires_in"` // e.g., "7d", "24h", "never"
	Note      string `json:"note"`
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
	userDBs  sync.Map // map[string]*sql.DB - cached user DB connections
}

func main() {
	// 1. Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	config := Config{
		Port:    port,
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
	mux.HandleFunc("POST /auth/validate-invite", server.handleValidateInvite)
	mux.HandleFunc("GET /auth/setup-status", server.handleSetupStatus)

	// Admin / Invites
	mux.HandleFunc("GET /api/admin/invites", server.withAdminAuth(server.handleListInvites))
	mux.HandleFunc("POST /api/admin/invites", server.withAdminAuth(server.handleGenerateInvite))
	mux.HandleFunc("DELETE /api/admin/invites/{id}", server.withAdminAuth(server.handleDeleteInvite))
	mux.HandleFunc("GET /api/admin/users", server.withAdminAuth(server.handleListUsers))

	// Vault Operations (Protected)
	mux.HandleFunc("GET /vault/items", server.withUserAuth(server.handleListItems))
	mux.HandleFunc("PUT /vault/items", server.withUserAuth(server.handleUpsertItems))

	// User Preferences
	mux.HandleFunc("/api/preferences", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			server.withUserAuth(server.handleGetPreferences)(w, r)
		} else if r.Method == http.MethodPut {
			server.withUserAuth(server.handleUpdatePreferences)(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Serve Static Files (Vite Build)
	// Serve Static Files (Vite Build - Embedded)
	distFS, err := fs.Sub(content, "dist")
	if err != nil {
		logger.Fatalf("Failed to load embedded assets: %v", err)
	}

	staticFileServer := http.FileServer(http.FS(distFS))

	// Catch-all for SPA: Serve index.html for any route not matched above
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Clean the path to prevent directory traversal
		cleanPath := strings.TrimPrefix(filepath.Clean(r.URL.Path), "/")
		if cleanPath == "" || cleanPath == "." {
			cleanPath = "index.html"
		}

		// Check if file exists in the FS
		f, err := distFS.Open(cleanPath)
		if err == nil {
			defer f.Close()
			// If it's a directory, we might want to let FileServer handle it or serve index if it's root
			// But for SPA usually specific files are requested or we fallback.
			// FileServer handles directories by showing index.html if present or listing.
			// Just use FileServer for existing paths.
			staticFileServer.ServeHTTP(w, r)
			return
		}

		// Should we check if it is a directory?
		// Actually, standard SPA logic: if API or asset -> 404. If route -> index.html.
		// Since API routes are handled above, we only care about assets vs routes.
		if strings.HasPrefix(r.URL.Path, "/assets/") {
			// If asset missing, 404
			http.NotFound(w, r)
			return
		}

		// Fallback to index.html for SPA routing
		index, err := distFS.Open("index.html")
		if err != nil {
			http.Error(w, "Index not found", http.StatusNotFound)
			return
		}
		defer index.Close()

		stat, _ := index.Stat()

		// Read content to support Seek (required by ServeContent)
		data, err := io.ReadAll(index)
		if err != nil {
			http.Error(w, "Failed to read index", http.StatusInternalServerError)
			return
		}

		http.ServeContent(w, r, "index.html", stat.ModTime(), bytes.NewReader(data))
	})

	// 7. Setup HTTP Server with graceful shutdown
	httpServer := &http.Server{
		Addr:    ":" + config.Port,
		Handler: corsHandler(mux),
	}

	// Channel to listen for interrupt signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in goroutine
	go func() {
		logger.Printf("Server listening on http://localhost:%s", config.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed: %v", err)
		}
	}()

	// Periodic WAL checkpoint to keep -wal/-shm files small
	checkpointDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				server.checkpointAllDBs()
			case <-checkpointDone:
				return
			}
		}
	}()

	// Wait for interrupt signal
	<-stop
	logger.Println("Shutting down server...")

	// Stop the checkpoint ticker
	close(checkpointDone)

	// Create shutdown context with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Fatalf("Server shutdown failed: %v", err)
	}

	// Final checkpoint and close all cached user DB connections
	server.checkpointAllDBs()
	server.userDBs.Range(func(key, value any) bool {
		if db, ok := value.(*sql.DB); ok {
			db.Close()
		}
		return true
	})

	logger.Println("Server stopped gracefully")
}

// checkpointAllDBs runs WAL checkpoint on system DB and all cached user DBs.
// TRUNCATE mode merges WAL into the main DB and truncates the WAL file to zero bytes.
func (s *Server) checkpointAllDBs() {
	// Checkpoint system DB
	if s.systemDB != nil {
		s.systemDB.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
	}

	// Checkpoint all cached user DBs
	s.userDBs.Range(func(key, value any) bool {
		if db, ok := value.(*sql.DB); ok {
			db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
		}
		return true
	})
}

// --- DB Init ---

// sqliteDSN builds a proper DSN for modernc.org/sqlite with PRAGMAs baked in.
// This ensures WAL mode and busy_timeout are applied to EVERY connection that
// Go's database/sql pool opens, not just the first one.
func sqliteDSN(path string) string {
	return fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(10000)", path)
}

func initSystemDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", sqliteDSN(path))
	if err != nil {
		return nil, err
	}

	// CRITICAL: SQLite only supports one writer at a time.
	// Setting MaxOpenConns(1) serializes all access through a single connection,
	// which eliminates SQLITE_BUSY errors from concurrent writes.
	db.SetMaxOpenConns(1)

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
		status TEXT DEFAULT 'ACTIVE',
		role TEXT DEFAULT 'User',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_login DATETIME
	);

	CREATE TABLE IF NOT EXISTS invites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT UNIQUE NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME,
		expires_in TEXT,
		used_at DATETIME,
		use_count INTEGER DEFAULT 0,
		max_uses INTEGER DEFAULT 1,
		created_by INTEGER NOT NULL,
		note TEXT,
		status TEXT DEFAULT 'ACTIVE',
		used_by TEXT,
		FOREIGN KEY(created_by) REFERENCES users(id)
	);
	`
	_, err = db.Exec(query)

	// Migrations
	db.Exec("ALTER TABLE invites ADD COLUMN used_by TEXT")
	db.Exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'")
	db.Exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'User'")
	db.Exec("ALTER TABLE users ADD COLUMN last_login DATETIME")
	db.Exec("ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'")

	return db, err
}

func initUserDB(path string) error {
	db, err := sql.Open("sqlite", sqliteDSN(path))
	if err != nil {
		return err
	}
	defer db.Close()

	db.SetMaxOpenConns(1)

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
		ctx := context.WithValue(r.Context(), userIDKey, userID)
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

		ctx := context.WithValue(r.Context(), userIDKey, userID)
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
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "version": Version})
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

func (s *Server) handleValidateInvite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var userCount int
	s.systemDB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)

	if userCount == 0 {
		// Setup Mode
		setupCode := os.Getenv("ADMIN_INVITE_CODE")
		if setupCode != "" && req.Token != setupCode {
			http.Error(w, "Invalid setup code", http.StatusForbidden)
			return
		}
	} else {
		// Normal Mode
		var status string
		var useCount, maxUses int
		var expiresAt *time.Time
		err := s.systemDB.QueryRow("SELECT status, use_count, max_uses, expires_at FROM invites WHERE token = ?", req.Token).Scan(&status, &useCount, &maxUses, &expiresAt)
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid invite token", http.StatusForbidden)
			return
		}

		if status != "ACTIVE" {
			http.Error(w, "Invite not active", http.StatusForbidden)
			return
		}
		if maxUses > 0 && useCount >= maxUses {
			http.Error(w, "Invite exhausted", http.StatusForbidden)
			return
		}
		if expiresAt != nil && expiresAt.Before(time.Now()) {
			http.Error(w, "Invite expired", http.StatusForbidden)
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"valid": "true"})
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
		// Check for Setup Code in Env
		setupCode := os.Getenv("ADMIN_INVITE_CODE")
		if setupCode != "" {
			if req.InviteToken != setupCode {
				s.logger.Println("Failed admin setup attempt: Invalid setup code")
				http.Error(w, "Invalid admin setup code", http.StatusForbidden)
				return
			}
		}

		isAdmin = true
		s.logger.Println("Registering first user as ADMIN:", req.Username)
	} else {
		// Validate Invite
		if req.InviteToken == "" {
			http.Error(w, "Invite token required", http.StatusForbidden)
			return
		}
		var inviteID int
		var useCount int
		var maxUses int
		var status string
		var expiresAt *time.Time

		err := s.systemDB.QueryRow(`
			SELECT id, use_count, max_uses, status, expires_at FROM invites 
			WHERE token = ?
		`, req.InviteToken).Scan(&inviteID, &useCount, &maxUses, &status, &expiresAt)

		if err == sql.ErrNoRows {
			http.Error(w, "Invalid invite token", http.StatusForbidden)
			return
		} else if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		// Check Status
		if status != "ACTIVE" {
			http.Error(w, "Invite is no longer active", http.StatusForbidden)
			return
		}

		// Check Expiry
		if expiresAt != nil && expiresAt.Before(time.Now()) {
			// Update status to EXPIRED if it wasn't already caught (usually background task or on-the-fly)
			s.systemDB.Exec("UPDATE invites SET status = 'EXPIRED' WHERE id = ?", inviteID)
			http.Error(w, "Invite has expired", http.StatusForbidden)
			return
		}

		// Check Max Uses
		if maxUses > 0 && useCount >= maxUses {
			http.Error(w, "Invite has reached maximum uses", http.StatusForbidden)
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
	role := "User"
	if isAdmin {
		role = "Admin"
	}

	res, err := s.systemDB.Exec(`
		INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name, status, role) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, req.Username, string(hashed), isAdmin, dbFilename, friendlyName, "ACTIVE", role)

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			http.Error(w, "Username taken", http.StatusConflict)
		} else {
			s.logger.Println("Register error:", err)
			http.Error(w, "Registration failed", http.StatusInternalServerError)
		}
		return
	}

	newUserID, _ := res.LastInsertId()

	// 5. Update Invite Usage (if applicable)
	if !isAdmin {
		_, err := s.systemDB.Exec(`
			UPDATE invites 
			SET use_count = use_count + 1, 
			    used_at = CURRENT_TIMESTAMP,
			    used_by = CASE 
					WHEN used_by IS NULL OR used_by = "" THEN CAST(? AS TEXT) 
					ELSE used_by || "," || CAST(? AS TEXT) 
				END,
			    status = CASE WHEN max_uses > 0 AND use_count + 1 >= max_uses THEN 'USED' ELSE status END
			WHERE token = ?
		`, newUserID, newUserID, req.InviteToken)
		if err != nil {
			s.logger.Println("Warning: Failed to update invite usage:", err)
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

	token, err := createToken(id)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Update last login
	s.systemDB.Exec("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", id)

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, Username: req.Username, IsAdmin: isAdmin})
}

// --- Vault Handlers ---

// getUserDB returns a cached *sql.DB for the user's vault database.
// Connections are pooled per-user and reused across requests.
// IMPORTANT: Do NOT call db.Close() on the returned connection.
func (s *Server) getUserDB(ctx context.Context) (*sql.DB, error) {
	userID := ctx.Value(userIDKey).(int)

	var dbFilename string
	err := s.systemDB.QueryRow("SELECT db_path FROM users WHERE id = ?", userID).Scan(&dbFilename)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	fullPath := filepath.Join(s.config.DataDir, dbFilename)

	// Check cache first
	if cached, ok := s.userDBs.Load(fullPath); ok {
		return cached.(*sql.DB), nil
	}

	// Open new connection with PRAGMAs baked into DSN
	db, err := sql.Open("sqlite", sqliteDSN(fullPath))
	if err != nil {
		return nil, err
	}

	// Single connection for SQLite to avoid SQLITE_BUSY
	db.SetMaxOpenConns(1)

	// Cache it (if another goroutine raced us, use theirs and close ours)
	actual, loaded := s.userDBs.LoadOrStore(fullPath, db)
	if loaded {
		db.Close() // We lost the race, close our duplicate
		return actual.(*sql.DB), nil
	}

	return db, nil
}

func (s *Server) handleListItems(w http.ResponseWriter, r *http.Request) {
	db, err := s.getUserDB(r.Context())
	if err != nil {
		http.Error(w, "Storage access failed", http.StatusInternalServerError)
		return
	}

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

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
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

func generateInviteToken() (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	for i := 0; i < 16; i++ {
		b[i] = charset[b[i]%byte(len(charset))]
	}
	s := string(b)
	return fmt.Sprintf("GRDN-%s-%s-%s-%s", s[0:4], s[4:8], s[8:12], s[12:16]), nil
}

func (s *Server) handleListInvites(w http.ResponseWriter, r *http.Request) {
	rows, err := s.systemDB.Query(`
		SELECT id, token, created_at, expires_at, expires_in, used_at, use_count, max_uses, created_by, note, status, used_by 
		FROM invites ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	invites := []Invite{}
	for rows.Next() {
		var inv Invite
		var usedByStr sql.NullString
		err := rows.Scan(
			&inv.ID, &inv.Token, &inv.CreatedAt, &inv.ExpiresAt,
			&inv.ExpiresIn, &inv.UsedAt, &inv.UseCount, &inv.MaxUses,
			&inv.CreatedBy, &inv.Note, &inv.Status, &usedByStr,
		)
		if err != nil {
			s.logger.Println("Scan error:", err)
			continue
		}

		// Auto-expire check: If ACTIVE but past Expiry, update DB and local object
		if inv.Status == "ACTIVE" && inv.ExpiresAt != nil && inv.ExpiresAt.Before(time.Now()) {
			inv.Status = "EXPIRED"
			_, err := s.systemDB.Exec("UPDATE invites SET status = 'EXPIRED' WHERE id = ?", inv.ID)
			if err != nil {
				s.logger.Println("Auto-expire DB update error:", err)
			}
		}

		if usedByStr.Valid {
			inv.UsedBy = usedByStr.String
		}

		invites = append(invites, inv)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, invites)
}

func (s *Server) handleGenerateInvite(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	var req CreateInviteRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
	}

	// Defaults
	if req.MaxUses == 0 && req.ExpiresIn == "" {
		req.MaxUses = 1
	}

	token, err := generateInviteToken()
	if err != nil {
		s.logger.Println("Token generation error:", err)
		http.Error(w, "Failed to generate invite token", http.StatusInternalServerError)
		return
	}

	var expiresAt *time.Time
	if req.ExpiresIn != "" && req.ExpiresIn != "never" {
		duration, err := time.ParseDuration(req.ExpiresIn)
		if err == nil {
			t := time.Now().UTC().Add(duration)
			expiresAt = &t
		} else {
			// Try "7d", "30d" patterns
			if strings.HasSuffix(req.ExpiresIn, "d") {
				daysStr := strings.TrimSuffix(req.ExpiresIn, "d")
				var days int
				fmt.Sscanf(daysStr, "%d", &days)
				if days > 0 {
					t := time.Now().UTC().AddDate(0, 0, days)
					expiresAt = &t
				}
			}
		}
	}

	_, err = s.systemDB.Exec(`
		INSERT INTO invites (token, created_by, expires_at, expires_in, max_uses, note, status) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, token, userID, expiresAt, req.ExpiresIn, req.MaxUses, req.Note, "ACTIVE")

	if err != nil {
		s.logger.Println("Insert error:", err)
		http.Error(w, "Failed to create invite", http.StatusInternalServerError)
		return
	}

	// Fetch the newly created invite to return full object
	var inv Invite
	var usedByStr sql.NullString
	err = s.systemDB.QueryRow(`
		SELECT id, token, created_at, expires_at, expires_in, use_count, max_uses, created_by, note, status, used_by 
		FROM invites WHERE token = ?
	`, token).Scan(
		&inv.ID, &inv.Token, &inv.CreatedAt, &inv.ExpiresAt,
		&inv.ExpiresIn, &inv.UseCount, &inv.MaxUses,
		&inv.CreatedBy, &inv.Note, &inv.Status, &usedByStr,
	)

	if usedByStr.Valid {
		inv.UsedBy = usedByStr.String
	}

	writeJSON(w, http.StatusCreated, inv)
}

func (s *Server) handleDeleteInvite(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		http.Error(w, "Missing invite ID", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid invite ID format", http.StatusBadRequest)
		return
	}

	// Rule: Only delete if not used
	var useCount int
	err = s.systemDB.QueryRow("SELECT use_count FROM invites WHERE id = ?", id).Scan(&useCount)
	if err == sql.ErrNoRows {
		http.Error(w, "Invite not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if useCount > 0 {
		http.Error(w, "Cannot delete an invite that has already been used", http.StatusForbidden)
		return
	}

	_, err = s.systemDB.Exec("DELETE FROM invites WHERE id = ?", id)
	if err != nil {
		http.Error(w, "Failed to delete invite", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.systemDB.Query(`
		SELECT id, username, is_admin, friendly_name, status, role, db_path, created_at, last_login 
		FROM users ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []AdminUserResponse{}
	for rows.Next() {
		var u User
		err := rows.Scan(
			&u.ID, &u.Username, &u.IsAdmin, &u.FriendlyName,
			&u.Status, &u.Role, &u.DBPath, &u.CreatedAt, &u.LastLogin,
		)
		if err != nil {
			s.logger.Println("User scan error:", err)
			continue
		}

		// Count vault items
		itemCount := 0
		userDBPath := filepath.Join(s.config.DataDir, u.DBPath)
		if udb, err := sql.Open("sqlite", sqliteDSN(userDBPath)); err == nil {
			udb.QueryRow("SELECT COUNT(*) FROM vault_items").Scan(&itemCount)
			udb.Close()
		}

		// Calculate used space
		var dbSize, overheadSize int64
		if info, err := os.Stat(userDBPath); err == nil {
			dbSize = info.Size()
		}
		for _, suffix := range []string{"-wal", "-shm"} {
			if info, err := os.Stat(userDBPath + suffix); err == nil {
				overheadSize += info.Size()
			}
		}

		users = append(users, AdminUserResponse{
			ID:                u.ID,
			Username:          u.Username,
			IsAdmin:           u.IsAdmin,
			FriendlyName:      u.FriendlyName,
			Status:            u.Status,
			Role:              u.Role,
			VaultItems:        itemCount,
			UsedSpace:         formatBytes(dbSize),
			UsedSpaceOverhead: formatBytes(overheadSize),
			CreatedAt:         u.CreatedAt,
			LastLogin:         u.LastLogin,
		})
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, users)
}

// --- Helpers ---

func createToken(userID int) (string, error) {
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

func formatBytes(b int64) string {
	switch {
	case b < 1024:
		return fmt.Sprintf("%d B", b)
	case b < 1024*1024:
		return fmt.Sprintf("%.1f KB", float64(b)/1024)
	case b < 1024*1024*1024:
		return fmt.Sprintf("%.1f MB", float64(b)/(1024*1024))
	default:
		return fmt.Sprintf("%.2f GB", float64(b)/(1024*1024*1024))
	}
}
