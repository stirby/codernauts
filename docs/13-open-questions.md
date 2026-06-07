# Open questions and review flags

This file tracks decisions and remaining `[REVIEW]` items.

## Resolved direction

- Decision: Codernauts is the working name.
- Decision: The game is API-first.
- Decision: Players should build or vibe-code their own clients.
- Decision: The Coder template provides starter tools and boilerplate.
- Decision: MVP is single-player.
- Decision: MVP focuses on game server architecture and individual experience.
- Decision: Multiplayer, trading, factions, combat, Slack reports, and leaderboards are deferred.
- Decision: Use a light sprinkle of Coder terms, but do not make every mechanic product terminology.
- Decision: The map does not wrap around at edges.
- Decision: Do not use org chart, team, or coworker relationship data for placement.
- Decision: Exclude credits, rare resources, trade, and market economy from MVP.

## API and server

- [REVIEW] Choose server stack. Recommendation: Go or TypeScript, with REST/JSON and OpenAPI.
- [REVIEW] Choose database for prototype. Recommendation: Postgres if we expect multiplayer soon, SQLite acceptable only for local throwaway prototypes.
- [REVIEW] Confirm API versioning style. Recommendation: `/v1` path prefix.
- [REVIEW] Confirm error format. Recommendation: consistent JSON with code, message, and optional details.
- [REVIEW] Confirm idempotency key behavior for action creation.

## Player template

- [REVIEW] Choose starter client language. Options: TypeScript, Python, Go, or multiple examples.
- [REVIEW] Decide whether MVP includes a sample web dashboard. Recommendation: no, unless it is clearly a sample client.
- [REVIEW] Decide how the template receives the API token.
- [REVIEW] Decide whether generated SDKs are included in the template or generated later.

## Single-player gameplay

- [REVIEW] Confirm whether the player starts as an outpost, ship, or agent fleet. Recommendation: outpost for simplest idle loop.
- [REVIEW] Confirm MVP resources. Recommendation: ore and energy only.
- [REVIEW] Confirm MVP actions. Recommendation: status, scan, extract, upgrade, log.
- [REVIEW] Confirm whether scan and extract are timed or instant with cooldowns. Recommendation: timed actions.
- [REVIEW] Confirm storage cap strictness. Recommendation: generous caps.

## Future multiplayer

- [REVIEW] Decide when to introduce shared world state after MVP.
- [REVIEW] Decide whether anonymous names rotate by season later.
- [REVIEW] Decide whether future leaderboards score bots, resources, or both.

## Top decisions to make next

1. Choose the server stack.
2. Choose the starter client language.
3. Confirm REST/JSON with OpenAPI.
4. Confirm token bootstrap flow for the Coder template.
5. Confirm ore and energy as the MVP resources.
6. Confirm scan, extract, upgrade, and log as the MVP action surface.
