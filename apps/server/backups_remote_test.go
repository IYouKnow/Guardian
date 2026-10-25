package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

// --- Archive encryption ---

func TestEncryptDecryptArchiveRoundTrip(t *testing.T) {
	key := "correct horse battery staple"

	// Span several frames so the framing (not just a single chunk) is exercised.
	original := make([]byte, backupFrameSize*2+12345)
	if _, err := rand.Read(original); err != nil {
		t.Fatalf("rand: %v", err)
	}

	encrypted, err := encryptArchive(key, bytes.NewReader(original))
	if err != nil {
		t.Fatalf("encryptArchive: %v", err)
	}
	ciphertext, err := io.ReadAll(encrypted)
	if err != nil {
		t.Fatalf("read ciphertext: %v", err)
	}
	if string(ciphertext[:len(backupMagic)]) != backupMagic {
		t.Fatalf("archive is missing the %q magic", backupMagic)
	}
	if len(ciphertext) <= len(original) {
		t.Fatalf("ciphertext (%d) should exceed plaintext (%d)", len(ciphertext), len(original))
	}
	if bytes.Contains(ciphertext, original[:64]) {
		t.Fatal("ciphertext contains plaintext — encryption is not applied")
	}

	decrypted, err := decryptArchive(key, bytes.NewReader(ciphertext))
	if err != nil {
		t.Fatalf("decryptArchive: %v", err)
	}
	got, err := io.ReadAll(decrypted)
	if err != nil {
		t.Fatalf("read plaintext: %v", err)
	}
	if !bytes.Equal(got, original) {
		t.Fatalf("round-trip mismatch: got %d bytes, want %d", len(got), len(original))
	}
}

func TestEncryptDecryptArchiveEmpty(t *testing.T) {
	key := "a-long-enough-backup-key"
	encrypted, err := encryptArchive(key, bytes.NewReader(nil))
	if err != nil {
		t.Fatalf("encryptArchive: %v", err)
	}
	ciphertext, err := io.ReadAll(encrypted)
	if err != nil {
		t.Fatalf("read ciphertext: %v", err)
	}
	decrypted, err := decryptArchive(key, bytes.NewReader(ciphertext))
	if err != nil {
		t.Fatalf("decryptArchive: %v", err)
	}
	got, err := io.ReadAll(decrypted)
	if err != nil {
		t.Fatalf("read plaintext: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("expected empty plaintext, got %d bytes", len(got))
	}
}

func TestDecryptArchiveWrongKeyFails(t *testing.T) {
	encrypted, err := encryptArchive("the-right-backup-key", bytes.NewReader([]byte("top secret vault bytes")))
	if err != nil {
		t.Fatalf("encryptArchive: %v", err)
	}
	ciphertext, err := io.ReadAll(encrypted)
	if err != nil {
		t.Fatalf("read ciphertext: %v", err)
	}

	decrypted, err := decryptArchive("the-wrong-backup-key", bytes.NewReader(ciphertext))
	if err != nil {
		t.Fatalf("decryptArchive returned early: %v", err)
	}
	if _, err := io.ReadAll(decrypted); err == nil {
		t.Fatal("expected an authentication error with the wrong key")
	}
}

// --- Secrets at rest ---

func TestSecretEncryptDecryptRoundTrip(t *testing.T) {
	SecretKey = strings.Repeat("K", minSecretLen)

	const token = "1//0g-example-refresh-token"
	sealed, err := encryptSecret(token)
	if err != nil {
		t.Fatalf("encryptSecret: %v", err)
	}
	if strings.Contains(sealed, "example-refresh") {
		t.Fatal("sealed value leaks the plaintext")
	}

	got, err := decryptSecret(sealed)
	if err != nil {
		t.Fatalf("decryptSecret: %v", err)
	}
	if got != token {
		t.Fatalf("decryptSecret = %q, want %q", got, token)
	}
}

func TestValidateBackupKey(t *testing.T) {
	if err := validateBackupKey(""); err != nil {
		t.Fatalf("empty key should be allowed (no encryption): %v", err)
	}
	if err := validateBackupKey("shortkey"); err == nil {
		t.Fatal("a key shorter than the minimum should be rejected")
	}
	if err := validateBackupKey(strings.Repeat("x", minBackupKeyLength)); err != nil {
		t.Fatalf("a minimum-length key should be accepted: %v", err)
	}
}

func TestSanitizeFolderName(t *testing.T) {
	if got := sanitizeFolderName("   "); got != googleDriveFolderName {
		t.Fatalf("blank name = %q, want the default", got)
	}
	if got := sanitizeFolderName(" My Vaults "); got != "My Vaults" {
		t.Fatalf("name = %q, want trimmed", got)
	}
	if got := sanitizeFolderName(strings.Repeat("a", 200)); len(got) != 100 {
		t.Fatalf("name length = %d, want 100", len(got))
	}
}

// --- Destination status & enable guard ---

// withUser attaches a user id to a request context the way withUserBackupAccess
// does, so handlers that read userIDKey can be exercised directly.
func withUser(r *http.Request, userID int) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), userIDKey, userID))
}

