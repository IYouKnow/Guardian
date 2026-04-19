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
}

interface SessionData {
  isLoggedIn: boolean;
  lastModified: number;
  mode?: 'local' | 'server';
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
let cachedAuthToken: string | undefined;
let cachedServerUrl: string | undefined;
let cachedServerKey: number[] | undefined;
let cachedDerivedServerKey: number[] | undefined;
let cachedLocalKey: number[] | undefined;

const SESSION_STORAGE_KEY = 'guardian_active_session';
const VAULT_STORAGE_KEY = 'guardian_vault';
const NEVER_ASK_KEY = 'guardian_autofill_never';

// Load session from storage on startup
async function loadSessionFromStorage() {
  try {
    const storage = chrome.storage as any;
    if (!storage.session) return;
    const result = await storage.session.get([SESSION_STORAGE_KEY]);
    if (result[SESSION_STORAGE_KEY]) {
      const session = result[SESSION_STORAGE_KEY] as SessionData;
      isLoggedIn = session.isLoggedIn || false;
      sessionLastModified = session.lastModified || 0;
      cachedMode = session.mode;
      cachedAuthToken = session.authToken;
      cachedServerUrl = session.serverUrl;
      cachedServerKey = session.serverKey;
      cachedDerivedServerKey = session.derivedServerKey;
      cachedLocalKey = session.localKey;
    }
  } catch (error) {
    console.error('Failed to load session from storage:', error);
  }
}

// Save session to storage
async function saveSessionToStorage() {
  try {
    const storage = chrome.storage as any;
    if (!storage.session) return;
    await storage.session.set({
      [SESSION_STORAGE_KEY]: {
        isLoggedIn,
        lastModified: sessionLastModified,
        mode: cachedMode,
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
    if (storage.session) {
      await storage.session.remove([SESSION_STORAGE_KEY]);
    }
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

// Find matching passwords for a URL
async function findMatches(url: string): Promise<AutofillMatch[]> {
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

  const matches: AutofillMatch[] = [];

  for (const entry of decryptedVault.entries) {
    if (urlMatches(entry.url || "", url)) {
      matches.push({
        id: entry.id,
        username: entry.username || "",
        password: entry.password,
        title: entry.name,
        website: entry.url || "",
      });
    }
  }

  return matches;
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
(chrome.runtime.onMessage as any).addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.action === 'getMatches') {
    findMatches(message.url)
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

  if (message.action === 'updatePasswords') {
    isLoggedIn = message.isLoggedIn || false;
    sessionLastModified = message.lastModified || 0;
    cachedMode = message.mode;
    cachedAuthToken = message.authToken;
    cachedServerUrl = message.serverUrl;
    cachedServerKey = message.serverKey;
    cachedDerivedServerKey = message.derivedServerKey;
    cachedLocalKey = message.localKey;

    // Persist to session storage
    saveSessionToStorage().then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'checkShouldPromptSave') {
    classifyCapturedCredential(
      String(message.url || ''),
      String(message.username || ''),
      String(message.password || ''),
    )
      .then((result) => sendResponse(result))
      .catch((err) => {
        console.warn('classifyCapturedCredential failed', err);
        sendResponse({ prompt: 'none' });
      });
    return true;
  }

  if (message.action === 'savePassword') {
    (async () => {
      console.log('[SW] savePassword received', {
        url: message.url,
        username: message.username,
        hasPassword: !!message.password,
      });
      const entries = await readDecryptedVault();
      if (!entries) {
        console.warn('[SW] savePassword rejected — vault locked');
        sendResponse({ success: false, reason: 'locked' });
        return;
      }
      const now = new Date().toISOString();
      const domain = getDomain(String(message.url || '')) || 'New login';
      const newEntry: VaultEntry = {
        id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: String(message.title || domain),
        username: String(message.username || ''),
        password: String(message.password || ''),
        url: String(message.url || ''),
        notes: '',
        createdAt: now,
        lastModified: now,
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
    isLoggedIn = false;
    sessionLastModified = 0;
    cachedMode = undefined;
    cachedAuthToken = undefined;
    cachedServerUrl = undefined;
    cachedServerKey = undefined;
    cachedDerivedServerKey = undefined;
    cachedLocalKey = undefined;
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
  isLoggedIn = false;
  sessionLastModified = 0;
  cachedMode = undefined;
  cachedAuthToken = undefined;
  cachedServerUrl = undefined;
  cachedServerKey = undefined;
  cachedDerivedServerKey = undefined;
  cachedLocalKey = undefined;
  clearSessionFromStorage();
});
