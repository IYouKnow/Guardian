package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/argon2"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

// Remote backups: in addition to the local .zip snapshot, a copy can be pushed to
// the operator's own Google Drive. If the operator sets a backup key, the copy is
// sealed with it before it leaves the host; otherwise the .zip is uploaded as-is
// (the vault item blobs are still end-to-end encrypted either way). Both the
// refresh token and the backup key are encrypted at rest.

const (
	googleDriveProvider     = "google_drive"
	googleDriveFolderName   = "Guardian Backups"
	googleDriveCallbackPath = "/api/backup-destination/google/callback"
	googleDriveUploadSuffix = ".enc"
	// googleRevokeEndpoint withdraws a user's grant when they disconnect.
	googleRevokeEndpoint = "https://oauth2.googleapis.com/revoke"
)

// remoteUploadTimeout bounds a single background upload to Google Drive.
const remoteUploadTimeout = 30 * time.Minute

// googleRevokeURL is where a disconnect withdraws the grant. It is a variable so
// tests can point it at a stub instead of reaching Google.
var googleRevokeURL = googleRevokeEndpoint

// The Google OAuth client is a server setting, not a build-time constant: the
// operator creates their own **Web application** client and enters its ID and
// secret in Settings → Backups. Keeping it out of the source means no
// confidential secret ships inside every deployed binary.
//
// A secret is required: Google's token endpoint rejects a secretless PKCE
// exchange with `invalid_request: client_secret is missing`, for both the initial
// code exchange and refreshes. Because every user links their own Drive from
// their own browser, the client must be a Web application with the callback
// registered as an authorized redirect URI — a Desktop client only permits
// loopback redirects, which resolve to the user's own machine. Google rejects
// raw-IP and plain-HTTP redirect URIs, so a real domain over HTTPS is required
// (it may point at a LAN address).
const (
	googleClientIDSetting     = "google_drive_client_id"
	googleClientSecretSetting = "google_drive_client_secret_enc"
	publicURLSetting          = "public_url"
)

// minClientSecretLength is a sanity check that the operator pasted a real Google
// client secret rather than a fragment.
const minClientSecretLength = 10

// errDriveClientNotConfigured is returned until the operator stores a client.
var errDriveClientNotConfigured = errors.New("google oauth client is not configured")

// --- Archive encryption (format "GBK1") ---
//
// Used only when the operator has set a backup key. An uploaded snapshot is a
// stream: magic "GBK1", a 16-byte Argon2id salt, then 1 MiB frames of
// [12-byte nonce][4-byte big-endian length][ciphertext + GCM tag]. The key is
// Argon2id(backupKey, salt) and each frame is AES-256-GCM, with the frame index
// bound as additional authenticated data so frames cannot be reordered or
// dropped. The format is documented so a future tool can decrypt an upload; the
// local .zip stays cleartext.

const (
	backupMagic     = "GBK1"
	backupSaltLen   = 16
	backupFrameSize = 1 << 20 // 1 MiB plaintext per frame

	argon2Time    = 4
	argon2Memory  = 64 * 1024 // KiB
	argon2Threads = 1
	argon2KeyLen  = 32
)

var errArchiveTruncated = errors.New("encrypted archive is truncated")

func deriveArchiveKey(passphrase string, salt []byte) []byte {
	return argon2.IDKey([]byte(passphrase), salt, argon2Time, argon2Memory, argon2Threads, argon2KeyLen)
}

// encryptArchive seals plain into GBK1 frames, returned as a lazily-produced
// reader so a large snapshot streams without being held in memory. The caller
// must consume or close the reader.
func encryptArchive(passphrase string, plain io.Reader) (io.Reader, error) {
	salt := make([]byte, backupSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}
	key := deriveArchiveKey(passphrase, salt)

	pr, pw := io.Pipe()
	go func() {
		pw.CloseWithError(writeEncryptedFrames(pw, key, salt, plain))
	}()
	return pr, nil
}

func writeEncryptedFrames(w io.Writer, key, salt []byte, plain io.Reader) error {
	if _, err := w.Write([]byte(backupMagic)); err != nil {
		return err
	}
	if _, err := w.Write(salt); err != nil {
		return err
	}

	gcm, err := newGCM(key)
	if err != nil {
		return err
	}

	buf := make([]byte, backupFrameSize)
	var index uint64
	for {
		n, readErr := io.ReadFull(plain, buf)
		if n > 0 {
			nonce := make([]byte, gcm.NonceSize())
			if _, err := rand.Read(nonce); err != nil {
				return err
			}
			var aad [8]byte
			binary.BigEndian.PutUint64(aad[:], index)
			ct := gcm.Seal(nil, nonce, buf[:n], aad[:])

			var lenBuf [4]byte
			binary.BigEndian.PutUint32(lenBuf[:], uint32(len(ct)))
			if _, err := w.Write(nonce); err != nil {
				return err
			}
			if _, err := w.Write(lenBuf[:]); err != nil {
				return err
			}
			if _, err := w.Write(ct); err != nil {
				return err
			}
			index++
		}
		if readErr == io.EOF || readErr == io.ErrUnexpectedEOF {
			return nil
		}
		if readErr != nil {
			return readErr
		}
	}
}

