/**
 * Background service worker for Guardian extension
 * Handles password matching and autofill coordination
 */

import { openVaultWithKey, createVaultWithKey, type VaultEntry } from "../../shared/crypto/vault";
import { pushEntriesToServer } from "./utils/serverSync";



interface AutofillMatch {
  id: string;
  username: string;
  password: string;
  title: string;
  website: string;
  favicon?: string;
}

interface SessionData {
  isLoggedIn: boolean;
  lastModified: number;
  mode?: 'local' | 'server';
  issuedAt?: number;
  expiresAt?: number;
  authToken?: string;
  serverUrl?: string;
  serverKey?: number[];
  derivedServerKey?: number[];
  localKey?: number[]; // For local mode
}

// Session states
let isLoggedIn = false;
let sessionLastModified = 0;
let cachedMode: 'local' | 'server' | undefined;
let sessionIssuedAt: number | undefined;
let sessionExpiresAt: number | undefined;
let cachedAuthToken: string | undefined;
let cachedServerUrl: string | undefined;
let cachedServerKey: number[] | undefined;
let cachedDerivedServerKey: number[] | undefined;
let cachedLocalKey: number[] | undefined;

const SESSION_STORAGE_KEY = 'guardian_active_session';
const SETTINGS_STORAGE_KEY = 'guardian_settings';
const VAULT_STORAGE_KEY = 'guardian_vault';
const NEVER_ASK_KEY = 'guardian_autofill_never';
const DEFAULT_SERVER_SESSION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Save prompt deferred while vault was locked; retried after login on this tab. */
interface DeferredSavePrompt {
  tabId: number;
  credential: { url: string; username: string; password: string };
}
let deferredSavePrompt: DeferredSavePrompt | null = null;

/**
 * Session secrets (tokens + key material) must use **only**
 * `chrome.storage.session`: they survive popup close and service worker
 * restarts while the browser stays open, and are cleared when the browser
 * exits — so the user is not asked to log in on every popup open, but is
 * after a full browser quit. We intentionally never fall back to
 * `chrome.storage.local` for this blob (that would persist across browser
 * sessions on disk).
 */
function getSessionPersistenceArea(): chrome.storage.StorageArea | null {
  const storage = chrome.storage as any;
  return storage.session ? (storage.session as chrome.storage.StorageArea) : null;
}

function clearInMemorySession() {
  isLoggedIn = false;
  sessionLastModified = 0;
  cachedMode = undefined;
  sessionIssuedAt = undefined;
  sessionExpiresAt = undefined;
  cachedAuthToken = undefined;
  cachedServerUrl = undefined;
  cachedServerKey = undefined;
  cachedDerivedServerKey = undefined;
  cachedLocalKey = undefined;
}

function isSessionExpired(mode?: 'local' | 'server', expiresAt?: number): boolean {
  if (mode !== 'server') return false;
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}

async function getServerSessionExpiryDays(): Promise<number> {
  try {
    const storage = chrome.storage as any;
    if (!storage.local) {
      return DEFAULT_SERVER_SESSION_DAYS;
    }
    const result = await storage.local.get([SETTINGS_STORAGE_KEY]);
    const settings = result[SETTINGS_STORAGE_KEY] || {};

    const rawDays = Number(settings.serverSessionExpiryDays);
    const days = Number.isFinite(rawDays) && rawDays >= 1
      ? Math.min(365, Math.floor(rawDays))
      : DEFAULT_SERVER_SESSION_DAYS;

    return days;
  } catch {
    return DEFAULT_SERVER_SESSION_DAYS;
  }
}

