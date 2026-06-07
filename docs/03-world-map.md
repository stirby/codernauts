# World and map

## Map model

Use a simple 2D grid of planet tiles.

```text
       ?     ?     ?
    ?  ?  [B]  ?   ?
 ?  ? [A] [YOU] [C] ?
    ?  ?  [D]  ?   ?
       ?     ?     ?
```

The full grid exists on the server, but each player only sees discovered tiles and summary information inside sensor range.

## Initial map recommendation

Season 0:

- Grid size: 30 by 30
- Starting positions: random viable planets with spacing rules
- Default visible range: home planet only
- Scanner I: adjacent orthogonal tiles
- Scanner II: adjacent orthogonal plus diagonal tiles
- Scanner III: radius 2 summaries

Decision: The map does not wrap around at edges. Edge tiles are real boundaries for Season 0.

## Tile states

| State | Meaning | Player-facing visibility |
| --- | --- | --- |
| Unknown | Not discovered | No info beyond possible signal hint |
| Scouted | Basic info known | Biome, habitability, rough resource profile |
| Uninhabited | Can be claimed | Claim cost and expected production |
| Occupied | Owned by another player or faction | Anonymous owner status, rough strength |
| Blocked | Cannot be claimed | Nebula, asteroid field, anomaly, hazard |
| Special | Has rare feature | Artifact, wormhole, boss planet, event site |

## Direction language

Season 0 can use simple directions:

- NORTH
- EAST
- SOUTH
- WEST

Future versions can add diagonals or coordinates once players have upgraded scanners.

## Planet properties

Each planet can have:

- Name
- Coordinates
- Biome
- Primary resource profile
- Optional rare resource
- Optional trait
- Optional hazard
- Owner user ID
- Owner faction ID
- Production modifiers
- Defense modifiers, future
- Discovery metadata per player

## Biomes

Initial biome list:

| Biome | Bonus | Penalty | Flavor |
| --- | --- | --- | --- |
| Metallic | Ore production | Higher claim cost | Deep crust deposits |
| Volcanic | Energy production | Storage instability | Geothermal vents |
| Frozen | Research or rare crystals | Lower base energy | Stable ice cores |
| Desert | Solar energy | Lower water, future | Clear skies |
| Oceanic | Future bio resource | Lower mining | Bio-gel seas |
| Jungle | Future growth resource | Higher hazard | Dense biomass |
| Gas Moon | Energy and fuel, future | Cannot host some buildings | Upper-atmosphere extraction |

Season 0 only needs bonuses that affect ore, energy, research, claim cost, or storage.

## Example planets

```text
Planet: Nox-17
Biome: Volcanic
Bonus: +30% energy production
Penalty: -10% storage capacity
Trait: Geothermal Vents
```

```text
Planet: Pella-08
Biome: Oceanic
Bonus: +20% research from labs
Penalty: -15% ore production
Trait: Bio-Gel Seas, future trade resource
```

```text
Planet: Korr-91
Biome: Metallic
Bonus: +25% ore production
Penalty: +15% claim cost
Trait: Deep Crust Deposits
```

## Starting planet rules

Each starting planet should be viable but distinct.

Recommended constraints:

- Minimum base ore production is always enough to buy Mine I quickly.
- No starting planet has a severe energy penalty.
- No starting planet begins adjacent to too many blocked tiles.
- Starting planets should be spaced apart enough to avoid immediate crowding.
- Each starting player gets at least one claimable planet within two scout actions.

Decision: Do not use org chart, team, or coworker relationship data for placement. Starting positions are generated from game-only placement rules.

## Discovery information

When a player scouts an adjacent tile, they see a limited summary.

Examples:

```text
NORTH: Unknown signal. High energy signature.
EAST: Uninhabited desert planet. Copper-rich.
SOUTH: Occupied. Owner unknown. Defense estimate: Not available in Season 0.
WEST: Frozen planet. Rare isotope detected.
```

Season 0 can suppress owner identity entirely:

```text
SOUTH: Occupied by Unknown Astronaut. Claim blocked.
```

## Special tiles

Special tiles should exist in the design but can be disabled in Season 0.

Potential special tiles:

- Ancient Ruins: one-time research reward
- Wormhole: connects distant map regions
- Trade Hub: future trade route bonus
- Derelict Station: event chain
- Nebula: blocks scouting unless upgraded
- Asteroid Field: high ore but higher claim time

[REVIEW] Include special tiles in Season 0 as rare flavor-only discoveries, or defer them entirely. Recommendation: include a few non-interactive discoveries for leaderboard event flavor if implementation stays simple.
