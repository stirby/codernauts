# Multiplayer systems

## Multiplayer philosophy

The game should feel shared before it becomes socially demanding. The first version should give players evidence that others exist without requiring direct coordination.

Recommended order:

1. Shared anonymous leaderboards
2. Hidden map with occupied planets
3. Expansion race
4. Trade routes
5. Factions
6. Raids and espionage
7. Conquest, only if the game can support it safely

## Season 0 multiplayer

Season 0 is primarily an individual experience with light shared-world context.

Season 0 includes:

- Individual idle production
- Shared world map, as architecture groundwork
- Anonymous players
- Occupied planet discovery, if the shared map is ready
- Expansion into empty planets, if the shared map is ready
- Daily leaderboards
- Notable world events

Season 0 excludes:

- Trading and economy systems beyond individual production
- Factions
- Combat
- Resource transfers
- Direct messaging
- Planet capture

## Scouting

Scouting reveals nearby map tiles.

At first, occupied planets show minimal information:

```text
Planet EAST is occupied.
Owner: Unknown Astronaut
Trade status: Not available this season
Conflict status: Not available this season
```

Future scanner levels can reveal:

- Anonymous astronaut name
- Faction name
- Biome
- Rare resource category
- Rough production band
- Rough defense band

[REVIEW] Decide when an occupied neighbor reveals an anonymous name. Recommendation: not in Season 0 unless it improves fun.

## Expansion

Players can claim uninhabited adjacent planets.

Rules:

- Target must be scouted.
- Target must be uninhabited.
- Target must be adjacent to owned territory.
- Claim has a resource cost and timer.
- Claim cost increases with owned planet count.

No player can claim another player's owned planet in MVP.

## Trade, Version 2

Trade should be the first true social mechanic.

Goals:

- Encourage discovery and cooperation.
- Make rare starting resources matter.
- Create anonymous diplomacy without requiring chat.
- Add strategic choices that are not purely combat.

Example route:

```text
Trade Route

Astronaut Finch-12 sends:
- 500 ore/hour

Astronaut Vela-3 sends:
- 50 Bio-Gel/hour

Route bonus:
- Both players get +3% research while route remains active.
```

Recommended trade model:

- Trade requires both players to accept.
- Trade terms are structured, not free-text.
- Trade routes have limited slots.
- Routes can be cancelled with a cooldown.
- Routes generate daily trade value stats.

Decision: Defer trade negotiation entirely. The MVP focuses on game architecture and the individual player experience.

## Native rare resources, Version 2

Each player's starting planet can have one native rare resource. Advanced upgrades require resources from other planets, creating trade pressure.

Examples:

- Bio-Gel improves lab output.
- Solar Glass improves energy production.
- Cryo Crystals improve storage.
- Titanium Foam improves claim speed.
- Neutrino Ice improves scanner range.

## Factions, Version 2 or 3

Factions are the big social unlock.

Possible unlock:

```text
Create faction
Requires: Faction Relay
Cost: 25,000 ore, 5,000 research
Max members: 5 initially
```

Faction mechanics:

- Anonymous faction name
- Shared leaderboard category
- Shared resource bank, future
- Faction-wide buffs
- Sensor sharing
- Trade route discounts
- Shared defense, future

Example faction bonuses:

| Faction style | Bonus |
| --- | --- |
| Engineering Guild | +5% construction speed |
| Mining Collective | +5% ore production |
| Research Pact | +5% research output |
| Defense League | +10% shield strength, future |
| Trade Union | +10% route efficiency |

[REVIEW] Decide whether faction names can be custom free text. Recommendation: allow custom names with moderation or pick from generated names first.

## Conflict, Version 3

Do not start with war. Conflict creates balance, safety, and morale problems before the base game is proven.

If added, start with raids rather than conquest.

Raid concept:

```text
Raid target: Unknown Neighbor
Attack commitment: 5,000 ore, 1,000 energy
Resolution: 6 hours
Outcome: Attacker wins
Reward: 1,200 ore, 300 credits
Target loses: exposed unshielded resources only
```

Combat should follow these principles:

- No permanent destruction in early conflict versions.
- No planet capture at first.
- Defenders keep core production.
- Losses come from exposed resources, not total economy.
- Defender receives temporary raid shield after being attacked.
- Repeated attacks on the same player are rate-limited.

## Basic raid formula, future

```text
attack_power = committed_resources * attack_multiplier

defense_power = shield_investment + defense_buildings + committed_reserves

if attack_power > defense_power:
  attacker gains 10% to 25% of exposed resources
  defender receives raid shield
else:
  attacker loses committed resources
  defender gains small salvage bonus
```

[REVIEW] Decide whether workplace culture can support conflict mechanics. Recommendation: validate cooperative systems first, then run a limited raid event in a short season.

## Social safety rules

- Public game surfaces use anonymous names.
- Real identity is only for auth, abuse prevention, and admin support.
- No custom player names in MVP.
- No free-text messaging in MVP.
- Trade and faction names need moderation if free text is allowed.
- Conflict needs cooldowns and shields before launch.
