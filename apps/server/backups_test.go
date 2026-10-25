package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// newBackupTestServer returns a test server with a real data dir on disk holding
// a dummy system.db and the seeded user's vault DB, so createBackup has files to
// archive.
func newBackupTestServer(t *testing.T) (*Server, int) {
	t.Helper()
	s, id := newTestServer(t, "ACTIVE", 0)
	s.config.DataDir = t.TempDir()

	// The create handlers refuse to run while the feature is off.
	if _, err := s.systemDB.Exec(
		"INSERT INTO server_settings (key, value) VALUES ('backups_enabled','1') ON CONFLICT(key) DO UPDATE SET value = '1'",
	); err != nil {
		t.Fatalf("enable backups: %v", err)
	}

	for _, name := range []string{"system.db", "alice.db"} {
		if err := os.WriteFile(filepath.Join(s.config.DataDir, name), []byte("sqlite-ish bytes"), 0o644); err != nil {
			t.Fatalf("seed %s: %v", name, err)
		}
	}
	return s, id
}

func createBackupViaHandler(t *testing.T, s *Server) BackupRecord {
	t.Helper()
	rr := httptest.NewRecorder()
	s.handleCreateBackup(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backups", nil))
	if rr.Code != http.StatusCreated {
		t.Fatalf("create status = %d, want 201", rr.Code)
	}
	var rec BackupRecord
	if err := json.NewDecoder(rr.Body).Decode(&rec); err != nil {
		t.Fatalf("decode create: %v", err)
	}
	return rec
}

// createUserBackupViaHandler snapshots the given user's own vault, as the
// personal backups page does.
func createUserBackupViaHandler(t *testing.T, s *Server, userID int) BackupRecord {
	t.Helper()
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/backups", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, userID))
	s.handleCreateUserBackup(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create user backup status = %d, want 201", rr.Code)
	}
	var rec BackupRecord
	if err := json.NewDecoder(rr.Body).Decode(&rec); err != nil {
		t.Fatalf("decode user create: %v", err)
	}
	return rec
}

func TestCreateBackupRefusedWhileDisabled(t *testing.T) {
	s, _ := newBackupTestServer(t)
	if _, err := s.systemDB.Exec("UPDATE server_settings SET value = '0' WHERE key = 'backups_enabled'"); err != nil {
		t.Fatalf("disable backups: %v", err)
	}

	rr := httptest.NewRecorder()
	s.handleCreateBackup(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backups", nil))
	if rr.Code != http.StatusConflict {
		t.Fatalf("admin create while disabled = %d, want 409", rr.Code)
	}

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/backups", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, 1))
	s.handleCreateUserBackup(rr, req)
	if rr.Code != http.StatusConflict {
		t.Fatalf("user create while disabled = %d, want 409", rr.Code)
	}
}

func listBackups(t *testing.T, s *Server, query string) []BackupRecord {
	t.Helper()
	rr := httptest.NewRecorder()
	s.handleListBackups(rr, httptest.NewRequest(http.MethodGet, "/api/admin/backups"+query, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("list status = %d, want 200", rr.Code)
	}
	var recs []BackupRecord
	if err := json.NewDecoder(rr.Body).Decode(&recs); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	return recs
}

func TestCreateBackupWritesArchiveAndRow(t *testing.T) {
	s, _ := newBackupTestServer(t)

	rec := createBackupViaHandler(t, s)
	if rec.Status != "success" {
		t.Fatalf("status = %q, want success (error: %s)", rec.Status, rec.Error)
	}
	if rec.Filename == "" || rec.Size <= 0 {
		t.Fatalf("expected a non-empty archive, got filename=%q size=%d", rec.Filename, rec.Size)
	}
	if rec.Vaults != 1 {
		t.Fatalf("vaults = %d, want 1", rec.Vaults)
	}
	if rec.Trigger != "manual" {
		t.Fatalf("trigger = %q, want manual", rec.Trigger)
	}

	// The archive must exist and contain both DB files.
	zr, err := zip.OpenReader(filepath.Join(s.snapshotDir(), rec.Filename))
	if err != nil {
		t.Fatalf("open archive: %v", err)
	}
	defer zr.Close()
	names := map[string]bool{}
	for _, f := range zr.File {
		names[f.Name] = true
	}
	if !names["system.db"] || !names["alice.db"] {
		t.Fatalf("archive entries = %v, want system.db and alice.db", names)
	}
}

func TestListBackupsNewestFirstAndBounded(t *testing.T) {
	s, _ := newBackupTestServer(t)

	var lastID int64
	for i := 0; i < 5; i++ {
		lastID = createBackupViaHandler(t, s).ID
	}

	all := listBackups(t, s, "")
	if len(all) != 5 {
		t.Fatalf("list len = %d, want 5", len(all))
	}
	if all[0].ID != lastID {
		t.Fatalf("first id = %d, want newest %d", all[0].ID, lastID)
	}
	for i := 1; i < len(all); i++ {
		if all[i-1].ID <= all[i].ID {
			t.Fatalf("records not newest-first: %d then %d", all[i-1].ID, all[i].ID)
		}
	}

	if got := listBackups(t, s, "?limit=2"); len(got) != 2 {
		t.Fatalf("limit=2 returned %d, want 2", len(got))
	}
	if got := listBackups(t, s, "?limit=9999"); len(got) != 5 {
		t.Fatalf("limit=9999 returned %d, want all 5", len(got))
	}
}

func TestDeleteBackupRemovesRowAndFile(t *testing.T) {
	s, _ := newBackupTestServer(t)
	rec := createBackupViaHandler(t, s)

	archive := filepath.Join(s.snapshotDir(), rec.Filename)
	if _, err := os.Stat(archive); err != nil {
		t.Fatalf("archive missing before delete: %v", err)
	}

	r := httptest.NewRequest(http.MethodDelete, "/api/admin/backups/"+strconv.FormatInt(rec.ID, 10), nil)
	r.SetPathValue("id", strconv.FormatInt(rec.ID, 10))
	rr := httptest.NewRecorder()
	s.handleDeleteBackup(rr, r)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, want 204", rr.Code)
	}

	if _, err := os.Stat(archive); !os.IsNotExist(err) {
		t.Fatalf("archive should be gone, stat err = %v", err)
	}
	if got := listBackups(t, s, ""); len(got) != 0 {
		t.Fatalf("list len = %d, want 0 after delete", len(got))
	}
}

func TestDeleteBackupUnknownIs404(t *testing.T) {
	s, _ := newBackupTestServer(t)

	r := httptest.NewRequest(http.MethodDelete, "/api/admin/backups/999", nil)
	r.SetPathValue("id", "999")
	rr := httptest.NewRecorder()
	s.handleDeleteBackup(rr, r)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestDownloadBackupServesArchive(t *testing.T) {
	s, _ := newBackupTestServer(t)
	rec := createBackupViaHandler(t, s)

	r := httptest.NewRequest(http.MethodGet, "/api/admin/backups/1/download", nil)
	r.SetPathValue("id", strconv.FormatInt(rec.ID, 10))
	rr := httptest.NewRecorder()
	s.handleDownloadBackup(rr, r)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/zip" {
		t.Fatalf("content-type = %q, want application/zip", ct)
	}
	wantCD := `attachment; filename="` + rec.Filename + `"`
	if cd := rr.Header().Get("Content-Disposition"); cd != wantCD {
		t.Fatalf("content-disposition = %q, want %q", cd, wantCD)
	}

	onDisk, err := os.ReadFile(filepath.Join(s.snapshotDir(), rec.Filename))
	if err != nil {
		t.Fatalf("read archive: %v", err)
	}
	if !bytes.Equal(rr.Body.Bytes(), onDisk) {
		t.Fatalf("body (%d bytes) does not match archive (%d bytes)", rr.Body.Len(), len(onDisk))
	}
}

func TestDownloadBackupUnknownIs404(t *testing.T) {
	s, _ := newBackupTestServer(t)

	r := httptest.NewRequest(http.MethodGet, "/api/admin/backups/999/download", nil)
	r.SetPathValue("id", "999")
	rr := httptest.NewRecorder()
	s.handleDownloadBackup(rr, r)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestDownloadBackupMissingFileIs404(t *testing.T) {
	s, _ := newBackupTestServer(t)
	rec := createBackupViaHandler(t, s)

	if err := os.Remove(filepath.Join(s.snapshotDir(), rec.Filename)); err != nil {
		t.Fatalf("remove archive: %v", err)
	}

	r := httptest.NewRequest(http.MethodGet, "/api/admin/backups/1/download", nil)
	r.SetPathValue("id", strconv.FormatInt(rec.ID, 10))
	rr := httptest.NewRecorder()
	s.handleDownloadBackup(rr, r)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

// A failed run records no archive, so the row exists but there is nothing to send.
func TestDownloadFailedBackupIsConflict(t *testing.T) {
	s, _ := newBackupTestServer(t)

	res, err := s.systemDB.Exec(
		`INSERT INTO backups (filename, size, vaults, status, trigger, duration_ms, error) VALUES ('', 0, 0, 'failed', 'manual', 0, 'boom')`)
	if err != nil {
		t.Fatalf("insert failed backup: %v", err)
	}
	id, _ := res.LastInsertId()

	r := httptest.NewRequest(http.MethodGet, "/api/admin/backups/1/download", nil)
	r.SetPathValue("id", strconv.FormatInt(id, 10))
	rr := httptest.NewRecorder()
	s.handleDownloadBackup(rr, r)
	if rr.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rr.Code)
	}
}

func TestDownloadUserBackupEnforcesOwnership(t *testing.T) {
	s, userID := newBackupTestServer(t)

	rec, err := s.createBackup("manual", nil, &userID)
	if err != nil {
		t.Fatalf("create user backup: %v", err)
	}

	download := func(asUser int) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodGet, "/api/backups/1/download", nil)
		r = r.WithContext(context.WithValue(r.Context(), userIDKey, asUser))
		r.SetPathValue("id", strconv.FormatInt(rec.ID, 10))
		rr := httptest.NewRecorder()
		s.handleDownloadUserBackup(rr, r)
		return rr
	}

	if rr := download(userID); rr.Code != http.StatusOK {
		t.Fatalf("own download status = %d, want 200", rr.Code)
	}
	if rr := download(userID + 999); rr.Code != http.StatusNotFound {
		t.Fatalf("foreign download status = %d, want 404", rr.Code)
	}
}

