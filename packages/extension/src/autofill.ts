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
      chrome.runtime.sendMessage({
        action: 'openExtension',
        createPassword: true,
        url: currentUrl,
      }).catch(console.error);
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

// Fill credentials into form
function fillCredentials(match: AutofillMatch) {
  if (!currentInput) return;

  // Find the form
  const form = currentInput.closest('form');
  if (!form) return;

  // Find username field (if current is password)
  let usernameField: HTMLInputElement | null = null;
  let passwordField: HTMLInputElement | null = null;

  if (isPasswordField) {
    passwordField = currentInput;
    // Try to find username field before password field
    const inputs = Array.from(form.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"]'));
    usernameField = inputs.find(input => {
      const elem = input as HTMLInputElement;
      return elem !== passwordField &&
        (elem.type === 'text' || elem.type === 'email' ||
          elem.name?.toLowerCase().includes('user') ||
          elem.name?.toLowerCase().includes('email') ||
          elem.id?.toLowerCase().includes('user') ||
          elem.id?.toLowerCase().includes('email'));
    }) as HTMLInputElement | null;
  } else {
    usernameField = currentInput;
    // Try to find password field after username field
    const inputs = Array.from(form.querySelectorAll('input[type="password"]'));
    passwordField = inputs[0] as HTMLInputElement | null;
  }

  // Fill username
  if (usernameField && match.username) {
    usernameField.value = match.username;
    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
    usernameField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Fill password
  if (passwordField && match.password) {
    passwordField.value = match.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
  }
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

// Handle input focus
async function handleInputFocus(event: FocusEvent) {
  const input = event.target as HTMLInputElement;

  // Only handle text, email, and password inputs
  if (!input || (input.type !== 'text' && input.type !== 'email' && input.type !== 'password')) {
    return;
  }

  // Check if it's likely a login form
  const form = input.closest('form');
  if (!form) return;

  // Request matching passwords from background script
  try {
    const currentUrl = window.location.href;
    const response = await chrome.runtime.sendMessage({
      action: 'getMatches',
      url: currentUrl
    });

    if (response) {
      const matches = response.matches || [];
      const isLoggedIn = response.isLoggedIn || false;

      // Show dropdown if we have matches OR if user is logged in (to show create option)
      if (matches.length > 0 || isLoggedIn) {
        showDropdown(input, matches, isLoggedIn && matches.length === 0, currentUrl);
      }
    }
  } catch (error) {
    console.error('Guardian autofill error:', error);
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

// Initialize
function init() {
  // Listen for focus events on input fields
  document.addEventListener('focusin', handleInputFocus);

  // Listen for clicks outside to close dropdown
  document.addEventListener('click', handleClickOutside);

  // Listen for scroll to reposition dropdown
  window.addEventListener('scroll', () => {
    if (currentInput && autofillDropdown && autofillDropdown.style.display !== 'none') {
      positionDropdown(currentInput);
    }
  }, true);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

