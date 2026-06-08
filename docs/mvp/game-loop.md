# Game loop

The MVP loop is a small automation loop around persistent miners and discovered asteroid sites.

## Starting state

A new player starts with:

- One pilot identity.
- One outpost at `{x: 0, y: 0}`.
- One known asteroid site named `Anchor Rock`.
- One starter miner named `Prospector One` assigned to `Anchor Rock`.
- A small ore balance for early builds and upgrades.
- A fixed energy capacity for assigned miners.

The UI and CLI must make this clear. The player should never see an empty dashboard and wonder whether the game has started.

## Core loop

1. Read `GET /v1/status`.
2. Review ore, energy capacity, miners, discovered sites, and suggested next actions.
3. Start a scan in one cardinal direction.
4. Poll until the scan resolves.
5. Build or upgrade a miner when ore allows it.
6. Assign idle miners to unassigned asteroid sites while energy capacity is available.
7. Read `GET /v1/log` to understand what changed.

## Actions

MVP actions are intentionally few:

- Scan a neighboring or nearby tile.
- Build a miner.
- Upgrade a miner.
- Assign a miner to an asteroid site.

There is no repeated manual mine action. Ore production comes from miners that stay assigned over time.

## Energy capacity

Energy is capacity, not a regenerating spendable resource. Each assigned miner reserves a flat amount of energy capacity. Building an idle miner costs ore but does not reserve energy until assignment. Upgrades cost ore, improve the miner, and increase total energy capacity by a provisional flat amount.

The current constants are deliberately named in code because final scaling is not decided yet:

- Starting energy capacity: `100`.
- Energy requirement per assigned miner: `30`.
- Energy capacity added per miner upgrade: `30`.

## Scans

A scan is a timed action. The server creates a pending action and resolves it when enough time has passed and state is read again.

MVP scan directions are:

- `north`
- `east`
- `south`
- `west`

No other direction names are in MVP scope.

## Progression

MVP progression should stay shallow:

- Build more miners.
- Upgrade miner levels.
- Discover more asteroid sites.
- Increase passive ore production.
- Increase energy capacity so more miners can be assigned.

Complex unlock trees, rare resources, markets, and contracts belong in later scope.

## Failure states

The API should return clear errors for common mistakes:

- Insufficient ore.
- Energy capacity exceeded.
- Unknown miner or site ID.
- Site already occupied.
- Scan already active.
- Invalid direction.

The client should prevent obvious errors when it already has enough state to do so.
