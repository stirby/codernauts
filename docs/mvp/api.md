# API contract

The API is a small HTTP JSON API. It should be stable enough for players to write scripts against it.

## Principles

- Use boring REST-style endpoints.
- Use snake_case JSON fields and stable IDs.
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
| `GET` | `/v1/sector` | Fetch discovered nodes and their sites |
| `GET` | `/v1/leaderboard` | Fetch the season gravelboard |
| `GET` | `/v1/conversions` | Fetch crusher state and conversion rates |
| `POST` | `/v1/conversions/{resource}` | Convert a resource into gravel |
| `POST` | `/v1/nodes/{id}/claim` | Claim a discovered node |
| `POST` | `/v1/crusher/upgrade` | Upgrade the crusher |
| `GET` | `/v1/miners` | List miners |
| `POST` | `/v1/miners` | Build a miner |
| `POST` | `/v1/miners/{id}/upgrade` | Upgrade a miner |
| `POST` | `/v1/miners/{id}/assign` | Assign a miner to a site |
| `GET` | `/v1/actions` | List actions |
| `GET` | `/v1/actions/{id}` | Fetch one action |
| `POST` | `/v1/actions/scan` | Start a scan |
| `GET` | `/v1/log` | Fetch activity log |

All endpoints except health and OpenAPI require auth and share the same CORS behavior.

## Main status object

`GET /v1/status` is the primary read endpoint for clients and bots. It returns:

- `server_time`
- `player`
- `outpost`
- `resources`
- `gravel`
- `crusher`
- `sector`
- `miners`
- `active_actions`
- `suggested_next_actions`

`server_time` is the current game-clock time. Clients should anchor countdowns to it rather than local wall time, because the server may run a scaled clock for testing (see the `-time-scale` flag).

Suggested next actions are `{"key": "...", "message": "..."}` objects, included when applicable, in this priority order:

| Key | Condition |
| --- | --- |
| `claim_node` | A discovered unclaimed node is affordable: "Claim `<name>` for `<cost summary>`." |
| `assign_miner` | An idle miner, an open claimed site, and energy capacity exist |
| `build_miner` | The next miner is affordable |
| `upgrade_crusher` | A next crusher level exists and is affordable |
| `convert` | Any unlocked resource balance is at least 200: "Crush `<resource>` into gravel." |
| `scan` | No scan is active |

## Player

Returned by `/v1/me` as `{"player": ...}` and embedded in status. `location` is the codernaut's fixed home node.

```json
{
  "id": "ply_dev",
  "display_name": "Astronaut Vega-7",
  "created_at": "2026-06-07T12:00:00Z",
  "location": {"node_id": "node_home", "node_name": "Vesta-41", "x": 0, "y": 0}
}
```

## Outpost

```json
{"id": "out_vesta_41", "name": "Vesta-41", "node_id": "node_home"}
```

## Resources

All four resources are uncapped integers; `max_ore` is removed. Energy is miner assignment capacity. `energy` and `max_energy` are legacy aliases of `energy_used` and `energy_capacity`. `ore_rate_per_second` is a legacy alias of `rates_per_second.ore`.

```json
{
  "ore": 123, "ice": 4, "gas": 0, "crystal": 0,
  "rates_per_second": {"ore": 1.75, "ice": 0.5, "gas": 0, "crystal": 0},
  "ore_rate_per_second": 1.75,
  "energy": 90, "max_energy": 100,
  "energy_capacity": 100, "energy_used": 90, "energy_available": 10,
  "last_generated_at": "2026-06-07T12:00:00Z"
}
```

## Cost

Costs are multi-resource objects; zero fields are omitted. Miner build and upgrade costs keep ore-only values but use the same shape.

```json
{"ore": 300, "ice": 100}
```

## Node

```json
{
  "id": "node_east_1",
  "name": "Bleak Slush",
  "kind": "asteroid_field",
  "trait": "frozen",
  "x": 1, "y": 0,
  "distance": 1,
  "discovered_at": "2026-06-07T12:00:00Z",
  "claimed_by": "ply_dev",
  "claim_cost": {"ore": 150},
  "sites": [ ... ]
}
```

`claimed_by` is omitted while unclaimed. `claim_cost` is always present for unclaimed nodes and omitted once claimed.