// Load session from storage on startup
async function loadSessionFromStorage() {
  try {
    const storage = chrome.storage as any;
    const sessionArea = getSessionPersistenceArea();
    if (!sessionArea && !storage.local) return;

    let raw: Record<string, SessionData> | undefined;

    if (sessionArea) {
      const result = await sessionArea.get([SESSION_STORAGE_KEY]);
      raw = result as Record<string, SessionData>;
    }

    // One-time migration: older builds stored the active session in local
    // (disk). Move it to session storage and delete the local copy.
    if (!raw?.[SESSION_STORAGE_KEY] && storage.local) {
      const legacy = await storage.local.get([SESSION_STORAGE_KEY]);
      if (legacy[SESSION_STORAGE_KEY]) {
        const migrated = legacy[SESSION_STORAGE_KEY] as SessionData;
        if (sessionArea) {
          await sessionArea.set({ [SESSION_STORAGE_KEY]: migrated });
          await storage.local.remove([SESSION_STORAGE_KEY]);
          raw = { [SESSION_STORAGE_KEY]: migrated };
        } else {
          // No session API: keep legacy in local until the runtime supports migration.
          raw = { [SESSION_STORAGE_KEY]: migrated };
        }
      }
    }

    if (raw?.[SESSION_STORAGE_KEY]) {
      const session = raw[SESSION_STORAGE_KEY] as SessionData;
      const expiryDays = await getServerSessionExpiryDays();
      if (session.mode === 'server') {
        if (isSessionExpired(session.mode, session.expiresAt)) {
          clearInMemorySession();
          await clearSessionFromStorage();
          return;
        }
      }
      isLoggedIn = session.isLoggedIn || false;
      sessionLastModified = session.lastModified || 0;
      cachedMode = session.mode;
      sessionIssuedAt = session.issuedAt;
      sessionExpiresAt = session.expiresAt;
      cachedAuthToken = session.authToken;
      cachedServerUrl = session.serverUrl;
      cachedServerKey = session.serverKey;
      cachedDerivedServerKey = session.derivedServerKey;
      cachedLocalKey = session.localKey;

      // Backfill expiry metadata for active server sessions.
      if (
        isLoggedIn &&
        cachedMode === 'server' &&
        (!sessionIssuedAt || !sessionExpiresAt)
      ) {
        sessionIssuedAt = Date.now();
        sessionExpiresAt = sessionIssuedAt + expiryDays * DAY_MS;
        await saveSessionToStorage();
      }
    }
  } catch (error) {
    console.error('Failed to load session from storage:', error);
  }
}

// Save session to storage
async function saveSessionToStorage() {
  try {
    const sessionArea = getSessionPersistenceArea();
    if (!sessionArea) return;
    await sessionArea.set({
      [SESSION_STORAGE_KEY]: {
        isLoggedIn,
        lastModified: sessionLastModified,
        mode: cachedMode,
        issuedAt: sessionIssuedAt,
        expiresAt: sessionExpiresAt,
        authToken: cachedAuthToken,
        serverUrl: cachedServerUrl,
        serverKey: cachedServerKey,
        derivedServerKey: cachedDerivedServerKey,
        localKey: cachedLocalKey,
      },
    });
  } catch (error) {
    console.error('Failed to save session to storage:', error);
  }
}

// Clear session from storage
async function clearSessionFromStorage() {
  try {
    const storage = chrome.storage as any;
    const removes: Promise<void>[] = [];
    if (storage.session) {
      removes.push(storage.session.remove([SESSION_STORAGE_KEY]));
    }
    if (storage.local) {
      removes.push(storage.local.remove([SESSION_STORAGE_KEY]));
    }
    await Promise.all(removes);
  } catch (error) {
    console.error('Failed to clear session from storage:', error);
  }
}

// Load session on startup
loadSessionFromStorage();

// Get domain from URL
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Check if URL matches website
function urlMatches(entryWebsite: string, currentUrl: string): boolean {
  const entryDomain = getDomain(entryWebsite);
  const currentDomain = getDomain(currentUrl);

  if (!entryDomain || !currentDomain) return false;

  // Exact match
  if (entryDomain === currentDomain) return true;

  // Subdomain match (e.g., www.google.com matches google.com)
  if (currentDomain.endsWith('.' + entryDomain)) return true;
  if (entryDomain.endsWith('.' + currentDomain)) return true;

  return false;
}

