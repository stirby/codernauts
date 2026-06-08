# API server architecture

## Core architecture

The central authoritative server is required for MVP. Player environments run clients and tools only.

```text
Starter project
  -> starter CLI, examples, custom player code
  -> Codernauts HTTP API
  -> central game server
  -> database
```

## Server responsibilities

- Authenticate API tokens.
- Own player state.
- Compute lazy resource accrual.
- Create and resolve actions.
- Manage persistent miners and resource accrual.
- Store world and sector state.
- Serve OpenAPI documentation.
- Return consistent JSON errors.
- Protect against unsafe polling or duplicate actions.

## Player environment responsibilities

- Store local API config safely.
- Provide starter client code.
- Provide examples and docs.
- Let players build their own tools.
- Store no authoritative game state.

## API style

Recommendation:

- REST/JSON for MVP.
- OpenAPI spec checked into the repo.
- `/v1` path prefix.
- Bearer token auth.
- Idempotency key support for action creation.
- UTC ISO-8601 timestamps.

## Data model sketch

```text
Player
- id
- display_name
- created_at

ApiToken
- id
- player_id
- token_hash
- created_at
- revoked_at

Outpost
- id
- player_id
- sector_id
- ore_balance
- energy_balance
- last_resource_update_at

Miner
- id
- player_id
- assigned_site_id
- status
- level
- base_ore_rate
- created_at
- updated_at

SectorTile
- id
- sector_id
- x
- y
- state
- biome
- discovered_at

Action
- id
- player_id
- type
- status
- payload
- result
- idempotency_key
- created_at
- resolves_at
- completed_at

EventLog
- id
- player_id
- type
- message
- payload
- created_at
```

## Timed action strategy

MVP can resolve actions lazily when a player calls status, actions, or log. A periodic worker can be added later for world events and multiplayer consistency.

## Deployment assumption

A locally hosted server is acceptable for the earliest prototype. If more than a small group plays, move the central server to a more durable internal deployment.

## Stack decision remains open

[REVIEW] Choose stack after confirming implementation preferences. Go plus Postgres is a strong fit for a small API server. TypeScript may be faster if the starter client is also TypeScript.
