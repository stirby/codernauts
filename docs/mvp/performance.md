# Performance expectations

Performance is part of the current scope. The game should stay cheap to run and easy to reason about.

## Server principles

- Avoid per-player background goroutines for resource production.
- Generate resources lazily when state is read or mutated.
- Keep timed actions in stored state and resolve them during normal reads.
- Keep `GET /v1/status` cheap enough to poll every few seconds.
- Keep state updates deterministic and testable.
- World generation is a deterministic function of direction and distance; scans never search the map.
- Prune the gravel-rate event window lazily on read and write, never with a background loop.
- Keep response payloads small.

## Complexity targets

For the in-memory prototype:

| Operation | Target | Notes |
| --- | --- | --- |
| Read status | O(miners + active actions + discovered nodes and sites) | Fine for now, easy to optimize later |
| Generate resources | O(assigned miners) | No tick loop |
| Compute energy usage | O(assigned miners) | Derived from assignments |
| Resolve actions | O(active or recent actions) | Avoid scanning unbounded history later |
| Build miner | O(1) plus state copy cost | Should remain simple |
| Assign miner | O(discovered sites + assigned miners) | Can index by site ID later |
| Claim node | O(discovered nodes) | ID lookup plus cost check |
| Convert resource | O(1) plus one gravel-event append | Floor arithmetic, no loops |
| Gravel per hour | O(events in the last hour) | Window pruned lazily on read and write |
| Leaderboard | O(players log players) | Single entry today; sorting stays cheap at season scale |
| Render GUI | O(visible grid cells + miners + log rows) | Keep visible grid bounded |

## Client polling

The dashboard can poll every 3-5 seconds. It should refresh immediately after mutations. It should not require sub-second polling or push updates.

## Data growth guardrails

The prototype can use an in-memory store, but the API design should not force expensive future migrations. Keep stable IDs and explicit fields so a later Postgres store can index:

- Player ID.
- Miner ID.
- Node ID and coordinates.
- Site ID.
- Action ID and status.
- Season ID.

Gravel-rate events are pruned to the last hour, so the window stays bounded regardless of session length. Discovered nodes grow one per scan, so sector size is bounded by play, not by time.

## What not to do

- Do not simulate every second in a global tick loop.
- Do not run a timer per scan, per miner, or per rate window.
- Do not make resource generation depend on browser refresh rate.
- Do not return entire historical logs forever in default views once data grows.
- Do not recompute the leaderboard with background jobs; compute it on read.
- Do not add animation-heavy GUI behavior that hides API state or burns client CPU.
