package main

import (
	"archive/zip"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// Backups are snapshots of SQLite databases written as a .zip on the same host
// that runs the Guardian server (data/backups/). An admin backup captures the
// whole server (system DB plus every per-user vault DB); a user backup captures
// just that user's vault. Admin backups may be mirrored to the remote
// destination; user backups are never uploaded.

const (
	backupDefaultLimit  = 50
	backupMaxLimit      = 200
	backupTimeFormat    = "20060102-150405"
	backupIntervalMin   = 1
	backupIntervalMax   = 525600 // one year in minutes
	backupRetentionMin  = 1
	backupRetentionMax  = 3650
	backupDefaultRetain = 30
	backupDefaultEvery  = 1440 // daily
	// SQLite's own datetime layout, so comparisons via datetime() and scans into
	// time.Time behave the same as the activity_log / created_at columns.
	dbTimeFormat = "2006-01-02 15:04:05"
)

// BackupRecord is one row of the backup history.
type BackupRecord struct {
	ID           int64     `json:"id"`
	Filename     string    `json:"filename"`
	Size         int64     `json:"size"`
	Vaults       int       `json:"vaults"`
	Status       string    `json:"status"`
	Trigger      string    `json:"trigger"`
	ScheduleID   *int      `json:"schedule_id"`
	DurationMs   int64     `json:"duration_ms"`
	Error        string    `json:"error"`
	RemoteStatus string    `json:"remote_status"`
	RemoteError  string    `json:"remote_error"`
	Owner        string    `json:"owner"` // owning username; empty for server-wide snapshots
	CreatedAt    time.Time `json:"created_at"`
}

// BackupSchedule is a recurring snapshot definition.
type BackupSchedule struct {
	ID              int64      `json:"id"`
	Name            string     `json:"name"`
	IntervalMinutes int        `json:"interval_minutes"`
	RetentionDays   int        `json:"retention_days"`
	Enabled         bool       `json:"enabled"`
	LastRun         *time.Time `json:"last_run"`
	NextRun         *time.Time `json:"next_run"`
	CreatedAt       time.Time  `json:"created_at"`
}

// snapshotDir is the local directory snapshots are written to, next to the data dir.
func (s *Server) snapshotDir() string {
	return filepath.Join(s.config.DataDir, "backups")
}

// checkpointFile folds a SQLite file's WAL back into the main DB so a plain file
// copy is consistent. Best-effort: a missing or non-SQLite file is skipped, and
// the file is never created as a side effect.
func checkpointFile(path string) {
	if _, err := os.Stat(path); err != nil {
		return
	}
	db, err := sql.Open("sqlite", sqliteDSN(path))
	if err != nil {
		return
	}
	defer db.Close()
	db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
}

// addToZip streams one file into the archive under its base name.
func addToZip(zw *zip.Writer, src string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	info, err := in.Stat()
	if err != nil {
		return err
	}
	hdr, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}
	hdr.Name = filepath.Base(src)
	hdr.Method = zip.Deflate

	w, err := zw.CreateHeader(hdr)
	if err != nil {
		return err
	}
	_, err = io.Copy(w, in)
	return err
}

