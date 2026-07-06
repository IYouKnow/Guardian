# Release Notes

## What's New

- **WebSocket Migration**: Replaced Server-Sent Events (SSE) with full-duplex WebSocket connections for real-time sync. Includes challenge-response authentication for secure client-server handshakes, automatic reconnection with exponential backoff, and 30-second heartbeats to keep connections alive through reverse proxies.
- **Connection Limits**: Added configurable per-user WebSocket connection limits in server settings to prevent resource exhaustion.
- **Server-Provided Salt**: The server now provides a per-vault salt for key derivation, improving cryptographic isolation between vaults without requiring client changes.
- **Enhanced Admin Dashboard**: User management improvements, updated security settings panel, and refined activity monitoring.
- **Security & Stability**: Improved connection handling, better error recovery, and hardening of WebSocket endpoints against abuse.

## Upgrade Notes

- This release replaces the SSE-based sync with WebSockets. All client packages (desktop, extension, mobile) have been updated to use the new WebSocket protocol — update all clients to a compatible version.
- If you use a reverse proxy (nginx, Caddy, etc.), ensure WebSocket upgrade headers are forwarded (`Upgrade`, `Connection`) for the `/ws` path.

## Docker Installation
Pull the latest image from the GitHub Container Registry:

## Binary Installation
Download the appropriate executable for your system from the Assets below:
- **Windows**: `guardian-server-windows-amd64.exe`
- **Linux**: `guardian-server-linux-amd64`
- **macOS**: `guardian-server-darwin-amd64` (Intel) / `guardian-server-darwin-arm64` (Apple Silicon)

Simply run the binary to start the server:
```bash
./guardian-server
# or on Windows
.\guardian-server.exe
```