// Find matching passwords. With no query, returns URL-matches for the
// current tab. With a query, searches every saved entry by
// title / username / website / notes so the user can still reach a
// credential even when URL matching missed (different subdomain, no
// saved URL, typo, etc.).
async function findMatches(url: string, query?: string): Promise<AutofillMatch[]> {
  if (!isLoggedIn) {
    return [];
  }

  // Ensure session is loaded
  await loadSessionFromStorage();

  const keyToUse = cachedLocalKey;
  if (!keyToUse) return [];

  let decryptedVault;

  try {
    // Dynamically retrieve the encrypted vault from local storage and decrypt it
    const storage = chrome.storage as any;
    const result = await storage.local.get("guardian_vault");
    const base64Vault = result["guardian_vault"];

    if (!base64Vault) return [];

    const binaryString = atob(base64Vault);
    const vaultBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      vaultBytes[i] = binaryString.charCodeAt(i);
    }

    decryptedVault = await openVaultWithKey(new Uint8Array(keyToUse), vaultBytes);
  } catch (e) {
    console.warn("Failed to decrypt vault in service worker", e);
    return [];
  }

  const toMatch = (entry: VaultEntry): AutofillMatch => ({
    id: entry.id,
    username: entry.username || "",
    password: entry.password,
    title: entry.name,
    website: entry.url || "",
    favicon: entry.favicon,
  });

  const q = (query || "").trim().toLowerCase();

  if (q.length > 0) {
    // Search mode: score each entry, return top results. URL-matches get
    // a boost so domain-relevant results stay near the top.
    const scored = decryptedVault.entries.map((entry) => {
      const hay = `${entry.name || ""} ${entry.username || ""} ${entry.url || ""} ${entry.notes || ""}`.toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 2;
      if ((entry.name || "").toLowerCase().startsWith(q)) score += 5;
      if ((entry.username || "").toLowerCase().startsWith(q)) score += 3;
      if (urlMatches(entry.url || "", url)) score += 4;
      return { entry, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((s) => toMatch(s.entry));
  }

  // No query: classic URL-match mode.
  return decryptedVault.entries
    .filter((entry) => urlMatches(entry.url || "", url))
    .map(toMatch);
}

// Decrypt the locally cached vault using the in-memory / session key.
// Returns null if not unlocked or not available.
async function readDecryptedVault(): Promise<VaultEntry[] | null> {
  await loadSessionFromStorage();
  if (!isLoggedIn || !cachedLocalKey) return null;
  try {
    const storage = chrome.storage as any;
    const result = await storage.local.get(VAULT_STORAGE_KEY);
    const base64Vault = result[VAULT_STORAGE_KEY];
    if (!base64Vault) return [];
    const bin = atob(base64Vault);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const decrypted = await openVaultWithKey(new Uint8Array(cachedLocalKey), bytes);
    return decrypted.entries;
  } catch (e) {
    console.warn('Failed to read vault in SW', e);
    return null;
  }
}

// Re-encrypt and persist the vault.
async function writeEncryptedVault(entries: VaultEntry[]): Promise<boolean> {
  if (!cachedLocalKey) return false;
  try {
    const encrypted = await createVaultWithKey(new Uint8Array(cachedLocalKey), entries);
    const base64 = btoa(String.fromCharCode(...encrypted));
    const storage = chrome.storage as any;
    await storage.local.set({ [VAULT_STORAGE_KEY]: base64 });
    sessionLastModified = Date.now();
    await saveSessionToStorage();
    return true;
  } catch (e) {
    console.error('Failed to write vault in SW', e);
    return false;
  }
}

type ServerPushStatus =
  | { state: 'skipped'; reason: 'local-mode' | 'missing-session' }
  | { state: 'ok' }
  | { state: 'failed'; error: string };

// If the user is in server mode, push the given entries to the server so
// the change is persisted across devices. Returns a rich status so the
// caller can surface server-push failures to the UI (saving locally but
// failing to push is dangerous: the local cache gets overwritten by the
// server's stale copy on next login).
async function maybePushToServer(entries: VaultEntry[]): Promise<ServerPushStatus> {
  if (cachedMode !== 'server') {
    return { state: 'skipped', reason: 'local-mode' };
  }
  if (!cachedServerUrl || !cachedAuthToken || !cachedDerivedServerKey) {
    console.warn('[SW] Cannot push to server — missing session data', {
      hasUrl: !!cachedServerUrl,
      hasToken: !!cachedAuthToken,
      hasKey: !!cachedDerivedServerKey,
    });
    return { state: 'skipped', reason: 'missing-session' };
  }
  try {
    await pushEntriesToServer(
      cachedServerUrl,
      cachedAuthToken,
      new Uint8Array(cachedDerivedServerKey),
      entries,
    );
    return { state: 'ok' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SW] Failed to push entries to server:', message);
    return { state: 'failed', error: message };
  }
}

// Fetch a favicon URL and return a data URL, or null on any failure.
// Keeps entries self-contained (no runtime cross-origin leaks) and bounded
// in size. The SW has host permissions for <all_urls>, so cross-origin
// favicon fetches succeed here even when a content script couldn't do it.
const MAX_FAVICON_BYTES = 32 * 1024;

async function fetchFaviconAsDataUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const resp = await fetch(url, { credentials: 'omit' });
    if (!resp.ok) return undefined;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.startsWith('image/') && !ct.includes('icon')) return undefined;
    const blob = await resp.blob();
    if (blob.size === 0 || blob.size > MAX_FAVICON_BYTES) return undefined;
    const buf = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const b64 = btoa(binary);
    const mime = blob.type || 'image/x-icon';
    return `data:${mime};base64,${b64}`;
  } catch (err) {
    console.warn('[SW] favicon fetch failed', err);
    return undefined;
  }
}

