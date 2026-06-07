# Future seasons, scoring, and leaderboards

## Status

Seasons, Slack reports, and leaderboards are not MVP scope.

They may become useful after the API-first single-player loop works and enough players have built clients worth comparing.

## Future leaderboard categories

Future categories should reward programming behavior, not just idle accumulation.

Possible categories:

| Category | Metric |
| --- | --- |
| Most Reliable Bot | Longest successful automation run |
| Fastest Explorer | Most scan completions in a day |
| Efficient Engineer | Most ore gained per energy spent |
| Toolsmith | Best submitted client or dashboard, judged manually |
| Top Miner | Ore produced in the cycle |

## Future Slack report

A future report might look like:

```text
Codernauts Daily Report

API Activity
- 28 players called the API today.
- 14 custom clients were active.
- 312 scan actions completed.

Top Automation
1. Astronaut Finch-12: 96 percent action uptime
2. Astronaut Cobalt-7: 88 percent action uptime
3. Astronaut Vela-3: 81 percent action uptime
```

## Design guardrail

Do not let future leaderboards push players toward bad Coder resource behavior. Never score real workspace uptime, CPU usage, memory usage, or spend.
