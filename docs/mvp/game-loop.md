# Game loop

The Phase 2 loop is collect, expand, crush, climb: collect resources with miners, expand by scanning and claiming nodes, crush resources into gravel, and climb the gravelboard before the season ends. Pacing targets live in [scaling.md](scaling.md).

## Starting state

A new player starts with:

- One codernaut identity with a fixed location at the home node `Vesta-41`.
- The home node pre-claimed, with three deposit sites: `Anchor Rock` (ore), `Basalt Shelf` (ore), and `Permafrost Pocket` (ice).
- One starter miner assigned to `Anchor Rock`.
- 350 ore; ice, gas, and crystal at zero. All resources are uncapped.
- Gravel at zero and a Crusher Mk I that can crush ore and ice.
- 100 energy capacity for miner assignments.

The UI and CLI must make this clear. The player should never see an empty dashboard and wonder whether the game has started.

## Core loop

1. Read `GET /v1/status`.
2. Collect: build, upgrade, and assign miners to sites on claimed nodes.
3. Expand: scan a direction, then claim the discovered node when you can afford it.
4. Crush: convert resource balances into gravel; upgrade the crusher to unlock gas and crystal and raise yield.
5. Climb: check `GET /v1/leaderboard` and your gravel-per-hour slope.
6. Read `GET /v1/log` to understand what changed.

## Actions

- Scan a direction.
- Claim a discovered node.
- Build, upgrade, and assign miners.
- Upgrade the crusher.
- Convert a resource into gravel.

There is no repeated manual mine action. Production comes from miners that stay assigned over time.

## Miners

An assigned miner adds `minerRate(level) * site base rate` per second to the site's resource. Accrual is lazy; there are no tick loops.

| Constant | Value |
| --- | --- |
| Build cost | `100 + 75 * existing miners` ore |
| Upgrade cost | 150 ore (1 to 2), 300 ore (2 to 3), 600 ore (3 to 4) |
| Max level | 4 |
| Mining rate | `1.0 + 0.75 * (level - 1)`, multiplied by the site base rate |

## Energy capacity

Energy is capacity, not a regenerating spendable resource. Each assigned miner reserves a flat amount of energy capacity. Building an idle miner costs ore but does not reserve energy until assignment. Miner upgrades cost ore, improve the miner, and add a flat amount of total energy capacity.

- Starting energy capacity: 100.
- Energy requirement per assigned miner: 30.
- Energy capacity added per miner upgrade: 30.

## Scans

A scan is a timed action that reveals the next undiscovered node in a direction. The server creates a pending action and resolves it when enough time has passed and state is read again. Only one scan may be active at a time.

Scan directions are `north`, `east`, `south`, and `west` only.

Scan duration scales with the distance of the node it will reveal: `15s + 20s * (distance - 1)`.

| Distance | Duration |
| --- | --- |
| 1 | 15s |
| 2 | 35s |
| 3 | 55s |

## Claiming

A discovered node must be claimed before miners can work its sites. Claim cost scales with distance `d`:

| Resource | Cost |
| --- | --- |
| ore | `150 * d * d` |
| ice | `100 * (d-1) * (d-1)` when `d >= 2`, otherwise 0 |
| gas | `75 * (d-2) * (d-2)` when `d >= 3`, otherwise 0 |

The first ring costs 150 ore. Deeper rings demand ice, then gas, so expansion depth depends on the production you have already built. Full cost examples are in [world.md](world.md).

## The crusher arc

The crusher is the outpost facility that turns resources into gravel. Upgrades unlock new crushable resources and raise the yield multiplier.

| Level | Name | Yield multiplier | Unlocks |
| --- | --- | --- | --- |
| 1 | Crusher Mk I | 1.0 | ore, ice |
| 2 | Crusher Mk II | 1.25 | gas |
| 3 | Sub-Orbital Aggregate Processing | 1.5 | crystal |
| 4 | Universal Gravelization Protocol | 2.0 | yield only |

| Upgrade to | Cost |
| --- | --- |
| 2 | 300 ore, 100 ice |
| 3 | 900 ore, 400 ice, 150 gas |
| 4 | 2500 ore, 1200 ice, 600 gas, 200 crystal |

Conversion: `gravel_earned = floor(amount * rate * yield_multiplier)`. Base rates per unit: ore 1, ice 3, gas 9, crystal 25. Gravel is cumulative and never spendable.

## Seasons

The game runs in short seasons. A season is created at server start with a deterministic name. Gravel, the leaderboard, and all progress belong to the season. In the prototype, server restart equals season reset. There are no catch-up mechanics; the reset is the only equalizer.

## Progression

- Build and upgrade miners for more production.
- Scan farther and claim richer, more distant nodes.
- Unlock gas and crystal production through claims, then crush them at higher crusher levels.
- Raise gravel per hour and convert often enough to keep the slope visible.

## Failure states

The API returns clear errors for common mistakes:

- Insufficient resources for a build, upgrade, claim, or conversion (`insufficient_resources`).
- Energy capacity exceeded (`energy_capacity_exceeded`).
- Unknown miner, site, or node (`not_found`).
- Site already occupied (`site_occupied`).
- Assigning a miner to a site on an unclaimed node (`node_not_claimed`).
- Claiming a node that is already claimed (`node_already_claimed`).
- Converting a resource the crusher cannot crush yet (`crusher_level_too_low`).
- Scan already active (`active_scan_exists`).
- Invalid direction, resource, or amount (`invalid_direction`, `invalid_resource`, `invalid_amount`).
- Upgrading a crusher already at max level (`max_level`).
- Reusing an idempotency key with a different request (`idempotency_conflict`).

The client should prevent obvious errors when it already has enough state to do so.
