package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

// userRequest builds a request carrying an authenticated user in its context,
// mirroring what withUserBackupAccess/withUserAuth attach.
func userRequest(method, target string, userID int) *http.Request {
	r := httptest.NewRequest(method, target, nil)
	return r.WithContext(context.WithValue(r.Context(), userIDKey, userID))
}

func enableUserBackups(t *testing.T, s *Server) {
	t.Helper()
	if _, err := s.systemDB.Exec("UPDATE server_settings SET value = '1' WHERE key = 'users_can_backup'"); err != nil {
		t.Fatalf("enable user backups: %v", err)
	}
}

func createUserBackup(t *testing.T, s *Server, userID int) BackupRecord {
	t.Helper()
	rr := httptest.NewRecorder()
	s.handleCreateUserBackup(rr, userRequest(http.MethodPost, "/api/backups", userID))
	if rr.Code != http.StatusCreated {
		t.Fatalf("create user backup status = %d, want 201", rr.Code)
	}
	var rec BackupRecord
	if err := json.NewDecoder(rr.Body).Decode(&rec); err != nil {
		t.Fatalf("decode user backup: %v", err)
	}
	return rec
}

func TestCreateUserBackupSnapshotsOwnVaultOnly(t *testing.T) {
	s, id := newBackupTestServer(t)
	enableUserBackups(t, s)

	rec := createUserBackup(t, s, id)
	if rec.Status != "success" {
		t.Fatalf("status = %q, want success (error: %s)", rec.Status, rec.Error)
	}
	if rec.Vaults != 1 {
		t.Fatalf("vaults = %d, want 1", rec.Vaults)
	}

	zr, err := zip.OpenReader(filepath.Join(s.snapshotDir(), rec.Filename))
	if err != nil {
		t.Fatalf("open archive: %v", err)
	}
	defer zr.Close()
	names := map[string]bool{}
	for _, f := range zr.File {
		names[f.Name] = true
	}
	if names["system.db"] {
		t.Fatal("user backup must not contain system.db")
	}
	if !names["alice.db"] {
		t.Fatalf("user backup entries = %v, want alice.db", names)
	}

	// The admin history is server-wide and must not leak the user's snapshot.
	if got := listBackups(t, s, ""); len(got) != 0 {
		t.Fatalf("admin list len = %d, want 0 (user backups are owner-scoped)", len(got))
	}
}

func TestUserBackupListsAreOwnerScoped(t *testing.T) {
	s, aliceID := newBackupTestServer(t)
	enableUserBackups(t, s)

	if err := os.WriteFile(filepath.Join(s.config.DataDir, "bob.db"), []byte("sqlite-ish bytes"), 0o644); err != nil {
		t.Fatalf("seed bob.db: %v", err)
	}
	res, err := s.systemDB.Exec(`
		INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name, status, role, salt, token_version)
		VALUES ('bob', 'x', 0, 'bob.db', 'Bob', 'ACTIVE', 'User', '', 0)
	`)
	if err != nil {
		t.Fatalf("insert bob: %v", err)
	}
	bobID64, _ := res.LastInsertId()
	bobID := int(bobID64)

	createUserBackup(t, s, aliceID)
	createUserBackup(t, s, bobID)

	listFor := func(userID int) []BackupRecord {
		rr := httptest.NewRecorder()
		s.handleListUserBackups(rr, userRequest(http.MethodGet, "/api/backups", userID))
		if rr.Code != http.StatusOK {
			t.Fatalf("list status = %d, want 200", rr.Code)
		}
		var recs []BackupRecord
		if err := json.NewDecoder(rr.Body).Decode(&recs); err != nil {
			t.Fatalf("decode list: %v", err)
		}
		return recs
	}

	aliceOwn := "u" + strconv.Itoa(aliceID) + "-"
	bobOwn := "u" + strconv.Itoa(bobID) + "-"
	if got := listFor(aliceID); len(got) != 1 || !strings.Contains(got[0].Filename, aliceOwn) {
		t.Fatalf("alice list = %+v, want only her snapshot", got)
	}
	if got := listFor(bobID); len(got) != 1 || !strings.Contains(got[0].Filename, bobOwn) {
		t.Fatalf("bob list = %+v, want only his snapshot", got)
	}
}

func TestDeleteUserBackupWrongOwnerIs404(t *testing.T) {
	s, aliceID := newBackupTestServer(t)
	enableUserBackups(t, s)

	rec := createUserBackup(t, s, aliceID)
	idStr := strconv.FormatInt(rec.ID, 10)

	// A different owner cannot delete it.
	rr := httptest.NewRecorder()
	r := userRequest(http.MethodDelete, "/api/backups/"+idStr, aliceID+1)
	r.SetPathValue("id", idStr)
	s.handleDeleteUserBackup(rr, r)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("cross-owner delete status = %d, want 404", rr.Code)
	}

	// The owner can.
	rr = httptest.NewRecorder()
	r = userRequest(http.MethodDelete, "/api/backups/"+idStr, aliceID)
	r.SetPathValue("id", idStr)
	s.handleDeleteUserBackup(rr, r)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("owner delete status = %d, want 204", rr.Code)
	}
}

func TestUserBackupRoutesRequireSetting(t *testing.T) {
	s, id := newBackupTestServer(t)

	token, err := createToken(id, 0)
	if err != nil {
		t.Fatalf("createToken: %v", err)
	}
	handler := s.withUserBackupAccess(s.handleListUserBackups)

	// Disabled by default (users_can_backup = '0').
	rr := httptest.NewRecorder()
	handler(rr, authRequest(token))
	if rr.Code != http.StatusForbidden {
		t.Fatalf("disabled status = %d, want 403", rr.Code)
	}

	enableUserBackups(t, s)

	rr = httptest.NewRecorder()
	handler(rr, authRequest(token))
	if rr.Code != http.StatusOK {
		t.Fatalf("enabled status = %d, want 200", rr.Code)
	}
}

func TestHandleMeReportsCanBackup(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)

	meOnce := func() MeResponse {
		r := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		r = r.WithContext(context.WithValue(r.Context(), userIDKey, id))
		rr := httptest.NewRecorder()
		s.handleMe(rr, r)
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rr.Code)
		}
		var got MeResponse
		if err := json.NewDecoder(rr.Body).Decode(&got); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return got
	}

	if meOnce().CanBackup {
		t.Fatal("can_backup should be false while the setting is off")
	}

	enableUserBackups(t, s)
	if !meOnce().CanBackup {
		t.Fatal("can_backup should be true once the setting is on")
	}
}
