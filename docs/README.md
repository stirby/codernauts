# Codernauts docs

Codernauts is an API-first programming game. Players do not primarily use a polished first-party UI. They provision a Coder workspace from a template, inspect a central game API, and build their own tools around it.

The truest MVP is a single-player programming loop that can later scale into multiplayer. Multiplayer, trading, factions, Slack leaderboards, and complex progression are future layers.

## Current recommended shape

- **Working title:** Codernauts
- **Core fantasy:** You are a programmer-astronaut building tools to automate an outpost.
- **Primary interface:** HTTP API plus player-built clients.
- **Onboarding surface:** Coder template with starter client tools and examples.
- **MVP focus:** Single-player API loop, central server architecture, and boilerplate client kit.
- **Deferred systems:** Multiplayer, shared map competition, trade, factions, raids, seasons, Slack reports, complex progression.
- **Identity model:** Stable server-side player identity with an API token. Coder identity integration can come after the basic token flow works.

## Recommended review order

1. [18-true-mvp.md](18-true-mvp.md)
2. [16-api-contract.md](16-api-contract.md)
3. [17-player-template.md](17-player-template.md)
4. [14-architecture-notes-for-later.md](14-architecture-notes-for-later.md)
5. [13-open-questions.md](13-open-questions.md)

## Docs index

| Doc | Purpose |
| --- | --- |
| [01-product-vision.md](01-product-vision.md) | Product direction, design pillars, and non-goals |
| [02-core-loop.md](02-core-loop.md) | Programmer-first loop and first session experience |
| [03-world-map.md](03-world-map.md) | Private sector model that can become a shared map later |
| [04-economy.md](04-economy.md) | MVP resource model, not trade or market economy |
| [05-upgrades-progression.md](05-upgrades-progression.md) | Minimal progression for a single-player API game |
| [06-actions-timers.md](06-actions-timers.md) | API action lifecycle, timers, idempotency, polling |
| [07-multiplayer-systems.md](07-multiplayer-systems.md) | Future multiplayer notes, not MVP scope |
| [08-identity-anonymity.md](08-identity-anonymity.md) | API token identity now, anonymity later |
| [09-seasons-scoring-leaderboards.md](09-seasons-scoring-leaderboards.md) | Future community and leaderboard layer |
| [10-interface.md](10-interface.md) | API, generated docs, starter clients, and sample tools |
| [11-mvp-roadmap.md](11-mvp-roadmap.md) | Build phases for the true MVP |
| [12-balancing-notes.md](12-balancing-notes.md) | Single-player pacing and automation tuning |
| [13-open-questions.md](13-open-questions.md) | Resolved decisions and remaining review flags |
| [14-architecture-notes-for-later.md](14-architecture-notes-for-later.md) | API server architecture, now core to MVP |
| [15-gameplay-ideas.md](15-gameplay-ideas.md) | Later programming-game ideas |
| [16-api-contract.md](16-api-contract.md) | Draft MVP API contract |
| [17-player-template.md](17-player-template.md) | Coder template starter kit design |
| [18-true-mvp.md](18-true-mvp.md) | The smallest honest MVP |

## High-confidence recommendations

- Build the API before building a polished UI.
- Make the first Coder template feel like a starter dev kit, not just a game launcher.
- Keep the MVP private and single-player, but design IDs and tables so multiplayer can be added later.
- Use a tiny resource loop: status, mine, scan, upgrade, log.
- Make every server behavior scriptable, documented, and deterministic enough for bots.
- Do not tie game output to real workspace CPU, RAM, uptime, or spend.
