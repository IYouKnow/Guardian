package main

import (
	"strings"
	"sync"
	"time"
)

// --- Auth rate limiting / brute-force lockout ---

const (
	// Per-IP throttle applied to the auth endpoints.
	authIPMaxRequests = 10
	authIPWindow      = time.Minute

	// Per-account lockout after repeated failed logins.
	loginMaxFailures     = 5
	loginLockoutDuration = 15 * time.Minute

	// Request body caps. The global cap keeps large uploads bounded for all
	// routes; auth routes get a much tighter cap since their payloads are tiny.
	maxRequestBodyBytes = 10 << 20 // 10 MiB
	authMaxBodyBytes    = 64 << 10 // 64 KiB
)

// normalizeAccountKey folds a username so case/whitespace variants share a key.
func normalizeAccountKey(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

// rateLimiter is a fixed-window counter keyed by an arbitrary string (client IP).
type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*countBucket
	limit   int
	window  time.Duration
	now     func() time.Time
}

type countBucket struct {
	count     int
	windowEnd time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		buckets: make(map[string]*countBucket),
		limit:   limit,
		window:  window,
		now:     time.Now,
	}
}

// allow reports whether key may proceed. When it may not, it returns the
// remaining time until the window resets.
func (l *rateLimiter) allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	b := l.buckets[key]
	if b == nil || !now.Before(b.windowEnd) {
		l.buckets[key] = &countBucket{count: 1, windowEnd: now.Add(l.window)}
		return true, 0
	}
	if b.count >= l.limit {
		return false, b.windowEnd.Sub(now)
	}
	b.count++
	return true, 0
}

// sweep drops buckets whose window has elapsed to bound memory growth.
func (l *rateLimiter) sweep() {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	for k, b := range l.buckets {
		if !now.Before(b.windowEnd) {
			delete(l.buckets, k)
		}
	}
}

// lockoutTracker locks a username after too many failed logins within a window.
type lockoutTracker struct {
	mu          sync.Mutex
	entries     map[string]*lockEntry
	maxFailures int
	lockout     time.Duration
	now         func() time.Time
}

type lockEntry struct {
	failures    int
	lastFailure time.Time
	lockedUntil time.Time
}

func newLockoutTracker(maxFailures int, lockout time.Duration) *lockoutTracker {
	return &lockoutTracker{
		entries:     make(map[string]*lockEntry),
		maxFailures: maxFailures,
		lockout:     lockout,
		now:         time.Now,
	}
}

// isLocked reports whether key is currently locked out and for how much longer.
func (t *lockoutTracker) isLocked(key string) (bool, time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()

	e := t.entries[key]
	if e == nil {
		return false, 0
	}
	now := t.now()
	if now.Before(e.lockedUntil) {
		return true, e.lockedUntil.Sub(now)
	}
	return false, 0
}

// recordFailure counts a failed login and trips the lockout at maxFailures.
// Failures older than the lockout window decay so an occasional typo doesn't
// accumulate forever.
func (t *lockoutTracker) recordFailure(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := t.now()
	e := t.entries[key]
	if e == nil || now.Sub(e.lastFailure) > t.lockout {
		e = &lockEntry{}
		t.entries[key] = e
	}

	e.lastFailure = now
	e.failures++
	if e.failures >= t.maxFailures {
		e.lockedUntil = now.Add(t.lockout)
		e.failures = 0
	}
}

// clear resets the failure state for key after a successful login.
func (t *lockoutTracker) clear(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.entries, key)
}

// sweep drops entries whose lockout has expired and whose failures have decayed.
func (t *lockoutTracker) sweep() {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := t.now()
	for k, e := range t.entries {
		if now.Before(e.lockedUntil) {
			continue
		}
		if now.Sub(e.lastFailure) > t.lockout {
			delete(t.entries, k)
		}
	}
}
