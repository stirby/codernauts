# MVP API contract

## API principles

- REST/JSON first.
- OpenAPI spec is a first-class artifact.
- All timestamps are UTC ISO-8601 strings.
- All write endpoints return the updated resource or created action.
- Action-creating endpoints support idempotency keys.
- Errors are predictable and safe for client code.

## Authentication

Use bearer tokens for MVP.

```text
Authorization: Bearer cnp_example
```

## Error format

```json
{
  "error": {
    "code": "insufficient_resources",
    "message": "Not enough ore for extractor upgrade.",
    "details": {
      "required_ore": 250,
      "available_ore": 120
    }
  }
}
```

## MVP endpoints

```text
GET  /v1/health
GET  /v1/me
GET  /v1/status
GET  /v1/sector
GET  /v1/actions
GET  /v1/actions/{action_id}
POST /v1/actions/scan
POST /v1/actions/extract
GET  /v1/upgrades
POST /v1/upgrades
GET  /v1/log
```

## `GET /v1/status`

Returns the full state a simple client needs.

```json
{
  "player": {
    "id": "ply_123",
    "display_name": "Astronaut Finch-12"
  },
  "outpost": {
    "id": "out_123",
    "name": "Vesta-41"
  },
  "resources": {
    "ore": 120,
    "max_ore": 1000,
    "energy": 50,
    "max_energy": 100,
    "ore_rate_per_second": 1.0,
    "energy_rate_per_second": 0.05
  },
  "upgrades": {
    "extractor": 1,
    "scanner": 0,
    "storage": 1
  },
  "active_actions": []
}
```

## `POST /v1/actions/scan`

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
  "id": "act_scan_123",
  "type": "scan",
  "status": "pending",
  "resolves_at": "2026-06-07T12:05:00Z"
}
```

## `POST /v1/actions/extract`

Request:

```json
{
  "tile_id": "home"
}
```

Response:

```json
{
  "id": "act_extract_123",
  "type": "extract",
  "status": "pending",
  "resolves_at": "2026-06-07T12:03:00Z"
}
```

## `POST /v1/upgrades`

Request:

```json
{
  "upgrade_key": "extractor"
}
```

Response:

```json
{
  "upgrade_key": "extractor",
  "level": 2,
  "resources": {
    "ore": 10,
    "energy": 50
  }
}
```

## Rate limits

Return `429` with a retry hint.

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
