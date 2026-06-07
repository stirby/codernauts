# Open questions and review flags

This file collects every `[REVIEW]` item from the docs.

## Naming and flavor

- Decision: Codernauts is the working name.
- Decision: Use a light sprinkle of Coder terms, but do not make everything hyper-focused on Coder terminology.

## Map and world

- Decision: The map does not wrap around at edges.
- Decision: Do not use org chart, team, or coworker relationship data for placement.
- [REVIEW] Include special tiles in Season 0 as rare flavor-only discoveries, or defer them entirely. Recommendation: include a few non-interactive discoveries only if simple.

## Economy

- Decision: Exclude credits from the MVP. Keep them as a possible later trade currency.
- Decision: Defer rare resources, trading, and related visibility rules until after the MVP.
- Decision: Do not worry about economy or trading for MVP beyond the individual production loop.
- [REVIEW] Decide storage cap strictness. Recommendation: generous caps in Season 0.
- [REVIEW] Starting rates and costs should be playtested quickly.

## Upgrades and progression

- [REVIEW] Confirm whether upgrades should have infinite levels or capped tiers. Recommendation: capped tiers for Season 0.

## Actions and timers

- [REVIEW] Decide whether all builds should be instant in Season 0. Recommendation: upgrades instant, scout and claim timed.
- [REVIEW] Decide conflict resolution for simultaneous claims. Recommendation: first completion wins with full refund to loser.
- [REVIEW] Decide whether notable events should be fully anonymous or use astronaut names. Recommendation: astronaut names.

## Multiplayer

- [REVIEW] Decide when an occupied neighbor reveals an anonymous name. Recommendation: not in Season 0 unless it improves fun.
- Decision: Defer trade negotiation entirely. MVP focus is game architecture and individual experience.
- [REVIEW] Decide whether faction names can be custom free text. Recommendation: generated names first or moderated custom names.
- [REVIEW] Decide whether workplace culture can support conflict mechanics. Recommendation: validate cooperation first, then run a limited raid event.

## Identity and privacy

- [REVIEW] Decide whether optional real-name reveal should exist at all. Recommendation: defer until after Season 0.
- [REVIEW] Decide whether anonymous names are stable across seasons. Recommendation: stable within a season, rotate between seasons.
- [REVIEW] Auth source requires architecture discussion. Gameplay requirement: stable identity across workspaces.

## Seasons and scoring

- [REVIEW] Choose the first real playtest length. Recommendation: 3 workdays.
- [REVIEW] Coder is distributed, so one daily report time may favor a region. Options are one global UTC report, one US-time report, or regional reports.
- [REVIEW] Decide whether Season 0 has one winner or category winners. Recommendation: category winners.
- [REVIEW] Decide whether players can opt into real-name recognition after the season. Recommendation: no for early seasons.

## Interface

- [REVIEW] Confirm whether the first client must support terminal-only users. Recommendation: web first, API designed so CLI can follow.

## Architecture

- [REVIEW] Choose stack after gameplay review. Since this is a Coder-adjacent project, Go plus Postgres plus a small web UI may fit well, but this should be discussed.
- [REVIEW] Decide whether a workspace-hosted server is acceptable for Season 0 or if it should be deployed as a small service immediately.
- [REVIEW] Repository shape depends on stack choice.

## Extra ideas

- [REVIEW] Avoid tying in-game production to real CPU, RAM, uptime, or workspace spend. It creates bad incentives.
- [REVIEW] Events are fun but can distract from balance. Add only after the base loop works.

## Balance

- [REVIEW] Starting balances and rates require quick simulation before implementation is finalized.
- [REVIEW] Decide if logistics upkeep is too much for Season 0. Recommendation: claim cost scaling first, logistics later if needed.
- [REVIEW] Daily objectives may add engagement but also scope. Recommendation: skip for first implementation unless the loop feels empty.

## Top decisions to make next

1. Confirm the MVP architecture and data model.
2. Confirm Season 0 scope with the individual experience as the priority.
3. Confirm web-first interface.
4. Confirm anonymous names rotate by season.
5. Confirm 3-workday Season 0 test length.
6. Confirm one global Slack report time.
