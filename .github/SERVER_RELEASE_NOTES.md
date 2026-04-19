# Release Notes

## What's New

- **Real-time Sync (SSE)**: New Server-Sent Events endpoint pushes live vault and preference updates to connected desktop, extension, and web clients — no more polling. Includes a 30-second heartbeat to keep connections alive through reverse proxies and load balancers.
- **Preferences API**: New endpoints to store per-user preferences (theme, connection mode, and more) so settings follow the user across every device.
- **Admin Dashboard Polish**: Redesigned invite management, new command palette (Ctrl/Cmd+K), breadcrumb navigation, reworked dashboard cards and activity charts, and a visible server version indicator in the footer.
- **Docker Compose Cleanup**: The bundled `docker-compose.yml` is now a single-service file. The experimental Cloudflare Tunnel profile and the `TUNNEL_TOKEN` variable have been removed — a first-class, dashboard-integrated remote access option will be introduced in a future release.
- **Release Workflow Fixes**: Corrected the Docker pull commands and release title shown on the GitHub Releases page (previously double-prefixed with `server-v`).

## Upgrade Notes

- If your previous install used `docker compose --profile tunnel up -d`, the `cloudflared` service is no longer part of the template. Keep running your own `cloudflared` container on the same Docker network, or wait for the upcoming built-in option.
- The Docker image tag format is unchanged on the registry (`1.0.2`, `1.0`, `1`). Only the release notes and release title have been cleaned up.

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
