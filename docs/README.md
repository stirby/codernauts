# Codernauts docs

Codernauts is an API-first space automation game for programmers. The current goal is a small, understandable MVP with a central API, a starter client, and a static 2D grid.

## Read this first

Start with the MVP docs. They are the source of truth for current scope.

1. [mvp/README.md](mvp/README.md)
2. [mvp/game-loop.md](mvp/game-loop.md)
3. [mvp/world.md](mvp/world.md)
4. [mvp/api.md](mvp/api.md)
5. [mvp/client.md](mvp/client.md)
6. [mvp/performance.md](mvp/performance.md)
7. [mvp/open-questions.md](mvp/open-questions.md)

## Scope folders

| Folder | Meaning |
| --- | --- |
| [mvp/](mvp/) | Current MVP commitments |
| [later/](later/) | Future ideas, not current scope |
| [archive/](archive/) | Historical planning notes, not current scope |

## Current MVP summary

- Single-player API-first prototype.
- Static discrete 2D grid.
- Cardinal scan directions only: `north`, `east`, `south`, `west`.
- Persistent miners assigned to asteroid sites.
- Passive ore generation and fixed energy capacity.
- CLI, bot, and small GUI in the starter client.
- Strong preference for simple, cheap server behavior.

## Explicitly not MVP

- Multiplayer.
- Shared map competition.
- Trading, factions, raids, seasons, and leaderboards.
- Galaxy rotation and galactic navigation directions.
- Workspace resource metrics as game mechanics.

## How to handle new ideas

Add future ideas to `later/`. Promote them into `mvp/` only after an explicit scope decision. If a document conflicts with `mvp/`, the MVP document wins.
