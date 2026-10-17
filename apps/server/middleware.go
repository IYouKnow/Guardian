package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// --- Middleware ---

func corsHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
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
		if ok, retry := s.authIPLimiter.allow(getClientIP(r)); !ok {
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
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(SecretKey), nil
	})

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
	claims := jwt.MapClaims{
		"sub": userID,
		"iss": "guardian-server",
		"exp": time.Now().Add(TokenDuration).Unix(),
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