# MVP API contract

## API principles

- API first. A player should be able to understand and play from HTTP examples alone.
- OpenAPI spec is a first-class artifact at `openapi/codernauts.yaml`.
- REST/JSON before generated SDKs.
- All timestamps are UTC ISO-8601 strings.
- All write endpoints return the updated resource or created action.
- Action-creating endpoints support idempotency keys.
- Errors are predictable and safe for client code.
- Gameplay objects should be plain game objects, not platform metaphors.

## Authentication

Use bearer tokens for MVP. The local prototype seeds one player for `dev-token`.

```text
Authorization: Bearer dev-token
```

## Error format

```json
{
  "error": {
    "code": "insufficient_resources",
    "message": "Not enough resources.",
    "details": {
      "required_ore": 250,
      "available_ore": 120,
      "required_energy": 10,
      "available_energy": 75
    }
  }
}
```

## MVP endpoints

```text
GET  /v1/health
GET  /openapi/codernauts.yaml
GET  /v1/me
GET  /v1/status
GET  /v1/sector
GET  /v1/miners
POST /v1/miners
POST /v1/miners/{miner_id}/upgrade
POST /v1/miners/{miner_id}/assign
GET  /v1/actions
GET  /v1/actions/{action_id}
POST /v1/actions/scan
GET  /v1/log
```

Manual extract is not part of the MVP surface. Resource growth comes from persistent miners. The first prototype should not ask players to click or loop `extract` manually.

## Core objects

### Resource state

```json
{
  "ore": 120,
  "max_ore": 1000,
  "energy": 75,
  "max_energy": 100,
  "ore_rate_per_second": 1.0,
  "energy_rate_per_second": 0.05,
  "last_generated_at": "2026-06-07T12:00:00Z"
}
```

### Miner

A miner is a persistent resource-generation object. Players decide which miners exist and which asteroid sites they are assigned to.

```json
{
  "id": "min_starter",
  "name": "Prospector One",
  "level": 1,
  "ore_rate_per_second": 1.0,
  "energy_per_second": 0.05,
  "assigned_site_id": "site_home_asteroid",
  "assigned_site_name": "Anchor Rock",
  "status": "mining",
  "build_cost": {
    "ore": 175,
    "energy": 10
  },
  "next_upgrade_cost": {
    "ore": 150,
    "energy": 20
  },
  "created_at": "2026-06-07T12:00:00Z"
}
```

### Site

A site is a discovered place in the player's private sector. The local prototype starts with one home asteroid site, then scans reveal more sites.

```json
{
  "id": "site_home_asteroid",
  "name": "Anchor Rock",
  "kind": "asteroid",
  "x": 0,
  "y": 0,
  "richness": 1,
  "assigned_miner_id": "min_starter",
  "discovered_at": "2026-06-07T12:00:00Z",
  "depleted": false,
  "base_ore_rate_per_second": 1.0
}
```

### Action

Actions are asynchronous jobs for activities that should take time, such as scanning.

```json
{
  "id": "act_scan_001",
  "type": "scan",
  "status": "pending",
  "created_at": "2026-06-07T12:00:00Z",
  "resolves_at": "2026-06-07T12:00:30Z",
  "request": {
    "direction": "north"
  }
}
```

## `GET /v1/status`

Returns the full state a simple client needs. The prototype response includes the player, outpost, resources, known sector sites, miners, active actions, and suggested next actions.

Response excerpt:

```json
{
  "player": {
    "id": "ply_dev",
    "display_name": "Astronaut Vega-7"
  },
  "outpost": {
    "id": "out_vesta_41",
    "name": "Vesta-41"
  },
  "resources": {
    "ore": 120,
    "max_ore": 1000,
    "energy": 75,
    "max_energy": 100,
    "ore_rate_per_second": 1.0,
    "energy_rate_per_second": 0.05,
    "last_generated_at": "2026-06-07T12:00:00Z"
  },
  "miners": [
    {
      "id": "min_starter",
      "name": "Prospector One",
      "level": 1,
      "status": "mining",
      "assigned_site_id": "site_home_asteroid",
      "assigned_site_name": "Anchor Rock",
      "ore_rate_per_second": 1.0,
      "next_upgrade_cost": {
        "ore": 150,
        "energy": 20
      }
    }
  ],
  "active_actions": [],
  "suggested_next_actions": [
    {
      "key": "scan",
      "message": "Start a scan to discover more asteroid sites."
    }
  ]
}
```