// decryptArchive is the inverse of encryptArchive. A wrong passphrase (or
// tampered ciphertext) surfaces as an error on the first frame.
func decryptArchive(passphrase string, src io.Reader) (io.Reader, error) {
	magic := make([]byte, len(backupMagic))
	if _, err := io.ReadFull(src, magic); err != nil {
		return nil, errArchiveTruncated
	}
	if string(magic) != backupMagic {
		return nil, errors.New("not a guardian backup archive")
	}
	salt := make([]byte, backupSaltLen)
	if _, err := io.ReadFull(src, salt); err != nil {
		return nil, errArchiveTruncated
	}
	key := deriveArchiveKey(passphrase, salt)

	pr, pw := io.Pipe()
	go func() {
		pw.CloseWithError(readEncryptedFrames(pw, key, src))
	}()
	return pr, nil
}

func readEncryptedFrames(w io.Writer, key []byte, src io.Reader) error {
	gcm, err := newGCM(key)
	if err != nil {
		return err
	}
	nonceSize := gcm.NonceSize()

	var index uint64
	for {
		nonce := make([]byte, nonceSize)
		if _, err := io.ReadFull(src, nonce); err != nil {
			if err == io.EOF {
				return nil // clean end of stream
			}
			return errArchiveTruncated
		}
		var lenBuf [4]byte
		if _, err := io.ReadFull(src, lenBuf[:]); err != nil {
			return errArchiveTruncated
		}
		ctLen := binary.BigEndian.Uint32(lenBuf[:])
		if ctLen < uint32(gcm.Overhead()) {
			return errArchiveTruncated
		}
		ct := make([]byte, ctLen)
		if _, err := io.ReadFull(src, ct); err != nil {
			return errArchiveTruncated
		}
		var aad [8]byte
		binary.BigEndian.PutUint64(aad[:], index)
		pt, err := gcm.Open(nil, nonce, ct, aad[:])
		if err != nil {
			return err
		}
		if _, err := w.Write(pt); err != nil {
			return err
		}
		index++
	}
}

func newGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// --- At-rest encryption for the OAuth refresh token ---

// encryptSecret seals s under the JWT-derived key, returned as base64(nonce||ct).
func encryptSecret(s string) (string, error) {
	key, err := tokenEncryptionKey()
	if err != nil {
		return "", err
	}
	gcm, err := newGCM(key)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(s), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

func decryptSecret(enc string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return "", err
	}
	key, err := tokenEncryptionKey()
	if err != nil {
		return "", err
	}
	gcm, err := newGCM(key)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("sealed value is too short")
	}
	pt, err := gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}

// --- Destination model & storage ---

// RemoteDestination is the API view of the remote destination. It never carries
// the refresh token.
type RemoteDestination struct {
	Provider         string     `json:"provider"`
	Connected        bool       `json:"connected"`
	Enabled          bool       `json:"enabled"`
	AccountEmail     string     `json:"account_email"`
	FolderName       string     `json:"folder_name"`
	FolderID         string     `json:"folder_id"`
	ConnectedAt      *time.Time `json:"connected_at"`
	LastSync         *time.Time `json:"last_sync"`
	LastError        string     `json:"last_error"`
	Encrypted        bool       `json:"encrypted"`
	ClientConfigured bool       `json:"client_configured"`
}

type destinationRow struct {
	AccountEmail    string
	FolderName      string
	FolderID        string
	RefreshTokenEnc string
	BackupKeyEnc    string
	Enabled         bool
	ConnectedAt     sql.NullTime
	LastSync        sql.NullTime
	LastError       string
}

