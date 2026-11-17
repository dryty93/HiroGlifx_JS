# Phase 4 — Local authentication and collection permissions

The development server protects `/api/*` using short-lived bearer tokens. The login endpoint remains public and fixed health routes remain readable.

## Start

```bash
HIROGLIFX_PASSWORD='your-long-secret' node runtime/create-user.js ./data/users.json editor writer
node runtime/run-auth-server.js examples/data.scroll ./data 3000
```

Send a JSON POST to `/auth/login` with username and password, then use the returned token in an `Authorization: Bearer <token>` header for data requests. `GET /auth/me` reports current role; `POST /auth/logout` revokes the token.

Roles: readers can fetch records; writers and admins can add and delete records. Passwords use scrypt with random salts. Tokens are kept only in memory and expire after an hour.

This is for localhost development, not production or untrusted networks. Missing production requirements include HTTPS termination, login rate limits, per-user record ownership, auditing, secure password reset, and persistent revocation. Never commit passwords or tokens.
