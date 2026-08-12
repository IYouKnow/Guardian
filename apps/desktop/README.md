# Guardian Desktop

A native password manager desktop app built with Tauri. Your vault is encrypted with Argon2id and ChaCha20‑Poly1305 — the encryption happens entirely on your device, so your master password and decrypted data never reach the server. You can use it with local `.guardian` vault files stored anywhere on disk, or connect to a self‑hosted Guardian server for real‑time sync across devices.

Guardian gives you full control over your data. There are no cloud dependencies unless you choose to run your own server, and the server itself is open source — it stores only encrypted ciphertext and has no way to read your passwords.

## Features

- **Local vaults** — save encrypted vault files anywhere on disk, open them with your master password. No server required.
- **Server sync** — connect to a Guardian server for cross‑device access. Changes propagate instantly via WebSocket push.
- **Clipboard auto‑clear** — copied passwords are automatically wiped from the clipboard after a configurable delay (default 10s).
- **Frameless window** — custom titlebar with native window controls (minimize, maximize/restore, close). Double‑click the titlebar to toggle maximize.
- **Mini mode** — compact layout for quick unlocks. The titlebar shrinks and the login view condenses.
- **Folder organization** — create nested folders, drag to reorder, drag items between folders or into the root.
- **Search & filter** — real‑time filtering across titles, usernames, URLs, notes, and tags as you type.
- **Grid or table view** — toggle between a card grid and a resizable table. Table columns are reorderable and width‑adjustable.
- **Multiple themes** — dark, light, slate, violet, and editor themes with 9 accent colors.
- **Theme sync** — preferences are persisted locally and optionally synced to the server when connected, so your theme follows you across devices.
- **Custom entry icons** — add a custom icon image to any entry.
- **Entry metadata** — each entry stores a title, username, password, website URL, custom icon, folder assignment, order, favorite flag, notes, tags, and a breached password indicator.
- **Item sizes** — choose between compact, default, or large item display in grid mode.
- **Reveal timer** — passwords auto‑censor after a configurable number of seconds.
- **Right‑click menus** — context menus on entries and empty areas for quick actions.
- **Drag‑and‑drop** — reorder entries within lists and move them between folders with drag and drop.
- **Right‑click menus** — context menus on entries and empty areas for quick actions.
- **Toast notifications** — non‑intrusive feedback for save, delete, and sync events.
- **Sync indicator** — a visual indicator shows the current connection and sync state when using server mode.
- **Auto‑reconnect** — WebSocket connections automatically retry with exponential backoff if the server is temporarily unreachable.
