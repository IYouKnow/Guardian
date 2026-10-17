package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRateLimiterAllowAndReset(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	l := newRateLimiter(3, time.Minute)
	l.now = func() time.Time { return now }

	for i := 0; i < 3; i++ {
		if ok, _ := l.allow("1.2.3.4"); !ok {
			t.Fatalf("request %d: want allowed, got blocked", i+1)
		}
	}

	ok, retry := l.allow("1.2.3.4")
	if ok {
		t.Fatal("4th request: want blocked, got allowed")
	}
	if retry <= 0 || retry > time.Minute {
		t.Fatalf("retry = %v, want (0, 1m]", retry)
	}

	// A different key is unaffected.
	if ok, _ := l.allow("5.6.7.8"); !ok {
		t.Fatal("independent key: want allowed, got blocked")
	}

	// After the window elapses the key is allowed again.
	now = now.Add(time.Minute)
	if ok, _ := l.allow("1.2.3.4"); !ok {
		t.Fatal("after window: want allowed, got blocked")
	}
}

func TestRateLimiterSweep(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	l := newRateLimiter(5, time.Minute)
	l.now = func() time.Time { return now }

	l.allow("stale") // window ends at now+1m

	now = now.Add(50 * time.Second)
	l.allow("fresh") // window ends at now+1m (10s later than "stale")

	now = now.Add(11 * time.Second) // "stale" window elapsed, "fresh" still live
	l.sweep()

	if _, exists := l.buckets["stale"]; exists {
		t.Error("sweep left an expired bucket behind")
	}
	if _, exists := l.buckets["fresh"]; !exists {
		t.Error("sweep removed a live bucket")
	}
}

func TestLockoutTrackerTripsAndClears(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	tr := newLockoutTracker(3, time.Minute)
	tr.now = func() time.Time { return now }

	if locked, _ := tr.isLocked("alice"); locked {
		t.Fatal("fresh key should not be locked")
	}

	tr.recordFailure("alice")
	tr.recordFailure("alice")
	if locked, _ := tr.isLocked("alice"); locked {
		t.Fatal("should not lock before maxFailures")
	}

	tr.recordFailure("alice")
	locked, retry := tr.isLocked("alice")
	if !locked {
		t.Fatal("want locked after maxFailures")
	}
	if retry <= 0 || retry > time.Minute {
		t.Fatalf("retry = %v, want (0, 1m]", retry)
	}

	// Unlock once the lockout elapses.
	now = now.Add(time.Minute)
	if locked, _ := tr.isLocked("alice"); locked {
		t.Fatal("want unlocked after lockout duration")
	}

	// A successful login clears accumulated failures.
	tr.recordFailure("bob")
	tr.clear("bob")
	if locked, _ := tr.isLocked("bob"); locked {
		t.Fatal("clear should remove lockout state")
	}
	if _, exists := tr.entries["bob"]; exists {
		t.Fatal("clear should delete the entry")
	}
}

func TestLockoutTrackerFailuresDecay(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	tr := newLockoutTracker(3, time.Minute)
	tr.now = func() time.Time { return now }

	tr.recordFailure("alice")
	tr.recordFailure("alice")

	// Idle past the lockout window: prior failures decay.
	now = now.Add(2 * time.Minute)
	tr.recordFailure("alice")

	if locked, _ := tr.isLocked("alice"); locked {
		t.Fatal("decayed failures should not trigger a lockout")
	}
	if got := tr.entries["alice"].failures; got != 1 {
		t.Fatalf("failures = %d, want 1 after decay", got)
	}
}

func TestLockoutTrackerSweep(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	tr := newLockoutTracker(2, time.Minute)
	tr.now = func() time.Time { return now }

	tr.recordFailure("alice")
	now = now.Add(2 * time.Minute)
	tr.sweep()

	if _, exists := tr.entries["alice"]; exists {
		t.Fatal("sweep left a decayed entry behind")
	}
}

func TestDecodeJSONOversizedBody(t *testing.T) {
	body := `{"data":"` + strings.Repeat("x", 200) + `"}`
	r := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(body))
	rr := httptest.NewRecorder()
	r.Body = http.MaxBytesReader(rr, r.Body, 16)

	var dst map[string]any
	if decodeJSON(rr, r, &dst) {
		t.Fatal("decodeJSON should report failure for an oversized body")
	}
	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusRequestEntityTooLarge)
	}
}

func TestDecodeJSONValidBody(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{"username":"alice"}`))
	rr := httptest.NewRecorder()

	var dst map[string]any
	if !decodeJSON(rr, r, &dst) {
		t.Fatalf("decodeJSON reported failure for a valid body (status %d)", rr.Code)
	}
	if dst["username"] != "alice" {
		t.Fatalf("decoded username = %v, want alice", dst["username"])
	}
}

func TestWithAuthRateLimit(t *testing.T) {
	s := &Server{authIPLimiter: newRateLimiter(2, time.Minute)}
	next := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
	h := s.withAuthRateLimit(next)

	call := func() *httptest.ResponseRecorder {
		rr := httptest.NewRecorder()
		r := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		r.RemoteAddr = "203.0.113.7:12345"
		h(rr, r)
		return rr
	}

	if rr := call(); rr.Code != http.StatusOK {
		t.Fatalf("request 1: status = %d, want 200", rr.Code)
	}
	if rr := call(); rr.Code != http.StatusOK {
		t.Fatalf("request 2: status = %d, want 200", rr.Code)
	}

	rr := call()
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("request 3: status = %d, want 429", rr.Code)
	}
	if rr.Header().Get("Retry-After") == "" {
		t.Fatal("429 response missing Retry-After header")
	}
}