// createBackup snapshots the selected DB files into one zip and records the run.
// With ownerID nil it captures the whole server (system.db plus every user
// vault) and may mirror the archive to the remote destination. With ownerID set
// it captures only that user's vault and never uploads remotely, so a regular
// user can never read another account's data. A failure is still recorded with
// status 'failed' so it shows in history.
func (s *Server) createBackup(trigger string, scheduleID *int, ownerID *int) (BackupRecord, error) {
	start := time.Now()

	if err := os.MkdirAll(s.snapshotDir(), 0o755); err != nil {
		return BackupRecord{}, err
	}

	var sources []string
	if ownerID != nil {
		// Per-user snapshot: only this user's vault database.
		var dbPath string
		if err := s.systemDB.QueryRow("SELECT db_path FROM users WHERE id = ?", *ownerID).Scan(&dbPath); err != nil {
			return BackupRecord{}, err
		}
		if dbPath == "" {
			return BackupRecord{}, fmt.Errorf("user %d has no vault database", *ownerID)
		}
		sources = []string{filepath.Join(s.config.DataDir, dbPath)}
	} else {
		// Server-wide snapshot: system.db first, then one file per user vault.
		sources = append(sources, filepath.Join(s.config.DataDir, "system.db"))
		rows, err := s.systemDB.Query("SELECT db_path FROM users")
		if err != nil {
			return BackupRecord{}, err
		}
		for rows.Next() {
			var p string
			if err := rows.Scan(&p); err != nil {
				continue
			}
			if p != "" {
				sources = append(sources, filepath.Join(s.config.DataDir, p))
			}
		}
		rows.Close()
	}

	files := make([]string, 0, len(sources))
	vaults := 0
	for i, src := range sources {
		if _, err := os.Stat(src); err != nil {
			continue
		}
		checkpointFile(src)
		files = append(files, src)
		if ownerID != nil {
			vaults = len(files)
		} else if i > 0 {
			vaults++
		}
	}

	// The owner is part of the name so two users snapshotting in the same second
	// don't collide on one archive file.
	prefix := "backup-"
	if ownerID != nil {
		prefix = "backup-u" + strconv.Itoa(*ownerID) + "-"
	}
	filename := prefix + time.Now().UTC().Format(backupTimeFormat) + ".zip"
	dest := filepath.Join(s.snapshotDir(), filename)

	var size int64
	zipErr := func() error {
		f, err := os.Create(dest)
		if err != nil {
			return err
		}
		zw := zip.NewWriter(f)
		for _, src := range files {
			if err := addToZip(zw, src); err != nil {
				zw.Close()
				f.Close()
				return err
			}
		}
		if err := zw.Close(); err != nil {
			f.Close()
			return err
		}
		info, err := f.Stat()
		f.Close()
		if err != nil {
			return err
		}
		size = info.Size()
		return nil
	}()

	rec := BackupRecord{
		Filename:   filename,
		Size:       size,
		Vaults:     vaults,
		Status:     "success",
		Trigger:    trigger,
		ScheduleID: scheduleID,
		DurationMs: time.Since(start).Milliseconds(),
	}
	if zipErr != nil {
		os.Remove(dest) // drop the partial archive
		rec.Filename = ""
		rec.Size = 0
		rec.Status = "failed"
		rec.Error = zipErr.Error()
		s.logger.Println("createBackup:", zipErr)
	}

	// Decide the remote upload before inserting so the row carries its initial
	// status: an enabled Drive destination makes it 'pending' until the
	// background upload finishes. Per-user snapshots stay local.
	uploadRemote := false
	if zipErr == nil && ownerID == nil {
		var status, errMsg string
		uploadRemote, status, errMsg = s.remotePlan()
		rec.RemoteStatus = status
		rec.RemoteError = errMsg
	}

	var ownerArg any
	if ownerID != nil {
		ownerArg = *ownerID
	}

	res, err := s.systemDB.Exec(`
		INSERT INTO backups (filename, size, vaults, status, trigger, schedule_id, duration_ms, error, remote_status, remote_error, owner_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, rec.Filename, rec.Size, rec.Vaults, rec.Status, rec.Trigger, scheduleID, rec.DurationMs, rec.Error, rec.RemoteStatus, rec.RemoteError, ownerArg)
	if err != nil {
		return rec, err
	}
	id, _ := res.LastInsertId()
	rec.ID = id

	// Upload off the request path: the HTTP WriteTimeout is 30s and a Drive
	// upload of a full snapshot can exceed it.
	if uploadRemote {
		go s.uploadBackup(id, dest, rec.Filename)
	}

	stored, err := s.backupByID(id)
	if err != nil {
		return rec, nil
	}
	return stored, zipErr
}

// backupByID loads a single backup row.
func (s *Server) backupByID(id int64) (BackupRecord, error) {
	var rec BackupRecord
	var scheduleID sql.NullInt64
	err := s.systemDB.QueryRow(`
		SELECT b.id, b.filename, b.size, b.vaults, b.status, b.trigger, b.schedule_id, b.duration_ms, b.error, b.remote_status, b.remote_error, b.created_at, COALESCE(u.username, '')
		FROM backups b
		LEFT JOIN users u ON u.id = b.owner_id
		WHERE b.id = ?
	`, id).Scan(
		&rec.ID, &rec.Filename, &rec.Size, &rec.Vaults, &rec.Status,
		&rec.Trigger, &scheduleID, &rec.DurationMs, &rec.Error, &rec.RemoteStatus, &rec.RemoteError, &rec.CreatedAt, &rec.Owner,
	)
	if err != nil {
		return BackupRecord{}, err
	}
	if scheduleID.Valid {
		v := int(scheduleID.Int64)
		rec.ScheduleID = &v
	}
	return rec, nil
}

// backupListLimit reads the optional ?limit= query parameter, clamped to the
// allowed range.
func backupListLimit(r *http.Request) int {
	limit := backupDefaultLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = min(n, backupMaxLimit)
		}
	}
	return limit
}

// respondBackups streams backup history matching where (plus args), newest first.
// Each row carries its owning username so an admin list can label user snapshots.
func (s *Server) respondBackups(w http.ResponseWriter, limit int, where string, args ...any) {
	query := `
		SELECT b.id, b.filename, b.size, b.vaults, b.status, b.trigger, b.schedule_id, b.duration_ms, b.error, b.remote_status, b.remote_error, b.created_at, COALESCE(u.username, '')
		FROM backups b
		LEFT JOIN users u ON u.id = b.owner_id`
	if where != "" {
		query += " WHERE " + where
	}
	query += " ORDER BY b.id DESC LIMIT ?"
	args = append(args, limit)

	rows, err := s.systemDB.Query(query, args...)
	if err != nil {
		s.logger.Println("respondBackups: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	records := []BackupRecord{}
	for rows.Next() {
		var rec BackupRecord
		var scheduleID sql.NullInt64
		if err := rows.Scan(
			&rec.ID, &rec.Filename, &rec.Size, &rec.Vaults, &rec.Status,
			&rec.Trigger, &scheduleID, &rec.DurationMs, &rec.Error, &rec.RemoteStatus, &rec.RemoteError, &rec.CreatedAt, &rec.Owner,
		); err != nil {
			s.logger.Println("respondBackups: scan error:", err)
			continue
		}
		if scheduleID.Valid {
			v := int(scheduleID.Int64)
			rec.ScheduleID = &v
		}
		records = append(records, rec)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, records)
}

// handleListBackups returns the full backup history, newest first: server-wide
// snapshots plus every user's, each labelled with its owner.
func (s *Server) handleListBackups(w http.ResponseWriter, r *http.Request) {
	s.respondBackups(w, backupListLimit(r), "")
}

// usersCanBackup reports whether the operator has enabled user-initiated backups.
func (s *Server) usersCanBackup() bool {
	var v string
	if err := s.systemDB.QueryRow("SELECT value FROM server_settings WHERE key = 'users_can_backup'").Scan(&v); err != nil {
		return false
	}
	return v == "1"
}

// handleListUserBackups returns the caller's own snapshots, newest first.
func (s *Server) handleListUserBackups(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)
	s.respondBackups(w, backupListLimit(r), "b.owner_id = ?", userID)
}

// handleCreateUserBackup snapshots only the caller's vault database.
func (s *Server) handleCreateUserBackup(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	rec, err := s.createBackup("manual", nil, &userID)
	if err != nil {
		s.logger.Println("handleCreateUserBackup:", err)
		http.Error(w, "Backup failed", http.StatusInternalServerError)
		return
	}

	s.recordActivity(s.actorName(r), "created a vault backup", rec.Filename, "backup")
	writeJSON(w, http.StatusCreated, rec)
}

// handleDeleteUserBackup removes one of the caller's own snapshots. The owner_id
// filter means a user can never delete another account's backup.
func (s *Server) handleDeleteUserBackup(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid backup ID", http.StatusBadRequest)
		return
	}

	var filename string
	err = s.systemDB.QueryRow("SELECT filename FROM backups WHERE id = ? AND owner_id = ?", id, userID).Scan(&filename)
	if err == sql.ErrNoRows {
		http.Error(w, "Backup not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if filename != "" {
		os.Remove(filepath.Join(s.snapshotDir(), filename)) // best-effort
	}

	if _, err := s.systemDB.Exec("DELETE FROM backups WHERE id = ? AND owner_id = ?", id, userID); err != nil {
		http.Error(w, "Failed to delete backup", http.StatusInternalServerError)
		return
	}

	s.recordActivity(s.actorName(r), "deleted a vault backup", filename, "backup")
	w.WriteHeader(http.StatusNoContent)
}

// handleCreateBackup runs an on-demand server-wide snapshot.
func (s *Server) handleCreateBackup(w http.ResponseWriter, r *http.Request) {
	rec, err := s.createBackup("manual", nil, nil)
	if err != nil {
		s.logger.Println("handleCreateBackup:", err)
		http.Error(w, "Backup failed", http.StatusInternalServerError)
		return
	}

	s.recordActivity(s.actorName(r), "created a backup", rec.Filename, "backup")
	writeJSON(w, http.StatusCreated, rec)
}

// handleDeleteBackup removes a history row and its archive. Admins may delete any
// backup — server-wide or a user's.
func (s *Server) handleDeleteBackup(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid backup ID", http.StatusBadRequest)
		return
	}

	var filename string
	err = s.systemDB.QueryRow("SELECT filename FROM backups WHERE id = ?", id).Scan(&filename)
	if err == sql.ErrNoRows {
		http.Error(w, "Backup not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if filename != "" {
		os.Remove(filepath.Join(s.snapshotDir(), filename)) // best-effort
	}

	if _, err := s.systemDB.Exec("DELETE FROM backups WHERE id = ?", id); err != nil {
		http.Error(w, "Failed to delete backup", http.StatusInternalServerError)
		return
	}

	s.recordActivity(s.actorName(r), "deleted a backup", filename, "backup")
	w.WriteHeader(http.StatusNoContent)
}

// --- Schedules ---

// handleListSchedules returns every schedule, oldest first.
func (s *Server) handleListSchedules(w http.ResponseWriter, r *http.Request) {
	rows, err := s.systemDB.Query(`
		SELECT id, name, interval_minutes, retention_days, enabled, last_run, next_run, created_at
		FROM backup_schedules ORDER BY id
	`)
	if err != nil {
		s.logger.Println("handleListSchedules: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	schedules := []BackupSchedule{}
	for rows.Next() {
		var sc BackupSchedule
		var lastRun, nextRun sql.NullTime
		if err := rows.Scan(
			&sc.ID, &sc.Name, &sc.IntervalMinutes, &sc.RetentionDays,
			&sc.Enabled, &lastRun, &nextRun, &sc.CreatedAt,
		); err != nil {
			s.logger.Println("handleListSchedules: scan error:", err)
			continue
		}
		if lastRun.Valid {
			sc.LastRun = &lastRun.Time
		}
		if nextRun.Valid {
			sc.NextRun = &nextRun.Time
		}
		schedules = append(schedules, sc)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, schedules)
}

type createScheduleRequest struct {
	Name            string `json:"name"`
	IntervalMinutes int    `json:"interval_minutes"`
	RetentionDays   int    `json:"retention_days"`
	Enabled         *bool  `json:"enabled"`
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// handleCreateSchedule persists a new recurring snapshot definition. The first
// run is scheduled one interval out.
func (s *Server) handleCreateSchedule(w http.ResponseWriter, r *http.Request) {
	var req createScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	interval := backupDefaultEvery
	if req.IntervalMinutes > 0 {
		interval = clampInt(req.IntervalMinutes, backupIntervalMin, backupIntervalMax)
	}
	retention := backupDefaultRetain
	if req.RetentionDays > 0 {
		retention = clampInt(req.RetentionDays, backupRetentionMin, backupRetentionMax)
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	now := time.Now().UTC()
	nextRun := now.Add(time.Duration(interval) * time.Minute).Format(dbTimeFormat)

	res, err := s.systemDB.Exec(`
		INSERT INTO backup_schedules (name, interval_minutes, retention_days, enabled, next_run)
		VALUES (?, ?, ?, ?, ?)
	`, req.Name, interval, retention, enabled, nextRun)
	if err != nil {
		s.logger.Println("handleCreateSchedule: insert error:", err)
		http.Error(w, "Failed to create schedule", http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()

	s.recordActivity(s.actorName(r), "created a backup schedule", req.Name, "backup")

	sc, err := s.scheduleByID(id)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, sc)
}

// scheduleByID loads a single schedule row.
func (s *Server) scheduleByID(id int64) (BackupSchedule, error) {
	var sc BackupSchedule
	var lastRun, nextRun sql.NullTime
	err := s.systemDB.QueryRow(`
		SELECT id, name, interval_minutes, retention_days, enabled, last_run, next_run, created_at
		FROM backup_schedules WHERE id = ?
	`, id).Scan(
		&sc.ID, &sc.Name, &sc.IntervalMinutes, &sc.RetentionDays,
		&sc.Enabled, &lastRun, &nextRun, &sc.CreatedAt,
	)
	if err != nil {
		return BackupSchedule{}, err
	}
	if lastRun.Valid {
		sc.LastRun = &lastRun.Time
	}
	if nextRun.Valid {
		sc.NextRun = &nextRun.Time
	}
	return sc, nil
}

type updateScheduleRequest struct {
	Name            *string `json:"name"`
	IntervalMinutes *int    `json:"interval_minutes"`
	RetentionDays   *int    `json:"retention_days"`
	Enabled         *bool   `json:"enabled"`
}

// handleUpdateSchedule applies a partial update to a schedule (used for edits
// and the enable/disable toggle).
func (s *Server) handleUpdateSchedule(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid schedule ID", http.StatusBadRequest)
		return
	}

	var req updateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Name != nil {
		if _, err := s.systemDB.Exec("UPDATE backup_schedules SET name = ? WHERE id = ?", *req.Name, id); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}
	if req.IntervalMinutes != nil {
		v := clampInt(*req.IntervalMinutes, backupIntervalMin, backupIntervalMax)
		if _, err := s.systemDB.Exec("UPDATE backup_schedules SET interval_minutes = ? WHERE id = ?", v, id); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}
	if req.RetentionDays != nil {
		v := clampInt(*req.RetentionDays, backupRetentionMin, backupRetentionMax)
		if _, err := s.systemDB.Exec("UPDATE backup_schedules SET retention_days = ? WHERE id = ?", v, id); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}
	if req.Enabled != nil {
		// Re-enabling reschedules one interval out so a paused schedule doesn't
		// fire late the moment it is turned back on.
		if *req.Enabled {
			interval := backupDefaultEvery
			if err := s.systemDB.QueryRow("SELECT interval_minutes FROM backup_schedules WHERE id = ?", id).Scan(&interval); err != nil {
				s.logger.Println("handleUpdateSchedule: interval lookup:", err)
			}
			nextRun := time.Now().UTC().Add(time.Duration(clampInt(interval, backupIntervalMin, backupIntervalMax)) * time.Minute)
			if _, err := s.systemDB.Exec(
				"UPDATE backup_schedules SET enabled = 1, next_run = ? WHERE id = ?",
				nextRun.Format(dbTimeFormat), id,
			); err != nil {
				http.Error(w, "Database error", http.StatusInternalServerError)
				return
			}
		} else {
			if _, err := s.systemDB.Exec("UPDATE backup_schedules SET enabled = 0 WHERE id = ?", id); err != nil {
				http.Error(w, "Database error", http.StatusInternalServerError)
				return
			}
		}
	}

	s.recordActivity(s.actorName(r), "updated a backup schedule", strconv.Itoa(id), "backup")

	sc, err := s.scheduleByID(int64(id))
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, sc)
}

// handleDeleteSchedule removes a schedule.
func (s *Server) handleDeleteSchedule(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid schedule ID", http.StatusBadRequest)
		return
	}

	if _, err := s.systemDB.Exec("DELETE FROM backup_schedules WHERE id = ?", id); err != nil {
		http.Error(w, "Failed to delete schedule", http.StatusInternalServerError)
		return
	}

	s.recordActivity(s.actorName(r), "deleted a backup schedule", strconv.Itoa(id), "backup")
	w.WriteHeader(http.StatusNoContent)
}

// runDueBackups runs every enabled schedule that is past due, then advances its
// next_run. Called from the maintenance ticker.
func (s *Server) runDueBackups() {
	rows, err := s.systemDB.Query(`
		SELECT id, interval_minutes, name FROM backup_schedules
		WHERE enabled = 1 AND (next_run IS NULL OR datetime(next_run) <= datetime(?))
	`, time.Now().UTC().Format(dbTimeFormat))
	if err != nil {
		s.logger.Println("runDueBackups: query error:", err)
		return
	}

	// With MaxOpenConns(1) an Exec inside an open Rows cursor deadlocks, so drain
	// the cursor fully before running any backups.
	type due struct {
		id       int
		interval int
		name     string
	}
	var dueList []due
	for rows.Next() {
		var d due
		if err := rows.Scan(&d.id, &d.interval, &d.name); err != nil {
			continue
		}
		dueList = append(dueList, d)
	}
	rows.Close()

	for _, d := range dueList {
		if _, err := s.createBackup("schedule", &d.id, nil); err != nil {
			s.logger.Printf("runDueBackups: schedule %d (%s) failed: %v", d.id, d.name, err)
		}
		interval := clampInt(d.interval, backupIntervalMin, backupIntervalMax)
		now := time.Now().UTC()
		s.systemDB.Exec(`
			UPDATE backup_schedules SET last_run = ?, next_run = ? WHERE id = ?
		`, now.Format(dbTimeFormat), now.Add(time.Duration(interval)*time.Minute).Format(dbTimeFormat), d.id)
	}
}
