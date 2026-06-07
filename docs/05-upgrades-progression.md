# Upgrades and progression

## MVP progression goal

Progression should be small enough to understand from JSON and useful enough to motivate client automation.

The player should think:

```text
If my script upgrades the extractor first, ore grows faster.
If it upgrades the scanner first, I can discover better sites.
```

## MVP upgrade families

| Upgrade | Effect | Why it exists |
| --- | --- | --- |
| Extractor | Increases ore rate | Core idle progression |
| Scanner | Unlocks scanning or better scan results | Creates API exploration |
| Storage | Increases ore and energy caps | Supports longer offline windows |

Do not add labs, factions, defenses, trade uplinks, or deep tech trees in MVP.

## Suggested capped levels

| Upgrade | Levels | Example effects |
| --- | --- | --- |
| Extractor | 1 to 5 | +0.5 ore/sec per level |
| Scanner | 0 to 2 | Level 1 scans adjacent, Level 2 reveals richer hints |
| Storage | 1 to 3 | Higher ore and energy caps |

## API shape

```text
GET  /v1/upgrades
POST /v1/upgrades
```

Example request:

```json
{
  "upgrade_key": "extractor"
}
```

Example response:

```json
{
  "upgrade_key": "extractor",
  "level": 2,
  "effect": {
    "ore_rate_delta": 0.5
  }
}
```

## Unlocks

Keep unlocks minimal.

```text
Scanner I unlocks scan actions.
Extractor II makes automation visibly better.
Storage II lets a casual player stay away longer.
```

## Deferred progression

- Research trees.
- Rare-resource recipes.
- Ship classes.
- Faction upgrades.
- Combat upgrades.
- Seasonal prestige.
