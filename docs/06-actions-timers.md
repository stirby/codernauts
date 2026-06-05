# Actions and timers

## Action model

Longer actions create asynchronous gameplay. Actions start, reserve or spend resources, then resolve later.

Examples:

- Scout adjacent planet
- Claim planet
- Build major upgrade
- Open trade route, future
- Raid, future
- Spy probe, future

## Action lifecycle

```text
queued -> running -> resolved
queued -> cancelled, optional
running -> failed, rare
```

Recommended Season 0 statuses:

- pending
- completed
- failed

Keep cancellation out of Season 0 unless needed.

## Season 0 actions

### Build upgrade

Small early upgrades can complete instantly. Larger upgrades can take time.

Recommended rule:

- Tier 0 and Tier 1 upgrades are instant.
- Scanner, lab, and expansion upgrades take 5 to 30 minutes.
- Planet claim takes 1 to 2 hours.

[REVIEW] Decide whether all builds should be instant in Season 0. Recommendation: make upgrades instant at first, make scout and claim timed. This keeps the MVP simpler.

### Scout direction

```text
Action: Scout EAST
Cost: 250 energy
Duration: 30 minutes
Requires: Scanner I
Result: Reveals tile summary
```

Possible results:

- Uninhabited planet
- Occupied planet
- Blocked tile
- Special tile

### Claim planet

```text
Action: Claim EAST
Cost: 2,000 ore, 500 energy
Duration: 2 hours
Requires: Scouted uninhabited adjacent planet and Colonization Shuttle I
Result: Adds planet to territory
```

If two players try to claim the same planet:

- The first completed claim wins.
- The later action fails and refunds most or all cost.

[REVIEW] Decide conflict resolution for simultaneous claims. Recommendation: first completion wins with full refund to loser in Season 0.

## Resource reservation

Two possible models:

### Spend at start

Resources are deducted when the action starts.

Pros:

- Simple.
- Prevents overspending.
- Easy to show cost.

Cons:

- Failed actions need refund logic.

### Reserve at start, spend at completion

Resources are locked when the action starts and spent when it completes.

Pros:

- More accurate for contested actions.

Cons:

- More state and UI complexity.

Recommendation:

- Spend at start for Season 0.
- Refund on failed contested claim.

## Action queue limits

Action limits prevent one player from queuing too much while away.

Recommended Season 0 limits:

- One active scout per player.
- One active claim per player.
- No build queue if upgrades are instant.

Future limits:

- Multiple action slots unlocked by upgrades.
- Faction projects with shared timers.
- Long-range expeditions.

## Activity log

Every action should produce a short log entry.

Examples:

```text
09:32 Scanner I came online.
09:35 Scout EAST started. Completion at 10:05.
10:05 Scout EAST completed. Desert planet discovered.
12:10 Claim EAST started. Completion at 14:10.
14:10 Claim EAST completed. Territory expanded to 2 planets.
```

The activity log makes the game feel alive without needing chat or graphics.

## Notable world events

A subset of actions can generate anonymized events for the daily report.

Examples:

- First player claimed a second planet.
- First special tile discovered.
- 20 scout actions completed in one day.
- A contested claim occurred.

[REVIEW] Decide whether notable events should be fully anonymous or use astronaut names. Recommendation: use astronaut names, not real identities.
