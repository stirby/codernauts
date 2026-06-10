# Client and starter project

The starter project is the onboarding surface for programmers. It should show how to call the API without becoming the main game.

## Client surfaces

The starter client includes:

- Reusable TypeScript API wrapper.
- CLI commands for common actions.
- A small example bot.
- A simple web dashboard for onboarding and debugging.
- Tests for client behavior and helper logic.

## CLI commands

Required commands:

```text
status
sector
nodes
miners
scan [direction]
build-miner
upgrade-miner <minerId>
assign-miner <minerId> <siteId>
claim <nodeId>
conversions
convert <resource> [amount]
upgrade-crusher
leaderboard
actions
action <actionId>
log
raw <method> <path>
bot
```

`scan` should default to a cardinal direction. `convert` without an amount converts the full balance. `leaderboard` shows the season, ranks, gravel totals, and gravel per hour. The CLI should not mention non-MVP direction names.

## Web dashboard

The web dashboard is a teaching and debugging aid. It should make the current game state obvious.

It should show:

- API connection settings.
- Player, codernaut location, and outpost.
- Resource balances and per-resource production rates.
- Energy capacity, used, and available.
- A gravelboard panel: season name, rank, total gravel, and gravel per hour.
- A crusher panel: level name, yield multiplier, unlocked resources, next upgrade cost, and convert controls.
- A 2D grid map with node markers that distinguish the home node, claimed nodes, and discovered unclaimed nodes with their claim costs.
- Scan buttons on the map's unexplored frontier cells, one per direction, showing the estimated duration and distance. The cell being scanned shows a countdown, and other frontiers are disabled while a scan is active. Scanning happens on the map, not in a separate panel.
- Sites per node with resource, richness, and assignment state.
- Miners, levels, rates, and assignments.
- Build, upgrade, assign, scan, claim, convert, and crusher upgrade controls.
- Recent log entries.

The dashboard should not introduce future-scope concepts. It should not mention markets, category boards, prestige, or galactic directions.

## Browser behavior

When served through a Coder forwarded port, the dashboard should use a same-origin API proxy such as `/api`. It should not default to `127.0.0.1` from the browser unless the page itself is running on loopback.

## Bot behavior

The example bot is intentionally simple. It chooses one safe action per cycle, in a fixed priority order:

1. Claim an affordable discovered node, nearest first.
2. Assign an idle miner to the fastest open site on a claimed node while energy capacity allows.
3. Upgrade the crusher when the next level is affordable.
4. Build a miner when none is idle and a site is open or about to be claimable.
5. Upgrade a miner to raise energy capacity when an assignment is blocked.
6. Start a scan if no scan is active.
7. Crush the surplus of one unlocked resource above the reserve for upcoming purchases, in batches of 25 or more, highest value first.
8. Wait and let resources accrue.

The bot reserves the cost of its next planned purchase (nearest claim, then crusher upgrade, then miner build) and the next crusher tier before crushing, so it keeps expanding while still posting gravel. It is a teaching example, not an optimal strategy engine. It demonstrates the collect, expand, crush, climb loop end to end.

## Stability expectations

- The client should tolerate missing optional fields, including `claimed_by`, `claim_cost`, `resource`, and `next_upgrade`.
- The client should handle both direct API URLs and same-origin proxy URLs.
- The client should refresh after mutations.
- The client should avoid duplicate scans when one is already active.
- The client should keep polling gentle.
- The client should show useful errors without exposing tokens.
