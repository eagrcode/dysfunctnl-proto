# Server Analysis — Verified Findings

## HIGH — Security Vulnerabilities

### 1. Refresh tokens have no expiry safety net

`auth.model.js:39-46` — `addRefreshToken` doesn't set `expires_at`, and `getRefreshToken` doesn't check it. Token rotation on login does invalidate the previous token (via `ON CONFLICT DO UPDATE`), which is good. However, if a token is stolen and the legitimate user doesn't log in again, the attacker can use it indefinitely. Adding an `expires_at` check (e.g. 30 days) would cap the damage window as a safety net alongside rotation.

### 2. Last admin can be demoted

`members/members.model.js` — `updateMemberRole` doesn't verify at least one admin remains. If the sole admin demotes themselves, the group becomes unmanageable.

---

## MEDIUM — Should Fix Before Production

### 3. Login timing attack enables email enumeration

`auth.controller.js:101-103` — If the user doesn't exist, `bcrypt.compare` is skipped, making the response measurably faster. Allows attackers to determine which emails are registered.

### 4. No pagination on list/calendar/message queries

`getAllMessages`, `getAllLists`, `getEventsByRange` all return unbounded result sets. A group with heavy usage will cause memory issues.

### 5. Calendar: no `startTime < endTime` validation

`calendar.controller.js` — Validates both are ISO dates but doesn't check that the event doesn't end before it starts. The DB schema also lacks a `CHECK` constraint.

### 6. Calendar participants array not validated

`calendar.controller.js:41-44` — Only checks `isArray()`. No UUID validation per element, no max length, no verification participants are group members.

### 7. `deleteUserAccount` returns nothing

`user/user.model.js:53-61` — No `return` statement. Controller sends `data: undefined`.

### 8. Duplicate member addition returns 500

`members/members.model.js` — Adding an existing member hits a PK constraint violation and surfaces as a 500 instead of a 409 Conflict. `ConflictError` is imported but never used.

---

## LOW — Improve When Convenient

### 9. `UploadError` constructor ignores parent `statusCode`

`errors.js:55-56` — Calls `super(message)` without passing `statusCode` to `AppError`, then manually sets `this.statusCode`. Works but bypasses the parent pattern.

### 10. Socket.IO CORS wildcard

`socketService.js:14-17` — `origin: "*"` with `credentials: true`. Browsers will reject this combo, but it should be explicit allowed origins for production.

### 11. No graceful shutdown

`server.js` — No `SIGTERM`/`SIGINT` handlers. Active requests and DB connections are killed abruptly on deploy.

### 12. No `helmet` security headers

`app.js` — No CSP, no HSTS, no X-Frame-Options, etc.

---

## Summary by Priority

| Priority | Count | Action |
|----------|-------|--------|
| Security high | 2 | Fix before any deployment beyond local dev |
| Medium | 6 | Fix before production |
| Low | 4 | Address during cleanup |
