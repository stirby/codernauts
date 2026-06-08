# MVP scope

This folder is the source of truth for the current Codernauts MVP. If a feature is not described here, it is not in scope for the MVP.

Codernauts is an API-first space automation game for programmers. Players use a starter project to inspect the API, write small clients or bots, and automate a tiny outpost.

## MVP promise

The MVP proves one loop:

1. Read current state from the API.
2. Scan a nearby tile on a simple 2D grid.
3. Build or upgrade persistent miners.
4. Assign miners to discovered asteroid sites.
5. Watch ore accrue over time while energy capacity gates miner assignments.
6. Use the log and API responses to understand what happened.

## Current scope

- Single-player local prototype.
- Central HTTP API.
- Static discrete 2D grid.
- Four scan directions: `north`, `east`, `south`, `west`.
- Persistent miners assigned to asteroid sites.
- Passive ore generation and fixed energy capacity.
- Small TypeScript starter client with CLI, bot, and onboarding GUI.
- OpenAPI document for the current API.
- Polling-based timed actions.
- Clear error responses and idempotent scan retries.

## Out of scope for MVP

- Multiplayer.
- Shared world map.
- Trading and markets.
- Combat, raids, hazards, factions, and seasons.
- Leaderboards and Slack reports.
- Galaxy rotation or galaxy-scale navigation.
- Directions such as `coreward`, `rimward`, `spinward`, or `trailing`.
- Websockets, server-sent events, and real-time push updates.
- Coder-themed mechanics such as workspace CPU, memory, uptime, or spend.

## Documentation map

| File | Purpose |
| --- | --- |
| [product.md](product.md) | Product goal, audience, and non-goals |
| [game-loop.md](game-loop.md) | First-session player loop and gameplay rules |
| [world.md](world.md) | Static 2D grid and site model |
| [api.md](api.md) | MVP API contract and JSON shapes |
| [client.md](client.md) | Starter client, GUI, CLI, and bot expectations |
| [performance.md](performance.md) | Performance expectations and implementation constraints |
| [open-questions.md](open-questions.md) | Decisions still needing review |

## Promotion rule

Future ideas live in `docs/later/`. Promote an idea into this folder only after we decide it belongs in the MVP. Archive historical planning notes in `docs/archive/` so they do not look like active scope.
