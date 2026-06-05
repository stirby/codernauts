# Upgrades and progression

## Progression goals

Upgrades should be legible, tempting, and frequent enough to create short check-ins.

A player should understand:

- What the upgrade costs.
- What it changes immediately.
- What it unlocks later.
- Why they might choose it over another option.

## Season 0 upgrade families

| Family | Purpose | Example upgrades |
| --- | --- | --- |
| Mining | Increase ore production | Mine I, Mine II, Autonomous Mine |
| Energy | Increase energy production and cap | Solar Array, Fusion Cell, Orbital Collector |
| Storage | Increase resource caps | Storage Depot, Warehouse, Planetary Vault |
| Research | Generate research and unlock systems | Lab, Research Network, AI Governor |
| Scanning | Reveal nearby planets | Scanner I, Deep Scanner, Sector Radar |
| Expansion | Claim more planets | Colonization Shuttle, Terraform Rig |

## Example upgrade screen

```text
Available Upgrades

[1] Mine II
Cost: 1,000 ore
Effect: +1.0 ore/sec

[2] Solar Array
Cost: 600 ore
Effect: +0.3 energy/sec, +500 energy storage

[3] Scanner I
Cost: 300 ore, 50 energy
Effect: Unlock adjacent scouting

[4] Research Lab
Cost: 2,000 ore, 500 energy
Effect: +0.05 research/sec, unlocks research upgrades
```

## Upgrade tiers

### Tier 0: Landing

Available immediately:

- Mine I
- Solar Panel I
- Storage Depot I

Goal:

- Give the player something to buy within minutes.

### Tier 1: Stable outpost

Unlocked by early production:

- Mine II
- Solar Array I
- Storage Depot II
- Lab I

Goal:

- Introduce energy and research without overwhelming the player.

### Tier 2: Exploration

Unlocked with Lab I and enough energy:

- Scanner I
- Scout action
- Colonization Shuttle I

Goal:

- Reveal the hidden map and connect idle production to world expansion.

### Tier 3: Expansion

Unlocked after first successful scout:

- Claim action
- Logistics I
- Mine automation
- Planet summary view

Goal:

- Let the player add a second planet and feel the world open up.

### Tier 4: Multiplayer preview

Recommended for Season 0 only as lightweight signals:

- Occupied tile discovery
- Anonymous neighbor display
- Leaderboard rival tags

Goal:

- Hint at future trade and conflict without implementing them.

## Strategic upgrades for later versions

| Upgrade | Unlocks |
| --- | --- |
| Trade Uplink | Trade routes |
| Faction Relay | Faction creation and invites |
| Defense Grid | Raid protection |
| Spy Probe | Espionage and stronger scouting |
| Orbital Cannon | Future conflict actions |
| Terraforming Rig | Advanced planet claiming |
| Wormhole Stabilizer | Long-range map movement |

## Cost curve

Costs should grow exponentially but not absurdly.

Example pattern:

```text
cost(level) = base_cost * growth_factor ^ (level - 1)
```

Suggested growth factors:

- Mine: 1.65
- Energy: 1.55
- Storage: 1.50
- Lab: 1.75
- Scanner: fixed milestone costs
- Expansion: base claim cost plus empire-size multiplier

[REVIEW] Confirm whether upgrades should have infinite levels or capped tiers. Recommendation: cap tiers for Season 0 so balance and UI stay simple.

## Unlock dependencies

Recommended Season 0 dependencies:

```text
Lab I requires Solar Array I
Scanner I requires Lab I
Scout action requires Scanner I
Colonization Shuttle I requires first scouted uninhabited planet
Claim action requires Colonization Shuttle I
```

## Anti-snowball controls

Use soft brakes, not hard punishment.

Potential controls:

- Increasing claim cost per owned planet.
- Empire upkeep after a planet threshold.
- Diminishing returns on repeated same-family upgrades.
- Daily objective bonuses for lower-ranked players.
- Newbie shield for first 24 hours, relevant when conflict exists.
- Raid protection after being attacked, future.

Recommended Season 0 controls:

- Claim cost increases by owned planet count.
- Planet production has a logistics multiplier that can be improved through upgrades.
- Leaderboard categories include more than total ore produced.

## Progression principle

The player should rarely be choosing between a good action and no action. They should usually be choosing between two good actions with different timelines.
