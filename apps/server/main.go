package main

import (
	"bytes"
	"context"
	"database/sql"
	"embed"
	"flag"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/netip"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

//go:embed dist
var content embed.FS

// --- Server ---
type Server struct {
	systemDB       *sql.DB
	config         Config
	logger         *log.Logger
	userDBs        sync.Map // map[string]*sql.DB - cached user DB connections
	sseHub         *SSEHub
	authIPLimiter  *rateLimiter
	authLockouts   *lockoutTracker
	trustedProxies []netip.Prefix
	allowedOrigins originAllowlist
	startedAt      time.Time
}

func main() {
	// 1. Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// -host selects the bind address. Empty (the default) listens on all
	// interfaces; the web dev script passes 127.0.0.1 so Windows does not raise
	// a firewall/UAC prompt for a loopback-only listener.
	host := flag.String("host", "", "bind address (default: all interfaces)")
	flag.Parse()

	config := Config{
		Host:    *host,
		Port:    port,
		DataDir: "./data",
	}

	// 2. Setup Logger
	logger := log.New(os.Stdout, "[GUARDIAN-API] ", log.LstdFlags)
	logger.Println("Starting Guardian Server (Multi-Tenant)...")

	// 3. Load and validate the JWT signing secret. Fail closed on missing,
	// placeholder, or too-short values so tokens can't be forged.
	SecretKey = os.Getenv("JWT_SECRET")
	if err := validateSecret(SecretKey); err != nil {
		logger.Fatalf("Insecure JWT_SECRET: %v. Generate one with `openssl rand -base64 32` and set it in your environment or .env file.", err)
	}

	// 3b. Extra trusted proxy ranges for X-Forwarded-For. Local/private peers are
	// always trusted (see defaultTrustedProxyNets); this adds public ones. Fail
	// closed on malformed entries so a typo can't silently change what is trusted.
	trustedProxies, err := parseTrustedProxies(os.Getenv("TRUSTED_PROXIES"))
	if err != nil {
		logger.Fatalf("Invalid TRUSTED_PROXIES: %v", err)
	}
	logger.Printf("Trusting X-Forwarded-For from local/private networks + %d configured range(s)", len(trustedProxies))

	// 3c. Extra permitted browser origins for CORS and the WebSocket handshake.
	// The bundled native clients and loopback are always allowed; this adds
	// whatever an operator lists. Fail closed on malformed entries.
	extraOrigins, err := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"))
	if err != nil {
		logger.Fatalf("Invalid ALLOWED_ORIGINS: %v", err)
	}
	logger.Printf("CORS/WebSocket origins: built-in native/loopback defaults + %d configured origin(s), %d scheme(s)", len(extraOrigins.exact), len(extraOrigins.schemes))

	// 4. Ensure Data Directory
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

	// 4b. Fail closed on first-run bootstrap: with no admin yet, refuse to start
	// unless ADMIN_INVITE_CODE is set, so a freshly exposed server can't be claimed
	// by whoever opens /auth/register first. Existing deployments (users > 0) boot
	// unchanged even if the code has been cleared.
	var userCount int
	if err := sysDB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount); err != nil {
		logger.Fatalf("Failed to count users: %v", err)
	}
	if err := validateAdminSetup(userCount, os.Getenv("ADMIN_INVITE_CODE")); err != nil {
		logger.Fatalf("Insecure server setup: %v. Set ADMIN_INVITE_CODE to a strong random string in your environment or .env file before first start.", err)
	}

	// 5. Setup Server
	server := &Server{
		systemDB:       sysDB,
		config:         config,
		logger:         logger,
		sseHub:         NewSSEHub(),
		authIPLimiter:  newRateLimiter(authIPMaxRequests, authIPWindow),
		authLockouts:   newLockoutTracker(loginMaxFailures, loginLockoutDuration),
		trustedProxies: trustedProxies,
		allowedOrigins: defaultOriginAllowlist().withExtra(extraOrigins),
		startedAt:      time.Now(),
	}

	mux := http.NewServeMux()

	// 6. Define Routes
	mux.HandleFunc("GET /health", server.handleHealth)

	// Auth — rate limited by client IP and body-capped (payloads here are tiny).
	mux.HandleFunc("POST /auth/register", server.withAuthRateLimit(withMaxBody(authMaxBodyBytes, server.handleRegister)))
	mux.HandleFunc("POST /auth/login", server.withAuthRateLimit(withMaxBody(authMaxBodyBytes, server.handleLogin)))
	mux.HandleFunc("POST /auth/validate-invite", server.withAuthRateLimit(withMaxBody(authMaxBodyBytes, server.handleValidateInvite)))
	mux.HandleFunc("GET /auth/setup-status", server.handleSetupStatus)

	// Current session — used by clients to validate a stored token on startup.
	mux.HandleFunc("GET /auth/me", server.withUserAuth(server.handleMe))

	// Admin / Invites
	mux.HandleFunc("GET /api/admin/invites", server.withAdminAuth(server.handleListInvites))
	mux.HandleFunc("POST /api/admin/invites", server.withAdminAuth(server.handleGenerateInvite))
	mux.HandleFunc("DELETE /api/admin/invites/{id}", server.withAdminAuth(server.handleDeleteInvite))
	mux.HandleFunc("GET /api/admin/users", server.withAdminAuth(server.handleListUsers))
	mux.HandleFunc("PUT /api/admin/users/{id}", server.withAdminAuth(server.handleUpdateUser))

	// Admin / Settings
	mux.HandleFunc("GET /api/admin/settings", server.withAdminAuth(server.handleListSettings))
	mux.HandleFunc("PUT /api/admin/settings", server.withAdminAuth(server.handleUpdateSetting))
	mux.HandleFunc("GET /api/admin/platform", server.withAdminAuth(server.handlePlatformInfo))
	mux.HandleFunc("GET /api/admin/activity", server.withAdminAuth(server.handleListActivity))
	mux.HandleFunc("GET /api/admin/traffic", server.withAdminAuth(server.handleTraffic))

	// Admin / Backups
	mux.HandleFunc("GET /api/admin/backups", server.withAdminAuth(server.handleListBackups))
	mux.HandleFunc("POST /api/admin/backups", server.withAdminAuth(server.handleCreateBackup))
	mux.HandleFunc("DELETE /api/admin/backups/{id}", server.withAdminAuth(server.handleDeleteBackup))
	mux.HandleFunc("GET /api/admin/backup-schedules", server.withAdminAuth(server.handleListSchedules))
	mux.HandleFunc("POST /api/admin/backup-schedules", server.withAdminAuth(server.handleCreateSchedule))
	mux.HandleFunc("PUT /api/admin/backup-schedules/{id}", server.withAdminAuth(server.handleUpdateSchedule))
	mux.HandleFunc("DELETE /api/admin/backup-schedules/{id}", server.withAdminAuth(server.handleDeleteSchedule))

	// Vault Operations (Protected)
	mux.HandleFunc("GET /vault/items", server.withUserAuth(server.handleListItems))
	mux.HandleFunc("PUT /vault/items", server.withUserAuth(server.handleUpsertItems))
	mux.HandleFunc("DELETE /vault/items/{id}", server.withUserAuth(server.handleDeleteItem))

	// WebSocket Events (challenge-response auth, no token in URL)
	mux.HandleFunc("GET /ws/events", server.handleWebSocket)

	// User Preferences
	// Register both exact and trailing slash to accommodate various clients/proxies
	mux.HandleFunc("/api/preferences", server.handlePreferences)
	mux.HandleFunc("/api/preferences/", server.handlePreferences)

	// Serve Static Files (Vite Build)
	// Serve Static Files (Vite Build - Embedded)
	distFS, err := fs.Sub(content, "dist")
	if err != nil {
		logger.Fatalf("Failed to load embedded assets: %v", err)
	}

	staticFileServer := http.FileServer(http.FS(distFS))

	// Catch-all for SPA: Serve index.html for any route not matched above
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Unmatched API paths must 404 rather than fall through to the SPA shell.
		// Serving index.html with a 200 here hands clients HTML instead of JSON
		// and silently masks a missing or renamed route.
		for _, prefix := range []string{"/api/", "/auth/", "/vault/", "/ws/"} {
			if strings.HasPrefix(r.URL.Path, prefix) {
				http.Error(w, "Not found", http.StatusNotFound)
				return
			}
		}

		// Clean the path to prevent directory traversal
		// Use path.Clean (not filepath.Clean) because fs.FS expects forward slashes
		cleanPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
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
		Addr:         net.JoinHostPort(config.Host, config.Port),
		Handler:      server.securityHeaders(server.corsHandler(http.MaxBytesHandler(mux, maxRequestBodyBytes))),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
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

	// Periodic maintenance: WAL checkpoint plus pruning of stale rate-limit
	// buckets and expired lockouts so those maps stay bounded.
	maintenanceDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				server.checkpointAllDBs()
				server.runDueBackups()
				server.authIPLimiter.sweep()
				server.authLockouts.sweep()
			case <-maintenanceDone:
				return
			}
		}
	}()

	// Wait for interrupt signal
	<-stop
	logger.Println("Shutting down server...")

	// Close SSE hub to unblock all SSE connections
	server.sseHub.shutdown()

	// Stop the maintenance ticker
	close(maintenanceDone)

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