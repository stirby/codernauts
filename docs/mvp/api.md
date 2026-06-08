# MVP API contract

The MVP API is a small HTTP JSON API. It should be stable enough for players to write scripts against it.

## Principles

- Use boring REST-style endpoints.
- Use snake_case JSON fields.
- Require bearer token auth except for health and OpenAPI endpoints.
- Return clear structured errors.
- Make write operations safe to retry when practical.
- Keep response bodies small and understandable.

## Authentication

Local development uses a bearer token:

```text
Authorization: Bearer dev-token
```

The token is a development default, not a production auth design.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/health` | Check server health, no auth required |
| `GET` | `/openapi/codernauts.yaml` | Fetch OpenAPI document, no auth required |
| `GET` | `/v1/me` | Fetch player identity |
| `GET` | `/v1/status` | Fetch the main game snapshot |
| `GET` | `/v1/sector` | Fetch discovered sector sites |
| `GET` | `/v1/miners` | List miners |
| `POST` | `/v1/miners` | Build a miner |
| `POST` | `/v1/miners/{id}/upgrade` | Upgrade a miner |
| `POST` | `/v1/miners/{id}/assign` | Assign a miner to a site |
| `GET` | `/v1/actions` | List actions |
| `GET` | `/v1/actions/{id}` | Fetch one action |
| `POST` | `/v1/actions/scan` | Start a scan |
| `GET` | `/v1/log` | Fetch activity log |

## Main status object

`GET /v1/status` is the primary read endpoint for clients and bots.

It returns:

- `player`
- `outpost`
- `resources`
- `sector`
- `miners`
- `active_actions`
- `suggested_next_actions`

## Resources

Energy is miner assignment capacity. `energy` is kept as a legacy alias for `energy_used`, and `max_energy` is kept as a legacy alias for `energy_capacity`.

```json
{
  "ore": 350,
  "max_ore": 1000,
  "energy": 30,
  "max_energy": 100,
  "energy_capacity": 100,
  "energy_used": 30,
  "energy_available": 70,
  "ore_rate_per_second": 1,
  "last_generated_at": "2026-06-07T12:00:00Z"
}
```

## Site

```json
{
  "id": "site_home_asteroid",
  "name": "Anchor Rock",
  "kind": "asteroid",
  "x": 0,
  "y": 0,
  "richness": 1,
  "assigned_miner_id": "min_starter",
  "depleted": false,
  "base_ore_rate_per_second": 1
}
```

## Miner

```json
{
  "id": "min_starter",
  "name": "Prospector One",
  "level": 1,
  "ore_rate_per_second": 1,
  "energy_requirement": 30,
  "assigned_site_id": "site_home_asteroid",
  "assigned_site_name": "Anchor Rock",
  "status": "mining",
  "build_cost": {
    "ore": 175
  },
  "next_upgrade_cost": {
    "ore": 150
  }
}
```

Build and upgrade costs spend ore only. Assigning a miner reserves energy capacity while that miner is assigned.

## Scan request

MVP scans accept cardinal directions only:

```json
{
  "direction": "north"
}
```

Allowed values:

- `north`
- `east`
- `south`
- `west`

Scans should support `Idempotency-Key` so clients can safely retry a request.

## Error format

```json
{
  "error": {
    "code": "insufficient_resources",
    "message": "Not enough resources.",
    "details": {
      "required_ore": 150,
      "available_ore": 90
    }
  }
}
```

Energy capacity failures use a separate error code:

```json
{
  "error": {
    "code": "energy_capacity_exceeded",
    "message": "Not enough energy capacity.",
    "details": {
      "required_energy": 30,
      "used_energy": 90,
      "max_energy": 100,
      "available_energy": 10
    }
  }
}
```

Clients should show `message` and use `details` for actionable hints. Clients must not display bearer tokens in error messages.

## Deferred API concepts

These are not part of the MVP API:

- Multiplayer endpoints.
- Trade or market endpoints.
- Leaderboard endpoints.
- Event stream endpoints.
- Galaxy-scale navigation fields.
- Non-cardinal scan directions.
