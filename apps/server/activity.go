package main

import (
	"net/http"
	"strconv"
	"time"
)

const (
	activityDefaultLimit = 20
	activityMaxLimit     = 100
)

// ActivityEntry is one row of the admin console's activity log.
type ActivityEntry struct {
	ID        int       `json:"id"`
	Actor     string    `json:"actor"`
	Action    string    `json:"action"`
	Target    string    `json:"target"`
	Category  string    `json:"category"`
	CreatedAt time.Time `json:"created_at"`
}

// recordActivity appends an audit entry to the system database. Audit logging is
// best-effort: a failure is logged but never fails the request that triggered it.
func (s *Server) recordActivity(actor, action, target, category string) {
	if _, err := s.systemDB.Exec(
		`INSERT INTO activity_log (actor, action, target, category) VALUES (?, ?, ?, ?)`,
		actor, action, target, category,
	); err != nil {
		s.logger.Println("recordActivity:", err)
	}
}

// usernameByID resolves a user id to a username for audit entries. It returns an
// empty string if the account no longer exists.
func (s *Server) usernameByID(id int) string {
	var username string
	if err := s.systemDB.QueryRow("SELECT username FROM users WHERE id = ?", id).Scan(&username); err != nil {
		return ""
	}
	return username
}

// actorName resolves the authenticated user's username from the request context.
// It returns an empty string when no user id is present (e.g. a handler invoked
// directly without the auth middleware), so audit logging never panics.
func (s *Server) actorName(r *http.Request) string {
	id, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		return ""
	}
	return s.usernameByID(id)
}

// handleListActivity returns the most recent audit entries, newest first.
func (s *Server) handleListActivity(w http.ResponseWriter, r *http.Request) {
	limit := activityDefaultLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = min(n, activityMaxLimit)
		}
	}

	rows, err := s.systemDB.Query(`
		SELECT id, actor, action, target, category, created_at
		FROM activity_log ORDER BY id DESC LIMIT ?
	`, limit)
	if err != nil {
		s.logger.Println("handleListActivity: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	entries := []ActivityEntry{}
	for rows.Next() {
		var e ActivityEntry
		if err := rows.Scan(&e.ID, &e.Actor, &e.Action, &e.Target, &e.Category, &e.CreatedAt); err != nil {
			s.logger.Println("handleListActivity: scan error:", err)
			continue
		}
		entries = append(entries, e)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, entries)
}