// Pick the best human-readable name for a new entry: prefer the page
// title when it's reasonable, fall back to the domain.
function pickEntryName(tabTitle: string | undefined, url: string, explicit?: string): string {
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  const title = (tabTitle || '').trim();
  const domain = getDomain(url);
  if (!title) return domain || 'New login';
  // Strip leading/trailing noise like "· Login" / "— Sign in" etc, but keep
  // the site name if present (e.g. "Login · GitHub" → "GitHub").
  const cleaned = title.replace(/\s*[·|\-–—]\s*(log[\s-]?in|sign[\s-]?in|sign[\s-]?up|login|signin)\s*$/i, '').trim();
  const preferred = cleaned || title;
  if (preferred.length > 80) return preferred.slice(0, 80);
  return preferred || domain || 'New login';
}

// Broadcast that the vault was mutated so any open popup can re-read it.
function broadcastVaultMutated() {
  try {
    (chrome.runtime.sendMessage as any)({ action: 'vaultMutated' }, () => {
      // Swallow "no receiver" errors — popup may not be open.
      void (chrome.runtime as any).lastError;
    });
  } catch {
    // ignore
  }
}

async function getNeverAskList(): Promise<string[]> {
  try {
    const storage = chrome.storage as any;
    const result = await storage.local.get(NEVER_ASK_KEY);
    return Array.isArray(result[NEVER_ASK_KEY]) ? result[NEVER_ASK_KEY] : [];
  } catch {
    return [];
  }
}

async function addToNeverAskList(domain: string): Promise<void> {
  try {
    const list = await getNeverAskList();
    if (!list.includes(domain)) {
      list.push(domain);
      const storage = chrome.storage as any;
      await storage.local.set({ [NEVER_ASK_KEY]: list });
    }
  } catch (e) {
    console.warn('Failed to update never-ask list', e);
  }
}

// Decide whether a captured credential should trigger a save/update prompt.
async function classifyCapturedCredential(
  url: string,
  username: string,
  password: string,
): Promise<
  | { prompt: 'none' }
  | { prompt: 'save' }
  | { prompt: 'update'; entryId: string; entryTitle: string }
