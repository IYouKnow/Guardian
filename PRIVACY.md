# Guardian Privacy Policy

_Last updated: October 11, 2026_

Guardian is a self-hosted, local-first password manager. It is available as a browser
extension, a desktop app, and a mobile app, with an optional self-hosted server and web admin
panel. Encryption happens on your device — your master password and decrypted data are never
sent anywhere.

This policy covers all of the Guardian apps and the server software.

## Our approach

- Guardian does not send your data to us or to any third party.
- There are no accounts with us, and no analytics, telemetry, advertising, or crash reporting.
- The optional server is software you run and control. We never operate it and never receive
  its data.

## What Guardian handles

- **Login credentials** you choose to save — usernames, passwords, notes, website addresses,
  tags, folders, and similar entry fields.
- **Page content**, read locally in your browser by the browser extension only to detect
  sign-in forms so autofill and save-prompting can work.
- **Page address, title, and favicon**, when you save a login from a page in the browser
  extension.
- **Server account data**, if you use a server: a username, a hashed password, a friendly
  name, and login timestamps.

## How we use it

Solely to provide Guardian's single purpose: saving, managing, syncing, and autofilling your
logins. We do not use it for advertising, profiling, or any purpose unrelated to that.

## Where it is stored

- **Browser extension** — your vault, encrypted, in the browser's local extension storage; the
  unlocked session is held in session storage and cleared when the browser closes.
- **Desktop and mobile apps** — encrypted vault files on your device. Encryption keys are
  derived from your master password and never leave the device.
- **Server (optional, self-hosted)** — on the machine you run it on: account credentials
  (username and a hashed password) and your vault stored as encrypted blobs. The server has no
  way to read your vault contents.

## Sharing

None. We do not sell, transfer, or share your data with anyone. Because we never receive your
data, there is nothing for us to share.

## Limited use

Guardian's use of your data is limited to providing and improving its single purpose. We do not
sell or transfer your data to third parties, we do not use it for advertising or for any purpose
unrelated to Guardian, and we do not use it to determine creditworthiness or for lending purposes.

## Retention and deletion

Your data stays on your device (and on your own server, if you run one) until you delete it.
Deleting entries, removing an app, or deleting your server data removes it.

## Security

Vaults are encrypted at rest using keys derived with Argon2/Argon2id and encrypted with
ChaCha20 (ChaCha20-Poly1305). Data that a client sends to your server is transmitted over the
connection you configure (use HTTPS/WSS in production).

## Contact

Questions about this policy? Contact **your-contact-email**.
