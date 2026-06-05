# Additional gameplay ideas

These are optional ideas that may improve the concept after the Season 0 loop is proven. They are not required for MVP.

## Coder-specific mechanics

### Workspace uptime as flavor, not scoring

Use workspace concepts in copy, but avoid rewarding real workspace resource consumption. The game should not encourage people to keep expensive workspaces running for score.

Possible flavor:

- Agents mine resources.
- Templates define colony archetypes.
- Ports represent trade lanes.
- Persistent volumes represent storage upgrades.
- Snapshots represent disaster recovery.

[REVIEW] Avoid tying in-game production to real CPU, RAM, uptime, or workspace spend. It creates bad incentives.

### Template archetypes, future

Players could choose one of several starting templates after Season 0:

| Archetype | Bonus | Tradeoff |
| --- | --- | --- |
| Miner | +10% ore | Slower research |
| Researcher | +10% research | Lower storage |
| Scout | Faster scouting | Higher upgrade costs |
| Logistician | Cheaper claims | Lower early production |
| Trader | Extra route slot | Weaker solo bonuses |

Recommendation: defer until players understand the base game.

## Better mystery systems

### Signal hints

Before full scouting, unknown tiles can show vague signal text:

```text
NORTH: Low metallic signal
EAST: Heat bloom detected
SOUTH: Artificial radio noise
WEST: Sensor interference
```

This makes scouting feel like a choice instead of random clicking.

### Anonymous rival tags

The leaderboard can show relational tags without real names:

```text
#6 Astronaut Vela-3, adjacent rival
#7 You
#8 Astronaut Finch-12, discovered neighbor
```

This makes the shared map matter without exposing identities.

## Seasonal events

Small events can add variety without new permanent systems.

Examples:

- Meteor Shower: asteroid planets produce extra ore for one day.
- Solar Maximum: energy production increases, scouting costs less.
- Scanner Blackout: long-range scans disabled, adjacent scans cheaper.
- Ancient Cache: first players to scout special ruins get research rewards.
- Logistics Strike: claim costs increase unless players complete objectives.

[REVIEW] Events are fun but can distract from balance. Add only after the base loop works.

## Cooperative goals

A company-wide shared objective could make the game feel less purely competitive.

Example:

```text
Global Project: Stabilize the Wormhole
Goal: Produce 100,000,000 total ore this season
Reward: Everyone gets a final-day production boost
```

This can coexist with anonymous leaderboards and reduce negative competition.

## Low-risk conflict alternatives

If raids feel too aggressive, use indirect competition first:

- Race to claim neutral special tiles.
- Bid resources into public projects.
- Compete for temporary sector bonuses.
- Send spy probes that reveal info but do not steal resources.
- Create market pressure through trade demand.

## Anti-cheese ideas

- Cap idle accrual at a generous offline window, such as 24 hours.
- Keep all authoritative state server-side.
- Use cumulative production counters for scoring.
- Make action costs deterministic and logged.
- Record admin-visible audit events for transfers, trade, and combat.

## Recommendation summary

The strongest early shape is:

1. A text-first web UI.
2. Three resources: ore, energy, research.
3. A hidden grid with scout and claim actions.
4. Anonymous daily category leaderboards.
5. Short seasons.
6. No combat until the cooperative and exploration game is working.