func putUserDestinationEnabled(t *testing.T, s *Server, userID int, enabled bool) int {
	t.Helper()
	body := `{"enabled":false}`
	if enabled {
		body = `{"enabled":true}`
	}
	rr := httptest.NewRecorder()
	req := withUser(httptest.NewRequest(http.MethodPut, "/api/backups/destination", strings.NewReader(body)), userID)
	s.handleUpdateUserDestination(rr, req)
	return rr.Code
}

func TestUserDestinationStatusAndEnableGuard(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()

	rr := httptest.NewRecorder()
	s.handleGetUserDestination(rr, withUser(httptest.NewRequest(http.MethodGet, "/api/backups/destination", nil), userID))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var dest RemoteDestination
	if err := json.NewDecoder(rr.Body).Decode(&dest); err != nil {
		t.Fatalf("decode status: %v", err)
	}
	if dest.Connected || dest.Enabled || dest.Encrypted || dest.ClientConfigured {
		t.Fatalf("unexpected initial status %+v", dest)
	}

	// Nothing connected: enabling is rejected.
	if code := putUserDestinationEnabled(t, s, userID, true); code != http.StatusBadRequest {
		t.Fatalf("enable without connection = %d, want 400", code)
	}

	// Connected: enabling succeeds, and no key means "not encrypted".
	sealed, err := encryptSecret("fake-refresh-token")
	if err != nil {
		t.Fatalf("encryptSecret: %v", err)
	}
	if err := s.saveUserDestinationConnected(userID, "me@example.com", googleDriveFolderName, "folder-123", sealed, ""); err != nil {
		t.Fatalf("saveUserDestinationConnected: %v", err)
	}
	if code := putUserDestinationEnabled(t, s, userID, true); code != http.StatusOK {
		t.Fatalf("enable after connect = %d, want 200", code)
	}
	dest, err = s.userDestinationStatus(userID)
	if err != nil {
		t.Fatalf("userDestinationStatus: %v", err)
	}
	if !dest.Connected || !dest.Enabled || dest.AccountEmail != "me@example.com" {
		t.Fatalf("unexpected status %+v", dest)
	}
	if dest.Encrypted {
		t.Fatal("destination should not report encryption without a backup key")
	}
}

func TestSaveUserDestinationConnectedPreservesExistingKey(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)

	sealedToken, _ := encryptSecret("token")
	sealedKey, _ := encryptSecret("operator-backup-key")
	if err := s.saveUserDestinationConnected(userID, "a@example.com", googleDriveFolderName, "f1", sealedToken, sealedKey); err != nil {
		t.Fatalf("saveUserDestinationConnected: %v", err)
	}

	// Reconnecting without a key must not silently drop encryption.
	if err := s.saveUserDestinationConnected(userID, "a@example.com", googleDriveFolderName, "f1", sealedToken, ""); err != nil {
		t.Fatalf("reconnect: %v", err)
	}
	dest, err := s.userDestinationStatus(userID)
	if err != nil {
		t.Fatalf("userDestinationStatus: %v", err)
	}
	if !dest.Encrypted {
		t.Fatal("reconnecting without a key should preserve the previous key")
	}
	key, ok, err := s.userDestinationBackupKey(userID)
	if err != nil || !ok || key != "operator-backup-key" {
		t.Fatalf("userDestinationBackupKey = (%q, %v, %v)", key, ok, err)
	}
}

