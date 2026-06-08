# Starter project

## Template goal

The starter project is a small programming project for learning the API. It should make the first request easy, then invite the player to edit or replace the client.

Avoid relying on platform-specific vocabulary in the player-facing README. Explain only the pieces a programmer needs: API URL, token, OpenAPI spec, commands, and where to edit code.

## MVP starter project contents

```text
codernauts-starter/
  README.md
  .gitignore
  .env.example
  openapi/
    codernauts.yaml
  examples/
    curl.sh
    basic-bot.ts
  src/
    client.ts
    cli.ts
  package.json
```

[REVIEW] Starter language is still open. TypeScript is a strong default for a quick editable client. Python is also reasonable for automation.

## Environment variables

```text
CODERNAUTS_API_URL=https://api.codernauts.example
CODERNAUTS_API_TOKEN=cnp_...
```

`.env` must be ignored by git.

## Starter commands

```bash
pnpm install
pnpm cli status
pnpm cli sector
pnpm cli miners
pnpm cli build-miner
pnpm cli upgrade-miner min_starter
pnpm cli assign-miner min_002 site_ast_001
pnpm cli scan rimward
pnpm cli log
pnpm bot
```

If using another language, keep the same conceptual commands.

## Starter bot behavior

The first bot should be intentionally simple:

1. Fetch status.
2. Fetch known sector tiles.
3. If there is no scan in progress and enough energy exists, scan a neighboring tile.
4. If enough ore exists, build a miner or upgrade the weakest miner.
5. Assign idle miners to the best known ore tile.
6. Sleep for a documented interval.
7. Repeat.

The bot should not run a manual extract loop. Ore should grow because miners keep running between API calls.

It should be useful but easy to improve.

## Template README should teach

- What the API URL is.
- Where the token is stored.
- How to run the CLI.
- How to inspect the raw API.
- How resources accrue over time.
- How miners produce ore while assigned to known tiles.
- How to edit the client.
- How to avoid committing secrets.

## Future starter project additions

- Generated SDKs.
- Python example.
- Go example.
- Sample web dashboard.
- Tests for player bots.
- Local simulator for strategy testing.
