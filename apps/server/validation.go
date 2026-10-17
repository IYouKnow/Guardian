package main

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// --- Credential policy ---

const (
	// bcryptCost is the work factor used for password hashing. It is higher than
	// bcrypt.DefaultCost (10) so brute-forcing an extracted hash is more costly.
	// Existing hashes keep their original cost; bcrypt reads it back per hash.
	bcryptCost = 12

	// minPasswordLen is the minimum acceptable password length. All clients
	// already enforce at least this, so this is defence-in-depth.
	minPasswordLen = 8

	// maxPasswordBytes caps the password at bcrypt's effective input limit.
	// bcrypt silently truncates beyond 72 bytes, so a longer password would give
	// a false sense of strength; reject it instead.
	maxPasswordBytes = 72
)

// usernamePattern restricts usernames to a conservative, DB/login-safe set.
var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9._-]{3,32}$`)

// commonPasswords are frequently used passwords that are rejected regardless of
// length. Keys are lowercased; lookups lowercase the candidate first.
var commonPasswords = map[string]struct{}{
	"password":   {},
	"password1":  {},
	"passw0rd":   {},
	"12345678":   {},
	"123456789":  {},
	"1234567890": {},
	"11111111":   {},
	"00000000":   {},
	"qwertyuiop": {},
	"qwerty123":  {},
	"qwertyui":   {},
	"1q2w3e4r":   {},
	"abc12345":   {},
	"aaaaaaaa":   {},
	"letmein1":   {},
	"iloveyou":   {},
	"admin123":   {},
	"welcome1":   {},
	"dragon123":  {},
	"monkey123":  {},
	"football":   {},
	"baseball":   {},
	"sunshine":   {},
	"princess":   {},
	"trustno1":   {},
}

// validateUsername rejects usernames that don't match the allowed charset and
// length. It never transforms the value, so stored usernames stay exact-match
// for login.
func validateUsername(username string) error {
	if !usernamePattern.MatchString(username) {
		return errors.New("Username must be 3-32 characters using letters, digits, and . _ -")
	}
	return nil
}

// validatePassword applies the minimum length, bcrypt byte cap, common-password
// denylist, and all-same-character checks.
func validatePassword(password string) error {
	if len(password) < minPasswordLen {
		return fmt.Errorf("Password must be at least %d characters", minPasswordLen)
	}
	if len([]byte(password)) > maxPasswordBytes {
		return fmt.Errorf("Password must be at most %d bytes", maxPasswordBytes)
	}
	if _, weak := commonPasswords[strings.ToLower(password)]; weak {
		return errors.New("Password is too common; choose a stronger one")
	}
	if allSameRune(password) {
		return errors.New("Password is too predictable; choose a stronger one")
	}
	return nil
}

// allSameRune reports whether s consists of a single repeated character.
func allSameRune(s string) bool {
	var first rune
	for i, r := range s {
		if i == 0 {
			first = r
			continue
		}
		if r != first {
			return false
		}
	}
	return true
}
