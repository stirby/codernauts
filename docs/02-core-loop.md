# Core loop

## Core loop summary

```text
Produce resources -> buy upgrades -> unlock systems -> scout map -> expand -> score on leaderboard
```

The player should always have one obvious next thing to do and one tempting longer-term goal.

## Season 0 loop

Season 0 should focus on the smallest coherent loop:

1. Player enters the game and receives a planet.
2. Planet idly produces ore.
3. Player spends ore on mine and energy upgrades.
4. Player unlocks research.
5. Player researches scanning.
6. Player scouts adjacent planets.
7. Player claims empty adjacent planets.
8. More planets increase production.
9. Daily leaderboard posts results.

## Session cadence

Ideal interaction length:

- Morning check-in: 30 to 90 seconds
- Midday action resolution: 30 to 90 seconds
- End-of-day leaderboard reaction: passive Slack visibility

Example morning session:

```text
You produced 18,400 ore while away.
Mine III is complete.
Scanner I is available.

Recommended action:
- Build Solar Array II to support scanner energy cost.
```

Example midday session:

```text
Scout EAST completed.
Result: Uninhabited desert planet. Copper-rich. Low hazard.

Available action:
- Claim EAST, 2 hours
```

## Player day example

At 9:30 AM:

```text
You log in.
Your planet mined 18,400 ore overnight.
You buy Mine IV.
You start researching Scanner II.
You scout EAST.
```

At 12:00 PM:

```text
Scout complete.
EAST is an uninhabited copper-rich planet.
You begin claiming it.
```

At 3:00 PM:

```text
Claim complete.
Your territory now has 2 planets.
Your ore production increases by 42%.
```

At 5:00 PM:

```text
Slack leaderboard posts.
You are #8 in ore produced and #3 in planets claimed.
```

## What should be fun before multiplayer depth exists

The game must be fun enough before trade, factions, or raids. Season 0 fun comes from:

- Watching production rates rise.
- Picking upgrades with visible effects.
- Revealing hidden planets.
- Racing anonymous coworkers on leaderboards.
- Seeing notable world events in Slack.

## Retention hooks

- Daily Slack report.
- Timed actions that complete during the workday.
- A visible next unlock.
- Short seasons that reset opportunity.
- Anonymous rivalries.
- Notable events generated from real player activity.

## Failure cases to avoid

- Player logs in and has no useful action to take.
- Early player lead becomes impossible to catch.
- Optimal strategy is too obvious after five minutes.
- Player gets attacked before understanding the game.
- Public leaderboard exposes real employee identity.
- Game requires constant attention to compete.
