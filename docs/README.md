# Codernauts docs

Codernauts is an API-first space automation game for programmers. Players mine exotic resources, crush them into gravel, and compete on a single seasonal leaderboard. The current goal is Phase 2: a small, understandable game with a central API, a starter client, and a competitive gravel loop.

## Read this first

Start with the MVP docs. They are the source of truth for current scope.

1. [mvp/README.md](mvp/README.md)
2. [mvp/game-loop.md](mvp/game-loop.md)
3. [mvp/scaling.md](mvp/scaling.md)
4. [mvp/world.md](mvp/world.md)
5. [mvp/api.md](mvp/api.md)
6. [mvp/client.md](mvp/client.md)
7. [mvp/performance.md](mvp/performance.md)
8. [mvp/open-questions.md](mvp/open-questions.md)

## Scope folders

| Folder | Meaning |
| --- | --- |
| [mvp/](mvp/) | Current scope commitments |
| [later/](later/) | Future ideas, not current scope |
| [archive/](archive/) | Historical planning notes, not current scope |

## Current scope summary (Phase 2)

- Single-player API-first prototype with a multiplayer-shaped leaderboard.
- Static discrete 2D grid of claimable nodes, each with three deposit sites.
- Cardinal scan directions only: `north`, `east`, `south`, `west`; scan time grows with distance.
- Four uncapped resources: ore, ice, gas, crystal.
- Persistent miners; energy is fixed assignment capacity.
- Crusher tiers convert resources into gravel, the single score.
- One gravelboard per season; in the prototype, server restart resets the season.
- CLI, bot, and small GUI in the starter client.
- Strong preference for simple, cheap server behavior.

## Explicitly not current scope

- Multiplayer interaction and shared maps.
- Markets and trading.
- Category leaderboards and prestige.
- Codernaut movement.
- Galaxy rotation and galactic navigation directions.
- Workspace resource metrics as game mechanics.

## How to handle new ideas

Add future ideas to `later/`. Promote them into `mvp/` only after an explicit scope decision. If a document conflicts with `mvp/`, the MVP document wins.
