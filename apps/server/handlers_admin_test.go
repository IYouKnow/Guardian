package main

import (
	"regexp"
	"strings"
	"testing"
)

var inviteTokenRe = regexp.MustCompile(`^GRDN-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`)

func TestGenerateInviteTokenFormat(t *testing.T) {
	const iterations = 1000
	seen := make(map[string]struct{}, iterations)

	for i := 0; i < iterations; i++ {
		token, err := generateInviteToken()
		if err != nil {
			t.Fatalf("generateInviteToken() error: %v", err)
		}
		if !inviteTokenRe.MatchString(token) {
			t.Fatalf("token %q does not match expected format", token)
		}
		payload := strings.TrimPrefix(token, "GRDN-")
		for _, c := range strings.ReplaceAll(payload, "-", "") {
			if strings.IndexByte(inviteAlphabet, byte(c)) < 0 {
				t.Fatalf("token %q contains character %q outside inviteAlphabet", token, c)
			}
		}
		if _, dup := seen[token]; dup {
			t.Fatalf("duplicate token generated: %q", token)
		}
		seen[token] = struct{}{}
	}
}

// TestRandomStringUnbiased uses a chi-square goodness-of-fit test to confirm
// randomString draws uniformly from inviteAlphabet. With 35 degrees of freedom
// the statistic sits near 35 when uniform; the old `b % len` implementation
// skews the first 4 characters and would push this into the hundreds.
func TestRandomStringUnbiased(t *testing.T) {
	const n = 360_000
	const threshold = 66.0

	s, err := randomString(n)
	if err != nil {
		t.Fatalf("randomString() error: %v", err)
	}
	if len(s) != n {
		t.Fatalf("randomString(%d) returned %d chars", n, len(s))
	}

	counts := make(map[rune]int, len(inviteAlphabet))
	for _, c := range s {
		counts[c]++
	}

	expected := float64(n) / float64(len(inviteAlphabet))
	chiSquare := 0.0
	for _, c := range inviteAlphabet {
		obs := float64(counts[c])
		d := obs - expected
		chiSquare += d * d / expected
	}

	if chiSquare > threshold {
		t.Errorf("chi-square = %.2f exceeds %.2f — distribution is not uniform", chiSquare, threshold)
	}
}
