package main

import "time"

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const userIDKey contextKey = "user_id"

// --- Models ---
type User struct {
	ID           int        `json:"id"`
	Username     string     `json:"username"`
	PasswordHash string     `json:"-"`
	IsAdmin      bool       `json:"is_admin"`
	DBPath       string     `json:"db_path"`
	FriendlyName string     `json:"friendly_name"`
	Status       string     `json:"status"`
	Role         string     `json:"role"`
	MaxWsPerIP   int        `json:"max_ws_per_ip"`
	CreatedAt    time.Time  `json:"created_at"`
	LastLogin    *time.Time `json:"last_login"`
}

type AdminUserResponse struct {
	ID                int        `json:"id"`
	Username          string     `json:"username"`
	IsAdmin           bool       `json:"is_admin"`
	FriendlyName      string     `json:"friendly_name"`
	Status            string     `json:"status"`
	Role              string     `json:"role"`
	MaxWsPerIP        int        `json:"max_ws_per_ip"`
	VaultItems        int        `json:"vault_items"`
	UsedSpace         string     `json:"used_space"`
	UsedSpaceOverhead string     `json:"used_space_overhead"`
	CreatedAt         time.Time  `json:"created_at"`
	LastLogin         *time.Time `json:"last_login"`
}

type Invite struct {
	ID        int        `json:"id"`
	Token     string     `json:"token"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at"`
	ExpiresIn string     `json:"expires_in"` // Original duration string
	UsedAt    *time.Time `json:"used_at"`
	UseCount  int        `json:"use_count"`
	MaxUses   int        `json:"max_uses"` // 0 for unlimited
	CreatedBy int        `json:"created_by"`
	Note      string     `json:"note"`
	Status    string     `json:"status"`  // "ACTIVE", "USED", "EXPIRED", "REVOKED"
	UsedBy    string     `json:"used_by"` // Comma-separated list of user IDs
}

type RegisterRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	InviteToken string `json:"invite_token"`
	DBName      string `json:"db_name"` // Friendly name
}

type CreateInviteRequest struct {
	MaxUses   int    `json:"max_uses"`
	ExpiresIn string `json:"expires_in"` // e.g., "7d", "24h", "never"
	Note      string `json:"note"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	Salt     string `json:"salt"`
}

type VaultItem struct {
	ID            string `json:"id"`
	EncryptedBlob string `json:"encrypted_blob"`
	Revision      int    `json:"revision"`
	UpdatedAt     string `json:"updated_at,omitempty"`
}