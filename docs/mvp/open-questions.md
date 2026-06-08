# MVP open questions

This file tracks unresolved questions for the current MVP only. Future-scope ideas belong in `docs/later/`.

## Current decisions

- The MVP map is a static 2D grid.
- The MVP scan directions are `north`, `east`, `south`, and `west`.
- Persistent miners are the resource-generation mechanism.
- The GUI is an onboarding and debugging client, not the main gameplay surface.
- Multiplayer is not in MVP scope.

## Questions to resolve

1. What final scaling curve should energy capacity, miner requirements, and upgrade costs use?
2. Should scans reveal only adjacent tiles, or can repeated scans in one direction reveal farther tiles?
3. Should every scan reveal an asteroid site in the prototype, or should some tiles be empty?
4. What is the target first-session duration before the player writes or edits code?
5. Should the first GUI default to the same-origin `/api` proxy whenever it is not running on localhost?
6. What is the maximum visible map size for the MVP dashboard?
7. What server response-time target should we use for `GET /v1/status` during local playtests?

## Recently removed from MVP scope

- Galactic directions.
- Galaxy rotation language.
- Shared map positioning.
- Multiplayer occupancy.
- Leaderboards and seasons.
