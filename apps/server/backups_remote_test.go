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

func putDestinationEnabled(t *testing.T, s *Server, enabled bool) int {
	t.Helper()
	body := `{"enabled":false}`
	if enabled {
		body = `{"enabled":true}`
	}
	rr := httptest.NewRecorder()
	s.handleUpdateBackupDestination(rr, httptest.NewRequest(http.MethodPut, "/api/admin/backup-destination", strings.NewReader(body)))
	return rr.Code
}

func TestBackupDestinationStatusAndEnableGuard(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()

	rr := httptest.NewRecorder()
	s.handleGetBackupDestination(rr, httptest.NewRequest(http.MethodGet, "/api/admin/backup-destination", nil))
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
	if code := putDestinationEnabled(t, s, true); code != http.StatusBadRequest {
		t.Fatalf("enable without connection = %d, want 400", code)
	}

	// Connected: enabling succeeds, and no key means "not encrypted".
	sealed, err := encryptSecret("fake-refresh-token")
	if err != nil {
		t.Fatalf("encryptSecret: %v", err)
	}
	if err := s.saveDestinationConnected("me@example.com", googleDriveFolderName, "folder-123", sealed, ""); err != nil {
		t.Fatalf("saveDestinationConnected: %v", err)
	}
	if code := putDestinationEnabled(t, s, true); code != http.StatusOK {
		t.Fatalf("enable after connect = %d, want 200", code)
	}
	dest, err = s.destinationStatus()
	if err != nil {
		t.Fatalf("destinationStatus: %v", err)
	}
	if !dest.Connected || !dest.Enabled || dest.AccountEmail != "me@example.com" {
		t.Fatalf("unexpected status %+v", dest)
	}
	if dest.Encrypted {
		t.Fatal("destination should not report encryption without a backup key")
	}
}

func TestSaveDestinationConnectedPreservesExistingKey(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	sealedToken, _ := encryptSecret("token")
	sealedKey, _ := encryptSecret("operator-backup-key")
	if err := s.saveDestinationConnected("a@example.com", googleDriveFolderName, "f1", sealedToken, sealedKey); err != nil {
		t.Fatalf("saveDestinationConnected: %v", err)
	}

	// Reconnecting without a key must not silently drop encryption.
	if err := s.saveDestinationConnected("a@example.com", googleDriveFolderName, "f1", sealedToken, ""); err != nil {
		t.Fatalf("reconnect: %v", err)
	}
	dest, err := s.destinationStatus()
	if err != nil {
		t.Fatalf("destinationStatus: %v", err)
	}
	if !dest.Encrypted {
		t.Fatal("reconnecting without a key should preserve the previous key")
	}
	key, ok, err := s.destinationBackupKey()
	if err != nil || !ok || key != "operator-backup-key" {
		t.Fatalf("destinationBackupKey = (%q, %v, %v)", key, ok, err)
	}
}

