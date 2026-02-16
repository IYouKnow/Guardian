package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

// --- User Preferences ---

func (s *Server) handleGetPreferences(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	var prefs string
	err := s.systemDB.QueryRow("SELECT preferences FROM users WHERE id = ?", userID).Scan(&prefs)
	if err == sql.ErrNoRows {
		// New user might have null? Default is '{}' but let's be safe
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("{}"))
		return
	} else if err != nil {
		s.logger.Println("Get prefs error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if prefs == "" {
		prefs = "{}"
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(prefs))
}

func (s *Server) handleUpdatePreferences(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	// Validate JSON
	var rawPrefs json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&rawPrefs); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Convert back to string for storage
	prefsBytes, _ := json.Marshal(rawPrefs)
	prefsStr := string(prefsBytes)

	_, err := s.systemDB.Exec("UPDATE users SET preferences = ? WHERE id = ?", prefsStr, userID)
	if err != nil {
		s.logger.Println("Update prefs error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(prefsBytes)
}
