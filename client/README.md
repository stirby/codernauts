# Codernauts TypeScript client starter

This folder is a small starter kit for exploring the Codernauts API. It is written for beginners and uses space automation words like miners, nodes, sites, scans, gravel, and logs.

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

## The gravel loop

1. Collect: assigned miners generate ore, ice, gas, and crystal on their own.
2. Expand: scan for new nodes, then claim them to open their mining sites.
3. Crush: convert spare resources into gravel at the outpost crusher.
4. Climb: the season gravelboard ranks codernauts by total gravel.

## Web console

The web console is the friendliest way to see the local game state. It shows the gravelboard, resources, the crusher, the node map with your location, miners, assignments, scans, and recent log entries. It refreshes automatically.

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
pnpm cli leaderboard
pnpm cli conversions
pnpm cli convert ore 100
pnpm cli claim node_east_1
pnpm cli nodes
pnpm cli miners
pnpm cli sector
pnpm cli scan north
pnpm cli build-miner
pnpm cli upgrade-miner <minerId>
pnpm cli upgrade-crusher
pnpm cli assign-miner <minerId> <siteId>
pnpm cli actions
pnpm cli action <actionId>
pnpm cli log
pnpm cli raw GET /v1/health
pnpm bot
```

### What the commands do

- `status`: shows your codernaut, location, gravel, crusher, resources, and active actions.
- `leaderboard`: prints the season gravelboard with rank, gravel, and gravel per hour.
- `conversions`: lists gravel rates per resource and which ones the crusher accepts.
- `convert <resource> [amount]`: crushes a resource into gravel; omit the amount to crush everything.
- `claim <nodeId>`: claims a discovered node so miners can work its sites.
- `nodes`: lists discovered nodes with traits, distances, claim costs, and sites.
- `miners`: lists your mining drones, their resources, and assigned sites.
- `sector`: lists discovered nodes and their sites in your current sector.
- `scan [direction]`: charts the next node in a direction; farther scans take longer.
- `build-miner`: builds a persistent mining drone.
- `upgrade-miner <minerId>`: upgrades one mining drone and increases energy capacity.
- `upgrade-crusher`: upgrades the crusher for better gravel yield and new resources.
- `assign-miner <minerId> <siteId>`: sends a miner to a site on a claimed node if energy capacity is available.
- `actions`: lists scan actions.
- `action <actionId>`: prints one scan action.
- `log`: prints recent captain's log entries.
- `raw <method> <path>`: makes a direct API call when you want to experiment.
- `bot`: runs a simple one-step helper that chooses a beginner action.

## Examples

Scan for nodes with an idempotency key so retrying is safe:

```sh
pnpm cli scan north --idempotency-key first-scan
```

Claim a discovered node and assign a miner to one of its sites:

```sh
pnpm cli claim node_east_1
pnpm cli assign-miner miner_123 site_east_1_a
```

Crush spare ore into gravel:

```sh
pnpm cli convert ore
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
src/client.ts        reusable API client
src/config.ts        environment defaults
src/cli.ts           command-line interface
src/format.ts        CLI output formatting
src/bot.ts           simple beginner bot runner
src/bot-helpers.ts   pure bot decision logic
src/web/             Vite and React web console
test/                small tests for safe client behavior
```

## Development checks

```sh
pnpm test
pnpm typecheck
pnpm web:build
```

## Notes for new codernauts

Persistent miners generate resources over time after they are assigned to sites on claimed nodes. Assigned miners reserve energy capacity. Gravel is cumulative and never spent, so crush freely once your next purchase is covered. A good early loop is:

1. Run `pnpm cli status`.
2. If you have idle miners, run `pnpm cli nodes` to find open sites on claimed nodes.
3. Run `pnpm cli build-miner` when you have enough ore.
4. Run `pnpm cli scan north` and claim what you find.
5. Run `pnpm cli convert ore` once your next purchase is covered.
6. Check `pnpm cli leaderboard` to watch your gravel climb.