> {
  if (!password || password.length < 4) return { prompt: 'none' };
  if (!isLoggedIn) return { prompt: 'none' };

  const domain = getDomain(url);
  if (!domain) return { prompt: 'none' };

  const neverAsk = await getNeverAskList();
  if (neverAsk.includes(domain)) return { prompt: 'none' };

  const entries = await readDecryptedVault();
  if (!entries) return { prompt: 'none' };

  // Exact match on domain + username + password → already stored, do nothing.
  const sameDomainEntries = entries.filter((e) => urlMatches(e.url || '', url));

  const exact = sameDomainEntries.find(
    (e) => (e.username || '') === username && e.password === password,
  );
  if (exact) return { prompt: 'none' };

  // Same domain + username but different password → offer update.
  if (username) {
    const sameUser = sameDomainEntries.find(
      (e) => (e.username || '').toLowerCase() === username.toLowerCase(),
    );
    if (sameUser) {
      return { prompt: 'update', entryId: sameUser.id, entryTitle: sameUser.name };
    }
  }

  // Otherwise it's a brand-new credential.
  return { prompt: 'save' };
}

// Handle messages from content scripts and popup
(chrome.runtime.onMessage as any).addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === 'getMatches') {
    findMatches(message.url, message.query)
      .then((matches) => {
        sendResponse({ matches, isLoggedIn });
      })
      .catch((err) => {
        console.warn('[SW] findMatches failed', err);
        sendResponse({ matches: [], isLoggedIn });
      });
    return true;
  }

  if (message.action === 'checkAutoUnlock') {
    // Always reload from storage first (service worker might have been suspended)
    loadSessionFromStorage().then(() => {
      sendResponse({
        canAutoUnlock: isLoggedIn,
        passwordCount: 0 // Will figure out later if we need to decrypt just to get count
      });
    }).catch(() => {
      sendResponse({
        canAutoUnlock: isLoggedIn,
        passwordCount: 0
      });
    });
    return true;
  }

  if (message.action === 'getSession') {
    loadSessionFromStorage().then(() => {
      sendResponse({
        isLoggedIn,
        lastModified: sessionLastModified,
        mode: cachedMode,
        issuedAt: sessionIssuedAt,
        expiresAt: sessionExpiresAt,
        authToken: cachedAuthToken,
        serverUrl: cachedServerUrl,
        serverKey: cachedServerKey,
        derivedServerKey: cachedDerivedServerKey,
        localKey: cachedLocalKey,
      });
    });
    return true;
  }

  if (message.action === 'getCachedPasswords') {
    // UI components now need to fetch the vault independently or use simple flags
    sendResponse({ passwords: [], success: isLoggedIn });
    return true;
  }

  if (message.action === 'openExtension') {
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'deferSavePrompt') {
    const tabId = sender.tab?.id;
    const c = message.credential as { url?: string; username?: string; password?: string } | undefined;
    if (
      tabId != null &&
      c &&
      typeof c.password === 'string' &&
      c.password.length >= 4
    ) {
      deferredSavePrompt = {
        tabId,
        credential: {
          url: String(c.url || ''),
          username: String(c.username || ''),
          password: String(c.password || ''),
        },
      };
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === 'sessionUnlockedAfterLogin') {
    const d = deferredSavePrompt;
    deferredSavePrompt = null;
    if (d) {
      chrome.tabs.sendMessage(d.tabId, {
        action: 'guardianRetryPendingSave',
        credential: d.credential,
      }).catch(() => {
        /* tab closed or no receiver */
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === 'updatePasswords') {
    (async () => {
      isLoggedIn = message.isLoggedIn || false;
      sessionLastModified = message.lastModified || 0;
      cachedMode = message.mode;
      cachedAuthToken = message.authToken;
      cachedServerUrl = message.serverUrl;
      cachedServerKey = message.serverKey;
      cachedDerivedServerKey = message.derivedServerKey;
      cachedLocalKey = message.localKey;

      if (isLoggedIn && cachedMode === 'server') {
        const days = await getServerSessionExpiryDays();
        const resetSessionTtl = Boolean(message.resetSessionTtl);
        if (resetSessionTtl || !sessionIssuedAt) {
          sessionIssuedAt = Date.now();
        }
        sessionExpiresAt = sessionIssuedAt + days * DAY_MS;
      } else {
        sessionIssuedAt = undefined;
        sessionExpiresAt = undefined;
      }

      // Persist to session storage
      await saveSessionToStorage();
      sendResponse({ success: true });
    })().catch(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'checkShouldPromptSave') {
    (async () => {
      try {
        await loadSessionFromStorage();
        if (!isLoggedIn || !cachedLocalKey) {
          sendResponse({ prompt: 'needs_login' as const });
          return;
        }
        const result = await classifyCapturedCredential(
          String(message.url || ''),
          String(message.username || ''),
          String(message.password || ''),
        );
        sendResponse(result);
      } catch (err) {
        console.warn('classifyCapturedCredential failed', err);
        sendResponse({ prompt: 'none' });
      }
    })();
    return true;
  }

  if (message.action === 'savePassword') {
    (async () => {
      console.log('[SW] savePassword received', {
        url: message.url,
        username: message.username,
        hasPassword: !!message.password,
        tabTitle: sender?.tab?.title,
        tabFavicon: sender?.tab?.favIconUrl,
      });
      const entries = await readDecryptedVault();
      if (!entries) {
        console.warn('[SW] savePassword rejected — vault locked');
        sendResponse({ success: false, reason: 'locked' });
        return;
      }
      const now = new Date().toISOString();
      const url = String(message.url || '');
      const tabTitle: string | undefined = sender?.tab?.title;
      const tabFavIconUrl: string | undefined = sender?.tab?.favIconUrl;

      // Kick off favicon fetch in parallel with vault write so the UI
      // doesn't stall on a slow image request.
      const faviconPromise = fetchFaviconAsDataUrl(tabFavIconUrl);

      const newEntry: VaultEntry = {
        id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: pickEntryName(tabTitle, url, message.title),
        username: String(message.username || ''),
        password: String(message.password || ''),
        url,
        notes: '',
        createdAt: now,
        lastModified: now,
        favicon: await faviconPromise,
      };
      const ok = await writeEncryptedVault([...entries, newEntry]);
      let push: ServerPushStatus = { state: 'skipped', reason: 'local-mode' };
      if (ok) {
        push = await maybePushToServer([newEntry]);
        broadcastVaultMutated();
      }
      console.log('[SW] savePassword result', { ok, push, id: newEntry.id });
      sendResponse({ success: ok, id: newEntry.id, push });
    })();
    return true;
  }

  if (message.action === 'updatePassword') {
    (async () => {
      console.log('[SW] updatePassword received', { entryId: message.entryId });
      const entries = await readDecryptedVault();
      if (!entries) {
        console.warn('[SW] updatePassword rejected — vault locked');
        sendResponse({ success: false, reason: 'locked' });
        return;
      }
      const targetId = String(message.entryId || '');
      const newPassword = String(message.password || '');
      const now = new Date().toISOString();
      let mutatedEntry: VaultEntry | null = null;
      const next = entries.map((e) => {
        if (e.id === targetId) {
          const updated = { ...e, password: newPassword, lastModified: now };
          mutatedEntry = updated;
          return updated;
        }
        return e;
      });
      if (!mutatedEntry) {
        console.warn('[SW] updatePassword rejected — id not found');
        sendResponse({ success: false, reason: 'not-found' });
        return;
      }
      const ok = await writeEncryptedVault(next);
      let push: ServerPushStatus = { state: 'skipped', reason: 'local-mode' };
      if (ok) {
        push = await maybePushToServer([mutatedEntry]);
        broadcastVaultMutated();
      }
      console.log('[SW] updatePassword result', { ok, push });
      sendResponse({ success: ok, push });
    })();
    return true;
  }

  if (message.action === 'neverAskForDomain') {
    addToNeverAskList(String(message.domain || ''))
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (message.action === 'clearPasswords') {
    deferredSavePrompt = null;
    clearInMemorySession();
    // Clear from session storage
    clearSessionFromStorage().then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});

// On startup, load session from storage
(chrome.runtime.onStartup as any).addListener(() => {
  loadSessionFromStorage();
});

// On install/update, clear session for security
(chrome.runtime.onInstalled as any).addListener(() => {
  clearInMemorySession();
  clearSessionFromStorage();
});
