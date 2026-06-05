# Architecture notes for later

This file captures architecture assumptions without locking decisions. The next conversation should turn this into an implementation architecture after gameplay scope is approved.

## Core architecture assumption

The game should have a central authoritative server. Player workspaces should run clients only.

Reason:

- Players should not lose progress when deleting a workspace.
- Shared map state needs one source of truth.
- Leaderboards and Slack reports need global state.
- Local workspace state would make cheating and synchronization harder.

## Likely components

```text
Player Coder workspace
  -> slim web client or local client app
  -> central game API
  -> central database
  -> scheduled worker for action resolution and Slack reports
```

## State ownership

Central server owns:

- Users and identity mapping
- Anonymous player names
- Seasons
- Map and planets
- Resource balances and production timestamps
- Upgrades
- Actions and timers
- Discovery state
- Leaderboard counters
- Activity logs
- Slack report data

Workspace client owns:

- No authoritative game state
- Local config only, if needed
- UI assets or CLI binary

## Stack options

Backend options:

- Go HTTP server
- Python FastAPI
- Node or TypeScript server

Frontend options:

- Server-rendered HTML with HTMX
- Minimal React
- Svelte
- Plain HTML plus small JavaScript

Database options:

- Postgres for central state
- SQLite only for a very early local prototype, not for multiplayer

Scheduler options:

- Server-side cron loop
- Separate worker process
- Database-backed action resolver
- External scheduler later if needed

[REVIEW] Choose stack after gameplay review. Since this is a Coder-adjacent project, Go plus Postgres plus a small web UI may fit well, but this should be discussed.

## Auth requirement

The server needs a stable identity from Coder, likely user ID or verified email. The exact mechanism depends on Coder app/template capabilities.

Gameplay requirement:

```text
same employee + new workspace = same active-season player
```

## Lazy production requirement

Production should be computed lazily on resource read or write.

This avoids per-player background jobs and makes resource generation deterministic.

## Timed action requirement

Actions need reliable resolution. Two viable approaches:

1. Resolve due actions lazily whenever a user loads the app.
2. Run a periodic worker that resolves due actions.

Recommendation for early build:

- Use lazy resolution plus a periodic worker for Slack and world consistency.

## Deployment assumption

The central game server can start in a persistent workspace or small internal deployment. Long-term, it should run somewhere less fragile than a personal workspace if people actually play.

[REVIEW] Decide whether a workspace-hosted server is acceptable for Season 0 or if it should be deployed as a small service immediately.

## Future repository shape

Possible repository layout:

```text
workspace-frontier/
  docs/
  server/
  web/
  cli/
  deploy/
  scripts/
```

Alternative for Go monolith:

```text
workspace-frontier/
  cmd/server/
  cmd/cli/
  internal/game/
  internal/httpapi/
  internal/store/
  web/
  docs/
```

[REVIEW] Repository shape depends on stack choice.
