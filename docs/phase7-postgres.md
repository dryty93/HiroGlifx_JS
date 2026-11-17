# Phase 7 — PostgreSQL storage adapter

`PostgresStore` provides parameterized queries, constrained collection names, UUID records, JSONB payloads, and owner-scoped list/delete methods. Unlike the JSON file store, it is designed for a PostgreSQL connection pool.

Install the optional driver in your deployment:

```bash
npm install pg
```

```javascript
const { Pool } = require("pg");
const { PostgresStore } = require("./runtime/postgres-store");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const store = new PostgresStore(pool);
await store.migrate();
await store.create("tasks");
const row = await store.insert("tasks","user123",{title:"Demo"});
console.log(await store.list("tasks","user123"));
await pool.end();
```

The adapter is an independent storage foundation. The HTTP integration and authorization boundary are implemented separately in Phase 8. Do not expose data methods over an unauthenticated endpoint. Apply least-privilege DB credentials, TLS/SSL per provider, database backups, and migrations before deployment.
