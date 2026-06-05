# MVP roadmap

## Scope strategy

Build the smallest version that proves employees will return to check production, buy upgrades, scout the map, and care about the leaderboard.

Do not include trade, factions, or combat until the core loop is proven.

## Phase 0: Planning and repository setup

Deliverables:

- Gameplay docs reviewed.
- Working title selected.
- Private repository created.
- Architecture chosen.
- Local development flow decided.
- Initial issue list or milestone created.

Exit criteria:

- Season 0 scope is locked.
- Auth and identity approach is known well enough to implement.
- Deployment target for central game server is chosen.

## Phase 1: Single-player idle core

Features:

- Player account creation from stable identity.
- Anonymous astronaut name assignment.
- Starting planet assignment.
- Resource balances.
- Lazy idle production.
- Basic upgrades: mine, solar, storage, lab.
- Activity log.
- Slim web UI.

No shared map needed yet.

Exit criteria:

- A player can open the app, produce ore, buy upgrades, close the app, return later, and see resources accrued correctly.

## Phase 2: Shared map and scouting

Features:

- 2D grid generation.
- Starting planet placement.
- Planet biomes and modifiers.
- Player-specific discovery state.
- Scout NORTH, EAST, SOUTH, WEST.
- Timed scout actions.
- Visible space summary.

Exit criteria:

- A player can scout adjacent tiles and see persistent discovered information.

## Phase 3: Expansion

Features:

- Claim uninhabited adjacent planet.
- Timed claim action.
- Multi-planet production aggregation.
- Claim cost scaling.
- Contested claim handling.
- Owned planet list.

Exit criteria:

- Multiple players can compete to claim map territory without overwriting each other.

## Phase 4: Leaderboards and Slack report

Features:

- Daily scoring counters.
- Leaderboard page.
- Daily Slack report generator.
- Notable event collection.
- Season start and end metadata.

Exit criteria:

- A daily anonymized report can be posted manually or automatically.

## Phase 5: Season 0 playtest

Season 0 rules:

- Duration: 3 workdays
- Resources: ore, energy, research
- Actions: upgrade, scout, claim
- No trade
- No factions
- No combat
- Daily leaderboard
- Final category awards

Exit criteria:

- At least a small group plays across multiple days.
- We collect feedback on fun, pacing, UI clarity, and leaderboard motivation.
- We identify the next system worth adding.

## Version 2: Trade and rare resources

Features:

- Native rare resource per player.
- Trade route proposals.
- Structured trade terms.
- Trade route slots.
- Trade value scoring.
- Trade route bonuses.
- Better occupied planet scouting.

## Version 2.5: Factions

Features:

- Faction Relay upgrade.
- Create or join faction.
- Anonymous faction names.
- Faction leaderboard.
- Shared buffs.
- Optional shared bank.
- Sensor sharing, possibly limited.

## Version 3: Conflict

Features:

- Defense Grid.
- Raid action.
- Shield and cooldowns.
- Exposed resource pool.
- Salvage rewards.
- Spy probe.

Explicitly not first:

- Planet capture.
- Permanent destruction.
- Unbounded repeated attacks.

## Future event seasons

Possible themed seasons:

- The Mining Race: base Season 0
- The Trade Constellation: trade focus
- The Faction War Games: limited raids
- The Wormhole Incident: map traversal event
- The Relic Rush: special tiles and artifacts
