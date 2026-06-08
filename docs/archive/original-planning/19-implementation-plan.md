# Codernauts MVP implementation plan

## Status

Repository is ready for prototyping.

Current branch:

```text
docs/apply-review-feedback
```

Current docs define the API-first direction. This plan reflects the current MVP contract with persistent miners instead of a repeated manual extract loop.

## MVP target

Build a local, testable prototype with both sides in this repo:

1. A central game server exposing a REST/JSON API.
2. A starter client kit that a player can edit or replace.
3. A basic bot that proves the game is fun to automate.
4. A local dev flow that runs the server and client from this repository.

The MVP is single-player. Multiplayer, trade, factions, Slack leaderboards, seasons, and a polished first-party web UI are out of scope.

## Recommended stack

### Server

- Go
- `net/http` plus small routing helper if needed
- In-memory store for first prototype, with interfaces shaped so Postgres can replace it
- OpenAPI YAML checked into the repo
- Fake clock support for deterministic tests

Rationale: Go is a good fit for a durable authoritative API server. For the first prototype, in-memory state is faster than wiring Postgres. Keep the store boundary clean so moving to Postgres is a small follow-up.

[REVIEW] If durable state across server restarts is required in the first prototype, use Postgres immediately instead of in-memory state.

### Client

- TypeScript
- pnpm
- Native `fetch`
- Small hand-written client
- CLI plus editable example bot
- Vitest for client tests

Rationale: TypeScript is fast to prototype, readable for a starter project, and good for bots or dashboards.

## Proposed repository layout

```text
cmd/
  codernauts-server/
    main.go

internal/
  server/
    router.go
    errors.go
    middleware.go
  game/
    service.go
    resources.go
    actions.go
    miners.go
    sector.go
    clock.go
  store/
    memory.go
    types.go

openapi/
  codernauts.yaml

client/
  README.md
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
  src/
    client.ts
    cli.ts
    config.ts
    errors.ts
    types.ts
  examples/
    basic-bot.ts
    curl.sh
  test/
    client.test.ts
    config.test.ts
    bot.test.ts

scripts/
  dev-server.sh
  smoke-test.sh
```

## API surface

Implement these first:

```text
GET  /v1/health
GET  /v1/me
GET  /v1/status
GET  /v1/sector
GET  /v1/miners
POST /v1/miners
POST /v1/miners/{miner_id}/upgrade
POST /v1/miners/{miner_id}/assign
GET  /v1/actions
GET  /v1/actions/{action_id}
POST /v1/actions/scan
GET  /v1/log
GET  /openapi/codernauts.yaml
```

Prototype auth:

```text
Authorization: Bearer dev-token
```

The first prototype can seed one player for `dev-token`. Real token issuing can come after the loop works.

[REVIEW] Confirm whether a fixed `dev-token` is acceptable for first prototype testing.

## Gameplay model

### State

- One player
- One private outpost
- One private sector
- Home tile at `(0, 0)`
- Ore and energy
- Persistent miners
- Scanner and storage levels
- Scan action log

### Starting values

```text
ore: 100
energy: 50
max ore: 1000
max energy: 100
energy rate: +0.05/sec
starter miner count: 1
starter miner level: 1
starter miner base ore rate: +1.0/sec
scanner level: 0
storage level: 1
```

### Miners

Miners are persistent resource-generation objects.

```text
running miner ore rate = base ore rate for level * assigned tile ore multiplier
paused miner ore rate = 0
```

Players can:

- List miners.
- Build a miner on a known tile.
- Upgrade a miner.
- Assign a miner to a known tile.
- Pause a miner.

### Actions

```text
scan: timed, spends energy, reveals a nearby tile
```

Recommended timer defaults for local prototype:

```text
scan duration: 30 seconds
```

Docs can mention longer playtest timers later, but 30 seconds is better for local testing.

[REVIEW] Confirm prototype timers can be shorter than eventual playtest timers.

### Progression defaults

```text
miner max level: 5
scanner max level: 2
storage max level: 3
```

Initial costs:

```text
build miner: 250 ore
miner 1 -> 2: 200 ore
scanner 0 -> 1: 200 ore, 25 energy
storage 1 -> 2: 300 ore
```

Scanner and storage can be represented as simple account-level fields in the first API if dedicated endpoints are deferred. Miner endpoints are the primary MVP progression surface.

## Client MVP

### CLI commands

```bash
pnpm cli status
pnpm cli sector
pnpm cli miners
pnpm cli build-miner
pnpm cli upgrade-miner min_starter
pnpm cli assign-miner min_002 site_ast_001
pnpm cli scan rimward
pnpm cli log
pnpm cli raw GET /v1/status
```

### Example bot

`client/examples/basic-bot.ts` should:

1. Fetch status.
2. Fetch known sector tiles.
3. If enough ore exists, build a miner or upgrade the weakest miner.
4. Assign idle miners to the best known ore tile.
5. If no scan is active and enough energy exists, scan a neighboring tile.
6. Poll politely.
7. Print what it did.

