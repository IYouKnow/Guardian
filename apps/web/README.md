# Guardian Web Panel - Quick Start

## Running the Web Panel

```bash
# From project root
pnpm --filter guardian-web dev
```

The web panel will be available at **http://localhost:5173**

## Prerequisites

- Go server must be running on port 8080
- Admin credentials from your Guardian server

## Login

Navigate to http://localhost:5173 and log in with your admin credentials.

## Features

✅ **Working Features:**
- Admin authentication
- Server health monitoring
- Invite token generation
- Server statistics dashboard

🔄 **Mock Features (UI only):**
- User Management
- Vault Monitor
- System Logs
- Backup & Restore
- Security Settings
- Performance Metrics

## Build

```bash
pnpm --filter guardian-web build
```

Build output will be in `packages/web/dist/`