func (s *Server) loadUserDestinationRow(ownerID int) (destinationRow, bool, error) {
	var row destinationRow
	err := s.systemDB.QueryRow(`
		SELECT account_email, folder_name, folder_id, refresh_token_enc, backup_key_enc, enabled, connected_at, last_sync, last_error
		FROM user_destinations WHERE provider = ? AND owner_id = ?
	`, googleDriveProvider, ownerID).Scan(
		&row.AccountEmail, &row.FolderName, &row.FolderID, &row.RefreshTokenEnc, &row.BackupKeyEnc,
		&row.Enabled, &row.ConnectedAt, &row.LastSync, &row.LastError,
	)
	if err == sql.ErrNoRows {
		return destinationRow{}, false, nil
	}
	if err != nil {
		return destinationRow{}, false, err
	}
	return row, true, nil
}

// userDestinationStatus builds the client-facing view for one user. It reports
// whether uploads are encrypted (a backup key is set) but never returns the key.
func (s *Server) userDestinationStatus(ownerID int) (RemoteDestination, error) {
	out := RemoteDestination{Provider: googleDriveProvider}

	clientID, clientSecret, err := s.googleClientCredentials()
	if err != nil {
		return out, err
	}
	out.ClientConfigured = clientID != "" && clientSecret != ""

	row, ok, err := s.loadUserDestinationRow(ownerID)
	if err != nil {
		return out, err
	}
	if !ok {
		return out, nil
	}

	out.Connected = row.RefreshTokenEnc != ""
	out.Enabled = row.Enabled
	out.AccountEmail = row.AccountEmail
	out.FolderName = row.FolderName
	out.FolderID = row.FolderID
	out.LastError = row.LastError
	out.Encrypted = row.BackupKeyEnc != ""
	if row.ConnectedAt.Valid {
		t := row.ConnectedAt.Time
		out.ConnectedAt = &t
	}
	if row.LastSync.Valid {
		t := row.LastSync.Time
		out.LastSync = &t
	}
	return out, nil
}

// saveUserDestinationConnected records (or replaces) one user's connected Drive
// account. An empty backupKeyEnc preserves a key from a previous connection, so
// reconnecting never silently downgrades an encrypted destination.
func (s *Server) saveUserDestinationConnected(ownerID int, email, folderName, folderID, refreshTokenEnc, backupKeyEnc string) error {
	_, err := s.systemDB.Exec(`
		INSERT INTO user_destinations (provider, owner_id, account_email, folder_name, folder_id, refresh_token_enc, backup_key_enc, enabled, connected_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
		ON CONFLICT(provider, owner_id) DO UPDATE SET
			account_email = excluded.account_email,
			folder_name = excluded.folder_name,
			folder_id = excluded.folder_id,
			refresh_token_enc = excluded.refresh_token_enc,
			backup_key_enc = CASE WHEN excluded.backup_key_enc = '' THEN user_destinations.backup_key_enc ELSE excluded.backup_key_enc END,
			enabled = 1,
			connected_at = CURRENT_TIMESTAMP,
			last_error = ''
	`, googleDriveProvider, ownerID, email, folderName, folderID, refreshTokenEnc, backupKeyEnc)
	return err
}

func (s *Server) setUserDestinationEnabled(ownerID int, enabled bool) error {
	val := 0
	if enabled {
		val = 1
	}
	_, err := s.systemDB.Exec("UPDATE user_destinations SET enabled = ? WHERE provider = ? AND owner_id = ?", val, googleDriveProvider, ownerID)
	return err
}

func (s *Server) clearUserDestination(ownerID int) error {
	_, err := s.systemDB.Exec("DELETE FROM user_destinations WHERE provider = ? AND owner_id = ?", googleDriveProvider, ownerID)
	return err
}

// setUserDestinationSync records the outcome of an upload on one user's row.
func (s *Server) setUserDestinationSync(ownerID int, lastErr string) {
	if lastErr == "" {
		if _, err := s.systemDB.Exec(
			"UPDATE user_destinations SET last_sync = CURRENT_TIMESTAMP, last_error = '' WHERE provider = ? AND owner_id = ?",
			googleDriveProvider, ownerID,
		); err != nil {
			s.logger.Println("setUserDestinationSync:", err)
		}
		return
	}
	if _, err := s.systemDB.Exec(
		"UPDATE user_destinations SET last_error = ? WHERE provider = ? AND owner_id = ?", lastErr, googleDriveProvider, ownerID,
	); err != nil {
		s.logger.Println("setUserDestinationSync:", err)
	}
}

func (s *Server) userDestinationRefreshToken(ownerID int) (string, bool, error) {
	row, ok, err := s.loadUserDestinationRow(ownerID)
	if err != nil {
		return "", false, err
	}
	if !ok || row.RefreshTokenEnc == "" {
		return "", false, nil
	}
	token, err := decryptSecret(row.RefreshTokenEnc)
	if err != nil {
		return "", false, err
	}
	return token, true, nil
}