// Destinations are per-user: one account can never see or change another's.
func TestUserDestinationIsOwnerScoped(t *testing.T) {
	s, userA := newTestServer(t, "ACTIVE", 0)

	res, err := s.systemDB.Exec(
		`INSERT INTO users (username, password_hash, is_admin, db_path, friendly_name, status, role) VALUES ('bob', 'x', 0, 'bob.db', 'Bob', 'ACTIVE', 'User')`)
	if err != nil {
		t.Fatalf("seed second user: %v", err)
	}
	bobID, _ := res.LastInsertId()
	userB := int(bobID)

	sealed, _ := encryptSecret("token-a")
	if err := s.saveUserDestinationConnected(userA, "a@example.com", googleDriveFolderName, "fa", sealed, ""); err != nil {
		t.Fatalf("connect A: %v", err)
	}

	if dest, _ := s.userDestinationStatus(userA); !dest.Connected || !dest.Enabled {
		t.Fatalf("A should see its own connected destination, got %+v", dest)
	}
	// B sees nothing of A's.
	if dest, _ := s.userDestinationStatus(userB); dest.Connected || dest.Enabled || dest.AccountEmail != "" {
		t.Fatalf("B saw A's destination: %+v", dest)
	}
	// B cannot enable (nothing connected for B) and A stays enabled.
	if code := putUserDestinationEnabled(t, s, userB, true); code != http.StatusBadRequest {
		t.Fatalf("B enabling its own empty destination = %d, want 400", code)
	}
	if dest, _ := s.userDestinationStatus(userA); !dest.Enabled {
		t.Fatal("A was affected by B's request")
	}

	// B disconnecting must not touch A's row.
	rr := httptest.NewRecorder()
	s.handleDeleteUserDestination(rr, withUser(httptest.NewRequest(http.MethodDelete, "/api/backups/destination", nil), userB))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("B disconnect = %d, want 204", rr.Code)
	}
	if dest, _ := s.userDestinationStatus(userA); !dest.Connected {
		t.Fatal("B's disconnect removed A's destination")
	}
}

func TestDeleteUserDestinationDisconnectsAndRevokes(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()

	// Capture the revocation call instead of reaching out to Google.
	var revoked string
	stub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		revoked = r.FormValue("token")
		w.WriteHeader(http.StatusOK)
	}))
	defer stub.Close()
	oldRevoke := googleRevokeURL
	googleRevokeURL = stub.URL
	defer func() { googleRevokeURL = oldRevoke }()

	sealed, err := encryptSecret("refresh-to-revoke")
	if err != nil {
		t.Fatalf("encryptSecret: %v", err)
	}
	if err := s.saveUserDestinationConnected(userID, "me@example.com", googleDriveFolderName, "folder-123", sealed, ""); err != nil {
		t.Fatalf("connect: %v", err)
	}

	rr := httptest.NewRecorder()
	s.handleDeleteUserDestination(rr, withUser(httptest.NewRequest(http.MethodDelete, "/api/backups/destination", nil), userID))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("disconnect = %d, want 204", rr.Code)
	}

	if dest, _ := s.userDestinationStatus(userID); dest.Connected {
		t.Fatal("destination should be disconnected")
	}
	if revoked != "refresh-to-revoke" {
		t.Fatalf("revoked token = %q, want the stored refresh token", revoked)
	}
}

// --- OAuth wiring ---

// seedGoogleClient stores an operator-supplied Google client for a test.
func seedGoogleClient(t *testing.T, s *Server, id, secret string) {
	t.Helper()
	if err := s.saveGoogleClient(id, secret); err != nil {
		t.Fatalf("saveGoogleClient: %v", err)
	}
}

func TestStartUserGoogleOAuthUnconfigured(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)

	rr := httptest.NewRecorder()
	s.handleStartUserGoogleOAuth(rr, withUser(httptest.NewRequest(http.MethodPost, "/api/backups/destination/connect", nil), userID))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rr.Code)
	}
}

