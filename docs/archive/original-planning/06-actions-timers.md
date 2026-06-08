# Actions and timers

## Why actions matter

Actions are the asynchronous part of the API game loop. A player writes code to start scans, track them, and react when they complete.

## MVP action types

| Action | Purpose | Timer |
| --- | --- | --- |
| Scan | Reveal a nearby tile | 1 to 5 minutes |

Miners generate ore without actions. Building, upgrading, assigning, and pausing miners are direct resource mutations for MVP.

## Action lifecycle

```text
pending -> completed
pending -> failed
```

Future systems can add cancellation, queues, retries, and conflicts.

## API requirements

Every action should have:

- Stable action ID.
- Player ID.
- Action type.
- Status.
- Input payload.
- Result payload.
- `created_at`.
- `resolves_at`.
- `completed_at`.

## Idempotency

Client authors will retry requests. Support an idempotency key for action-creating endpoints.

```text
Idempotency-Key: user-generated-uuid
```

If the same key is reused for the same player and endpoint, return the original action instead of creating a duplicate.

## Polling

MVP polling endpoints:

```text
GET /v1/actions
GET /v1/actions/{action_id}
```

The server can also resolve due actions lazily whenever status or actions are fetched.

## Example scan action

Request:

```json
{
  "direction": "north"
}
```

Response:

```json
{
  "id": "act_123",
  "type": "scan",
  "status": "pending",
  "resolves_at": "2026-06-07T12:05:00Z"
}
```

Completed result:

```json
{
  "id": "act_123",
  "type": "scan",
  "status": "completed",
  "result": {
    "discovered_site": {
      "id": "site_ast_001",
      "name": "North Drift 001",
      "kind": "asteroid",
      "base_ore_rate_per_second": 1.25
    }
  }
}
```

## Rate limits

The API should tolerate experimentation but prevent tight polling loops.

MVP recommendation:

- Document a polite polling interval, such as 5 to 10 seconds.
- Return `429` with a useful retry hint if a client loops too fast.
