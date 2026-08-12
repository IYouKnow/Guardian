package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

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
	s.logger.Println("handleListInvites: starting")
	ctx := r.Context()

	// Mark past-due invites expired in one statement *before* opening a Rows cursor.
	// With MaxOpenConns(1), running Exec inside rows.Next() deadlocks: the active Rows
	// holds the only connection until Close, so another Exec blocks indefinitely (or errors).
	if _, err := s.systemDB.ExecContext(ctx, `
		UPDATE invites SET status = 'EXPIRED'
		WHERE status = 'ACTIVE' AND expires_at IS NOT NULL
		  AND datetime(expires_at) < datetime('now')
	`); err != nil {
		s.logger.Println("handleListInvites: expire update error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rows, err := s.systemDB.QueryContext(ctx, `
		SELECT id, token, created_at, expires_at, expires_in, used_at, use_count, max_uses, created_by, note, status, used_by 
		FROM invites ORDER BY created_at DESC
	`)
	if err != nil {
		s.logger.Println("handleListInvites: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	s.logger.Println("handleListInvites: query succeeded, reading rows")
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

		if usedByStr.Valid {
			inv.UsedBy = usedByStr.String
		}

		invites = append(invites, inv)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	s.logger.Println("handleListInvites: done, sending response")
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
	s.logger.Println("handleListUsers: starting")
	rows, err := s.systemDB.Query(`
		SELECT id, username, is_admin, friendly_name, status, role, db_path, created_at, last_login, max_ws_per_ip
		FROM users ORDER BY created_at DESC
	`)
	if err != nil {
		s.logger.Println("handleListUsers: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []AdminUserResponse{}
	for rows.Next() {
		var u User
		err := rows.Scan(
			&u.ID, &u.Username, &u.IsAdmin, &u.FriendlyName,
			&u.Status, &u.Role, &u.DBPath, &u.CreatedAt, &u.LastLogin, &u.MaxWsPerIP,
		)
		if err != nil {
			s.logger.Println("User scan error:", err)
			continue
		}

		s.logger.Printf("handleListUsers: processing user %d (%s)", u.ID, u.Username)

		// Calculate used space (doesn't require opening DB)
		var dbSize, overheadSize int64
		userDBPath := filepath.Join(s.config.DataDir, u.DBPath)
		s.logger.Printf("handleListUsers: checking file size at %s", userDBPath)
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
			MaxWsPerIP:        u.MaxWsPerIP,
			VaultItems:        0,
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

	s.logger.Printf("handleListUsers: processed %d users, sending response", len(users))
	writeJSON(w, http.StatusOK, users)
}

// handleListSettings returns all key-value pairs from the server_settings table
func (s *Server) handleListSettings(w http.ResponseWriter, r *http.Request) {
	rows, err := s.systemDB.Query("SELECT key, value FROM server_settings ORDER BY key")
	if err != nil {
		s.logger.Println("handleListSettings: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		settings[k] = v
	}

	writeJSON(w, http.StatusOK, settings)
}

// handleUpdateSetting creates or updates a single key-value pair in server_settings
type updateSettingRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (s *Server) handleUpdateSetting(w http.ResponseWriter, r *http.Request) {
	var req updateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Key == "" {
		http.Error(w, "Key is required", http.StatusBadRequest)
		return
	}

	_, err := s.systemDB.Exec(`
		INSERT INTO server_settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, req.Key, req.Value)
	if err != nil {
		s.logger.Println("handleUpdateSetting: exec error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Setting updated"})
}

// handleUpdateUser updates fields on a user by ID
type updateUserRequest struct {
	MaxWsPerIP *int    `json:"max_ws_per_ip"`
	Status     *string `json:"status"`
	Role       *string `json:"role"`
}

func (s *Server) handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.MaxWsPerIP != nil {
		_, err := s.systemDB.Exec("UPDATE users SET max_ws_per_ip = ? WHERE id = ?", *req.MaxWsPerIP, id)
		if err != nil {
			s.logger.Println("handleUpdateUser: max_ws_per_ip error:", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	if req.Status != nil {
		validStatuses := map[string]bool{"ACTIVE": true, "DISABLED": true, "SUSPENDED": true}
		if !validStatuses[*req.Status] {
			http.Error(w, "Invalid status. Must be ACTIVE, DISABLED, or SUSPENDED", http.StatusBadRequest)
			return
		}
		_, err := s.systemDB.Exec("UPDATE users SET status = ? WHERE id = ?", *req.Status, id)
		if err != nil {
			s.logger.Println("handleUpdateUser: status error:", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	if req.Role != nil {
		validRoles := map[string]bool{"User": true, "Admin": true}
		if !validRoles[*req.Role] {
			http.Error(w, "Invalid role. Must be User or Admin", http.StatusBadRequest)
			return
		}
		_, err := s.systemDB.Exec("UPDATE users SET role = ?, is_admin = ? WHERE id = ?", *req.Role, *req.Role == "Admin", id)
		if err != nil {
			s.logger.Println("handleUpdateUser: role error:", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "User updated"})
}