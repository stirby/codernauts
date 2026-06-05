# Economy

## Economy goals

The economy should be:

- Easy to understand in the first minute.
- Deep enough to support upgrade choices.
- Small enough to balance for Season 0.
- Built around idle accumulation and meaningful sinks.

## Season 0 resources

Recommended MVP resources:

| Resource | Role | Production source | Main sinks |
| --- | --- | --- | --- |
| Ore | Basic construction and expansion | Mines and planets | Buildings, upgrades, claims |
| Energy | Gating resource for scanning and advanced upgrades | Solar arrays and biome modifiers | Scouting, labs, claims |
| Research | Unlocks new mechanics and upgrade tiers | Labs | Scanner, automation, advanced production |
| Credits | Score and future trade currency | Daily grants or market actions, future | Trade routes, faction fees, future |

[REVIEW] Recommendation: exclude credits from Season 0 unless a clear sink exists. Keep them as Version 2 trade currency.

## Later resources

Potential Version 2 and Version 3 resources:

| Resource | Role |
| --- | --- |
| Water | Bio upgrades, life support, trade scarcity |
| Carbon | Manufacturing and organic tech |
| Silicon | Scanner and automation upgrades |
| Fuel | Long-range scouting and raids |
| Alloy | Advanced construction |
| Data | Espionage and research systems |
| Quantum Cores | Late-game rare upgrades |
| Relics | Seasonal event currency |

## Rare resources

Rare resources create trade motivation. They should not be required in Season 0.

Examples:

- Cryo Crystals
- Dark Matter Dust
- Bio-Gel
- Titanium Foam
- Solar Glass
- Neutrino Ice
- Compiler Pearls
- Terraform Seeds

Recommended Version 2 rule:

- Each home planet has one native rare resource.
- Advanced upgrades require two or three different rare resources.
- Players can gain access through trade or faction membership.

[REVIEW] Decide whether rare resources should be public after trade, after scouting, or only after a stronger scan.

## Idle production model

Production should be calculated lazily instead of running one job per player.

Conceptual formula:

```text
current_balance = stored_balance + production_rate * elapsed_time
```

When resources are read or modified:

1. Load stored balance and last updated timestamp.
2. Calculate elapsed time.
3. Calculate production generated during elapsed time.
4. Apply storage caps.
5. Persist the new balance and timestamp.
6. Execute the player action.

This keeps the game simple and scalable.

## Storage caps

Storage creates a reason to check in but should not punish casual players too hard.

Recommended Season 0 behavior:

- Ore has a storage cap.
- Energy has a storage cap.
- Research may have a high or no cap.
- Players start with enough storage to be away overnight without fully capping too early.

[REVIEW] Decide cap strictness. Recommendation: use generous caps in Season 0 so people are not punished for doing actual work.

## Production rates

Season 0 starting point:

```text
Ore:      +1.0 per second
Energy:   +0.1 per second, capped
Research: +0.0 per second until Lab I
```

After early upgrades:

```text
Ore:      +2.0 to +5.0 per second
Energy:   +0.3 to +1.0 per second
Research: +0.05 to +0.3 per second
```

[REVIEW] These numbers should be playtested quickly. The target is that a player can buy something useful after the first few minutes, then after a few hours, then overnight.

## Resource sinks

Season 0 sinks:

- Mine upgrades
- Solar upgrades
- Storage upgrades
- Lab upgrades
- Scanner research
- Scout actions
- Claim actions

Future sinks:

- Trade route setup costs
- Faction creation and upkeep
- Defense grid investment
- Raid commitments
- Spy probes
- Wormhole travel
- Seasonal projects

## Scoring counters versus balances

Leaderboards should use cumulative counters, not just current balances.

Track counters such as:

- Total ore produced this cycle
- Total energy produced this cycle
- Total research produced this cycle
- Total ore spent this cycle
- Planets claimed this cycle
- Scout actions completed this cycle

This prevents players from needing to hoard resources to rank well.

## Economy principle

Spend should usually feel good. If spending resources drops leaderboard position, players may stop interacting. Prefer scoring production and achievements over current inventory.
