package main

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// newSetupTestServer returns a Server whose system DB has no users yet (setup
// mode) and a temp DataDir for user DB creation.
func newSetupTestServer(t *testing.T) *Server {
	t.Helper()
	path := strings.ReplaceAll(filepath.Join(t.TempDir(), "system.db"), "\\", "/")
	db, err := initSystemDB(path)
	if err != nil {
		t.Fatalf("initSystemDB: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return &Server{systemDB: db, config: Config{DataDir: t.TempDir()}, logger: log.New(io.Discard, "", 0)}
}

func TestHandleValidateInviteSetupMode(t *testing.T) {
	post := func(s *Server, token string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, "/auth/validate-invite", strings.NewReader(`{"token":"`+token+`"}`))
		rr := httptest.NewRecorder()
		s.handleValidateInvite(rr, r)
		return rr
	}

	t.Run("unconfigured server rejects any token", func(t *testing.T) {
		s := newSetupTestServer(t)
		t.Setenv("ADMIN_INVITE_CODE", "")
		if rr := post(s, "anything"); rr.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", rr.Code)
		}
	})

	t.Run("configured server requires the exact code", func(t *testing.T) {
		s := newSetupTestServer(t)
		t.Setenv("ADMIN_INVITE_CODE", "s3cret")
		if rr := post(s, "wrong"); rr.Code != http.StatusForbidden {
			t.Fatalf("wrong code: status = %d, want 403", rr.Code)
		}
		if rr := post(s, "s3cret"); rr.Code != http.StatusOK {
			t.Fatalf("correct code: status = %d, want 200", rr.Code)
		}
	})
}

func TestHandleRegisterSetupModeFailsClosedWhenCodeUnset(t *testing.T) {
	s := newSetupTestServer(t)
	t.Setenv("ADMIN_INVITE_CODE", "")

	body := `{"username":"mallory","password":"password123","invite_token":"whatever"}`
	r := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	s.handleRegister(rr, r)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rr.Code)
	}

	var count int
	if err := s.systemDB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		t.Fatalf("count users: %v", err)
	}
	if count != 0 {
		t.Fatalf("user count = %d, want 0 (no account should be created)", count)
	}
}

func TestHandleRegisterSetupModeCreatesAdminWithCode(t *testing.T) {
	s := newSetupTestServer(t)
	t.Setenv("ADMIN_INVITE_CODE", "s3cret")

	post := func(token string) *httptest.ResponseRecorder {
		body := `{"username":"alice","password":"password123","invite_token":"` + token + `"}`
		r := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(body))
		rr := httptest.NewRecorder()
		s.handleRegister(rr, r)
		return rr
	}

	if rr := post("wrong"); rr.Code != http.StatusForbidden {
		t.Fatalf("wrong code: status = %d, want 403", rr.Code)
	}
	if rr := post("s3cret"); rr.Code != http.StatusCreated {
		t.Fatalf("correct code: status = %d, want 201 (body %q)", rr.Code, rr.Body.String())
	}

	var isAdmin bool
	var status, role string
	if err := s.systemDB.QueryRow("SELECT is_admin, status, role FROM users WHERE username = 'alice'").Scan(&isAdmin, &status, &role); err != nil {
		t.Fatalf("lookup first user: %v", err)
	}
	if !isAdmin || role != "Admin" || status != "ACTIVE" {
		t.Fatalf("got isAdmin=%v role=%q status=%q, want admin/Admin/ACTIVE", isAdmin, role, status)
	}
}

