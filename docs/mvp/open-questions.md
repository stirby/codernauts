# Open questions

This file tracks unresolved questions for the current scope only. Future-scope ideas belong in `docs/later/`.

## Current decisions

- The map is a static 2D grid of nodes; each node holds three deposit sites.
- Scan directions are `north`, `east`, `south`, and `west`; repeated scans in one direction reach farther nodes.
- Every scan reveals a useful node; there are no empty results in the prototype.
- Persistent miners are the resource-generation mechanism; energy is assignment capacity.
- Resources are uncapped; gravel from conversion is the only score.
- One leaderboard ranks season gravel; gravel per hour is a stat, not a ranking.
- Seasons reset everything; in the prototype, server restart equals reset.
- World generation is deterministic with no RNG.
- The GUI is an onboarding and debugging client, not the main gameplay surface.
- Multiplayer interaction is out of scope; the leaderboard shape supports many entries without redesign.

## Questions to resolve

These are balance-tuning questions. The mechanics are settled; the constants are not. Tune against the pacing table in [scaling.md](scaling.md) using playtest data.

1. Are the exact constants right: claim cost curve, conversion rates (1/3/9/25), crusher costs and multipliers, and scan durations?
2. What is the right season length once seasons run on a schedule instead of restarts? Weekly is the working assumption.
3. Does the first ring need cheaper claims? If playtests show the first claim landing well past the 10-minute target, lower the distance-1 cost before touching anything else.