## `GET /v1/sector`

Returns discovered asteroid sites in the player's private sector.

Response:

```json
{
  "id": "sec_orion",
  "name": "Orion Spur",
  "sites": [
    {
      "id": "site_home_asteroid",
      "name": "Anchor Rock",
      "kind": "asteroid",
      "x": 0,
      "y": 0,
      "richness": 1,
      "assigned_miner_id": "min_starter",
      "depleted": false,
      "base_ore_rate_per_second": 1.0
    }
  ]
}
```

## `GET /v1/miners`

Returns all miners owned by the player.

Response:

```json
{
  "miners": [
    {
      "id": "min_starter",
      "name": "Prospector One",
      "level": 1,
      "status": "mining",
      "assigned_site_id": "site_home_asteroid",
      "assigned_site_name": "Anchor Rock",
      "ore_rate_per_second": 1.0,
      "energy_per_second": 0.05,
      "build_cost": {
        "ore": 175,
        "energy": 10
      },
      "next_upgrade_cost": {
        "ore": 150,
        "energy": 20
      }
    }
  ]
}
```

## `POST /v1/miners`

Builds a new idle miner. Assign it to a discovered asteroid site to increase ore generation.

Response:

```json
{
  "id": "min_002",
  "name": "Autonomous Miner 002",
  "level": 1,
  "status": "idle",
  "ore_rate_per_second": 1.0,
  "energy_per_second": 0.05,
  "build_cost": {
    "ore": 250,
    "energy": 10
  }
}
```

## `POST /v1/miners/{miner_id}/upgrade`

Upgrades one miner. This is per-object progression rather than a global production level.

Response:

```json
{
  "id": "min_starter",
  "name": "Prospector One",
  "level": 2,
  "status": "mining",
  "assigned_site_id": "site_home_asteroid",
  "ore_rate_per_second": 1.75,
  "next_upgrade_cost": {
    "ore": 300,
    "energy": 35
  }
}
```

## `POST /v1/miners/{miner_id}/assign`

Assigns a miner to a discovered asteroid site. A miner assigned to a richer site generates more ore.

Request:

```json
{
  "site_id": "site_ast_001"
}
```

The TypeScript starter client sends `siteId`; the prototype server accepts both `site_id` and `siteId`.

Response:

```json
{
  "id": "min_002",
  "name": "Autonomous Miner 002",
  "level": 1,
  "status": "mining",
  "assigned_site_id": "site_ast_001",
  "assigned_site_name": "North Drift 001",
  "ore_rate_per_second": 1.0
}
```

## `POST /v1/actions/scan`

Creates a 30 second scan action to reveal one asteroid site. One scan can be active at a time in the local prototype.

Headers:

```text
Idempotency-Key: user-generated-uuid
```

Request:

```json
{
  "direction": "north"
}
```

Response:

```json
{
  "id": "act_scan_001",
  "type": "scan",
  "status": "pending",
  "request": {
    "direction": "north"
  },
  "created_at": "2026-06-07T12:00:00Z",
  "resolves_at": "2026-06-07T12:00:30Z"
}
```

Completed response from `GET /v1/actions/{action_id}`:

```json
{
  "id": "act_scan_001",
  "type": "scan",
  "status": "completed",
  "request": {
    "direction": "north"
  },
  "result": {
    "discovered_site": {
      "id": "site_ast_001",
      "name": "North Drift 001",
      "kind": "asteroid",
      "x": 0,
      "y": 1,
      "richness": 2,
      "base_ore_rate_per_second": 1.25
    }
  },
  "created_at": "2026-06-07T12:00:00Z",
  "resolves_at": "2026-06-07T12:00:30Z",
  "completed_at": "2026-06-07T12:00:30Z"
}
```

## `GET /v1/log`

Returns recent events useful for bots and for humans learning the API.

Response:

```json
{
  "log": [
    {
      "id": "log_001",
      "message": "Outpost initialized near Anchor Rock.",
      "created_at": "2026-06-07T12:00:00Z"
    }
  ]
}
```

## Rate limits

Return `429` with a retry hint when rate limiting is added.

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Too many requests. Try again later.",
    "details": {
      "retry_after_seconds": 5
    }
  }
}
```
