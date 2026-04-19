/**
 * Content script for Guardian autofill functionality
 * Detects login forms and shows autofill suggestions
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

// State
let currentInput: HTMLInputElement | null = null;
let autofillDropdown: HTMLElement | null = null;
let isPasswordField = false;
let matches: AutofillMatch[] = [];

// True once we detect the extension context has been invalidated
// (e.g. extension reloaded/updated). Stale content scripts from before
// the reload cannot talk to the new service worker, so we quietly stop
// trying rather than spamming the console on every event.
let extensionContextInvalid = false;

function isExtensionAlive(): boolean {
  if (extensionContextInvalid) return false;
  try {
    // chrome.runtime.id becomes undefined after context invalidation.
    return !!(chrome.runtime && chrome.runtime.id);
  } catch {
    extensionContextInvalid = true;
    return false;
  }
}

// Centralised wrapper around chrome.runtime.sendMessage that:
// - short-circuits when the extension context is dead
// - detects "Extension context invalidated" errors and disables further
//   messaging from this stale content script
async function safeSendMessage<T = any>(message: any): Promise<T | null> {
  if (!isExtensionAlive()) return null;
  try {
    return (await chrome.runtime.sendMessage(message)) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Extension context invalidated') || msg.includes('Receiving end does not exist')) {
      extensionContextInvalid = true;
    }
    throw err;
  }
}

// Create autofill dropdown UI
function createAutofillDropdown(): HTMLElement {
  const dropdown = document.createElement('div');
  dropdown.id = 'guardian-autofill-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    min-width: 300px;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
  `;

  return dropdown;
}

// Render dropdown content
function renderDropdown(matches: AutofillMatch[], showCreateOption: boolean = false, currentUrl: string = '') {
  if (!autofillDropdown) return;

  if (matches.length === 0 && !showCreateOption) {
    autofillDropdown.style.display = 'none';
    return;
  }

  autofillDropdown.innerHTML = '';

  matches.forEach((match, index) => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #1a1a1a;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: background 0.2s;
    `;
    item.onmouseenter = () => {
      item.style.background = '#1a1a1a';
    };
    item.onmouseleave = () => {
      item.style.background = 'transparent';
    };
    item.onclick = () => {
      fillCredentials(match);
      hideDropdown();
    };

    // Icon
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(250, 204, 21, 0.1));
      border: 1px solid rgba(250, 204, 21, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    icon.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="rgb(250, 204, 21)" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
      </svg>
    `;

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const username = document.createElement('div');
    username.style.cssText = `
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    username.textContent = match.username || match.title;

    const password = document.createElement('div');
    password.style.cssText = `
      color: #9ca3af;
      font-size: 12px;
      font-family: monospace;
      letter-spacing: 2px;
    `;
    password.textContent = '••••••••';

    content.appendChild(username);
    content.appendChild(password);

    item.appendChild(icon);
    item.appendChild(content);
    autofillDropdown.appendChild(item);
  });

  // Create password option (if no matches found)
  if (showCreateOption && matches.length === 0) {
    const createItem = document.createElement('div');
    createItem.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      border-top: 1px solid #1a1a1a;
      transition: background 0.2s;
    `;
    createItem.onmouseenter = () => {
      createItem.style.background = '#1a1a1a';
    };
    createItem.onmouseleave = () => {
      createItem.style.background = 'transparent';
    };
    createItem.onclick = () => {
      // Open extension to create password
      safeSendMessage({
        action: 'openExtension',
        createPassword: true,
        url: currentUrl,
      }).catch(() => {});
      hideDropdown();
    };

    const createIcon = document.createElement('div');
    createIcon.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    createIcon.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="rgb(250, 204, 21)" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    `;

    const createText = document.createElement('div');
    createText.style.cssText = `
      flex: 1;
    `;

    const createTitle = document.createElement('div');
    createTitle.style.cssText = `
      color: rgb(250, 204, 21);
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 2px;
    `;
    createTitle.textContent = 'Save password for this site';

    const createSubtitle = document.createElement('div');
    createSubtitle.style.cssText = `
      color: #9ca3af;
      font-size: 12px;
    `;
    createSubtitle.textContent = getDomain(currentUrl) || 'This website';

    createText.appendChild(createTitle);
    createText.appendChild(createSubtitle);
    createItem.appendChild(createIcon);
    createItem.appendChild(createText);
    autofillDropdown.appendChild(createItem);
  }

  // Manage passwords option
  const manageItem = document.createElement('div');
  manageItem.style.cssText = `
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid #1a1a1a;
    transition: background 0.2s;
  `;
  manageItem.onmouseenter = () => {
    manageItem.style.background = '#1a1a1a';
  };
  manageItem.onmouseleave = () => {
    manageItem.style.background = 'transparent';
  };
  manageItem.onclick = () => {
    // Close dropdown - user can click extension icon to manage passwords
    hideDropdown();
  };

  const manageIcon = document.createElement('div');
  manageIcon.style.cssText = `
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  manageIcon.innerHTML = `
    <svg width="16" height="16" fill="none" stroke="rgb(156, 163, 175)" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  `;

  const manageText = document.createElement('div');
  manageText.style.cssText = `
    color: #9ca3af;
    font-size: 13px;
  `;
  manageText.textContent = 'Manage passwords...';

  manageItem.appendChild(manageIcon);
  manageItem.appendChild(manageText);
  autofillDropdown.appendChild(manageItem);

  autofillDropdown.style.display = 'block';
}

// Position dropdown relative to input
function positionDropdown(input: HTMLInputElement) {
  if (!autofillDropdown) return;

  const rect = input.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  autofillDropdown.style.top = `${rect.bottom + scrollTop + 4}px`;
  autofillDropdown.style.left = `${rect.left + scrollLeft}px`;
}

// Show dropdown
function showDropdown(input: HTMLInputElement, passwordMatches: AutofillMatch[], showCreate: boolean = false, url: string = '') {
  matches = passwordMatches;
  currentInput = input;
  isPasswordField = input.type === 'password';

  if (!autofillDropdown) {
    autofillDropdown = createAutofillDropdown();
    document.body.appendChild(autofillDropdown);
  }

  renderDropdown(matches, showCreate, url);
  positionDropdown(input);
}

// Hide dropdown
function hideDropdown() {
  if (autofillDropdown) {
    autofillDropdown.style.display = 'none';
  }
  currentInput = null;
  matches = [];
}

// React/Vue/Svelte tracked-input aware value setter. A naked
// `input.value = x` bypasses React's synthetic event system and the value
// snaps back on the next render. Using the native setter from the
// prototype descriptor and dispatching the usual lifecycle events makes
// the framework pick up the change as if the user had typed it.
function setInputValueNative(input: HTMLInputElement, value: string) {
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  // Fire the events a real user would: focus → input → change → blur-ish.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

// Locate username + password fields starting from the current input.
// Works whether the page uses a <form> or a plain <div> (very common on
// modern SPAs like Twitter/X, GitHub, etc.).
function findLoginFields(startFrom: HTMLInputElement): {
  username: HTMLInputElement | null;
  password: HTMLInputElement | null;
} {
  // Search scope: nearest form if any, else the whole document.
  const scope: Document | HTMLElement = startFrom.closest('form') || document;

  const isVisible = (el: HTMLInputElement) =>
    !el.disabled && !el.readOnly && el.offsetParent !== null;

  const allPasswords = Array.from(
    scope.querySelectorAll<HTMLInputElement>('input[type="password"]'),
  ).filter(isVisible);

  // Pick the password field nearest to the user's current input.
  let passwordField: HTMLInputElement | null = null;
  if (startFrom.type === 'password') {
    passwordField = startFrom;
  } else if (allPasswords.length > 0) {
    passwordField =
      allPasswords.find(
        (p) =>
          !!(startFrom.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING),
      ) || allPasswords[0];
  }

  // Pick the best matching username/email field, preferring one that
  // comes before the password field.
  const usernameCandidates = Array.from(
    scope.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="email"], input[type="tel"], input:not([type])',
    ),
  ).filter((el) => isVisible(el) && el !== passwordField);

  const scoreField = (el: HTMLInputElement): number => {
    let score = 0;
    const hint = `${el.autocomplete || ''} ${el.name || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
    if (el.autocomplete === 'username' || el.autocomplete === 'email') score += 10;
    if (el.type === 'email') score += 4;
    if (/email/.test(hint)) score += 3;
    if (/user(name)?/.test(hint)) score += 3;
    if (/login/.test(hint)) score += 2;
    if (/phone|mobile/.test(hint)) score += 1;
    return score;
  };

  let usernameField: HTMLInputElement | null = null;
  if (startFrom.type !== 'password') {
    usernameField = startFrom;
  } else if (passwordField) {
    const before = usernameCandidates.filter(
      (el) =>
        !!(el.compareDocumentPosition(passwordField!) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    const pool = before.length > 0 ? before : usernameCandidates;
    const scored = pool.map((el) => ({ el, score: scoreField(el) }));
    scored.sort((a, b) => b.score - a.score);
    usernameField = scored[0]?.el || null;
  }

  return { username: usernameField, password: passwordField };
}

// Fill credentials into the page. Works on both classic <form> logins
// and modern form-less SPAs.
function fillCredentials(match: AutofillMatch) {
  if (!currentInput) return;

  const { username: usernameField, password: passwordField } =
    findLoginFields(currentInput);

  if (usernameField && match.username) {
    usernameField.focus();
    setInputValueNative(usernameField, match.username);
  }

  if (passwordField && match.password) {
    passwordField.focus();
    setInputValueNative(passwordField, match.password);
  }

  // Put focus somewhere sensible so the user can immediately press Enter.
  if (passwordField) passwordField.focus();
  else if (usernameField) usernameField.focus();
}

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

// Decide whether a focused field is a plausible login field. We accept
// type=password always, and type=text/email/tel when hints or nearby
// password fields suggest a login context. This replaces the old rule
// that required a <form> ancestor, which fails on most modern SPAs.
function isLoginLikeField(input: HTMLInputElement): boolean {
  if (!input || !input.tagName || input.tagName !== 'INPUT') return false;
  if (input.disabled || input.readOnly) return false;

  const type = (input.type || '').toLowerCase();
  if (type === 'password') return true;
  if (type !== 'text' && type !== 'email' && type !== 'tel' && type !== '') return false;

  // Strong positive signals from HTML attributes.
  const ac = (input.autocomplete || '').toLowerCase();
  if (ac === 'username' || ac === 'email' || ac.startsWith('new-password') || ac.startsWith('current-password')) {
    return true;
  }
  const hint = `${input.name || ''} ${input.id || ''} ${input.getAttribute('aria-label') || ''} ${input.placeholder || ''}`.toLowerCase();
  if (/\b(user(name)?|email|login|account)\b/.test(hint)) return true;

  // Fallback: the page has a visible password field somewhere → this
  // text/email field is probably its companion username.
  const pwdNearby = document.querySelector<HTMLInputElement>('input[type="password"]');
  if (pwdNearby && pwdNearby.offsetParent !== null) return true;

  return false;
}

// Handle input focus
async function handleInputFocus(event: FocusEvent) {
  const input = event.target as HTMLInputElement;
  if (!isLoginLikeField(input)) return;

  // Request matching passwords from background script
  try {
    const currentUrl = window.location.href;
    const response = await safeSendMessage<{ matches: AutofillMatch[]; isLoggedIn: boolean }>({
      action: 'getMatches',
      url: currentUrl
    });

    if (response) {
      const matches: AutofillMatch[] = Array.isArray(response.matches) ? response.matches : [];
      const isLoggedIn = response.isLoggedIn || false;

      // Show dropdown if we have matches OR if user is logged in (to show create option)
      if (matches.length > 0 || isLoggedIn) {
        showDropdown(input, matches, isLoggedIn && matches.length === 0, currentUrl);
      }
    }
  } catch (error) {
    if (!extensionContextInvalid) {
      console.error('Guardian autofill error:', error);
    }
  }
}

// Handle clicks outside dropdown
function handleClickOutside(event: MouseEvent) {
  if (autofillDropdown && !autofillDropdown.contains(event.target as Node)) {
    if (currentInput && !currentInput.contains(event.target as Node)) {
      hideDropdown();
    }
  }
}

// ---------------------------------------------------------------------------
// Save-on-submit prompt
// ---------------------------------------------------------------------------

interface CapturedCredential {
  username: string;
  password: string;
  url: string;
}

let lastCapturedCredential: CapturedCredential | null = null;
let saveBannerHost: HTMLElement | null = null;
let saveBannerRoot: ShadowRoot | null = null;
let lastPromptKey: string | null = null;
let lastPromptAt = 0;

// Find the most likely username/email field associated with a password field.
function findAssociatedUsernameField(
  passwordField: HTMLInputElement,
  scope: Document | HTMLElement,
): HTMLInputElement | null {
  const candidates = Array.from(
    scope.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="email"], input[type="tel"], input:not([type])',
    ),
  ).filter((el) => {
    if (el.disabled || el.readOnly) return false;
    if (el.offsetParent === null && el.type !== 'hidden') return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Prefer fields that appear BEFORE the password in DOM order.
  const before = candidates.filter((el) => {
    const pos = el.compareDocumentPosition(passwordField);
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });

  const pool = before.length > 0 ? before : candidates;

  // Score by how likely this is a username/email field.
  const scored = pool.map((el) => {
    let score = 0;
    const hint = `${el.autocomplete || ''} ${el.name || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
    if (/email/.test(hint)) score += 3;
    if (/user/.test(hint)) score += 3;
    if (/login/.test(hint)) score += 2;
    if (el.type === 'email') score += 2;
    if (el.autocomplete === 'username') score += 5;
    return { el, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.el || null;
}

// Capture the current username + password from the given form (or document).
function captureFrom(scope: Document | HTMLElement | null): CapturedCredential | null {
  const root = scope || document;
  const passwordField = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="password"]'),
  ).find((el) => !!el.value);

  if (!passwordField || !passwordField.value) return null;

  const usernameField = findAssociatedUsernameField(passwordField, root);
  const cred: CapturedCredential = {
    username: usernameField?.value || '',
    password: passwordField.value,
    url: window.location.href,
  };
  lastCapturedCredential = cred;
  return cred;
}

// Ask the background if we should prompt, and if so, show the banner.
async function attemptPromptSave(cred: CapturedCredential | null) {
  if (!cred || !cred.password || cred.password.length < 4) return;

  // De-duplicate: don't re-prompt for the same credential within 10s.
  const key = `${cred.url}|${cred.username}|${cred.password}`;
  const now = Date.now();
  if (key === lastPromptKey && now - lastPromptAt < 10_000) return;
  lastPromptKey = key;
  lastPromptAt = now;

  try {
    const response = await safeSendMessage<{
      prompt: 'none' | 'save' | 'update';
      entryId?: string;
      entryTitle?: string;
    }>({
      action: 'checkShouldPromptSave',
      url: cred.url,
      username: cred.username,
      password: cred.password,
    });
    if (!response) return;

    if (response.prompt === 'save') {
      showSaveBanner({ mode: 'save', credential: cred });
    } else if (response.prompt === 'update' && response.entryId) {
      showSaveBanner({
        mode: 'update',
        credential: cred,
        entryId: response.entryId,
        entryTitle: response.entryTitle,
      });
    }
  } catch (err) {
    // Stale content script (extension reloaded) or SW unavailable — stay quiet.
    if (!extensionContextInvalid) {
      console.warn('Guardian: save-prompt check failed', err);
    }
  }
}

// Build the banner host + shadow root (once).
function ensureSaveBannerHost(): ShadowRoot {
  if (saveBannerRoot && saveBannerHost && saveBannerHost.isConnected) {
    return saveBannerRoot;
  }
  saveBannerHost = document.createElement('div');
  saveBannerHost.id = 'guardian-save-banner-host';
  saveBannerHost.style.cssText = `
    all: initial;
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
  `;
  saveBannerRoot = saveBannerHost.attachShadow({ mode: 'closed' });
  document.documentElement.appendChild(saveBannerHost);
  return saveBannerRoot;
}

function hideSaveBanner() {
  if (saveBannerHost && saveBannerHost.parentNode) {
    saveBannerHost.parentNode.removeChild(saveBannerHost);
  }
  saveBannerHost = null;
  saveBannerRoot = null;
}

interface BannerOptions {
  mode: 'save' | 'update';
  credential: CapturedCredential;
  entryId?: string;
  entryTitle?: string;
}

function showSaveBanner(options: BannerOptions) {
  const root = ensureSaveBannerHost();
  root.innerHTML = '';

  const domain = getDomain(options.credential.url) || 'this site';
  const isUpdate = options.mode === 'update';
  const title = isUpdate ? 'Update password?' : 'Save password?';
  const subtitle = isUpdate
    ? `We noticed a new password for "${options.entryTitle || domain}".`
    : `Save this login for ${domain} to your Guardian vault?`;
  const primaryLabel = isUpdate ? 'Update' : 'Save';

  const wrap = document.createElement('div');
  wrap.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: 320px;
    background: #0a0a0a;
    color: #ffffff;
    border: 1px solid rgba(250, 204, 21, 0.3);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    padding: 14px 16px;
    box-sizing: border-box;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';

  const icon = document.createElement('div');
  icon.style.cssText = `
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(250, 204, 21, 0.1));
    border: 1px solid rgba(250, 204, 21, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `;
  icon.innerHTML = `
    <svg width="14" height="14" fill="none" stroke="rgb(250, 204, 21)" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
    </svg>
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size:13px;font-weight:600;';
  titleEl.textContent = title;

  header.appendChild(icon);
  header.appendChild(titleEl);

  const subtitleEl = document.createElement('div');
  subtitleEl.style.cssText = 'font-size:12px;color:#9ca3af;margin-bottom:10px;line-height:1.4;';
  subtitleEl.textContent = subtitle;

  const credsBox = document.createElement('div');
  credsBox.style.cssText = `
    background: #111111;
    border: 1px solid #1f1f1f;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    margin-bottom: 12px;
  `;
  const userRow = document.createElement('div');
  userRow.style.cssText = 'color:#d4d4d8;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  userRow.textContent = options.credential.username || '(no username)';
  const passRow = document.createElement('div');
  passRow.style.cssText = 'color:#71717a;font-family:monospace;letter-spacing:2px;';
  passRow.textContent = '•'.repeat(Math.min(12, options.credential.password.length));
  credsBox.appendChild(userRow);
  credsBox.appendChild(passRow);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const makeBtn = (label: string, primary: boolean) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      border: 1px solid ${primary ? 'rgb(250, 204, 21)' : '#27272a'};
      background: ${primary ? 'rgb(250, 204, 21)' : 'transparent'};
      color: ${primary ? '#000000' : '#d4d4d8'};
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    `;
    return btn;
  };

  const primaryBtn = makeBtn(primaryLabel, true);
  const neverBtn = makeBtn('Never', false);
  const laterBtn = makeBtn('Not now', false);
  laterBtn.style.marginLeft = 'auto';

  const status = document.createElement('div');
  status.style.cssText = 'font-size:11px;margin-top:10px;line-height:1.4;display:none;';

  const showStatus = (text: string, tone: 'ok' | 'warn' | 'err') => {
    const color = tone === 'ok' ? '#22c55e' : tone === 'warn' ? 'rgb(250, 204, 21)' : '#ef4444';
    status.style.color = color;
    status.style.display = 'block';
    status.textContent = text;
  };

  primaryBtn.onclick = async () => {
    primaryBtn.disabled = true;
    neverBtn.disabled = true;
    laterBtn.disabled = true;
    primaryBtn.textContent = 'Saving...';
    let response: any = null;
    try {
      if (isUpdate && options.entryId) {
        response = await safeSendMessage({
          action: 'updatePassword',
          entryId: options.entryId,
          password: options.credential.password,
        });
      } else {
        response = await safeSendMessage({
          action: 'savePassword',
          url: options.credential.url,
          username: options.credential.username,
          password: options.credential.password,
          title: domain,
        });
      }
    } catch (err) {
      console.warn('Guardian: save failed', err);
      showStatus(
        extensionContextInvalid
          ? 'Guardian was updated. Please reload this page and try again.'
          : 'Could not reach Guardian extension.',
        'err',
      );
      window.setTimeout(() => hideSaveBanner(), 3500);
      return;
    }

    // Null response = extension context invalidated (stale script).
    if (response === null && extensionContextInvalid) {
      showStatus('Guardian was updated. Please reload this page and try again.', 'err');
      window.setTimeout(() => hideSaveBanner(), 3500);
      return;
    }

    // Interpret response from the service worker.
    if (!response || !response.success) {
      const reason = response?.reason || 'unknown';
      if (reason === 'locked') {
        showStatus('Guardian is locked. Open the popup to unlock, then try again.', 'err');
      } else if (reason === 'not-found') {
        showStatus('Entry no longer exists. Please try "Save" instead.', 'err');
      } else {
        showStatus('Save failed. Please try again.', 'err');
      }
      window.setTimeout(() => hideSaveBanner(), 3500);
      return;
    }

    const push = response.push;
    if (push?.state === 'failed') {
      showStatus(
        'Saved locally, but could not sync to server. Your entry may be lost on next login — check your server connection.',
        'warn',
      );
      window.setTimeout(() => hideSaveBanner(), 5000);
      return;
    }
    if (push?.state === 'skipped' && push.reason === 'missing-session') {
      showStatus(
        'Saved locally. Open the popup to finish syncing to your server.',
        'warn',
      );
      window.setTimeout(() => hideSaveBanner(), 4500);
      return;
    }

    showStatus(isUpdate ? 'Password updated.' : 'Password saved.', 'ok');
    window.setTimeout(() => hideSaveBanner(), 1500);
  };

  neverBtn.onclick = async () => {
    try {
      await safeSendMessage({
        action: 'neverAskForDomain',
        domain,
      });
    } catch {
      // ignore
    }
    hideSaveBanner();
  };

  laterBtn.onclick = () => hideSaveBanner();

  actions.appendChild(neverBtn);
  actions.appendChild(laterBtn);
  actions.appendChild(primaryBtn);

  wrap.appendChild(header);
  wrap.appendChild(subtitleEl);
  wrap.appendChild(credsBox);
  wrap.appendChild(actions);
  wrap.appendChild(status);
  root.appendChild(wrap);

  // Auto-dismiss after 30s.
  window.setTimeout(() => {
    if (saveBannerRoot === root) hideSaveBanner();
  }, 30_000);
}

// Attach listeners that capture credentials and trigger the prompt.
function attachCaptureListeners() {
  // Capture on real form submissions (most reliable signal).
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target as HTMLElement | null;
      const cred = captureFrom(form);
      if (cred) attemptPromptSave(cred);
    },
    true,
  );

  // Enter key inside a password field → likely a submit.
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLInputElement | null;
      if (!target || target.tagName !== 'INPUT' || target.type !== 'password') return;
      if (!target.value) return;
      const scope = target.closest('form') || document;
      const cred = captureFrom(scope);
      if (cred) window.setTimeout(() => attemptPromptSave(cred), 200);
    },
    true,
  );

  // Click on login-ish buttons inside SPAs (no <form>).
  document.addEventListener(
    'click',
    (event) => {
      const el = (event.target as HTMLElement | null)?.closest(
        'button, [role="button"], input[type="submit"], a[href]',
      ) as HTMLElement | null;
      if (!el) return;
      const type = el.getAttribute('type')?.toLowerCase();
      const label = (
        el.textContent ||
        el.getAttribute('aria-label') ||
        el.getAttribute('value') ||
        ''
      )
        .toLowerCase()
        .trim();
      const looksLikeSubmit =
        type === 'submit' ||
        /\b(log[\s-]?in|sign[\s-]?in|sign[\s-]?up|register|create\s+account|continue)\b/.test(
          label,
        );
      if (!looksLikeSubmit) return;
      const scope = el.closest('form') || document;
      const cred = captureFrom(scope);
      if (cred) window.setTimeout(() => attemptPromptSave(cred), 400);
    },
    true,
  );

  // Fallback: keep capturing the latest typed password so an SPA that
  // navigates away after login still has a chance to prompt on the next page.
  document.addEventListener(
    'input',
    (event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target || target.tagName !== 'INPUT' || target.type !== 'password') return;
      const scope = target.closest('form') || document;
      captureFrom(scope);
    },
    true,
  );

  // If the page URL changes after a captured password, try prompting —
  // covers SPAs that push a new history entry on login.
  let lastHref = window.location.href;
  const checkNav = () => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      if (lastCapturedCredential) {
        attemptPromptSave({ ...lastCapturedCredential, url: lastHref });
      }
    }
  };
  window.addEventListener('popstate', checkNav);
  window.addEventListener('hashchange', checkNav);
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof origPush>) {
    const ret = origPush.apply(this, args);
    window.setTimeout(checkNav, 0);
    return ret;
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    const ret = origReplace.apply(this, args);
    window.setTimeout(checkNav, 0);
    return ret;
  };
}

// Initialize
function init() {
  // Listen for focus events on input fields
  document.addEventListener('focusin', handleInputFocus);

  // Listen for clicks outside to close dropdown
  document.addEventListener('click', handleClickOutside);

  // Keep the dropdown glued to the input on scroll/resize.
  const reposition = () => {
    if (currentInput && autofillDropdown && autofillDropdown.style.display !== 'none') {
      positionDropdown(currentInput);
    }
  };
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);

  // Save-on-submit capture + prompt.
  attachCaptureListeners();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

