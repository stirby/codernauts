# Codernauts

Codernauts is an API-first space automation game for programmers. Players get starter tools and build their own clients, bots, dashboards, or CLIs against a central game server.

The local prototype in this repository is playable with one server process and one TypeScript starter client. The loop is collect, expand, crush, climb: persistent miners generate uncapped resources on claimed nodes, scans reveal new nodes to claim, the crusher converts everything into gravel, and gravel is the only leaderboard score for the season. Energy is fixed assignment capacity rather than a regenerating spendable resource.

## Quickstart

Start the API server in one terminal:

```bash
./scripts/dev-server.sh
```

Run the smoke test in another terminal:

```bash
./scripts/smoke-test.sh
```

Try the starter client:

```bash
cd client
pnpm install
pnpm cli status
pnpm cli sector
pnpm cli miners
pnpm bot
```

Or open the web console:

```bash
cd client
pnpm web
```

Then visit `http://127.0.0.1:5174`. The web console connects to the same API, shows the sector map, refreshes automatically, and has controls for scans, miners, upgrades, and assignments.

The local API defaults are:

```text
CODERNAUTS_API_URL=http://localhost:8080
CODERNAUTS_API_TOKEN=dev-token
```

Useful raw API calls:

```bash
curl http://localhost:8080/v1/health
curl -H 'Authorization: Bearer dev-token' http://localhost:8080/v1/status
curl -X POST -H 'Authorization: Bearer dev-token' -H 'Content-Type: application/json' http://localhost:8080/v1/actions/scan -d '{"direction":"north"}'
```

## Development checks

```bash
go test ./...
cd client && pnpm typecheck && pnpm test && pnpm web:build
./scripts/smoke-test.sh
```

Start with [`docs/mvp/README.md`](docs/mvp/README.md) for current scope, then review [`docs/mvp/api.md`](docs/mvp/api.md), [`docs/mvp/client.md`](docs/mvp/client.md), [`docs/mvp/performance.md`](docs/mvp/performance.md), and [`openapi/codernauts.yaml`](openapi/codernauts.yaml).
