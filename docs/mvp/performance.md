# Performance expectations

Performance is part of the MVP scope. The game should stay cheap to run and easy to reason about.

## Server principles

- Avoid per-player background goroutines for resource production.
- Generate resources lazily when state is read or mutated.
- Keep timed actions in stored state and resolve them during normal reads.
- Keep `GET /v1/status` cheap enough to poll every few seconds.
- Keep state updates deterministic and testable.
- Avoid scans that require expensive map searches.
- Keep response payloads small.

## Complexity targets

For the in-memory MVP:

| Operation | Target | Notes |
| --- | --- | --- |
| Read status | O(miners + active actions + discovered sites) | Fine for MVP, easy to optimize later |
| Generate resources | O(assigned miners) | No tick loop |
| Compute energy usage | O(assigned miners) | Derived from assignments |
| Resolve actions | O(active or recent actions) | Avoid scanning unbounded history later |
| Build miner | O(1) plus state copy cost | Should remain simple |
| Assign miner | O(discovered sites + assigned miners) | Can index by site ID and track used capacity later |
| Render GUI | O(visible grid cells + miners + log rows) | Keep visible grid bounded |

## Client polling

The dashboard can poll every 3-5 seconds. It should refresh immediately after mutations. It should not require sub-second polling or push updates.

## Data growth guardrails

The MVP can use an in-memory store, but the API design should not force expensive future migrations. Keep stable IDs and explicit fields so a later Postgres store can index:

- Player ID.
- Miner ID.
- Site ID.
- Action ID.
- Action status.
- Site coordinates.

## What not to do

- Do not simulate every second in a global tick loop.
- Do not run a timer per scan or per miner.
- Do not make resource generation depend on browser refresh rate.
- Do not return entire historical logs forever in default views once data grows.
- Do not add animation-heavy GUI behavior that hides API state or burns client CPU.
