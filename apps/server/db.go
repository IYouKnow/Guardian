package main

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"

	// Register the pure-Go SQLite driver ("sqlite") with database/sql.
	_ "modernc.org/sqlite"
)

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
	db.Exec("ALTER TABLE users ADD COLUMN salt TEXT DEFAULT ''")
	db.Exec("ALTER TABLE users ADD COLUMN max_ws_per_ip INTEGER DEFAULT 0")

	db.Exec(`
		CREATE TABLE IF NOT EXISTS server_settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`)
	db.Exec("INSERT OR IGNORE INTO server_settings (key, value) VALUES ('max_ws_per_ip_default', '0')")

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