package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// --- Middleware ---

// originPermitted reports whether a browser Origin may be trusted: it is on the
// configured/default allowlist, or it is same-origin with the request (the
// embedded admin SPA). Used by both CORS and the WebSocket handshake.
func (s *Server) originPermitted(r *http.Request, origin string) bool {
	if s.allowedOrigins.allows(origin) {
		return true
	}
	if u, err := url.Parse(origin); err == nil && strings.EqualFold(u.Host, r.Host) {
		return true
	}
	return false
}

// corsHandler applies CORS only for permitted origins, echoing the caller's
// origin instead of the wildcard so any website can no longer read responses.
func (s *Server) corsHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Origin")

		origin := r.Header.Get("Origin")
		allowed := origin != "" && s.originPermitted(r, origin)
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		}

		if r.Method == http.MethodOptions {
			if origin != "" && !allowed {
				http.Error(w, "CORS origin not allowed", http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// cspPolicy locks the served admin panel down to same-origin assets. Scripts stay
// same-origin (the panel keeps its bearer token in localStorage, so XSS is the
// main risk); frame-ancestors/X-Frame-Options block clickjacking; connect-src
// allows the same-origin events WebSocket.
const cspPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; " +
	"img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:; " +
	"object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"

// hstsPolicy pins browsers to HTTPS for a year once a secure request is seen.
// includeSubDomains is intentionally omitted so a self-hosted domain's other
// hosts aren't forced to HTTPS.
const hstsPolicy = "max-age=31536000"

// securityHeaders hardens every response, including the SPA fallback and API
// responses. It is applied outermost so headers are present even on errors.
func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", cspPolicy)
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
		if s.requestIsHTTPS(r) {
			h.Set("Strict-Transport-Security", hstsPolicy)
		}
		next.ServeHTTP(w, r)
	})
}

// requestIsHTTPS reports whether the client reached the edge over HTTPS: either
// the server terminated TLS itself, or a trusted proxy did and forwarded
// X-Forwarded-Proto: https. The header is honoured only from a trusted peer, so a
// client can't force HSTS onto a plaintext connection.
func (s *Server) requestIsHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	remote, ok := parseIP(r.RemoteAddr)
	if !ok || !s.isTrustedProxy(remote) {
		return false
	}
	proto := r.Header.Get("X-Forwarded-Proto")
	if i := strings.IndexByte(proto, ','); i >= 0 {
		proto = proto[:i]
	}
	return strings.EqualFold(strings.TrimSpace(proto), "https")
}

// withUserAuth validates JWT and adds user_id to context
func (s *Server) withUserAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := s.validateToken(r)
		if err != nil {
			s.logger.Println("withUserAuth: token validation failed:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next(w, r.WithContext(ctx))
	}
}

// withAuthRateLimit throttles auth routes by client IP. It runs before the body
// is read so oversized/expensive requests are rejected early.
func (s *Server) withAuthRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if ok, retry := s.authIPLimiter.allow(s.getClientIP(r)); !ok {
			w.Header().Set("Retry-After", strconv.Itoa(int(retry.Seconds())+1))
			writeJSON(w, http.StatusTooManyRequests, map[string]string{
				"message": "Too many attempts. Try again later.",
			})
			return
		}
		next(w, r)
	}
}

// withMaxBody caps the number of bytes a handler will read from the request body.
func withMaxBody(limit int64, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, limit)
		next(w, r)
	}
}

// withAdminAuth validates JWT AND checks if user is admin
func (s *Server) withAdminAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.logger.Println("withAdminAuth: validating token")
		userID, err := s.validateToken(r)
		if err != nil {
			s.logger.Println("withAdminAuth: token validation failed:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check Admin Status in DB
		var isAdmin bool
		err = s.systemDB.QueryRow("SELECT is_admin FROM users WHERE id = ?", userID).Scan(&isAdmin)
		if err != nil || !isAdmin {
			s.logger.Printf("withAdminAuth: user %d is not admin (isAdmin=%v, err=%v)\n", userID, isAdmin, err)
			http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
			return
		}

		s.logger.Printf("withAdminAuth: user %d is admin, proceeding\n", userID)
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) validateToken(r *http.Request) (int, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return 0, fmt.Errorf("missing header")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(SecretKey), nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(jwtIssuer),
		jwt.WithIssuedAt(),
		jwt.WithExpirationRequired(),
	)

	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, fmt.Errorf("invalid claims")
	}

	userIDFloat, ok := claims["sub"].(float64)
	if !ok {
		return 0, fmt.Errorf("invalid user id")
	}
	userID := int(userIDFloat)

	// Tokens issued before this claim existed have no "ver" and default to 0.
	tokenVersion, _ := claims["ver"].(float64)

	// Reject tokens for accounts that are no longer active, and tokens whose
	// version no longer matches the stored one (revoked by disable/suspend).
	var status string
	var dbVersion int
	if err := s.systemDB.QueryRow(
		"SELECT status, COALESCE(token_version, 0) FROM users WHERE id = ?", userID,
	).Scan(&status, &dbVersion); err != nil {
		return 0, fmt.Errorf("user lookup failed")
	}
	if status != "ACTIVE" {
		return 0, fmt.Errorf("account is not active")
	}
	if int(tokenVersion) != dbVersion {
		return 0, fmt.Errorf("token has been revoked")
	}

	return userID, nil
}

// --- Helpers ---

func createToken(userID int, tokenVersion int) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID,
		"iss": jwtIssuer,
		"iat": now.Unix(),
		"exp": now.Add(TokenDuration).Unix(),
		"jti": uuid.NewString(),
		"ver": tokenVersion,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(SecretKey))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// decodeJSON decodes a JSON request body into dst. On failure it writes the
// response itself (413 when the body exceeds the cap, 400 otherwise) and
// reports false so the caller can return immediately.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{
				"message": "Request body too large",
			})
			return false
		}
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return false
	}
	return true
}

func formatBytes(b int64) string {
	switch {
	case b < 1024:
		return fmt.Sprintf("%d B", b)
	case b < 1024*1024:
		return fmt.Sprintf("%.1f KB", float64(b)/1024)
	case b < 1024*1024*1024:
		return fmt.Sprintf("%.1f MB", float64(b)/(1024*1024))
	default:
		return fmt.Sprintf("%.2f GB", float64(b)/(1024*1024*1024))
	}
}