func TestStartUserGoogleOAuthRejectsShortKey(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)
	seedGoogleClient(t, s, "guardian-client-id.apps.googleusercontent.com", "guardian-client-secret")

	rr := httptest.NewRecorder()
	body := strings.NewReader(`{"backup_key":"short"}`)
	s.handleStartUserGoogleOAuth(rr, withUser(httptest.NewRequest(http.MethodPost, "/api/backups/destination/connect", body), userID))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestStartUserGoogleOAuthBuildsPKCEAuthURLAndCarriesSettings(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)
	seedGoogleClient(t, s, "guardian-client-id.apps.googleusercontent.com", "guardian-client-secret")

	rr := httptest.NewRecorder()
	body := strings.NewReader(`{"backup_key":"a-long-enough-key","folder_name":"My Vaults"}`)
	req := withUser(httptest.NewRequest(http.MethodPost, "/api/backups/destination/connect", body), userID)
	s.handleStartUserGoogleOAuth(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var resp struct {
		AuthURL string `json:"auth_url"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	u, err := url.Parse(resp.AuthURL)
	if err != nil {
		t.Fatalf("parse auth url: %v", err)
	}
	q := u.Query()
	if got := q.Get("client_id"); got != "guardian-client-id.apps.googleusercontent.com" {
		t.Fatalf("client_id = %q, want the stored client", got)
	}
	if q.Get("code_challenge") == "" || q.Get("code_challenge_method") != "S256" {
		t.Fatalf("expected an S256 PKCE challenge, got %v", q)
	}
	if got, want := q.Get("redirect_uri"), s.oauthRedirectURL(req); got != want {
		t.Fatalf("redirect_uri = %q, want %q", got, want)
	}
	if q.Get("access_type") != "offline" {
		t.Fatalf("access_type = %q, want offline", q.Get("access_type"))
	}
	if q.Get("state") == "" {
		t.Fatal("missing state parameter")
	}

	pending, ok := takeOAuthState(q.Get("state"))
	if !ok || pending.verifier == "" {
		t.Fatal("state was not stored with a PKCE verifier")
	}
	if pending.userID != userID {
		t.Fatalf("state userID = %d, want %d", pending.userID, userID)
	}
	if pending.backupKey != "a-long-enough-key" || pending.folderName != "My Vaults" {
		t.Fatalf("settings not carried in state: %+v", pending)
	}
	if _, again := takeOAuthState(q.Get("state")); again {
		t.Fatal("state should be single-use")
	}
}

func TestGoogleOAuthConfigRequiresStoredClient(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	redirect := "https://guardian.example.com" + googleDriveCallbackPath
	if _, err := s.googleOAuthConfig(redirect); err == nil {
		t.Fatal("expected an error before a client is configured")
	}

	seedGoogleClient(t, s, "client-id", "client-secret")
	conf, err := s.googleOAuthConfig(redirect)
	if err != nil {
		t.Fatalf("googleOAuthConfig: %v", err)
	}
	if conf.ClientID != "client-id" || conf.ClientSecret != "client-secret" {
		t.Fatalf("config = (%q, %q), want the stored client", conf.ClientID, conf.ClientSecret)
	}
	if conf.RedirectURL != redirect {
		t.Fatalf("redirect = %q, want %q", conf.RedirectURL, redirect)
	}
}

func TestOAuthRedirectURLDerivation(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	// Derived from the request host when no public URL is set.
	req := httptest.NewRequest(http.MethodPost, "http://guardian.example.com/x", nil)
	req.Host = "guardian.example.com"
	if got, want := s.oauthRedirectURL(req), "http://guardian.example.com"+googleDriveCallbackPath; got != want {
		t.Fatalf("derived redirect = %q, want %q", got, want)
	}

	// A trusted X-Forwarded-Proto: https flips the scheme.
	fwd := httptest.NewRequest(http.MethodPost, "http://guardian.example.com/x", nil)
	fwd.Host = "guardian.example.com"
	fwd.RemoteAddr = "127.0.0.1:1234"
	fwd.Header.Set("X-Forwarded-Proto", "https")
	if got, want := s.oauthRedirectURL(fwd), "https://guardian.example.com"+googleDriveCallbackPath; got != want {
		t.Fatalf("forwarded redirect = %q, want %q", got, want)
	}

	// The stored public URL wins, with trailing slashes normalised.
	if err := s.savePublicURL("https://vault.example.com/"); err != nil {
		t.Fatalf("savePublicURL: %v", err)
	}
	if got, want := s.oauthRedirectURL(req), "https://vault.example.com"+googleDriveCallbackPath; got != want {
		t.Fatalf("public-url redirect = %q, want %q", got, want)
	}

	// With no request (a background refresh) and no public URL, it falls back.
	if err := s.savePublicURL(""); err != nil {
		t.Fatalf("clear public url: %v", err)
	}
	if got := s.oauthRedirectURL(nil); !strings.HasSuffix(got, googleDriveCallbackPath) {
		t.Fatalf("nil-request redirect = %q", got)
	}
}

func TestValidatePublicURL(t *testing.T) {
	for _, ok := range []string{"", "https://guardian.example.com", "http://localhost:8080", "https://vault.example.com/sub"} {
		if err := validatePublicURL(ok); err != nil {
			t.Fatalf("%q should be accepted: %v", ok, err)
		}
	}
	for _, bad := range []string{"guardian.example.com", "http://192.168.1.10:8080", "http://guardian.example.com", "https://10.0.0.5"} {
		if err := validatePublicURL(bad); err == nil {
			t.Fatalf("%q should be rejected", bad)
		}
	}
}

func putIntegration(t *testing.T, s *Server, body string) int {
	t.Helper()
	rr := httptest.NewRecorder()
	s.handleUpdateBackupIntegration(rr, httptest.NewRequest(http.MethodPut, "/api/admin/backup-destination/integration", strings.NewReader(body)))
	return rr.Code
}

func TestBackupIntegrationHandlers(t *testing.T) {
	s, userID := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()

	type view struct {
		ClientID               string `json:"client_id"`
		ClientSecretConfigured bool   `json:"client_secret_configured"`
		PublicURL              string `json:"public_url"`
		RedirectURI            string `json:"redirect_uri"`
	}

	// Initially unconfigured.
	rr := httptest.NewRecorder()
	s.handleGetBackupIntegration(rr, httptest.NewRequest(http.MethodGet, "/api/admin/backup-destination/integration", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var got view
	json.NewDecoder(rr.Body).Decode(&got)
	if got.ClientID != "" || got.ClientSecretConfigured {
		t.Fatalf("unexpected initial integration view %+v", got)
	}
	if !strings.HasSuffix(got.RedirectURI, googleDriveCallbackPath) {
		t.Fatalf("redirect_uri = %q, want the callback path", got.RedirectURI)
	}

	// Validation.
	if code := putIntegration(t, s, `{"client_id":""}`); code != http.StatusBadRequest {
		t.Fatalf("empty update = %d, want 400", code)
	}
	if code := putIntegration(t, s, `{"client_id":"","client_secret":"super-secret-value"}`); code != http.StatusBadRequest {
		t.Fatalf("secret without an id = %d, want 400", code)
	}
	if code := putIntegration(t, s, `{"client_id":"id","client_secret":"short"}`); code != http.StatusBadRequest {
		t.Fatalf("short secret = %d, want 400", code)
	}
	if code := putIntegration(t, s, `{"client_id":"id","public_url":"http://192.168.1.10:8080"}`); code != http.StatusBadRequest {
		t.Fatalf("raw-IP public url = %d, want 400", code)
	}

	// Saving stores the client and reports only that a secret exists.
	rr = httptest.NewRecorder()
	s.handleUpdateBackupIntegration(rr, httptest.NewRequest(http.MethodPut, "/api/admin/backup-destination/integration",
		strings.NewReader(`{"client_id":"client-id","client_secret":"super-secret-value"}`)))
	if rr.Code != http.StatusOK {
		t.Fatalf("save = %d, want 200", rr.Code)
	}
	respBody := rr.Body.String()
	if strings.Contains(respBody, "super-secret-value") {
		t.Fatal("response leaked the client secret")
	}
	if err := json.Unmarshal([]byte(respBody), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.ClientID != "client-id" || !got.ClientSecretConfigured {
		t.Fatalf("unexpected view after save: %+v", got)
	}

	// The secret round-trips through storage but is never stored in the clear.
	clientID, secret, err := s.googleClientCredentials()
	if err != nil || clientID != "client-id" || secret != "super-secret-value" {
		t.Fatalf("stored credentials = (%q, %q, %v)", clientID, secret, err)
	}
	var sealed string
	if err := s.systemDB.QueryRow("SELECT value FROM server_settings WHERE key = ?", googleClientSecretSetting).Scan(&sealed); err != nil {
		t.Fatalf("read sealed secret: %v", err)
	}
	if strings.Contains(sealed, "super-secret-value") {
		t.Fatal("client secret is stored in the clear")
	}

	// The generic settings list must not expose the sealed secret.
	listRR := httptest.NewRecorder()
	s.handleListSettings(listRR, httptest.NewRequest(http.MethodGet, "/api/admin/settings", nil))
	if strings.Contains(listRR.Body.String(), googleClientSecretSetting) {
		t.Fatal("generic settings list exposes the sealed client secret")
	}

	// Updating the client ID alone keeps the stored secret.
	if code := putIntegration(t, s, `{"client_id":"client-id-2"}`); code != http.StatusOK {
		t.Fatalf("id-only update = %d, want 200", code)
	}
	if id, sec, _ := s.googleClientCredentials(); id != "client-id-2" || sec != "super-secret-value" {
		t.Fatalf("credentials after id-only update = (%q, %q)", id, sec)
	}

	// The public URL can be saved on its own, without touching the client.
	if code := putIntegration(t, s, `{"client_id":"","public_url":"https://vault.example.com"}`); code != http.StatusOK {
		t.Fatalf("public-url-only update = %d, want 200", code)
	}
	if got := s.publicURL(); got != "https://vault.example.com" {
		t.Fatalf("publicURL = %q, want the saved value", got)
	}
	if id, sec, _ := s.googleClientCredentials(); id != "client-id-2" || sec != "super-secret-value" {
		t.Fatalf("public-url-only update changed the client to (%q, %q)", id, sec)
	}

	// The destination status reports the client as configured.
	dest, err := s.userDestinationStatus(userID)
	if err != nil {
		t.Fatalf("userDestinationStatus: %v", err)
	}
	if !dest.ClientConfigured {
		t.Fatal("destination should report client_configured once a client is stored")
	}
}

func TestGoogleOAuthCallbackRejectsUnknownState(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/admin/backup-destination/google/callback?state=unknown&code=abc", nil)
	s.handleGoogleOAuthCallback(rr, req)
	if rr.Code != http.StatusFound {
		t.Fatalf("status = %d, want 302", rr.Code)
	}
	if loc := rr.Header().Get("Location"); !strings.Contains(loc, "google=error") {
		t.Fatalf("redirect Location = %q, want a google=error result", loc)
	}
}

// --- Upload flow ---

type fakeUploader struct {
	mu       sync.Mutex
	owners   []int
	uploaded []string
	payload  []byte
	err      error
}

func (f *fakeUploader) Upload(_ context.Context, ownerID int, name string, body io.Reader) error {
	if f.err != nil {
		return f.err
	}
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	f.mu.Lock()
	f.owners = append(f.owners, ownerID)
	f.uploaded = append(f.uploaded, name)
	f.payload = data
	f.mu.Unlock()
	return nil
}

func (f *fakeUploader) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.uploaded)
}

func (f *fakeUploader) lastName() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.uploaded) == 0 {
		return ""
	}
	return f.uploaded[len(f.uploaded)-1]
}

func (f *fakeUploader) lastOwner() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.owners) == 0 {
		return -1
	}
	return f.owners[len(f.owners)-1]
}

func (f *fakeUploader) lastPayload() []byte {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.payload
}

// waitForRemoteStatus polls until the background upload records the status.
func waitForRemoteStatus(t *testing.T, s *Server, id int64, want string) BackupRecord {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if rec, err := s.backupByID(id); err == nil && rec.RemoteStatus == want {
			return rec
		}
		time.Sleep(10 * time.Millisecond)
	}
	rec, _ := s.backupByID(id)
	t.Fatalf("remote_status = %q/err=%q, want %q", rec.RemoteStatus, rec.RemoteError, want)
	return rec
}

// newRemoteTestServer returns a server whose seeded user has a connected,
// unencrypted destination, plus a fake uploader.
func newRemoteTestServer(t *testing.T) (*Server, *fakeUploader, int) {
	t.Helper()
	s, userID := newBackupTestServer(t)
	s.sseHub = NewSSEHub()

	sealed, err := encryptSecret("fake-refresh-token")
	if err != nil {
		t.Fatalf("encryptSecret: %v", err)
	}
	if err := s.saveUserDestinationConnected(userID, "me@example.com", googleDriveFolderName, "folder-123", sealed, ""); err != nil {
		t.Fatalf("saveUserDestinationConnected: %v", err)
	}

	fake := &fakeUploader{}
	s.remote = fake
	return s, fake, userID
}

func TestUserBackupUploadsUnencryptedWithoutKey(t *testing.T) {
	s, fake, userID := newRemoteTestServer(t)

	rec := createUserBackupViaHandler(t, s, userID)
	if rec.RemoteStatus != "pending" {
		t.Fatalf("initial remote_status = %q, want pending", rec.RemoteStatus)
	}

	stored := waitForRemoteStatus(t, s, rec.ID, "uploaded")
	if stored.Status != "success" {
		t.Fatalf("snapshot status = %q, want success", stored.Status)
	}
	if fake.count() != 1 {
		t.Fatalf("uploads = %d, want 1", fake.count())
	}
	if got := fake.lastOwner(); got != userID {
		t.Fatalf("upload owner = %d, want %d", got, userID)
	}
	// No key set, so the .zip is uploaded as-is (a real zip starts with "PK").
	if got := fake.lastName(); got != rec.Filename {
		t.Fatalf("uploaded name = %q, want the plain archive %q", got, rec.Filename)
	}
	if payload := fake.lastPayload(); !bytes.HasPrefix(payload, []byte("PK")) {
		t.Fatalf("expected an unencrypted zip payload, got %q", payload[:min(4, len(payload))])
	}
}

func TestUserBackupEncryptsWhenKeySet(t *testing.T) {
	s, fake, userID := newRemoteTestServer(t)

	sealedToken, _ := encryptSecret("fake-refresh-token")
	sealedKey, _ := encryptSecret("operator-backup-key")
	if err := s.saveUserDestinationConnected(userID, "me@example.com", googleDriveFolderName, "folder-123", sealedToken, sealedKey); err != nil {
		t.Fatalf("saveUserDestinationConnected: %v", err)
	}

	rec := createUserBackupViaHandler(t, s, userID)
	waitForRemoteStatus(t, s, rec.ID, "uploaded")

	if got := fake.lastName(); !strings.HasSuffix(got, googleDriveUploadSuffix) {
		t.Fatalf("uploaded name = %q, want a %s suffix", got, googleDriveUploadSuffix)
	}
	if payload := fake.lastPayload(); !bytes.HasPrefix(payload, []byte(backupMagic)) {
		t.Fatalf("expected a %q-prefixed payload, got %q", backupMagic, payload[:min(4, len(payload))])
	}
}

func TestUserBackupUploadFailureIsRecorded(t *testing.T) {
	s, fake, userID := newRemoteTestServer(t)
	fake.err = context.DeadlineExceeded

	rec := createUserBackupViaHandler(t, s, userID)
	stored := waitForRemoteStatus(t, s, rec.ID, "failed")
	if stored.Status != "success" {
		t.Fatalf("local snapshot should still succeed, got %q", stored.Status)
	}
	if stored.RemoteError == "" {
		t.Fatal("remote_error should describe the failure")
	}

	dest, err := s.userDestinationStatus(userID)
	if err != nil {
		t.Fatalf("userDestinationStatus: %v", err)
	}
	if dest.LastError == "" {
		t.Fatal("destination last_error should be set after a failed upload")
	}
}

func TestUserBackupSkipsUploadWhenDestinationDisabled(t *testing.T) {
	s, fake, userID := newRemoteTestServer(t)
	if err := s.setUserDestinationEnabled(userID, false); err != nil {
		t.Fatalf("setUserDestinationEnabled: %v", err)
	}

	rec := createUserBackupViaHandler(t, s, userID)
	if rec.RemoteStatus != "" {
		t.Fatalf("remote_status = %q, want empty for a disabled destination", rec.RemoteStatus)
	}

	// Give any (incorrect) background upload a chance to run.
	time.Sleep(200 * time.Millisecond)
	if fake.count() != 0 {
		t.Fatalf("uploads = %d, want 0", fake.count())
	}
}

// Drive destinations are per-user, so a server-wide snapshot is never mirrored.
func TestServerWideBackupNeverUploads(t *testing.T) {
	s, fake, _ := newRemoteTestServer(t)

	rec := createBackupViaHandler(t, s)
	if rec.RemoteStatus != "" {
		t.Fatalf("remote_status = %q, want empty for a server-wide snapshot", rec.RemoteStatus)
	}

	time.Sleep(200 * time.Millisecond)
	if fake.count() != 0 {
		t.Fatalf("uploads = %d, want 0", fake.count())
	}
}
