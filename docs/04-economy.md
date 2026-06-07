# Resource model

## MVP framing

This is not an economy in the MVP. There is no market, trading, credits, rare resources, or player-to-player exchange. The MVP only needs a small resource model that makes API automation worthwhile.

## MVP resources

| Resource | Role | Source | Sink |
| --- | --- | --- | --- |
| Ore | Primary spendable resource | Passive extractor rate, extract actions | Extractor, scanner, storage upgrades |
| Energy | Action capacity | Regenerates over time | Scan and extract actions |

Research and credits are deferred.

## Lazy production

Production should be calculated lazily.

```text
current_ore = stored_ore + ore_rate * elapsed_time
current_energy = min(max_energy, stored_energy + energy_rate * elapsed_time)
```

The server updates balances when the player reads or changes state.

## Storage

Storage exists to make upgrades meaningful, not to punish players.

MVP recommendation:

- Ore has a generous cap.
- Energy has a cap because it gates actions.
- Offline accrual can cap after 24 hours if needed.

## Initial values for prototype

```text
Starting ore: 100
Starting energy: 50
Max ore: 1,000
Max energy: 100
Ore rate: +1.0/sec
Energy rate: +0.05/sec
```

These are placeholders. Tune them with a quick simulation before a playtest.

## Deferred economy concepts

- Credits.
- Rare resources.
- Trade routes.
- Markets.
- Faction banks.
- Resource transfers.

These should not influence MVP architecture except that resource names should be extensible.
