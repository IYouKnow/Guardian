package main

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
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
