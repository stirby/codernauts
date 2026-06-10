# Codernauts playtest template

A Coder template for dogfooding Codernauts. Each workspace clones the game
from GitHub, builds it, and runs the API server plus the web dashboard.

## What you get

- The game server on `127.0.0.1:8035` inside the workspace, started fresh
  every workspace start (the world is in-memory; each start is a new season).
- The Control Deck dashboard as a subdomain app, with the `/api` proxy wired
  to the server. One click from the workspace page.
- `CODERNAUTS_API_URL` and `CODERNAUTS_API_TOKEN` preset in the agent
  environment, so CLI commands work immediately in any workspace terminal:

  ```bash
  cd ~/codernauts/client
  pnpm cli status
  pnpm cli bot
  ```

- Workspace metadata showing season gravel and gravel per hour.

## Parameters

| Parameter    | Default                                 | Notes                                            |
|--------------|-----------------------------------------|--------------------------------------------------|
| `repo_url`   | `https://github.com/stirby/codernauts`  | Any clonable URL works.                          |
| `branch`     | `feat/phase2-gravel`                    | Branch to check out and run.                     |
| `time_scale` | `1`                                     | Game clock speed: 1x, 2x, 5x, or 10x.            |

Changing `time_scale` and restarting the workspace restarts the server at the
new speed with a fresh world. At 10x, a distance-1 scan resolves in 1.5 real
seconds and an hour of economy plays out in 6 minutes.

## Push to a deployment

```bash
cd templates/codernauts
coder templates push codernauts -d .
```

Requires a Docker provisioner. The image builds from `build/Dockerfile`
(Ubuntu 24.04, latest stable Go, Node 22, pnpm 10) and is cached per host.

## Logs

- Server: `/tmp/codernauts-server.log`
- Dashboard: `/tmp/codernauts-web.log`
