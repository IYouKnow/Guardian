/**
 * Background service worker for Guardian extension
 * Handles password matching and autofill coordination
 */

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  website: string;
  password: string;
}

interface AutofillMatch {
  id: string;
  username: string;
  password: string;
  title: string;
  website: string;
}

// Store decrypted passwords in memory and chrome.storage (persists across restarts)
let cachedPasswords: PasswordEntry[] = [];
let isLoggedIn = false;

const PASSWORDS_STORAGE_KEY = 'guardian_autofill_passwords';
const LOGIN_STATE_KEY = 'guardian_is_logged_in';

// Load passwords from storage on startup
async function loadPasswordsFromStorage() {
  try {
    const result = await chrome.storage.local.get([PASSWORDS_STORAGE_KEY, LOGIN_STATE_KEY]);
    if (result[PASSWORDS_STORAGE_KEY]) {
      cachedPasswords = result[PASSWORDS_STORAGE_KEY];
    }
    if (result[LOGIN_STATE_KEY] !== undefined) {
      isLoggedIn = result[LOGIN_STATE_KEY];
    }
  } catch (error) {
    console.error('Failed to load passwords from storage:', error);
  }
}

// Save passwords to storage
async function savePasswordsToStorage() {
  try {
    await chrome.storage.local.set({
      [PASSWORDS_STORAGE_KEY]: cachedPasswords,
      [LOGIN_STATE_KEY]: isLoggedIn,
    });
  } catch (error) {
    console.error('Failed to save passwords to storage:', error);
  }
}

// Clear passwords from storage
async function clearPasswordsFromStorage() {
  try {
    await chrome.storage.local.remove([PASSWORDS_STORAGE_KEY, LOGIN_STATE_KEY]);
  } catch (error) {
    console.error('Failed to clear passwords from storage:', error);
  }
}

// Load passwords on startup
loadPasswordsFromStorage();

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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getMatches') {
    const matches = findMatches(message.url);
    sendResponse({ matches, isLoggedIn });
    return true;
  }

  if (message.action === 'checkAutoUnlock') {
    // Check if we have passwords in memory/storage for auto-unlock
    sendResponse({ 
      canAutoUnlock: isLoggedIn && cachedPasswords.length > 0,
      passwordCount: cachedPasswords.length 
    });
    return true;
  }

  if (message.action === 'getCachedPasswords') {
    // Return cached passwords for auto-unlock (only if logged in)
    if (isLoggedIn) {
      sendResponse({ passwords: cachedPasswords, success: true });
    } else {
      sendResponse({ passwords: [], success: false });
    }
    return true;
  }

  if (message.action === 'openExtension') {
    // Open extension popup - this will be handled by the popup
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'updatePasswords') {
    cachedPasswords = message.passwords || [];
    isLoggedIn = message.isLoggedIn || false;
    // Persist to storage
    savePasswordsToStorage().then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: true }); // Still respond success even if storage fails
    });
    return true;
  }

  if (message.action === 'clearPasswords') {
    cachedPasswords = [];
    isLoggedIn = false;
    // Clear from storage
    clearPasswordsFromStorage().then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: true }); // Still respond success even if storage fails
    });
    return true;
  }


  return false;
});

// On startup, load passwords from storage (don't clear - we want them to persist)
chrome.runtime.onStartup.addListener(() => {
  loadPasswordsFromStorage();
});

// On install/update, clear passwords for security
chrome.runtime.onInstalled.addListener(() => {
  cachedPasswords = [];
  isLoggedIn = false;
  clearPasswordsFromStorage();
});