func TestDeleteBackupDestinationDisconnects(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()
	if err := s.saveDestinationConnected("me@example.com", googleDriveFolderName, "folder-123", "sealed", ""); err != nil {
		t.Fatalf("saveDestinationConnected: %v", err)
	}

	rr := httptest.NewRecorder()
	s.handleDeleteBackupDestination(rr, httptest.NewRequest(http.MethodDelete, "/api/admin/backup-destination", nil))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("disconnect = %d, want 204", rr.Code)
	}

	dest, err := s.destinationStatus()
	if err != nil {
		t.Fatalf("destinationStatus: %v", err)
	}
	if dest.Connected {
		t.Fatal("destination should be disconnected")
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

func TestStartGoogleOAuthUnconfigured(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	rr := httptest.NewRecorder()
	s.handleStartGoogleOAuth(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backup-destination/connect", nil))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rr.Code)
	}
}

func TestStartGoogleOAuthRejectsShortKey(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	seedGoogleClient(t, s, "guardian-client-id.apps.googleusercontent.com", "guardian-client-secret")

	rr := httptest.NewRecorder()
	body := strings.NewReader(`{"backup_key":"short"}`)
	s.handleStartGoogleOAuth(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backup-destination/connect", body))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestStartGoogleOAuthBuildsPKCEAuthURLAndCarriesSettings(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	seedGoogleClient(t, s, "guardian-client-id.apps.googleusercontent.com", "guardian-client-secret")

	rr := httptest.NewRecorder()
	body := strings.NewReader(`{"backup_key":"a-long-enough-key","folder_name":"My Vaults"}`)
	s.handleStartGoogleOAuth(rr, httptest.NewRequest(http.MethodPost, "/api/admin/backup-destination/connect", body))
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
	if got := q.Get("redirect_uri"); got != s.googleRedirectURL() {
		t.Fatalf("redirect_uri = %q, want %q", got, s.googleRedirectURL())
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
	if pending.backupKey != "a-long-enough-key" || pending.folderName != "My Vaults" {
		t.Fatalf("settings not carried in state: %+v", pending)
	}
	if _, again := takeOAuthState(q.Get("state")); again {
		t.Fatal("state should be single-use")
	}
}

func TestGoogleOAuthConfigRequiresStoredClient(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	if _, err := s.googleOAuthConfig(); err == nil {
		t.Fatal("expected an error before a client is configured")
	}

	seedGoogleClient(t, s, "client-id", "client-secret")
	conf, err := s.googleOAuthConfig()
	if err != nil {
		t.Fatalf("googleOAuthConfig: %v", err)
	}
	if conf.ClientID != "client-id" || conf.ClientSecret != "client-secret" {
		t.Fatalf("config = (%q, %q), want the stored client", conf.ClientID, conf.ClientSecret)
	}
	if conf.RedirectURL != s.googleRedirectURL() {
		t.Fatalf("redirect = %q, want %q", conf.RedirectURL, s.googleRedirectURL())
	}
}

func putIntegration(t *testing.T, s *Server, body string) int {
	t.Helper()
	rr := httptest.NewRecorder()
	s.handleUpdateBackupIntegration(rr, httptest.NewRequest(http.MethodPut, "/api/admin/backup-destination/integration", strings.NewReader(body)))
	return rr.Code
}

func TestBackupIntegrationHandlers(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	s.sseHub = NewSSEHub()

	type view struct {
		ClientID               string `json:"client_id"`
		ClientSecretConfigured bool   `json:"client_secret_configured"`
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

	// Validation.
	if code := putIntegration(t, s, `{"client_id":""}`); code != http.StatusBadRequest {
		t.Fatalf("empty client_id = %d, want 400", code)
	}
	if code := putIntegration(t, s, `{"client_id":"id","client_secret":"short"}`); code != http.StatusBadRequest {
		t.Fatalf("short secret = %d, want 400", code)
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

	// The destination status reports the client as configured.
	dest, err := s.destinationStatus()
	if err != nil {
		t.Fatalf("destinationStatus: %v", err)
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
	uploaded []string
	payload  []byte
	err      error
}

func (f *fakeUploader) Upload(_ context.Context, name string, body io.Reader) error {
	if f.err != nil {
		return f.err
	}
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	f.mu.Lock()
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

// newRemoteTestServer returns a server with a connected (unencrypted)
// destination and a fake uploader.
func newRemoteTestServer(t *testing.T) (*Server, *fakeUploader) {
	t.Helper()
	s, _ := newBackupTestServer(t)
	s.sseHub = NewSSEHub()

	sealed, err := encryptSecret("fake-refresh-token")
	if err != nil {
		t.Fatalf("encryptSecret: %v", err)
	}
	if err := s.saveDestinationConnected("me@example.com", googleDriveFolderName, "folder-123", sealed, ""); err != nil {
		t.Fatalf("saveDestinationConnected: %v", err)
	}

	fake := &fakeUploader{}
	s.remote = fake
	return s, fake
}

func TestCreateBackupUploadsUnencryptedWithoutKey(t *testing.T) {
	s, fake := newRemoteTestServer(t)

	rec := createBackupViaHandler(t, s)
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
	// No key set, so the .zip is uploaded as-is (a real zip starts with "PK").
	if got := fake.lastName(); got != rec.Filename {
		t.Fatalf("uploaded name = %q, want the plain archive %q", got, rec.Filename)
	}
	if payload := fake.lastPayload(); !bytes.HasPrefix(payload, []byte("PK")) {
		t.Fatalf("expected an unencrypted zip payload, got %q", payload[:min(4, len(payload))])
	}
}

func TestCreateBackupEncryptsWhenKeySet(t *testing.T) {
	s, fake := newRemoteTestServer(t)

	sealedToken, _ := encryptSecret("fake-refresh-token")
	sealedKey, _ := encryptSecret("operator-backup-key")
	if err := s.saveDestinationConnected("me@example.com", googleDriveFolderName, "folder-123", sealedToken, sealedKey); err != nil {
		t.Fatalf("saveDestinationConnected: %v", err)
	}

	rec := createBackupViaHandler(t, s)
	waitForRemoteStatus(t, s, rec.ID, "uploaded")

	if got := fake.lastName(); !strings.HasSuffix(got, googleDriveUploadSuffix) {
		t.Fatalf("uploaded name = %q, want a %s suffix", got, googleDriveUploadSuffix)
	}
	if payload := fake.lastPayload(); !bytes.HasPrefix(payload, []byte(backupMagic)) {
		t.Fatalf("expected a %q-prefixed payload, got %q", backupMagic, payload[:min(4, len(payload))])
	}
}

func TestCreateBackupUploadFailureIsRecorded(t *testing.T) {
	s, fake := newRemoteTestServer(t)
	fake.err = context.DeadlineExceeded

	rec := createBackupViaHandler(t, s)
	stored := waitForRemoteStatus(t, s, rec.ID, "failed")
	if stored.Status != "success" {
		t.Fatalf("local snapshot should still succeed, got %q", stored.Status)
	}
	if stored.RemoteError == "" {
		t.Fatal("remote_error should describe the failure")
	}

	dest, err := s.destinationStatus()
	if err != nil {
		t.Fatalf("destinationStatus: %v", err)
	}
	if dest.LastError == "" {
		t.Fatal("destination last_error should be set after a failed upload")
	}
}

func TestCreateBackupSkipsUploadWhenDisabled(t *testing.T) {
	s, fake := newRemoteTestServer(t)
	if err := s.setDestinationEnabled(false); err != nil {
		t.Fatalf("setDestinationEnabled: %v", err)
	}

	rec := createBackupViaHandler(t, s)
	if rec.RemoteStatus != "" {
		t.Fatalf("remote_status = %q, want empty for a disabled destination", rec.RemoteStatus)
	}

	// Give any (incorrect) background upload a chance to run.
	time.Sleep(200 * time.Millisecond)
	if fake.count() != 0 {
		t.Fatalf("uploads = %d, want 0", fake.count())
	}
}
