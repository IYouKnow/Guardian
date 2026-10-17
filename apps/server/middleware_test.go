package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// newTestServer returns a Server backed by a fresh temp system DB seeded with a
// single user, plus that user's id.
func newTestServer(t *testing.T, status string, tokenVersion int) (*Server, int) {
	t.Helper()
	SecretKey = strings.Repeat("A", minSecretLen)

	// Use forward slashes so the file: DSN is parsed as a URI on Windows too.
	path := strings.ReplaceAll(filepath.Join(t.TempDir(), "system.db"), "\\", "/")
	db, err := initSystemDB(path)
	if err != nil {
		t.Fatalf("initSystemDB: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	res, err := db.Exec(`
		INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name, status, role, salt, token_version)
		VALUES ('alice', 'x', 0, 'alice.db', 'Alice', ?, 'User', '', ?)
	`, status, tokenVersion)
	if err != nil {
		t.Fatalf("insert user: %v", err)
	}
	id, _ := res.LastInsertId()

	return &Server{systemDB: db, logger: log.New(io.Discard, "", 0)}, int(id)
}

func authRequest(token string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/vault/items", nil)
	r.Header.Set("Authorization", "Bearer "+token)
	return r
}

func TestValidateTokenAccountStatusAndVersion(t *testing.T) {
	tests := []struct {
		name         string
		status       string
		dbVersion    int
		tokenVersion int
		wantErr      bool
	}{
		{"active with matching version", "ACTIVE", 3, 3, false},
		{"disabled", "DISABLED", 0, 0, true},
		{"suspended", "SUSPENDED", 0, 0, true},
		{"revoked version", "ACTIVE", 1, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s, id := newTestServer(t, tt.status, tt.dbVersion)
			token, err := createToken(id, tt.tokenVersion)
			if err != nil {
				t.Fatalf("createToken: %v", err)
			}

			gotID, err := s.validateToken(authRequest(token))
			if tt.wantErr {
				if err == nil {
					t.Fatalf("validateToken = (%d, nil), want error", gotID)
				}
				return
			}
			if err != nil {
				t.Fatalf("validateToken error: %v", err)
			}
			if gotID != id {
				t.Fatalf("userID = %d, want %d", gotID, id)
			}
		})
	}
}

func TestValidateTokenLegacyTokenWithoutVersionAccepted(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)

	// A token minted before the "ver" claim existed must still work while the
	// account is active and its version is 0.
	claims := jwt.MapClaims{
		"sub": float64(id),
		"iss": "guardian-server",
		"exp": time.Now().Add(time.Hour).Unix(),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(SecretKey))
	if err != nil {
		t.Fatalf("sign legacy token: %v", err)
	}

	if _, err := s.validateToken(authRequest(token)); err != nil {
		t.Fatalf("legacy token without ver should be accepted, got: %v", err)
	}
}

func TestCreateTokenIncludesAllClaims(t *testing.T) {
	SecretKey = strings.Repeat("A", minSecretLen)
	before := time.Now()

	token, err := createToken(42, 7)
	if err != nil {
		t.Fatalf("createToken: %v", err)
	}

	parsed, err := jwt.Parse(token, func(*jwt.Token) (interface{}, error) {
		return []byte(SecretKey), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("parse minted token: %v", err)
	}
	claims := parsed.Claims.(jwt.MapClaims)

	if got := claims["iss"]; got != jwtIssuer {
		t.Fatalf("iss = %v, want %q", got, jwtIssuer)
	}
	if jti, _ := claims["jti"].(string); jti == "" {
		t.Fatal("jti is missing or empty")
	}
	iat, ok := claims["iat"].(float64)
	if !ok {
		t.Fatalf("iat = %v, want numeric", claims["iat"])
	}
	iatTime := time.Unix(int64(iat), 0)
	if iatTime.Before(before.Add(-time.Minute)) || iatTime.After(time.Now().Add(time.Minute)) {
		t.Fatalf("iat %v is not close to now", iatTime)
	}
	exp, ok := claims["exp"].(float64)
	if !ok {
		t.Fatalf("exp = %v, want numeric", claims["exp"])
	}
	if got, want := time.Unix(int64(exp), 0), iatTime.Add(TokenDuration); !got.Equal(want) {
		t.Fatalf("exp = %v, want %v", got, want)
	}
	if ver, _ := claims["ver"].(float64); int(ver) != 7 {
		t.Fatalf("ver = %v, want 7", claims["ver"])
	}
}

// signClaims mints an HS256 token from arbitrary claims for negative tests.
func signClaims(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(SecretKey))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

func TestValidateTokenRejectsWrongIssuer(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)
	token := signClaims(t, jwt.MapClaims{
		"sub": float64(id),
		"iss": "evil",
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour).Unix(),
		"ver": 0,
	})
	if _, err := s.validateToken(authRequest(token)); err == nil {
		t.Fatal("token with a foreign issuer should be rejected")
	}
}

func TestValidateTokenRejectsFutureIssuedAt(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)
	token := signClaims(t, jwt.MapClaims{
		"sub": float64(id),
		"iss": jwtIssuer,
		"iat": time.Now().Add(time.Hour).Unix(),
		"exp": time.Now().Add(2 * time.Hour).Unix(),
		"ver": 0,
	})
	if _, err := s.validateToken(authRequest(token)); err == nil {
		t.Fatal("token issued in the future should be rejected")
	}
}

func TestValidateTokenRejectsMissingExpiration(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)
	token := signClaims(t, jwt.MapClaims{
		"sub": float64(id),
		"iss": jwtIssuer,
		"iat": time.Now().Unix(),
		"ver": 0,
	})
	if _, err := s.validateToken(authRequest(token)); err == nil {
		t.Fatal("token without an exp claim should be rejected")
	}
}

func TestValidateTokenUnknownUserRejected(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	token, err := createToken(9999, 0)
	if err != nil {
		t.Fatalf("createToken: %v", err)
	}
	if _, err := s.validateToken(authRequest(token)); err == nil {
		t.Fatal("token for an unknown user should be rejected")
	}
}

func TestWithUserAuthRejectsDisabledAccount(t *testing.T) {
	s, id := newTestServer(t, "DISABLED", 0)
	token, err := createToken(id, 0)
	if err != nil {
		t.Fatalf("createToken: %v", err)
	}

	next := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
	rr := httptest.NewRecorder()
	s.withUserAuth(next)(rr, authRequest(token))

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}

func TestHandleUpdateUserDisableRevokesExistingToken(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)
	idStr := strconv.Itoa(id)

	token, err := createToken(id, 0)
	if err != nil {
		t.Fatalf("createToken: %v", err)
	}
	if _, err := s.validateToken(authRequest(token)); err != nil {
		t.Fatalf("token should be valid before disable: %v", err)
	}

	update := func(body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPut, "/api/admin/users/"+idStr, strings.NewReader(body))
		r.SetPathValue("id", idStr)
		rr := httptest.NewRecorder()
		s.handleUpdateUser(rr, r)
		return rr
	}

	if rr := update(`{"status":"DISABLED"}`); rr.Code != http.StatusOK {
		t.Fatalf("disable status = %d, want 200", rr.Code)
	}
	if _, err := s.validateToken(authRequest(token)); err == nil {
		t.Fatal("token should be revoked after disabling the account")
	}

	// Re-activating must not resurrect the token that was already revoked.
	if rr := update(`{"status":"ACTIVE"}`); rr.Code != http.StatusOK {
		t.Fatalf("re-activate status = %d, want 200", rr.Code)
	}
	if _, err := s.validateToken(authRequest(token)); err == nil {
		t.Fatal("old token should stay revoked after re-activation")
	}
}

func TestHandleMe(t *testing.T) {
	s, id := newTestServer(t, "ACTIVE", 0)

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
	if got.ID != id || got.Username != "alice" {
		t.Fatalf("got %+v, want id=%d username=alice", got, id)
	}
}

func TestHandleMeUnknownUserRejected(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	r := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, 9999))
	rr := httptest.NewRecorder()
	s.handleMe(rr, r)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}
