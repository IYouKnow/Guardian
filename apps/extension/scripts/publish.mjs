// Publishes the packaged extension to the Chrome Web Store via the
// Chrome Web Store API v2, authenticated with a Google Cloud service
// account. Dependency-free: JWT signing with node:crypto, HTTP with fetch.
//
//   node scripts/publish.mjs [--upload-only | --check]
//
//   --check   authenticate and verify access to the store item, without
//             uploading or publishing anything. Exits non-zero on failure.
//
// Required env:
//   CWS_SERVICE_ACCOUNT_JSON   service-account key JSON (inline), or
//   CWS_SERVICE_ACCOUNT_FILE   path to the service-account key JSON
//   CWS_PUBLISHER_ID           Developer Dashboard -> Publisher -> Settings
// Optional:
//   CWS_EXTENSION_ID           override the store item id (defaults to STORE_ITEM_ID)
//   CWS_ZIP                    path to the zip (defaults to newest in release/)
//
// The store item must already exist (do one manual upload first). The
// manifest version must be higher than what is already on the store.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign } from 'node:crypto';

// The Guardian store item. This id is public (it appears in the listing URL)
// and must never change, or an update would be pushed to a different item —
// which is exactly the "duplicate listing" violation. Override only if you
// deliberately migrate to a new item.
const STORE_ITEM_ID = 'bfjoohlcpkpmdeldpjgiangapiekbbfk';

const API = 'https://chromewebstore.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const UPLOAD_POLL_ATTEMPTS = 20;
const UPLOAD_POLL_INTERVAL_MS = 3000;

const uploadOnly = process.argv.includes('--upload-only');
const checkOnly = process.argv.includes('--check');
const extensionRoot = fileURLToPath(new URL('..', import.meta.url));

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}.`);
  return value;
}

function loadServiceAccount() {
  const inline = process.env.CWS_SERVICE_ACCOUNT_JSON;
  if (inline) return JSON.parse(inline);
  const file = process.env.CWS_SERVICE_ACCOUNT_FILE;
  if (file) return JSON.parse(readFileSync(file, 'utf8'));
  throw new Error(
    'Provide the service-account key via CWS_SERVICE_ACCOUNT_JSON or CWS_SERVICE_ACCOUNT_FILE.',
  );
}

function resolveZip() {
  if (process.env.CWS_ZIP) return process.env.CWS_ZIP;
  const releaseDir = join(extensionRoot, 'release');
  let entries;
  try {
    entries = readdirSync(releaseDir);
  } catch {
    throw new Error(`No release directory at ${releaseDir}. Run "package:chrome" first.`);
  }
  const zips = entries
    .filter((name) => name.startsWith('guardian-chrome-') && name.endsWith('.zip'))
    .map((name) => join(releaseDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (zips.length === 0) {
    throw new Error(`No guardian-chrome-*.zip found in ${releaseDir}. Run "package:chrome" first.`);
  }
  return zips[0];
}

async function getAccessToken(serviceAccount) {
  const tokenUri = serviceAccount.token_uri || DEFAULT_TOKEN_URI;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(serviceAccount.private_key);
  const assertion = `${signingInput}.${base64url(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${text}`);
  const { access_token } = JSON.parse(text);
  return access_token;
}

async function callJson(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const publisherId = requireEnv('CWS_PUBLISHER_ID');
  const extensionId = process.env.CWS_EXTENSION_ID || STORE_ITEM_ID;
  const base = `${API}/v2/publishers/${publisherId}/items/${extensionId}`;

  const token = await getAccessToken(serviceAccount);
  console.log('Access token acquired.');

  if (checkOnly) {
    console.log(`Checking access to publisher ${publisherId}, item ${extensionId}...`);
    try {
      const status = await callJson(`${base}:fetchStatus`, token);
      console.log('fetchStatus:', JSON.stringify(status, null, 2));
      console.log('\nCredentials are valid: the service account can reach this item.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nCredential check FAILED: ${message}`);
      if (message.includes('403')) {
        console.error(
          '403 — authenticated but not authorized. Confirm this service account\'s email is listed under the publisher dashboard Account section.',
        );
      } else if (message.includes('404')) {
        console.error('404 — the publisher id or the store item id is wrong.');
      }
      process.exit(1);
    }
    return;
  }

  const zipPath = resolveZip();
  console.log(`Publishing ${zipPath} (item ${extensionId})`);

  const uploadBody = readFileSync(zipPath);
  let upload = await callJson(`${API}/upload/v2/publishers/${publisherId}/items/${extensionId}:upload`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: uploadBody,
  });
  console.log('Upload response:', JSON.stringify(upload));

  for (let attempt = 0; attempt < UPLOAD_POLL_ATTEMPTS && upload.uploadState === 'IN_PROGRESS'; attempt++) {
    await new Promise((r) => setTimeout(r, UPLOAD_POLL_INTERVAL_MS));
    upload = await callJson(`${base}:fetchStatus`, token);
    console.log(`fetchStatus (${attempt + 1}):`, JSON.stringify(upload));
  }

  if (upload.uploadState === 'FAILURE') {
    throw new Error(`Upload failed: ${JSON.stringify(upload)}`);
  }
  if (upload.uploadState === 'IN_PROGRESS') {
    throw new Error('Upload still in progress after polling; try again shortly.');
  }

  if (uploadOnly) {
    console.log('Upload complete. Skipping publish (--upload-only).');
    return;
  }

  const published = await callJson(`${base}:publish`, token, { method: 'POST' });
  console.log('Publish response:', JSON.stringify(published));
  console.log('Submitted to the Chrome Web Store for review.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