func TestHandleRegisterRejectsWeakInputs(t *testing.T) {
	s := newSetupTestServer(t)
	t.Setenv("ADMIN_INVITE_CODE", "s3cret")

	cases := []struct {
		name string
		body string
	}{
		{"common password", `{"username":"alice","password":"password","invite_token":"s3cret"}`},
		{"short password", `{"username":"alice","password":"short","invite_token":"s3cret"}`},
		{"all-same password", `{"username":"alice","password":"zzzzzzzz","invite_token":"s3cret"}`},
		{"username with space", `{"username":"al ice","password":"password123","invite_token":"s3cret"}`},
		{"username too short", `{"username":"ab","password":"password123","invite_token":"s3cret"}`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(tc.body))
			rr := httptest.NewRecorder()
			s.handleRegister(rr, r)
			if rr.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (body %q)", rr.Code, rr.Body.String())
			}
		})
	}

	var count int
	if err := s.systemDB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		t.Fatalf("count users: %v", err)
	}
	if count != 0 {
		t.Fatalf("user count = %d, want 0 (no account should be created)", count)
	}
}

// TestHandleRegisterConcurrentAdminBootstrap fires several first-time
// registrations at once; the atomic transaction must let exactly one win the
// admin account and reject the rest.
func TestHandleRegisterConcurrentAdminBootstrap(t *testing.T) {
	s := newSetupTestServer(t)
	t.Setenv("ADMIN_INVITE_CODE", "s3cret")

	const attempts = 6
	codes := make([]int, attempts)
	start := make(chan struct{})
	var wg sync.WaitGroup

	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			body := `{"username":"alice","password":"password123","invite_token":"s3cret"}`
			r := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(body))
			rr := httptest.NewRecorder()
			<-start
			s.handleRegister(rr, r)
			codes[i] = rr.Code
		}(i)
	}
	close(start)
	wg.Wait()

	created := 0
	for _, code := range codes {
		switch code {
		case http.StatusCreated:
			created++
		case http.StatusForbidden, http.StatusConflict:
			// Expected losers: another request won the admin account.
		default:
			t.Fatalf("unexpected status %d (codes %v)", code, codes)
		}
	}
	if created != 1 {
		t.Fatalf("created = %d, want exactly 1 (codes %v)", created, codes)
	}

	var count, admins int
	if err := s.systemDB.QueryRow("SELECT COUNT(*), COALESCE(SUM(is_admin), 0) FROM users").Scan(&count, &admins); err != nil {
		t.Fatalf("count users: %v", err)
	}
	if count != 1 || admins != 1 {
		t.Fatalf("users=%d admins=%d, want exactly 1 admin", count, admins)
	}
}

func TestHandleRegisterNormalModeUsesInvite(t *testing.T) {
	s := newSetupTestServer(t)
	t.Setenv("ADMIN_INVITE_CODE", "s3cret")

	res, err := s.systemDB.Exec(`
		INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name, status, role, salt)
		VALUES ('root', 'x', 1, 'root.db', 'root', 'ACTIVE', 'Admin', '')
	`)
	if err != nil {
		t.Fatalf("seed existing user: %v", err)
	}
	rootID, _ := res.LastInsertId()

	const inviteToken = "GRDN-TEST-0000-0000-0000"
	if _, err := s.systemDB.Exec(`
		INSERT INTO invites (token, created_by, max_uses, status) VALUES (?, ?, 1, 'ACTIVE')
	`, inviteToken, rootID); err != nil {
		t.Fatalf("seed invite: %v", err)
	}

	body := `{"username":"bob","password":"password123","invite_token":"` + inviteToken + `"}`
	r := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	s.handleRegister(rr, r)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body %q)", rr.Code, rr.Body.String())
	}

	var isAdmin bool
	if err := s.systemDB.QueryRow("SELECT is_admin FROM users WHERE username = 'bob'").Scan(&isAdmin); err != nil {
		t.Fatalf("lookup bob: %v", err)
	}
	if isAdmin {
		t.Fatal("bob should not be admin")
	}

	var useCount int
	if err := s.systemDB.QueryRow("SELECT use_count FROM invites WHERE token = ?", inviteToken).Scan(&useCount); err != nil {
		t.Fatalf("lookup invite: %v", err)
	}
	if useCount != 1 {
		t.Fatalf("invite use_count = %d, want 1", useCount)
	}
}
