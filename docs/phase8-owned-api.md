# Phase 8 — User-owned API

The PostgreSQL-backed API now exposes authenticated, owner-scoped routes. A caller can only list and delete their own records; the owner is taken from their verified bearer session, **never** the request JSON.

Run with a real database (requires `npm install pg` and a configured PostgreSQL server):

```bash
DATABASE_URL='postgresql://...' HIROGLIFX_USERS_FILE='./data/users.json' node runtime/run-postgres-api.js examples/postgres.scroll 3000
```

`POST /auth/login` issues a temporary token. Use it with `GET /api/tasks`, `POST /api/tasks`, and `DELETE /api/tasks/<uuid>`. Validation requires JSON object bodies and caps request sizes. Writers/admins can modify; readers are read-only. Unknown paths and collections fail closed.

This is still localhost-only, not audited for internet deployment. Missing: persistent sessions, rate limits, CSRF-aware cookie alternatives, per-tenant roles, session rotation, and production migrations. Phase 9 adds deployment smoke checks and documentation, not an unrestricted public launch.