## Site

```json
{
  "id": "site_east_1_a",
  "node_id": "node_east_1",
  "name": "Bleak Slush Pit A",
  "kind": "deposit",
  "resource": "ice",
  "x": 1, "y": 0,
  "richness": 2,
  "base_rate_per_second": 1.0,
  "assigned_miner_id": "min_002",
  "discovered_at": "2026-06-07T12:00:00Z",
  "depleted": false
}
```

Site kind is `deposit` (was `asteroid`). `base_ore_rate_per_second` is removed; use `base_rate_per_second` together with `resource`.

## Sector

The flat `sites` array is removed from the sector. Clients derive sites from nodes.

```json
{"id": "sec_orion", "name": "Orion Spur", "nodes": [ ... ]}
```

## Miner

Miners keep their existing fields (`energy_requirement`, `build_cost`, `next_upgrade_cost`, `next_upgrade_preview`, `status`) plus `resource` (the resource of the assigned site, omitted when idle) and `rate_per_second` (alias of `ore_rate_per_second`; both equal the miner level rate, which multiplies the site base rate). `status` is `idle` or `mining`.

```json
{
  "id": "min_starter",
  "name": "Prospector One",
  "level": 1,
  "rate_per_second": 1,
  "ore_rate_per_second": 1,
  "resource": "ore",
  "energy_requirement": 30,
  "assigned_site_id": "site_home_anchor",
  "assigned_site_name": "Anchor Rock",
  "status": "mining",
  "build_cost": {"ore": 175},
  "next_upgrade_cost": {"ore": 150},
  "next_upgrade_preview": { ... miner at the next level ... },
  "created_at": "2026-06-07T12:00:00Z"
}
```

Production: an assigned miner adds `minerRate(level) * site base rate` per second to the site's resource. Accrual is lazy with no clamping and no tick loops.

## Crusher

```json
{
  "level": 1,
  "name": "Crusher Mk I",
  "yield_multiplier": 1.0,
  "unlocked_resources": ["ore", "ice"],
  "next_upgrade": {
    "level": 2,
    "name": "Crusher Mk II",
    "yield_multiplier": 1.25,
    "unlocks_resource": "gas",
    "cost": {"ore": 300, "ice": 100}
  }
}
```

`next_upgrade` is omitted at level 4. `unlocks_resource` is omitted in the level 4 upgrade preview because that level only raises yield.

`POST /v1/crusher/upgrade` takes no body and returns the updated Crusher JSON with 200. Errors: `max_level` 400, `insufficient_resources` 409. The log entry uses the de-escalation name, for example "Crusher upgraded to Sub-Orbital Aggregate Processing."

## Gravel and seasons

Gravel is a cumulative integer counter and is never spendable. The season is created at store init: id `season_<unix-start>`, name chosen deterministically from `["The Coarse Age", "The Pebble Epoch", "The Grit Dynasty", "The Aggregate Era"]` by `start.Unix() % 4`.

`per_hour` is a sliding-window rate over conversion events from the last hour. The window is `min(1h, now - season start)`, clamped to at least 1s, and the value is rounded to 1 decimal in JSON. Events are pruned lazily on read and write; there are no background loops.

```json
{
  "total": 1234,
  "per_hour": 456.7,
  "season": {"id": "season_1760000000", "name": "The Coarse Age", "started_at": "..."}
}
```

## Leaderboard

`GET /v1/leaderboard` (auth required) returns entries sorted by gravel descending with rank assigned 1..n. There is a single entry for now; the shape must allow many entries with no redesign.

```json
{
  "season": {"id": "...", "name": "...", "started_at": "..."},
  "entries": [
    {
      "rank": 1,
      "player_id": "ply_dev",
      "codernaut": "Astronaut Vega-7",
      "gravel": 1234,
      "gravel_per_hour": 456.7,
      "is_you": true
    }
  ]
}
```

## Scan

`POST /v1/actions/scan` starts a timed scan and returns 202. Allowed directions: `north`, `east`, `south`, `west`.

```json
{"direction": "north"}
```

Each scan reveals the next undiscovered node in that direction. Scan duration is `15s + 20s * (d - 1)` for the node at distance `d`. Only one scan may be active at a time. Scans support `Idempotency-Key` for safe retries. The completed action result is `{"discovered_node": Node}` (was `discovered_site`).

