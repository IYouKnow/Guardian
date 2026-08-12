package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

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

	// 2. Generate random salt for key derivation
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		http.Error(w, "Failed to generate salt", http.StatusInternalServerError)
		return
	}
	saltB64 := base64.StdEncoding.EncodeToString(salt)

	// 3. Hash Password
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
		INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name, status, role, salt) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, req.Username, string(hashed), isAdmin, dbFilename, friendlyName, "ACTIVE", role, saltB64)

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
	var salt string
	err := s.systemDB.QueryRow("SELECT id, password_hash, is_admin, salt FROM users WHERE username = ?", req.Username).Scan(&id, &passwordHash, &isAdmin, &salt)
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

	// Retroactively generate salt for existing users who don't have one
	if salt == "" {
		rawSalt := make([]byte, 16)
		if _, err := rand.Read(rawSalt); err != nil {
			http.Error(w, "Failed to generate salt", http.StatusInternalServerError)
			return
		}
		salt = base64.StdEncoding.EncodeToString(rawSalt)
		s.systemDB.Exec("UPDATE users SET salt = ? WHERE id = ?", salt, id)
	}

	token, err := createToken(id)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Update last login
	s.systemDB.Exec("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", id)

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, Username: req.Username, IsAdmin: isAdmin, Salt: salt})
}