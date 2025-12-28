/**
 * Background service worker for Guardian extension
 * Handles password matching and autofill coordination
 */

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  website: string;
}

interface AutofillMatch {
  id: string;
  username: string;
  password: string;
  title: string;
  website: string;
}

interface SessionData {
  passwords: PasswordEntry[];
  isLoggedIn: boolean;
  lastModified: number;
}

// Store decrypted passwords in memory and chrome.storage.session (persists across popup opens, clears on browser close)
let cachedPasswords: PasswordEntry[] = [];
let isLoggedIn = false;
let sessionLastModified = 0;

const SESSION_STORAGE_KEY = 'guardian_active_session';

// Load session from storage on startup
async function loadSessionFromStorage() {
  try {
    const storage = chrome.storage as any;
    if (!storage.session) return;
    const result = await storage.session.get([SESSION_STORAGE_KEY]);
    if (result[SESSION_STORAGE_KEY]) {
      const session = result[SESSION_STORAGE_KEY] as SessionData;
      cachedPasswords = session.passwords || [];
      isLoggedIn = session.isLoggedIn || false;
      sessionLastModified = session.lastModified || 0;
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
        passwords: cachedPasswords,
        isLoggedIn,
        lastModified: sessionLastModified,
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
function findMatches(url: string): AutofillMatch[] {
  if (!isLoggedIn || cachedPasswords.length === 0) {
    return [];
  }

  const matches: AutofillMatch[] = [];

  for (const entry of cachedPasswords) {
    if (urlMatches(entry.website, url)) {
      matches.push({
        id: entry.id,
        username: entry.username,
        password: entry.password,
        title: entry.title,
        website: entry.website,
      });
    }
  }

  return matches;
}

// Handle messages from content scripts and popup
(chrome.runtime.onMessage as any).addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.action === 'getMatches') {
    const matches = findMatches(message.url);
    sendResponse({ matches, isLoggedIn });
    return true;
  }

  if (message.action === 'checkAutoUnlock') {
    // Always reload from storage first (service worker might have been suspended)
    loadSessionFromStorage().then(() => {
      sendResponse({
        canAutoUnlock: isLoggedIn && cachedPasswords.length > 0,
        passwordCount: cachedPasswords.length
      });
    }).catch(() => {
      sendResponse({
        canAutoUnlock: isLoggedIn && cachedPasswords.length > 0,
        passwordCount: cachedPasswords.length
      });
    });
    return true;
  }

  if (message.action === 'getSession') {
    loadSessionFromStorage().then(() => {
      sendResponse({
        isLoggedIn,
        passwords: cachedPasswords,
        lastModified: sessionLastModified
      });
    });
    return true;
  }

  if (message.action === 'getCachedPasswords') {
    // Always reload from storage first
    loadSessionFromStorage().then(() => {
      if (isLoggedIn) {
        sendResponse({ passwords: cachedPasswords, success: true });
      } else {
        sendResponse({ passwords: [], success: false });
      }
    }).catch(() => {
      if (isLoggedIn) {
        sendResponse({ passwords: cachedPasswords, success: true });
      } else {
        sendResponse({ passwords: [], success: false });
      }
    });
    return true;
  }

  if (message.action === 'openExtension') {
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'updatePasswords') {
    cachedPasswords = message.passwords || [];
    isLoggedIn = message.isLoggedIn || false;
    sessionLastModified = message.lastModified || 0;
    // Persist to session storage
    saveSessionToStorage().then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'clearPasswords') {
    cachedPasswords = [];
    isLoggedIn = false;
    sessionLastModified = 0;
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
  cachedPasswords = [];
  isLoggedIn = false;
  sessionLastModified = 0;
  clearSessionFromStorage();
});
