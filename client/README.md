# Codernauts TypeScript client starter

This folder is a small starter kit for exploring the Codernauts API. It is written for beginners and uses space automation words like miners, sectors, scans, sites, ore, and logs.

## What you need

- Node.js 18 or newer
- pnpm
- A Codernauts API server running locally, usually at `http://localhost:8080`

## First run

```sh
cd client
pnpm install
pnpm cli status
```

The client uses these defaults:

- API URL: `http://localhost:8080`
- bearer token: `dev-token`

You can override them with environment variables or by copying `.env.example` to `.env`.

```sh
cp .env.example .env
```

## Web console

The web console is the friendliest way to see the local game state. It shows ore, energy capacity, the sector map, active scans, miners, assignments, and recent log entries. It also refreshes automatically.

Start the API server from the repository root in one terminal:

```sh
../scripts/dev-server.sh
```

Start the web client from this folder in another terminal:

```sh
pnpm web
```

Open `http://127.0.0.1:5174` and use the default token, `dev-token`. The page has API URL and token fields if you run the server somewhere else.

You can also set browser defaults before starting Vite:

```sh
VITE_CODERNAUTS_API_URL=http://127.0.0.1:8080 VITE_CODERNAUTS_API_TOKEN=dev-token pnpm web
```

## Commands

Run commands with `pnpm cli <command>`.

```sh
pnpm cli status
pnpm cli miners
pnpm cli sector
pnpm cli scan north
pnpm cli build-miner
pnpm cli upgrade-miner <minerId>
pnpm cli assign-miner <minerId> <siteId>
pnpm cli actions
pnpm cli action <actionId>
pnpm cli log
pnpm cli raw GET /v1/health
pnpm bot
```

### What the commands do

- `status`: shows your pilot, ore, energy capacity, active actions, and quick next steps.
- `miners`: lists your mining drones and their assigned resource sites.
- `sector`: lists discovered space sites in your current sector.
- `scan`: asks the API to scan nearby space for more resource sites.
- `build-miner`: builds a persistent mining drone.
- `upgrade-miner <minerId>`: upgrades one mining drone and increases energy capacity.
- `assign-miner <minerId> <siteId>`: sends a miner to a discovered site if energy capacity is available.
- `actions`: lists scan actions.
- `action <actionId>`: prints one scan action.
- `log`: prints recent captain's log entries.
- `raw <method> <path>`: makes a direct API call when you want to experiment.
- `bot`: runs a simple one-step helper that chooses a beginner action.

## Examples

Scan for sites with an idempotency key so retrying is safe:

```sh
pnpm cli scan north --idempotency-key first-scan
```

Assign a miner to a site:

```sh
pnpm cli assign-miner miner_123 site_456
```

Call any endpoint directly:

```sh
pnpm cli raw GET /v1/status
pnpm cli raw POST /v1/actions/scan '{"direction":"north"}'
```

Use a remote server:

```sh
CODERNAUTS_API_URL=https://example.invalid CODERNAUTS_API_TOKEN=my-token pnpm cli status
```

## Project layout

```text
src/client.ts   reusable API client
src/config.ts   environment defaults
src/cli.ts      command-line interface
src/bot.ts      simple beginner bot
src/web/        Vite and React web console
test/           small tests for safe client behavior
```

## Development checks

```sh
pnpm test
pnpm typecheck
pnpm web:build
```

## Notes for new pilots

Persistent miners generate ore over time after they are assigned to discovered sites. Assigned miners reserve energy capacity. A good early loop is:

1. Run `pnpm cli status`.
2. If you have no sites, run `pnpm cli scan north`.
3. Run `pnpm cli build-miner` when you have enough ore.
4. Run `pnpm cli sector` to find a site id.
5. Run `pnpm cli assign-miner <minerId> <siteId>` when energy capacity is available.
6. Check `pnpm cli log` to see what happened.