func TestRunDueBackupsFiresEnabledDueOnly(t *testing.T) {
	s, _ := newBackupTestServer(t)

	past := time.Now().UTC().Add(-time.Hour).Format(dbTimeFormat)
	future := time.Now().UTC().Add(time.Hour).Format(dbTimeFormat)

	// due + enabled
	res, err := s.systemDB.Exec(
		`INSERT INTO backup_schedules (name, interval_minutes, enabled, next_run) VALUES ('due', 60, 1, ?)`, past)
	if err != nil {
		t.Fatalf("insert due schedule: %v", err)
	}
	dueID, _ := res.LastInsertId()

	// enabled but not yet due
	if _, err := s.systemDB.Exec(
		`INSERT INTO backup_schedules (name, interval_minutes, enabled, next_run) VALUES ('later', 60, 1, ?)`, future); err != nil {
		t.Fatalf("insert future schedule: %v", err)
	}

	// due but disabled
	if _, err := s.systemDB.Exec(
		`INSERT INTO backup_schedules (name, interval_minutes, enabled, next_run) VALUES ('paused', 60, 0, ?)`, past); err != nil {
		t.Fatalf("insert paused schedule: %v", err)
	}

	s.runDueBackups()

	recs := listBackups(t, s, "")
	if len(recs) != 1 {
		t.Fatalf("backups created = %d, want 1", len(recs))
	}
	if recs[0].Trigger != "schedule" {
		t.Fatalf("trigger = %q, want schedule", recs[0].Trigger)
	}
	if recs[0].ScheduleID == nil || int64(*recs[0].ScheduleID) != dueID {
		t.Fatalf("schedule_id = %v, want %d", recs[0].ScheduleID, dueID)
	}

	// next_run must have advanced past now.
	var nextRun time.Time
	if err := s.systemDB.QueryRow("SELECT next_run FROM backup_schedules WHERE id = ?", dueID).Scan(&nextRun); err != nil {
		t.Fatalf("read next_run: %v", err)
	}
	if !nextRun.After(time.Now().UTC().Add(-time.Minute)) {
		t.Fatalf("next_run = %v, want in the future", nextRun)
	}
}

