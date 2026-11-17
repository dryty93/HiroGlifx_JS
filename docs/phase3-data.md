# Phase 3 — Persistent local data

The new development server supports **JSON collections** with persistent files and REST endpoints.

```bash
node runtime/run-data-server.js examples/data.scroll ./data/hiro.json 3000
curl http://127.0.0.1:3000/api/notes
curl -X POST http://127.0.0.1:3000/api/notes -H 'Content-Type: application/json' -d '{"title":"New task"}'
```

```scroll
data.collection notes
data.seed notes '{"title":"Ship HiroGlifx","done":false}'
```

Collections expose `GET /api/notes`, `POST /api/notes`, and `DELETE /api/notes/<id>`. The seed command adds its initial object **only** when a collection is empty. File updates use same-directory atomic rename.

**Security/deployment:** Runs on 127.0.0.1 by default, intentionally unauthenticated for local experimentation. Do not expose this to the public internet. It is single-process, cannot safely coordinate concurrent server processes, and is not a substitute for Postgres, backups or transactional storage. Authentication and write permissions are planned in Phase 4.
