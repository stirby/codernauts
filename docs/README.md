# Workspace Frontier gameplay docs

Workspace Frontier is an asynchronous multiplayer idle strategy game for Coder employees. Players enter through a Coder workspace, receive an anonymous astronaut identity, manage a starting planet on a hidden 2D grid, grow production, scout nearby space, expand to other planets, and compete on daily anonymous leaderboards.

This docs folder is intentionally gameplay-first. Architecture, implementation details, and deployment decisions should be designed after the gameplay plan is reviewed.

## Current recommended shape

- **Working title:** Workspace Frontier
- **Season 0 theme:** The Mining Race
- **Primary interface:** Slim web UI first, CLI later
- **MVP multiplayer surface:** Shared leaderboard, hidden map, adjacent scouting, expansion into empty planets
- **Deferred systems:** Trade, factions, raids, espionage, conquest
- **Identity model:** Real Coder identity stored server-side, anonymous astronaut identity shown in game
- **Game cadence:** Short seasonal rounds with daily Slack reports

## Docs index

| Doc | Purpose |
| --- | --- |
| [01-product-vision.md](01-product-vision.md) | Fantasy, audience, goals, and non-goals |
| [02-core-loop.md](02-core-loop.md) | Idle loop, session cadence, player day, retention hooks |
| [03-world-map.md](03-world-map.md) | 2D grid, planets, discovery states, planet generation |
| [04-economy.md](04-economy.md) | Resources, production, lazy accrual, storage, sinks |
| [05-upgrades-progression.md](05-upgrades-progression.md) | Upgrade tree, unlock pacing, anti-snowball controls |
| [06-actions-timers.md](06-actions-timers.md) | Timed actions such as scouting, claiming, and building |
| [07-multiplayer-systems.md](07-multiplayer-systems.md) | Scouting, expansion, trade, factions, conflict, social rules |
| [08-identity-anonymity.md](08-identity-anonymity.md) | Player identity layers, privacy, abuse controls |
| [09-seasons-scoring-leaderboards.md](09-seasons-scoring-leaderboards.md) | Seasons, scoring categories, Slack report format |
| [10-interface.md](10-interface.md) | Slim web UI and future CLI shape |
| [11-mvp-roadmap.md](11-mvp-roadmap.md) | Phased scope from Season 0 to later versions |
| [12-balancing-notes.md](12-balancing-notes.md) | Initial tuning knobs, formulas, and guardrails |
| [13-open-questions.md](13-open-questions.md) | Ambiguities flagged with `[REVIEW]` |
| [14-architecture-notes-for-later.md](14-architecture-notes-for-later.md) | Deferred architecture assumptions and options |
| [15-gameplay-ideas.md](15-gameplay-ideas.md) | Additional mechanics worth considering after MVP |

## Review workflow

1. Read [01-product-vision.md](01-product-vision.md) through [13-open-questions.md](13-open-questions.md).
2. Search for `[REVIEW]` to find decisions that need owner input.
3. Lock Season 0 scope before discussing architecture.
4. After gameplay is accepted, convert [14-architecture-notes-for-later.md](14-architecture-notes-for-later.md) into a build plan.

## High-confidence recommendations

- Start with seasons, not one permanent world.
- Start with no combat. Add raids only after the core loop is proven.
- Start with one native rare resource per player only when trade is introduced.
- Keep the first web UI text-heavy and button-driven, similar to Universal Paperclips.
- Make the game playable in 30 to 90 second check-ins.
- Never expose real employee names in public game surfaces by default.