The bot should never run a repeated manual extract loop. Ore grows because miners continue to run between API calls.

## Parallel implementation plan with contributors

After plan approval, split work like this:

### Workstream 1: Server skeleton and HTTP contract

Scope:

- Go module
- `cmd/codernauts-server`
- router
- JSON error envelope
- auth middleware with `dev-token`
- health, me, status skeleton
- OpenAPI initial file

Acceptance:

```bash
go test ./...
go run ./cmd/codernauts-server
curl http://localhost:8080/v1/health
```

### Workstream 2: Game engine and memory store

Scope:

- resource accrual
- fake clock
- miners
- scanner and storage levels
- scan actions
- deterministic sector generation
- in-memory store

Acceptance:

```bash
go test ./internal/game ./internal/store
```

### Workstream 3: Full API handlers

Scope:

- sector endpoint
- miner endpoints
- actions endpoints
- log endpoint
- idempotency keys for scan and miner build
- structured error mapping

Acceptance:

```bash
go test ./internal/server ./...
```

### Workstream 4: TypeScript starter client

Scope:

- client package setup
- config loading
- typed HTTP client
- API errors
- CLI commands
- tests with mocked fetch

Acceptance:

```bash
cd client
pnpm install
pnpm test
pnpm typecheck
```

### Workstream 5: Example bot and smoke tests

Scope:

- `examples/basic-bot.ts`
- `examples/curl.sh`
- `scripts/smoke-test.sh`
- README quickstart

Acceptance:

```bash
./scripts/smoke-test.sh
cd client && pnpm bot
```

### Workstream 6: Integration and docs pass

Scope:

- align OpenAPI with implemented responses
- update docs with exact prototype commands
- ensure no token leaks
- run full server/client test suite

Acceptance:

```bash
go test ./...
cd client && pnpm test && pnpm typecheck
./scripts/smoke-test.sh
```

## Implementation phases

### Phase 1: Server can boot

Deliver:

- Go server starts on `:8080`
- health endpoint works
- `Authorization: Bearer dev-token` works
- status returns seeded player, outpost, resources, and starter miner

### Phase 2: Game loop works by curl

Deliver:

- miner can be built
- miner can be upgraded
- miner can be assigned or paused
- ore accrues from running miners
- scan action can reveal a tile
- log records events

### Phase 3: Client can drive server

Deliver:

- `pnpm cli status`
- `pnpm cli miners`
- `pnpm cli build-miner`
- `pnpm cli upgrade-miner min_starter`
- `pnpm cli assign-miner min_002 site_ast_001`
- `pnpm cli scan rimward`
- `pnpm cli log`

### Phase 4: Bot proves the idea

Deliver:

- basic bot loops against local server
- bot builds, upgrades, and assigns miners over time
- bot scans for better tiles
- output is understandable

### Phase 5: Reviewable local demo

Deliver:

- one command starts server
- one command runs smoke test
- one command runs bot
- README explains how to test from this repository

## Test strategy

### Server tests

- resource accrual clamps to caps
- running miners increase ore rate
- paused miners do not increase ore rate
- tile ore multipliers affect assigned miners
- miner upgrades increase ore rate
- storage upgrades increase caps if implemented
- scan requires enough energy
- scan reveals a neighboring tile
- miner build and scan idempotency keys return original results
- conflicting idempotency payload returns conflict
- due actions resolve once
- unauthenticated requests return `401`
- JSON errors match contract

### Client tests

- config reads URL and token
- token is never printed in errors
- client sends bearer auth
- scan and miner build send idempotency keys
- CLI validates directions
- API errors are parsed
- bot decision function is testable without infinite loop

## Local demo commands after implementation

```bash
# terminal 1
./scripts/dev-server.sh

# terminal 2
./scripts/smoke-test.sh

# terminal 3
cd client
pnpm install
CODERNAUTS_API_URL=http://localhost:8080 CODERNAUTS_API_TOKEN=dev-token pnpm cli status
CODERNAUTS_API_URL=http://localhost:8080 CODERNAUTS_API_TOKEN=dev-token pnpm bot
```

## Blockers before prototyping

No hard blockers. I can start with defaults if you approve this plan.

Decisions that would change implementation:

1. **Server persistence:** in-memory first, or Postgres immediately?
2. **Starter language:** TypeScript default, or Python/Go instead?
3. **Prototype auth:** fixed `dev-token`, or real token bootstrap now?
4. **Action timers:** short local timers, such as 30 seconds, or realistic 2 minute timers?
5. **Scanner upgrades:** should scanner and storage have endpoints in the first prototype, or remain seeded fields until a later pass?

Recommended defaults if you want speed:

- In-memory store first.
- TypeScript client with pnpm.
- Fixed `dev-token` for local prototype.
- 30 second scan timer for local testing.
- Seed Scanner 0 and Storage 1, then add dedicated upgrade endpoints after miner automation feels good.