// minBackupKeyLength keeps an operator-supplied archive key out of brute-force
// range before Argon2id is applied.
const minBackupKeyLength = 12

// validateBackupKey checks an operator-supplied archive key. The key is optional:
// an empty value means uploads are not encrypted.
func validateBackupKey(key string) error {
	if key == "" {
		return nil
	}
	if len(key) < minBackupKeyLength {
		return fmt.Errorf("backup key must be at least %d characters", minBackupKeyLength)
	}
	return nil
}

// sanitizeFolderName validates an operator-chosen Drive folder name, falling back
// to the default. Query-significant characters are escaped when the folder is
// looked up, not here, so the stored name stays readable.
func sanitizeFolderName(name string) string {
	name = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, strings.TrimSpace(name))
	if name == "" {
		return googleDriveFolderName
	}
	if len(name) > 100 {
		name = name[:100]
	}
	return name
}

// userDestinationBackupKey returns one user's archive key, decrypted, when one is
// set. ok is false when no key is configured (uploads stay unencrypted).
func (s *Server) userDestinationBackupKey(ownerID int) (string, bool, error) {
	row, ok, err := s.loadUserDestinationRow(ownerID)
	if err != nil {
		return "", false, err
	}
	if !ok || row.BackupKeyEnc == "" {
		return "", false, nil
	}
	key, err := decryptSecret(row.BackupKeyEnc)
	if err != nil {
		return "", false, err
	}
	return key, true, nil
}

// --- Remote upload ---

// remoteUploader uploads an already-encrypted snapshot to one user's
// destination. It is an interface so tests can inject a fake.
type remoteUploader interface {
	Upload(ctx context.Context, ownerID int, name string, body io.Reader) error
}

// remotePlanFor decides whether a freshly-created snapshot owned by ownerID
// should be uploaded. A destination that is absent, disabled, or disconnected
// means no upload.
func (s *Server) remotePlanFor(ownerID int) (upload bool, status, errMsg string) {
	if s.remote == nil {
		return false, "", ""
	}
	if _, ok, err := s.userDestinationRefreshToken(ownerID); err != nil || !ok {
		return false, "", ""
	}
	row, ok, err := s.loadUserDestinationRow(ownerID)
	if err != nil || !ok || !row.Enabled {
		return false, "", ""
	}
	return true, "pending", ""
}

// uploadBackup pushes one user's finished snapshot to their destination —
// encrypting it first only when they set a backup key — then records the outcome.
// It runs in the background so the HTTP request that triggered the snapshot is
// not held open for the whole upload.
func (s *Server) uploadBackup(backupID int64, ownerID int, archivePath, filename string) {
	ctx, cancel := context.WithTimeout(context.Background(), remoteUploadTimeout)
	defer cancel()

	f, err := os.Open(archivePath)
	if err != nil {
		s.finishUpload(backupID, ownerID, err)
		return
	}
	defer f.Close()

	name := filename
	var body io.Reader = f

	if key, ok, err := s.userDestinationBackupKey(ownerID); err != nil {
		s.finishUpload(backupID, ownerID, err)
		return
	} else if ok {
		encrypted, err := encryptArchive(key, f)
		if err != nil {
			s.finishUpload(backupID, ownerID, err)
			return
		}
		// Closing the read end unblocks the encoder goroutine if the upload aborts.
		if closer, ok := encrypted.(io.Closer); ok {
			defer closer.Close()
		}
		body = encrypted
		name = filename + googleDriveUploadSuffix
	}

	if err := s.remote.Upload(ctx, ownerID, name, body); err != nil {
		s.finishUpload(backupID, ownerID, err)
		return
	}
	s.finishUpload(backupID, ownerID, nil)
}

func (s *Server) finishUpload(backupID int64, ownerID int, uploadErr error) {
	status := "uploaded"
	msg := ""
	if uploadErr != nil {
		status = "failed"
		msg = uploadErr.Error()
		s.logger.Printf("backup %d: remote upload failed: %v", backupID, uploadErr)
	}
	if _, err := s.systemDB.Exec(
		"UPDATE backups SET remote_status = ?, remote_error = ? WHERE id = ?", status, msg, backupID,
	); err != nil {
		s.logger.Println("finishUpload: update backup row:", err)
	}
	s.setUserDestinationSync(ownerID, msg)
	s.sseHub.BroadcastAll("backup_updated")
}

// driveUploader implements remoteUploader against the Google Drive REST API,
// resolving the owner's stored refresh token and folder at upload time.
type driveUploader struct{ server *Server }

