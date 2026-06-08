# Codernauts development guidelines

## Product principles

- Codernauts is an API-first space automation game for programmers.
- The game is space-themed, not Coder-themed.
- The primary player activity is building clients, bots, dashboards, and tools against a stable API.
- Prefer simple mechanics that are easy to explain.
- Never treat players or users as stupid.
- If a mechanic cannot be explained clearly, do not build it yet.
- Learn from API-first games such as SpaceTraders, but do not copy complexity before it is needed.
- Performance and robustness matter more than spectacle.

## MVP scope

- Current MVP scope lives in `docs/mvp/`.
- Future ideas live in `docs/later/`.
- Historical planning lives in `docs/archive/`.
- If docs conflict, `docs/mvp/` wins.
- The MVP world is a static discrete 2D grid.
- MVP scan directions are `north`, `east`, `south`, and `west` only.
- Do not add galaxy rotation, galactic navigation, multiplayer, markets, factions, seasons, raids, or leaderboards unless the MVP docs are explicitly updated first.

## Engineering standards

- Prefer boring, robust systems over magical systems.
- Performance is a product requirement, not a later optimization.
- Avoid per-player background goroutines, tick loops, or high-frequency polling.
- Resource generation should stay lazy and deterministic.
- Energy is miner assignment capacity, not a regenerating spendable resource.
- Keep API responses small and stable.
- Every functionality change must include tests.
- Add enough tests to make regressions unlikely, including failure cases.
- Avoid low-value tests that only mirror implementation details.
- Every functionality change must update clear, concise documentation.

## API standards

- The API is the product surface.
- Use stable IDs and snake_case JSON.
- Keep errors structured and actionable.
- Use idempotency for retryable writes where practical.
- Keep endpoints scriptable and documented.
- Do not expose tokens in logs, errors, UI text, or docs examples beyond local development defaults.

## Client standards

- The starter client should be readable for new programmers.
- The GUI is an onboarding and debugging aid, not the primary game.
- The GUI should make current state obvious.
- The CLI, bot, and GUI must not introduce future-scope concepts.
- Browser code should work through Coder forwarded ports and same-origin proxy paths.
- Keep polling gentle.

## Documentation standards

- Current behavior belongs in `docs/mvp/`.
- Future ideas belong in `docs/later/`.
- Old plans belong in `docs/archive/`.
- Documentation should be clear, thorough, and concise.
- Do not mix current scope and future scope in the same section.
- Update docs in the same change as behavior changes.

## Scope promotion rule

If an idea lives in `docs/later/`, do not implement it directly. First move the idea into `docs/mvp/` through an explicit scope decision, then update implementation, API docs, client behavior, and tests together.

## Performance design rule

New server behavior should have an obvious complexity profile. If the complexity is not obvious, document the expected cost in `docs/mvp/performance.md` or in the relevant implementation plan before building it.

## Human clarity rule

Every new mechanic should have a one-sentence explanation that works in the README, CLI help text, or GUI. If the explanation is awkward, simplify the mechanic before implementing it.

## API compatibility rule

Do not break request or response shapes casually. If an API shape changes, update the OpenAPI document, TypeScript client types, CLI or GUI behavior, tests, and MVP API docs in the same change.

## Validation

Run relevant checks after changes:

```sh
go test ./...
cd client && pnpm typecheck && pnpm test && pnpm web:build
./scripts/smoke-test.sh
rg -n "$(python3 -c 'print(chr(0x2014)+"|"+chr(0x2013)+"| " + "--" + " ")')" -g '!client/node_modules/**' -g '!client/dist/**' . || true
```

Use a fresh port for smoke tests when a long-running local server may have accumulated state:

```sh
PORT=8098 ./scripts/smoke-test.sh
```

## Style

- No emdash, endash, or spaced double-hyphen punctuation in code, comments, strings, or docs.
- Prefer direct language.
- Do not add clever abstractions before they are needed.
