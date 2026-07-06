# Release Notes

## v1.0.0 — Initial Release

Guardian Desktop is a native password manager that keeps your vault encrypted at all times — your master password and decrypted data never leave your device.

### Features

- **Local vaults** — create and open encrypted `.guardian` vault files stored anywhere on disk
- **Server sync** — connect to a self‑hosted Guardian server for cross‑device access with real‑time WebSocket push
- **Strong encryption** — Argon2id key derivation + ChaCha20‑Poly1305, all client‑side
- **Clipboard auto‑clear** — copied passwords are wiped from the clipboard after a configurable delay
- **Frameless window** — custom titlebar with native window controls (minimize, maximize, close), drag support, double‑click to toggle maximize
- **Mini mode** — compact layout for quick unlocks
- **Folder organization** — nested folders with drag support, move items between folders
- **Search & filter** — real‑time filtering across titles, usernames, URLs, notes, and tags
- **Grid or table view** — toggle between card grid and resizable, reorderable table
- **Multiple themes** — dark, light, slate, violet, and editor themes with accent color customization
- **Theme sync** — preferences persist locally and optionally sync across devices
- **Custom entry icons** — add a custom icon to any entry
- **Entry metadata** — each entry stores title, username, password, website URL, icon, folder, notes, tags, and breached password indicator
- **Item sizes** — compact, default, or large display in grid mode
- **Reveal timer** — passwords auto‑censor after a configurable delay
- **Drag‑and‑drop** — reorder entries and move between folders
- **Toast notifications** — feedback for save, delete, and sync events
- **Right‑click menus** — context menus for entries and empty areas for quick actions
 - **Sync indicator** — visual connection and sync state indicator
 - **Auto‑reconnect** — WebSocket connections retry with exponential backoff

### Platforms

Windows, macOS, Linux.
