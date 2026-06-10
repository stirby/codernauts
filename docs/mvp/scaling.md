# Scaling design

This page is the single system of thought behind every scaling decision in Codernauts. When a tuning or design question comes up, answer it with these rules before inventing a new mechanic. If a proposed change breaks one of these rules, the change is wrong or the rule needs an explicit revision in this file.

## Prior-art lessons in brief

| Game | Lesson |
| --- | --- |
| SpaceTraders | The API surface scales through concurrent assets and timers, not bigger single responses |
| Universal Paperclips | Fast first success hooks the player, plateaus justify automation, and complexity stays hidden until it is earned |
| The Farmer Was Replaced | Automation is the fantasy, efficiency is the reward |
| Factorio | Manual play is a bootstrap, and each new resource introduces one constraint at a time |
| shapez | Verbs stay stable while throughput demands rise |
| Dyson Sphere Program | Spatial expansion creates demand before the player can fully meet it |
| Satisfactory-style point sinks | Score useful output, not hoards |

## The scaling rules

1. **First progress must be explosive.** The first minute shows production, a score, and a next action. The first 10 minutes include claiming the first new node. Early upgrades feel multiplicative.
2. **Automation pressure comes from scale, not punishment.** Manual play is fine for 1-3 entities. Automation is clearly better by 5-10. Optimization matters once scans, conversions, and claims run concurrently.
3. **Every new resource must create a new decision.** A resource that only adds a bigger number does not get added.
4. **Score contribution, not hoarding.** Gravel comes from conversion. Balances never rank.
5. **Complexity arrives in phases.** Each phase introduces one primary new decision.
6. **Throughput beats waiting.** Timers exist only when parallel work exists. Scan duration grows with distance from home.
7. **One leaderboard number: gravel.** No fairness or catch-up mechanics; ruthless competition is the point. Runaway leaders are balance telemetry signaling challenge-design work, not a problem to patch with handicaps. Category boards stay in the back pocket (see `docs/later/leaderboards.md`).
8. **Short seasons keep competition hot.** Weekly or faster resets are the only equalizer. In the prototype, restart equals reset.

## The gravel narrative canon

The canon is design law. Hold future decisions accountable to it.

- Inverted refinement is the spine. Players harvest exotic materials, and the tech tree exists to crush them into the dumbest possible substance more efficiently.
- Upgrades sound like bureaucratic de-escalation: Crusher Mk I, Crusher Mk II, Sub-Orbital Aggregate Processing, Universal Gravelization Protocol.
- A resource's identity is how annoying it is to gravelize. A resource has value only through its gravel yield.
- The cumulative total decides the winner. The slope (gravel per hour) decides the trash talk. Both must be visible.
- Prestige fiction is reserved for later: "the gravel is never fine enough", crushing your own infrastructure for a multiplier, and "Gravel standards have been revised."
- Let one thing resist. Later, exactly one ungravelizable object exists, and cracking it is a season finale.
- The trash-talk naming test: every player-facing name must survive being said out loud in a standup voice, with contempt or glee.

## First 10 minutes pacing target

| Time | What the player sees |
| --- | --- |
| 0-1 min | Production running, gravel at zero, clear next actions |
| 1-3 min | More miners built and assigned |
| 3-6 min | First conversion, gravel on the board |
| 5-8 min | First nearby scan completed |
| 8-10 min | First node claimed |

The constants in `docs/mvp/game-loop.md` and `docs/mvp/api.md` exist to hit this table. Tune constants against this table, not against intuition.

## Phase 2 scope boundaries

Anti-patterns. Do not add these in Phase 2:

- No markets, trading, factions, or combat.
- No per-player goroutines or tick loops.
- No scoring of uptime, spend, or polling volume.
- No balance-based ranking.
