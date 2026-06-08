# Balancing notes

## MVP balancing target

Balance the first API programming experience, not a competitive economy.

Good MVP pacing means:

- First API call in under 5 minutes.
- First completed action in under 10 minutes.
- First useful client edit in under 60 minutes.
- First upgrade in the first session.
- A basic bot is useful but not optimal forever.

## Initial values

Prototype values:

```text
Starting ore: 100
Starting energy: 50
Max ore: 1,000
Max energy: 100
Starter miner ore rate: +1.0/sec
Energy rate: +0.05/sec
Scan duration: 2 minutes
Build miner cost: 250 ore
Miner upgrade cost: 200 ore
Scanner upgrade cost: 200 ore, 25 energy
Storage upgrade cost: 300 ore
```

## Automation guardrails

Players should be allowed to automate, but not accidentally attack the server.

Recommendations:

- Document a 5 to 10 second polling interval.
- Return `429` with retry hints for aggressive clients.
- Make action timers long enough that tight loops are unnecessary.
- Use idempotency keys so retries are safe.

## Simulation needs

Before playtest, simulate:

- Human using CLI only.
- Basic bot polling every 10 seconds.
- Bot that upgrades miners first.
- Bot that scans for better miner sites first.
- Player who returns after 24 hours.

Metrics:

- Time to first upgrade.
- Time to first scan result.
- Time to storage cap.
- API requests per player per hour.
- Number of meaningful client decisions.
