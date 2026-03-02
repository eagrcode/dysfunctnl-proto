# Server Analysis — Verified Findings

## PRE-DEPLOYMENT — Required Before Pi Setup

### 1. Socket.IO CORS: replace wildcard with allowed origins

`socketService.js:14-17` — `origin: "*"` with `credentials: true`. Browsers will reject this combo. Replace with an explicit allowlist from env var (e.g. `ALLOWED_ORIGINS`).

### 2. Graceful shutdown

`server.js` — No `SIGTERM`/`SIGINT` handlers. Active requests and DB connections are killed abruptly on deploy. Add signal handlers to close the HTTP server and drain the PG pool before exit.

### 3. Environment variables audit

Ensure all secrets (`JWT_SECRET`, DB credentials, `ALLOWED_ORIGINS`) are set via `.env` on the Pi and not hardcoded. Review `APP_PORT` binding address (`0.0.0.0` vs `127.0.0.1`) for LAN access.

### 4. PostgreSQL: bind address & auth

Default PG only listens on `localhost`. For Pi deployment, configure `postgresql.conf` (`listen_addresses`) and `pg_hba.conf` to allow connections from the server process. Use strong passwords for `app_user`.

---

## Summary by Priority

| Priority | Count | Action |
|----------|-------|--------|
| Pre-deployment | 4 | Required before Pi setup |
