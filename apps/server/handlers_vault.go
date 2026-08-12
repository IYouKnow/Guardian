package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

// --- Vault Handlers ---

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

// handleUpsertItems adds or updates one or more vault items for the user
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
		// Allow clients to delete items via the same PUT endpoint (useful when DELETE is blocked).
		// Convention: revision <= 0 OR empty encrypted_blob indicates a tombstone delete.
		if item.Revision <= 0 || strings.TrimSpace(item.EncryptedBlob) == "" {
			if _, err := tx.Exec("DELETE FROM vault_items WHERE id = ?", item.ID); err != nil {
				tx.Rollback()
				http.Error(w, "Delete failed: "+err.Error(), http.StatusInternalServerError)
				return
			}
			continue
		}

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

	// Retrieve user ID from context safely (to use for broadcasting event)
	userID, ok := r.Context().Value(userIDKey).(int)
	if ok {
		s.sseHub.BroadcastToUser(userID, "vault_updated")
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Items synced"})
}

// handleDeleteItem removes a single vault item by id for the authenticated user
func (s *Server) handleDeleteItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "Missing item id", http.StatusBadRequest)
		return
	}

	db, err := s.getUserDB(r.Context())
	if err != nil {
		http.Error(w, "Storage access failed", http.StatusInternalServerError)
		return
	}

	res, err := db.Exec("DELETE FROM vault_items WHERE id = ?", id)
	if err != nil {
		http.Error(w, "Delete failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		// Idempotent: still return success so clients can delete without
		// worrying about whether the server already purged the entry.
		writeJSON(w, http.StatusOK, map[string]string{"message": "Item not found (already deleted)"})
		return
	}

	// Broadcast vault change to other sessions
	if userID, ok := r.Context().Value(userIDKey).(int); ok {
		s.sseHub.BroadcastToUser(userID, "vault_updated")
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Item deleted"})
}