func (u *driveUploader) Upload(ctx context.Context, ownerID int, name string, body io.Reader) error {
	refreshToken, ok, err := u.server.userDestinationRefreshToken(ownerID)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("google drive is not connected")
	}

	row, ok, err := u.server.loadUserDestinationRow(ownerID)
	if err != nil {
		return err
	}
	if !ok || row.FolderID == "" {
		return errors.New("google drive backup folder is not set")
	}

	conf, err := u.server.googleOAuthConfig(u.server.oauthRedirectURL(nil))
	if err != nil {
		return err
	}
	svc, err := drive.NewService(ctx, option.WithTokenSource(conf.TokenSource(ctx, &oauth2.Token{RefreshToken: refreshToken})))
	if err != nil {
		return err
	}

	_, err = svc.Files.Create(&drive.File{Name: name, Parents: []string{row.FolderID}}).
		Media(body, googleapi.ChunkSize(8<<20)).
		Fields("id").
		Do()
	return err
}

// --- OAuth (bundled Desktop client, PKCE, no secret) ---

// oauthPending is an in-flight authorization, keyed by the state parameter. It
// also carries the destination settings collected before the redirect so the
// callback (which has no bearer token) can apply them.
type oauthPending struct {
	verifier   string
	userID     int
	backupKey  string
	folderName string
	createdAt  time.Time
}

const (
	oauthStateTTL     = 10 * time.Minute
	oauthStateCleanup = 2 * time.Minute
)

var (
	oauthStates    = make(map[string]oauthPending)
	oauthStatesMu  sync.Mutex
	oauthStateOnce sync.Once
)

func storeOAuthState(state, verifier string, userID int, backupKey, folderName string) {
	oauthStateOnce.Do(func() { go oauthStateSweeper() })

	oauthStatesMu.Lock()
	oauthStates[state] = oauthPending{
		verifier:   verifier,
		userID:     userID,
		backupKey:  backupKey,
		folderName: folderName,
		createdAt:  time.Now(),
	}
	oauthStatesMu.Unlock()
}

func takeOAuthState(state string) (oauthPending, bool) {
	oauthStatesMu.Lock()
	defer oauthStatesMu.Unlock()
	p, ok := oauthStates[state]
	if ok {
		delete(oauthStates, state)
	}
	return p, ok
}

func oauthStateSweeper() {
	ticker := time.NewTicker(oauthStateCleanup)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		oauthStatesMu.Lock()
		for k, v := range oauthStates {
			if now.Sub(v.createdAt) > oauthStateTTL {
				delete(oauthStates, k)
			}
		}
		oauthStatesMu.Unlock()
	}
}

func randomURLToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// publicURL returns the operator-set base URL (trailing slashes trimmed), or "".
func (s *Server) publicURL() string {
	var v string
	if err := s.systemDB.QueryRow("SELECT value FROM server_settings WHERE key = ?", publicURLSetting).Scan(&v); err != nil {
		return ""
	}
	return strings.TrimRight(strings.TrimSpace(v), "/")
}

// oauthRedirectURL resolves the callback Google sends the browser back to. It
// prefers the operator-set public URL; otherwise it derives the scheme and host
// from the incoming request (honouring a trusted X-Forwarded-Proto). The value
// must exactly match an authorized redirect URI on the Web-application client.
//
// A nil request (a background token refresh, which never sends a redirect URI)
// falls back to loopback.
func (s *Server) oauthRedirectURL(r *http.Request) string {
	if base := s.publicURL(); base != "" {
		return base + googleDriveCallbackPath
	}

	scheme := "http"
	host := ""
	if r != nil {
		if s.requestIsHTTPS(r) {
			scheme = "https"
		}
		host = r.Host
	}
	if host == "" {
		port := s.config.Port
		if port == "" {
			port = "8080"
		}
		host = "127.0.0.1:" + port
	}
	return fmt.Sprintf("%s://%s%s", scheme, host, googleDriveCallbackPath)
}

// googleClientCredentials returns the operator-supplied Google OAuth client. The
// secret is decrypted from its sealed form; both are empty when unconfigured.
func (s *Server) googleClientCredentials() (string, string, error) {
	var clientID, encSecret string
	if err := s.systemDB.QueryRow(
		"SELECT value FROM server_settings WHERE key = ?", googleClientIDSetting,
	).Scan(&clientID); err != nil && err != sql.ErrNoRows {
		return "", "", err
	}
	if err := s.systemDB.QueryRow(
		"SELECT value FROM server_settings WHERE key = ?", googleClientSecretSetting,
	).Scan(&encSecret); err != nil && err != sql.ErrNoRows {
		return "", "", err
	}
	if encSecret == "" {
		return clientID, "", nil
	}
	secret, err := decryptSecret(encSecret)
	if err != nil {
		return clientID, "", err
	}
	return clientID, secret, nil
}

