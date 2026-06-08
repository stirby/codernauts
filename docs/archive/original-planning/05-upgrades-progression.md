# Upgrades and progression

## MVP progression goal

Progression should be small enough to understand from JSON and useful enough to motivate client automation.

The player should think:

```text
If my script upgrades the weakest miner first, ore grows faster.
If it scans first, I can discover better sites for miner assignment.
```

## MVP upgrade families

| Upgrade | Effect | Why it exists |
| --- | --- | --- |
| Miner | Increases ore rate for one persistent object | Core idle progression |
| Scanner | Unlocks scanning or better scan results | Creates API exploration |
| Storage | Increases ore and energy caps | Supports longer offline windows |

Do not add labs, factions, defenses, trade uplinks, or deep tech trees in MVP.

## Suggested capped levels

| Upgrade | Levels | Example effects |
| --- | --- | --- |
| Miner | 1 to 5 | Higher base ore/sec per level |
| Scanner | 0 to 2 | Level 1 scans adjacent, Level 2 reveals richer hints |
| Storage | 1 to 3 | Higher ore and energy caps |

## API shape

```text
GET  /v1/miners
POST /v1/miners
POST /v1/miners/{miner_id}/upgrade
POST /v1/miners/{miner_id}/assign
```

Example request:

```json
{
  "target_level": 2
}
```

Example response:

```json
{
  "miner": {
    "id": "min_123",
    "level": 2,
    "status": "running",
    "assigned_site_id": "site_home_asteroid",
    "effective_ore_rate_per_second": 1.8
  }
}
```

## Unlocks

Keep unlocks minimal.

```text
Scanner I improves scan results.
Miner II makes automation visibly better.
Storage II lets a casual player stay away longer.
```

## Deferred progression

- Research trees.
- Rare-resource recipes.
- Ship classes.
- Faction upgrades.
- Combat upgrades.
- Seasonal prestige.
