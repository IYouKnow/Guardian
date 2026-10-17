package main

import (
	"bufio"
	"errors"
	"fmt"
	"net/netip"
	"net/url"
	"os"
	"strings"
	"time"
)

// --- Configuration ---
var (
	SecretKey     string
	TokenDuration = 24 * time.Hour
	Version       = "dev" // Default version, will be overridden by CI/CD during tagged builds
)

// minSecretLen is the minimum accepted length for JWT_SECRET. Shorter secrets are
// brute-forceable, which would let an attacker forge authentication tokens.
const minSecretLen = 32

// insecureSecrets are well-known placeholder values that must never be used to
// sign tokens. They are compared case-insensitively.
var insecureSecrets = map[string]struct{}{
	"change_me_to_a_random_secret":        {},
	"replace_with_a_secure_random_string": {},
	"changeme":                            {},
	"change_me":                           {},
	"secret":                              {},
	"password":                            {},
	"jwt_secret":                          {},
	"your_secret_here":                    {},
}

func init() {
	// Try to load .env file if it exists
	loadEnv()
}

// validateSecret rejects missing, placeholder, or too-short JWT secrets so the
// server fails closed instead of running with a guessable signing key.
func validateSecret(secret string) error {
	trimmed := strings.TrimSpace(secret)
	if trimmed == "" {
		return errors.New("JWT_SECRET is not set")
	}
	if _, insecure := insecureSecrets[strings.ToLower(trimmed)]; insecure {
		return errors.New("JWT_SECRET is set to a known placeholder value")
	}
	if len(trimmed) < minSecretLen {
		return fmt.Errorf("JWT_SECRET must be at least %d characters", minSecretLen)
	}
	return nil
}

// defaultTrustedProxyNets are always treated as trusted proxies: loopback, RFC1918
// private, link-local, IPv6 ULA, and CGNAT (Tailscale). This lets a locally-run
// reverse proxy (cloudflared, nginx, Docker bridge) work with no configuration,
// while a public peer can never match these and so cannot spoof X-Forwarded-For.
var defaultTrustedProxyNets = []netip.Prefix{
	netip.MustParsePrefix("127.0.0.0/8"),
	netip.MustParsePrefix("::1/128"),
	netip.MustParsePrefix("10.0.0.0/8"),
	netip.MustParsePrefix("172.16.0.0/12"),
	netip.MustParsePrefix("192.168.0.0/16"),
	netip.MustParsePrefix("169.254.0.0/16"),
	netip.MustParsePrefix("fe80::/10"),
	netip.MustParsePrefix("fc00::/7"),
	netip.MustParsePrefix("100.64.0.0/10"),
}

// parseTrustedProxies parses extra trusted proxy ranges from a comma-separated
// list of IPs ("1.2.3.4") and CIDRs ("203.0.113.0/24"). Empty input adds nothing.
// Bare IPs become /32 or /128. Entries are ADDED to defaultTrustedProxyNets.
func parseTrustedProxies(s string) ([]netip.Prefix, error) {
	var prefixes []netip.Prefix
	for _, raw := range strings.Split(s, ",") {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}
		if p, err := netip.ParsePrefix(entry); err == nil {
			prefixes = append(prefixes, p.Masked())
			continue
		}
		addr, err := netip.ParseAddr(entry)
		if err != nil {
			return nil, fmt.Errorf("invalid TRUSTED_PROXIES entry %q (expected an IP or CIDR, not a hostname): %w", entry, err)
		}
		addr = addr.Unmap()
		prefixes = append(prefixes, netip.PrefixFrom(addr, addr.BitLen()))
	}
	return prefixes, nil
}

// originAllowlist is the set of browser origins permitted to talk to the server
// cross-origin (CORS) or to open a WebSocket. It holds exact origins plus scheme
// prefixes for browser extensions, whose IDs aren't known ahead of time.
type originAllowlist struct {
	exact   map[string]struct{}
	schemes []string
}

// defaultOriginAllowlist are origins trusted with no configuration: the fixed
// origins the bundled native clients use, plus extension schemes. Loopback is
// handled inside allows, so arbitrary websites are never matched.
func defaultOriginAllowlist() originAllowlist {
	return originAllowlist{
		exact: map[string]struct{}{
			"tauri://localhost":      {}, // Tauri desktop (macOS/Linux)
			"http://tauri.localhost": {}, // Tauri desktop (Windows WebView2)
			"capacitor://localhost":  {}, // Capacitor mobile (iOS)
		},
		schemes: []string{
			"chrome-extension://",
			"moz-extension://",
		},
	}
}

// withExtra merges another allowlist (from ALLOWED_ORIGINS) into a copy of this
// one. The defaults are always retained.
func (a originAllowlist) withExtra(extra originAllowlist) originAllowlist {
	merged := originAllowlist{
		exact:   make(map[string]struct{}, len(a.exact)+len(extra.exact)),
		schemes: append([]string(nil), a.schemes...),
	}
	for k := range a.exact {
		merged.exact[k] = struct{}{}
	}
	for k := range extra.exact {
		merged.exact[k] = struct{}{}
	}
	merged.schemes = append(merged.schemes, extra.schemes...)
	return merged
}

// allows reports whether origin is permitted: an exact allowlist match, an
// allowed extension scheme, or a loopback host on any port. The origin is parsed
// rather than substring-matched, so "http://localhost.attacker.tld" is rejected.
func (a originAllowlist) allows(origin string) bool {
	normalized := strings.ToLower(strings.TrimRight(strings.TrimSpace(origin), "/"))
	if normalized == "" {
		return false
	}
	if _, ok := a.exact[normalized]; ok {
		return true
	}
	for _, scheme := range a.schemes {
		if strings.HasPrefix(normalized, scheme) {
			return true
		}
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	host := strings.ToLower(u.Hostname())
	if host == "localhost" {
		return true
	}
	if addr, err := netip.ParseAddr(host); err == nil && addr.IsLoopback() {
		return true
	}
	return false
}

// parseAllowedOrigins parses extra permitted origins from a comma-separated list.
// Entries ending in "://" are treated as scheme prefixes (e.g. "chrome-extension://");
// everything else must be an exact origin like "https://vault.example.com". Malformed
// entries fail closed so a typo can't silently weaken the allowlist.
func parseAllowedOrigins(s string) (originAllowlist, error) {
	list := originAllowlist{exact: map[string]struct{}{}}
	for _, raw := range strings.Split(s, ",") {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}
		lower := strings.ToLower(entry)
		if strings.HasSuffix(lower, "://") {
			if strings.TrimSuffix(lower, "://") == "" {
				return originAllowlist{}, fmt.Errorf("invalid ALLOWED_ORIGINS entry %q (missing scheme)", entry)
			}
			list.schemes = append(list.schemes, lower)
			continue
		}
		u, err := url.Parse(entry)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return originAllowlist{}, fmt.Errorf("invalid ALLOWED_ORIGINS entry %q (expected an origin like https://host[:port], or a scheme prefix ending in '://')", entry)
		}
		list.exact[strings.TrimRight(lower, "/")] = struct{}{}
	}
	return list, nil
}

// loadEnv is a simple helper to load .env files without external dependencies
func loadEnv() {
	f, err := os.Open(".env")
	if err != nil {
		return // No .env file, skip
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			// Only set if not already set in environment
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

type Config struct {
	Port    string
	DataDir string
}
