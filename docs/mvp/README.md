# MVP scope

This folder is the source of truth for the current Codernauts scope (Phase 2). If a feature is not described here, it is not in scope.

Codernauts is an API-first space automation game for programmers. Players use a starter project to inspect the API, write small clients or bots, and automate an outpost that crushes everything it mines into gravel, the only leaderboard score.

## Phase 2 promise

Phase 2 proves one competitive loop: collect, expand, crush, climb.

1. Read current state from the API.
2. Collect resources with persistent miners on claimed nodes.
3. Expand by scanning for new nodes and claiming them at distance-scaled cost.
4. Crush resources into gravel; upgrade the crusher to unlock more resources and raise yield.
5. Climb the gravelboard before the season resets.
6. Use the log and API responses to understand what happened.

## Current scope

- Single-player local prototype with a multiplayer-shaped leaderboard.
- Central HTTP API.
- Static discrete 2D grid of nodes; each node contains multiple sites.
- Four scan directions: `north`, `east`, `south`, `west`; scan duration grows with distance.
- Four uncapped resources: ore, ice, gas, crystal.
- Node claiming with distance-scaled multi-resource costs.
- Persistent miners assigned to deposit sites on claimed nodes.
- Energy as fixed miner assignment capacity.
- Crusher tiers that unlock resources and raise gravel yield.
- Conversion of resources into gravel, the cumulative score.
- A single gravelboard ranked by season gravel.
- Seasons; in the prototype, server restart equals season reset.
- A codernaut identity with a fixed location at the home node.
- Small TypeScript starter client with CLI, bot, and onboarding GUI.
- OpenAPI document for the current API.
- Polling-based timed actions.
- Clear error responses and idempotent retries for scans, claims, and conversions.

## Out of scope

- Multiplayer interaction (other players on the map, shared state).
- Markets and trading.
- Category leaderboards.
- Prestige mechanics.
- Codernaut movement.
- Combat, raids, hazards, and factions.
- Galaxy rotation or galaxy-scale navigation.
- Directions such as `coreward`, `rimward`, `spinward`, or `trailing`.
- Websockets, server-sent events, and real-time push updates.
- Coder-themed mechanics such as workspace CPU, memory, uptime, or spend.

## Documentation map

| File | Purpose |
| --- | --- |
| [product.md](product.md) | Product goal, audience, and non-goals |
| [game-loop.md](game-loop.md) | Player loop, crusher arc, seasons, and gameplay rules |
| [scaling.md](scaling.md) | The system of thought behind all scaling decisions |
| [world.md](world.md) | Grid, nodes, sites, traits, and claiming |
| [api.md](api.md) | API contract and JSON shapes |
| [client.md](client.md) | Starter client, GUI, CLI, and bot expectations |
| [performance.md](performance.md) | Performance expectations and implementation constraints |
| [open-questions.md](open-questions.md) | Decisions still needing review |

## Promotion rule

Future ideas live in `docs/later/`. Promote an idea into this folder only after we decide it belongs in the current scope. Archive historical planning notes in `docs/archive/` so they do not look like active scope.
