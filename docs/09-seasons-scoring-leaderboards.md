# Seasons, scoring, and leaderboards

## Why seasons

Seasons are strongly recommended.

Benefits:

- Prevents early players from snowballing forever.
- Makes balance mistakes less fatal.
- Gives late joiners a fresh future opportunity.
- Creates internal hype through starts and finales.
- Allows rules to change between experiments.

## Season length

Recommended progression:

| Stage | Length | Purpose |
| --- | --- | --- |
| Internal dev test | 1 day | Validate loop and bugs |
| Season 0 | 3 days | Validate fun and scoring |
| Season 1 | 1 week | Add more progression and Slack cadence |
| Later seasons | 1 to 2 weeks | Add trade, factions, events |

[REVIEW] Choose the first real playtest length. Recommendation: 3 workdays.

## Daily cycle

Recommended daily report time:

- 5:00 PM local company-preferred timezone

[REVIEW] Coder is distributed, so one daily report time may favor a region. Options are one global UTC report, one US-time report, or regional reports. Recommendation: one global report for simplicity.

## Leaderboard categories

Season 0 categories:

| Category | Metric | Why it works |
| --- | --- | --- |
| Top Miners | Total ore produced today | Core idle score |
| Top Researchers | Total research produced today | Rewards unlocking labs |
| Largest Outposts | Number of owned planets | Rewards exploration and expansion |
| Fastest Growth | Percent production increase today | Catch-up friendly |
| Most Curious | Scout actions completed today | Rewards exploration |

Recommended final score:

```text
season_score = weighted_sum(
  ore_produced,
  research_produced,
  planets_claimed,
  scout_actions_completed,
  production_rate_growth
)
```

[REVIEW] Decide whether Season 0 has one winner or category winners. Recommendation: category winners to reduce single-strategy dominance.

## Use cumulative counters

Do not rank primarily by current resource balance. Rank by production and achievement counters so players are rewarded for spending resources.

Daily counters reset each scoring cycle:

- Ore produced today
- Research produced today
- Energy produced today, optional
- Planets claimed today
- Scouting actions completed today
- Production rate increase today

Season counters persist for final awards.

## Slack daily report example

```text
Daily Workspace Frontier Report
Season 0, Day 2

Top Miners
1. Astronaut Cobalt-7: 1,204,000 ore
2. Astronaut Vela-3: 947,000 ore
3. Astronaut Ash-12: 881,500 ore

Top Researchers
1. Astronaut Nova-4: 82,000 research
2. Astronaut Umber-9: 77,200 research
3. Astronaut Finch-2: 69,800 research

Largest Outposts
1. Astronaut Kestrel-6: 5 planets
2. Astronaut Cobalt-7: 4 planets
3. Astronaut Vela-3: 4 planets

Notable Events
- 47 scout missions completed.
- First volcanic planet claimed.
- A contested claim occurred in Sector D14.
```

## Final season report example

```text
Workspace Frontier Season 0 Complete

Overall Standings
1. Astronaut Cobalt-7
2. Astronaut Vela-3
3. Astronaut Nova-4

Category Awards
Top Miner: Astronaut Cobalt-7
Top Researcher: Astronaut Nova-4
Largest Outpost: Astronaut Kestrel-6
Most Curious: Astronaut Finch-2
Fastest Growth: Astronaut Ash-12

World Stats
Players: 42
Planets claimed: 113
Scout missions: 602
Total ore produced: 87,400,000
```

## Notable events

Notable events create narrative. They should be generated from actual game events.

Potential Season 0 events:

- First player reached Mine V.
- First scanner came online.
- First second planet claimed.
- First special tile discovered.
- Total scout count crossed 100.
- A player reached 1 million daily ore.
- A contested claim occurred.

Future events:

- First trade route established.
- First faction founded.
- First raid resolved.
- First wormhole stabilized.

## Leaderboard anonymity

Slack reports should use anonymous astronaut names only. No team names, emails, or real names.

[REVIEW] Decide whether players can opt into real-name recognition after the season. Recommendation: no for early seasons.