## Claim

`POST /v1/nodes/{id}/claim` requires no body; an empty body is accepted and ignored. An optional `Idempotency-Key` header is honored: replaying the same key returns the stored result, while the same key with a different node id returns `idempotency_conflict` 409.

Claim cost scales with distance: ore `150 * d * d`, ice `100 * (d-1) * (d-1)` when `d >= 2`, gas `75 * (d-2) * (d-2)` when `d >= 3`.

Success returns 200 with the updated Node JSON and writes a log entry. Errors: `not_found` 404 for an unknown node, `node_already_claimed` 409, `insufficient_resources` 409 with per-resource required and available details for the nonzero required resources.

Assigning a miner to a site on an unclaimed node fails with `node_not_claimed` 409 and details `{node_id, claim_cost}`.

## Conversions

`GET /v1/conversions` returns the crusher and the server-owned rate table:

```json
{
  "crusher": { ...Crusher JSON... },
  "rates": [
    {"resource": "ore", "gravel_per_unit": 1, "required_crusher_level": 1, "unlocked": true},
    {"resource": "ice", "gravel_per_unit": 3, "required_crusher_level": 1, "unlocked": true},
    {"resource": "gas", "gravel_per_unit": 9, "required_crusher_level": 2, "unlocked": false},
    {"resource": "crystal", "gravel_per_unit": 25, "required_crusher_level": 3, "unlocked": false}
  ]
}
```

`POST /v1/conversions/{resource}` takes an optional JSON body `{"amount": 100}`. A missing body or missing amount converts the full integer balance of that resource. `Idempotency-Key` is honored like scan: the same key with the same request returns the stored result, and a different request returns `idempotency_conflict`.

`gravel_earned = floor(amount * rate * yield_multiplier)`. Success returns 200:

```json
{
  "resource": "ore",
  "amount_converted": 100,
  "gravel_per_unit": 1,
  "yield_multiplier": 1.25,
  "gravel_earned": 125,
  "gravel_total": 1359,
  "resources": { ...Resources JSON after conversion... }
}
```

Errors: `invalid_resource` 400 for an unknown resource name, `invalid_amount` 400 when a provided amount is below 1 or not an integer, `crusher_level_too_low` 409 with details `{resource, required_crusher_level, crusher_level}`, and `insufficient_resources` 409. Each conversion appends a log entry and records a gravel event for the per-hour stat.

## Error format

```json
{
  "error": {
    "code": "insufficient_resources",
    "message": "Not enough resources.",
    "details": {
      "required": {"ore": 300, "ice": 100},
      "available": {"ore": 120, "ice": 0}
    }
  }
}
```

`insufficient_resources` details list `required` and `available` with the same keys, covering only the nonzero required resources. Legacy `required_ore` and `available_ore` fields remain when ore is part of the cost.

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

Full code-to-status mapping:

| HTTP status | Codes |
| --- | --- |
| 404 | `not_found` |
| 409 | `insufficient_resources`, `energy_capacity_exceeded`, `site_occupied`, `active_scan_exists`, `idempotency_conflict`, `node_already_claimed`, `node_not_claimed`, `crusher_level_too_low` |
| 400 | `invalid_direction`, `site_unavailable`, `max_level`, `invalid_resource`, `invalid_amount`, `invalid_json`, `invalid_request` |

Clients should show `message` and use `details` for actionable hints. Clients must not display bearer tokens in error messages.

## Log messages

Log messages allow flavor but keep grep-able fields:

| Event | Message | Fields |
| --- | --- | --- |
| claim | `Claimed <node name>.` | `node_id`, `cost` |
| convert | `Crushed <amount> <resource> into <gravel> gravel.` | `resource`, `amount`, `gravel_earned`, `gravel_total` |
| crusher upgrade | `Crusher upgraded to <name>.` | `level`, `cost` |
| scan complete | `Scan completed and charted <node name>.` | `action_id`, `node_id` |

## Deferred API concepts

These are not part of the current API:

- Multiplayer endpoints.
- Trade or market endpoints.
- Category leaderboard endpoints.
- Event stream endpoints.
- Galaxy-scale navigation fields.
- Non-cardinal scan directions.
