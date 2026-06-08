# Future architecture notes

The MVP can use a simple central server and in-memory store. Later versions may need durable persistence and multi-player scale.

Possible later work:

- Postgres persistence.
- Action tables with indexed status and resolution time.
- Site and miner lookup indexes.
- Per-player rate limits.
- Audit logs for game-affecting writes.
- Deployment topology and migrations.
- Generated SDKs from the OpenAPI spec.

Guardrail: do not design a distributed simulation before the local single-player loop is proven.