// saveGoogleClient stores the client ID and, when a new one is given, the sealed
// client secret. An empty secret leaves the stored one untouched, so the console
// never has to round-trip the value.
func (s *Server) saveGoogleClient(clientID, clientSecret string) error {
	if _, err := s.systemDB.Exec(`
		INSERT INTO server_settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, googleClientIDSetting, clientID); err != nil {
		return err
	}
	if clientSecret == "" {
		return nil
	}
	sealed, err := encryptSecret(clientSecret)
	if err != nil {
		return err
	}
	_, err = s.systemDB.Exec(`
		INSERT INTO server_settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, googleClientSecretSetting, sealed)
	return err
}

// googleOAuthConfig builds the OAuth config from the stored client, or reports
// that the operator has not configured one yet.
func (s *Server) googleOAuthConfig(redirectURL string) (*oauth2.Config, error) {
	clientID, clientSecret, err := s.googleClientCredentials()
	if err != nil {
		return nil, err
	}
	if clientID == "" || clientSecret == "" {
		return nil, errDriveClientNotConfigured
	}
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{drive.DriveFileScope},
		Endpoint:     google.Endpoint,
	}, nil
}

// handleGetUserDestination returns the caller's own destination status.
func (s *Server) handleGetUserDestination(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	dest, err := s.userDestinationStatus(userID)
	if err != nil {
		s.logger.Println("handleGetUserDestination:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, dest)
}

// handleStartUserGoogleOAuth records the caller's destination settings (an
// optional backup key and folder name) and returns the Google consent URL. The
// settings body is optional.
func (s *Server) handleStartUserGoogleOAuth(w http.ResponseWriter, r *http.Request) {
	conf, err := s.googleOAuthConfig(s.oauthRedirectURL(r))
	if err != nil {
		http.Error(w, "Google Drive is not configured on this server yet", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		BackupKey  string `json:"backup_key"`
		FolderName string `json:"folder_name"`
	}
	if r.ContentLength != 0 {
		if !decodeJSON(w, r, &req) {
			return
		}
	}
	backupKey := strings.TrimSpace(req.BackupKey)
	if err := validateBackupKey(backupKey); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID, _ := r.Context().Value(userIDKey).(int)

	state := randomURLToken(32)
	verifier := randomURLToken(32)
	if state == "" || verifier == "" {
		http.Error(w, "Failed to start authorization", http.StatusInternalServerError)
		return
	}
	storeOAuthState(state, verifier, userID, backupKey, sanitizeFolderName(req.FolderName))

	authURL := conf.AuthCodeURL(
		state,
		oauth2.AccessTypeOffline,
		oauth2.S256ChallengeOption(verifier),
		oauth2.SetAuthURLParam("prompt", "consent"),
	)
	writeJSON(w, http.StatusOK, map[string]string{"auth_url": authURL})
}

// handleGoogleOAuthCallback completes the flow. It is reached by Google's
// redirect, so it is not bearer-authenticated; the unguessable, short-lived,
// server-held state value authenticates the exchange instead.
func (s *Server) handleGoogleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if errParam := q.Get("error"); errParam != "" {
		s.redirectGoogleResult(w, r, "error", errParam)
		return
	}

	state := q.Get("state")
	code := q.Get("code")
	if state == "" || code == "" {
		s.redirectGoogleResult(w, r, "error", "missing_state_or_code")
		return
	}

	pending, ok := takeOAuthState(state)
	if !ok || time.Since(pending.createdAt) > oauthStateTTL {
		s.redirectGoogleResult(w, r, "error", "invalid_state")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	conf, err := s.googleOAuthConfig(s.oauthRedirectURL(r))
	if err != nil {
		s.logger.Println("google oauth config:", err)
		s.redirectGoogleResult(w, r, "error", "not_configured")
		return
	}
	token, err := conf.Exchange(ctx, code, oauth2.VerifierOption(pending.verifier))
	if err != nil {
		s.logger.Println("google oauth exchange:", err)
		s.redirectGoogleResult(w, r, "error", "exchange_failed")
		return
	}
	if token.RefreshToken == "" {
		s.redirectGoogleResult(w, r, "error", "no_refresh_token")
		return
	}

	svc, err := drive.NewService(ctx, option.WithTokenSource(conf.TokenSource(ctx, token)))
	if err != nil {
		s.logger.Println("google drive service:", err)
		s.redirectGoogleResult(w, r, "error", "drive_init_failed")
		return
	}

	var email string
	if about, err := svc.About.Get().Fields("user(emailAddress)").Do(); err == nil && about.User != nil {
		email = about.User.EmailAddress
	}

	folderName := pending.folderName
	if folderName == "" {
		folderName = googleDriveFolderName
	}
	folderID, err := ensureDriveFolder(ctx, svc, folderName)
	if err != nil {
		s.logger.Println("google drive folder:", err)
		s.redirectGoogleResult(w, r, "error", "folder_failed")
		return
	}

	encToken, err := encryptSecret(token.RefreshToken)
	if err != nil {
		s.logger.Println("encrypt refresh token:", err)
		s.redirectGoogleResult(w, r, "error", "store_failed")
		return
	}

	// The backup key is optional; when present it is sealed at rest like the token.
	var encKey string
	if pending.backupKey != "" {
		encKey, err = encryptSecret(pending.backupKey)
		if err != nil {
			s.logger.Println("encrypt backup key:", err)
			s.redirectGoogleResult(w, r, "error", "store_failed")
			return
		}
	}

	if err := s.saveUserDestinationConnected(pending.userID, email, folderName, folderID, encToken, encKey); err != nil {
		s.logger.Println("save destination:", err)
		s.redirectGoogleResult(w, r, "error", "store_failed")
		return
	}

	s.recordActivity(s.usernameByID(pending.userID), "connected Google Drive backups", email, "backup")
	s.redirectGoogleResult(w, r, "connected", "")
}

// handleDeleteUserDestination disconnects the caller's destination and withdraws
// the Google grant, so Guardian no longer holds access to their Drive.
func (s *Server) handleDeleteUserDestination(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	// Best-effort revoke before dropping the stored token.
	if token, ok, err := s.userDestinationRefreshToken(userID); err == nil && ok {
		s.revokeGoogleToken(token)
	}

	if err := s.clearUserDestination(userID); err != nil {
		s.logger.Println("handleDeleteUserDestination:", err)
		http.Error(w, "Failed to disconnect", http.StatusInternalServerError)
		return
	}
	s.recordActivity(s.actorName(r), "disconnected Google Drive backups", "", "backup")
	w.WriteHeader(http.StatusNoContent)
}

// handleUpdateUserDestination toggles the caller's destination. Enabling requires
// a connected account.
func (s *Server) handleUpdateUserDestination(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	var req struct {
		Enabled *bool `json:"enabled"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Enabled == nil {
		http.Error(w, "enabled is required", http.StatusBadRequest)
		return
	}

	if *req.Enabled {
		row, ok, err := s.loadUserDestinationRow(userID)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		if !ok || row.RefreshTokenEnc == "" {
			http.Error(w, "Connect Google Drive before enabling it", http.StatusBadRequest)
			return
		}
	}

	if err := s.setUserDestinationEnabled(userID, *req.Enabled); err != nil {
		s.logger.Println("handleUpdateUserDestination:", err)
		http.Error(w, "Failed to update destination", http.StatusInternalServerError)
		return
	}

	action := "paused Google Drive backups"
	if *req.Enabled {
		action = "enabled Google Drive backups"
	}
	s.recordActivity(s.actorName(r), action, "", "backup")

	dest, err := s.userDestinationStatus(userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, dest)
}

// revokeGoogleToken withdraws Guardian's access to the user's Drive. Best-effort:
// a failure is logged but never blocks the local disconnect.
func (s *Server) revokeGoogleToken(token string) {
	if googleRevokeURL == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	body := url.Values{"token": {token}}.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, googleRevokeURL, strings.NewReader(body))
	if err != nil {
		s.logger.Println("revokeGoogleToken: build request:", err)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.logger.Println("revokeGoogleToken:", err)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode != http.StatusOK {
		s.logger.Println("revokeGoogleToken: unexpected status", resp.StatusCode)
	}
}

// backupIntegrationView is the client-facing view of the stored Google client.
// The secret itself is never returned — only whether one is stored. The redirect
// URI is the exact value the operator must register on the Web-application
// client, derived the same way the OAuth flow will use it.
func (s *Server) backupIntegrationView(r *http.Request, clientID, clientSecret string) map[string]any {
	return map[string]any{
		"client_id":                clientID,
		"client_secret_configured": clientSecret != "",
		"public_url":               s.publicURL(),
		"redirect_uri":             s.oauthRedirectURL(r),
	}
}

// savePublicURL stores the operator's public base URL. An empty value clears it,
// so the redirect goes back to being derived from each request.
func (s *Server) savePublicURL(v string) error {
	_, err := s.systemDB.Exec(`
		INSERT INTO server_settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, publicURLSetting, strings.TrimSpace(v))
	return err
}

// validatePublicURL enforces the part of Google's redirect-URI rules the operator
// controls here, so a misconfiguration fails at save time rather than as an
// opaque redirect_uri_mismatch at consent time. The path is ignored — the
// callback path is appended.
func validatePublicURL(raw string) error {
	if raw == "" {
		return nil
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return errors.New("enter an absolute URL such as https://guardian.example.com")
	}
	host := u.Hostname()
	loopback := host == "localhost" || host == "127.0.0.1" || host == "::1"
	if loopback {
		return nil
	}
	if net.ParseIP(host) != nil {
		return errors.New("Google rejects raw IP addresses — use a domain name")
	}
	if u.Scheme != "https" {
		return errors.New("Google requires HTTPS — use an https:// URL")
	}
	return nil
}

// handleGetBackupIntegration reports the operator-supplied Google OAuth client.
func (s *Server) handleGetBackupIntegration(w http.ResponseWriter, r *http.Request) {
	clientID, clientSecret, err := s.googleClientCredentials()
	if err != nil {
		s.logger.Println("handleGetBackupIntegration:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, s.backupIntegrationView(r, clientID, clientSecret))
}

type backupIntegrationRequest struct {
	ClientID     string  `json:"client_id"`
	ClientSecret *string `json:"client_secret"`
	PublicURL    *string `json:"public_url"`
}

// handleUpdateBackupIntegration stores the operator-supplied Google OAuth client
// and, when given, the public URL. An empty client ID leaves the stored client
// untouched (so the public URL can be saved on its own), and an omitted or empty
// secret leaves the stored one untouched, so the console never has to round-trip
// the value.
func (s *Server) handleUpdateBackupIntegration(w http.ResponseWriter, r *http.Request) {
	var req backupIntegrationRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	clientID := strings.TrimSpace(req.ClientID)
	clientSecret := ""
	if req.ClientSecret != nil {
		clientSecret = strings.TrimSpace(*req.ClientSecret)
		if clientSecret != "" && len(clientSecret) < minClientSecretLength {
			http.Error(w, "That does not look like a Google client secret", http.StatusBadRequest)
			return
		}
	}
	if clientID == "" && clientSecret != "" {
		http.Error(w, "A client ID is required alongside the secret", http.StatusBadRequest)
		return
	}
	if clientID == "" && req.PublicURL == nil {
		http.Error(w, "Nothing to update", http.StatusBadRequest)
		return
	}
	if req.PublicURL != nil {
		if err := validatePublicURL(strings.TrimSpace(*req.PublicURL)); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	if clientID != "" {
		if err := s.saveGoogleClient(clientID, clientSecret); err != nil {
			s.logger.Println("handleUpdateBackupIntegration:", err)
			http.Error(w, "Failed to save the Google client", http.StatusInternalServerError)
			return
		}
		s.recordActivity(s.actorName(r), "updated the Google OAuth client", "", "backup")
	}
	if req.PublicURL != nil {
		if err := s.savePublicURL(*req.PublicURL); err != nil {
			s.logger.Println("handleUpdateBackupIntegration: save public url:", err)
			http.Error(w, "Failed to save the public URL", http.StatusInternalServerError)
			return
		}
	}

	storedID, storedSecret, err := s.googleClientCredentials()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, s.backupIntegrationView(r, storedID, storedSecret))
}

// redirectGoogleResult sends the browser back to the console with an outcome.
func (s *Server) redirectGoogleResult(w http.ResponseWriter, r *http.Request, status, reason string) {
	target := "/backups?google=" + url.QueryEscape(status)
	if reason != "" {
		target += "&reason=" + url.QueryEscape(reason)
	}
	http.Redirect(w, r, target, http.StatusFound)
}

// ensureDriveFolder returns the id of the backup folder, creating it if needed.
// The drive.file scope only exposes files this app created, which is exactly the
// folder it manages.
func ensureDriveFolder(ctx context.Context, svc *drive.Service, name string) (string, error) {
	escaped := strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(name)
	q := fmt.Sprintf("mimeType='application/vnd.google-apps.folder' and name='%s' and trashed=false", escaped)
	list, err := svc.Files.List().Q(q).Fields("files(id,name)").PageSize(1).Do()
	if err != nil {
		return "", err
	}
	if len(list.Files) > 0 {
		return list.Files[0].Id, nil
	}
	folder, err := svc.Files.Create(&drive.File{
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
	}).Fields("id").Do()
	if err != nil {
		return "", err
	}
	return folder.Id, nil
}
