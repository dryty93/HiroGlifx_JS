# Phase 9 — Deployment readiness and real-database CI

This phase adds an actual PostgreSQL 16 GitHub Actions service and tests the complete API flow: schema initialization, create, list, deletion, authentication, role denial, and cross-user isolation.

Run integration tests with a **disposable** PostgreSQL database:

```bash
npm install --no-save pg@8
export HIRO_TEST_DATABASE_URL='postgresql://hiro:local_password@127.0.0.1:5432/hiro_test'
node --test tests/postgres-integration.test.js
```

Do not use a production database for the test suite. The test creates collection and record rows.

## Deployment checklist

- [ ] Provide secret-managed DATABASE_URL and HIROGLIFX_USERS_FILE, never commit credentials
- [ ] Replace development UserStore with a production identity system
- [ ] Set up HTTPS at the edge and secure session rotation/revocation
- [ ] Introduce brute-force protection and throttling on /auth/login
- [ ] Replace file-backed user storage with a transactional user table
- [ ] Design explicit multi-tenant roles, audit trails and ownership policies
- [ ] Create migrations and backups with documented restore drills
- [ ] Configure restrictive CORS and Content Security Policy
- [ ] Enforce browser automation domain policies at network-routing level
- [ ] Deploy sandboxed previews on a dedicated origin with network controls
- [ ] Exercise browser E2E tests and real hosting smoke checks

**Not production-ready.** The existing sample server binds to 127.0.0.1. CI passing proves code pathways under a disposable DB; it does not prove security, reliability, or uptime of a publicly deployed service.
