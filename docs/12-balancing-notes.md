# Balancing notes

## Balancing targets

Season 0 should support these player behaviors:

- First useful upgrade within 2 to 5 minutes.
- First lab or scanner path within the first workday.
- First scout completion within 30 to 60 minutes after unlocking scanner.
- First claimed planet within the first or second day.
- Casual players can still make visible progress with 2 to 3 check-ins per day.
- Highly active players can optimize but should not become unreachable immediately.

## Starting values

Initial proposal:

```text
Starting ore: 100
Starting energy: 50
Starting research: 0
Ore production: +1.0/sec
Energy production: +0.1/sec
Research production: +0.0/sec
Ore storage: 25,000
Energy storage: 2,000
Research storage: unlimited or 10,000
```

[REVIEW] Starting balances and rates require quick simulation before implementation is finalized.

## Example early costs

```text
Mine I
Cost: 100 ore
Effect: +0.5 ore/sec

Mine II
Cost: 500 ore
Effect: +0.8 ore/sec

Solar Panel I
Cost: 300 ore
Effect: +0.2 energy/sec, +500 energy cap

Storage Depot I
Cost: 400 ore
Effect: +25,000 ore cap

Lab I
Cost: 2,000 ore, 500 energy
Effect: +0.05 research/sec

Scanner I
Cost: 1,000 ore, 250 energy, 100 research
Effect: Unlock adjacent scouting

Scout direction
Cost: 250 energy
Duration: 30 minutes

Colonization Shuttle I
Cost: 3,000 ore, 750 energy, 250 research
Effect: Unlock claiming

Claim adjacent planet
Cost: 5,000 ore, 1,000 energy
Duration: 2 hours
```

## Claim cost scaling

Possible formula:

```text
claim_cost = base_claim_cost * (1.35 ^ owned_planet_count)
```

Alternative formula:

```text
claim_cost = base_claim_cost + (owned_planet_count * 2,500 ore)
```

Recommendation:

- Use the simpler linear formula for Season 0 if players will only claim a few planets.
- Use exponential scaling when seasons are longer or map control matters more.

## Production from multiple planets

Simple Season 0 model:

```text
total_ore_rate = sum(planet_ore_rate * biome_modifier) * global_mining_multiplier * logistics_multiplier
```

Logistics multiplier example:

```text
1 planet: 100%
2 planets: 100%
3 planets: 95%
4 planets: 90%
5 planets: 85%
```

Logistics upgrades can offset this later.

[REVIEW] Decide if logistics upkeep is too much for Season 0. Recommendation: include claim cost scaling first, add logistics only if needed.

## Catch-up mechanics

Season 0 options:

- Fastest Growth leaderboard category.
- Daily objectives with small boosts.
- Increased first-day production for late joiners.
- Category awards instead of one overall winner.

Future options:

- Research bonus for smaller empires.
- Newbie shield.
- Anti-raid cooldowns.
- Faction member limits.
- Planet upkeep.

## Daily objectives

Optional Season 0 daily objectives:

```text
Complete one scout: +250 research
Buy any upgrade: +500 ore
Spend 1,000 energy: +5% energy production for 12 hours
```

[REVIEW] Daily objectives may add engagement but also scope. Recommendation: skip for first implementation unless the loop feels empty.

## Simulation needs

Before launching Season 0, run a simple balance simulation for:

- Casual player: checks in twice per day.
- Active player: checks in six times per day.
- Optimizer: checks in often and picks ideal upgrades.
- Late joiner: starts on Day 2.

Metrics to compare:

- Ore produced by day.
- Time to Lab I.
- Time to Scanner I.
- Time to first claim.
- Number of planets by season end.
- Leaderboard separation between player profiles.