func TestScheduleCRUD(t *testing.T) {
	s, _ := newBackupTestServer(t)

	body := `{"name":"Nightly","interval_minutes":1440,"retention_days":30}`
	rr := httptest.NewRecorder()
	s.handleCreateSchedule(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backup-schedules", stringReader(body)))
	if rr.Code != http.StatusCreated {
		t.Fatalf("create schedule status = %d, want 201", rr.Code)
	}
	var sc BackupSchedule
	if err := json.NewDecoder(rr.Body).Decode(&sc); err != nil {
		t.Fatalf("decode schedule: %v", err)
	}
	if sc.Name != "Nightly" || !sc.Enabled || sc.IntervalMinutes != 1440 {
		t.Fatalf("unexpected schedule %+v", sc)
	}
	if sc.NextRun == nil {
		t.Fatal("next_run should be set on create")
	}

	// Disable it.
	idStr := strconv.FormatInt(sc.ID, 10)
	rr = httptest.NewRecorder()
	put := httptest.NewRequest(http.MethodPut, "/api/admin/backup-schedules/"+idStr, stringReader(`{"enabled":false}`))
	put.SetPathValue("id", idStr)
	s.handleUpdateSchedule(rr, put)
	if rr.Code != http.StatusOK {
		t.Fatalf("update schedule status = %d, want 200", rr.Code)
	}
	var updated BackupSchedule
	json.NewDecoder(rr.Body).Decode(&updated)
	if updated.Enabled {
		t.Fatal("schedule should be disabled")
	}

	// Delete it.
	rr = httptest.NewRecorder()
	del := httptest.NewRequest(http.MethodDelete, "/api/admin/backup-schedules/"+idStr, nil)
	del.SetPathValue("id", idStr)
	s.handleDeleteSchedule(rr, del)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete schedule status = %d, want 204", rr.Code)
	}

	list := listSchedules(t, s)
	if len(list) != 0 {
		t.Fatalf("schedules = %d, want 0 after delete", len(list))
	}
}

func TestCreateScheduleRequiresName(t *testing.T) {
	s, _ := newBackupTestServer(t)

	rr := httptest.NewRecorder()
	s.handleCreateSchedule(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backup-schedules", stringReader(`{"interval_minutes":60}`)))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for a missing name", rr.Code)
	}
}

func listSchedules(t *testing.T, s *Server) []BackupSchedule {
	t.Helper()
	rr := httptest.NewRecorder()
	s.handleListSchedules(rr, httptest.NewRequest(http.MethodGet, "/api/admin/backup-schedules", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("list schedules status = %d, want 200", rr.Code)
	}
	var schedules []BackupSchedule
	if err := json.NewDecoder(rr.Body).Decode(&schedules); err != nil {
		t.Fatalf("decode schedules: %v", err)
	}
	return schedules
}

func stringReader(s string) *strings.Reader { return strings.NewReader(s) }
