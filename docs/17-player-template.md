# Player template

## Template goal

The Coder template is the player's starter lab. It should make the first API call easy, then invite the player to edit or replace the client.

## MVP template contents

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
CODERNAUTS_API_URL=https://codernauts.example.internal
CODERNAUTS_API_TOKEN=cnp_...
```

`.env` must be ignored by git.

## Starter commands

```bash
pnpm install
pnpm codernauts status
pnpm codernauts scan north
pnpm codernauts upgrade extractor
pnpm bot
```

If using another language, keep the same conceptual commands.

## Starter bot behavior

The first bot should be intentionally simple:

1. Fetch status.
2. If enough ore, upgrade extractor.
3. If no action is active and enough energy exists, start scan or extract.
4. Sleep for a documented interval.
5. Repeat.

It should be easy to improve.

## Template README should teach

- What the API URL is.
- Where the token is stored.
- How to run the CLI.
- How to inspect the raw API.
- How to edit the client.
- How to avoid committing secrets.

## Future template additions

- Generated SDKs.
- Python example.
- Go example.
- Sample web dashboard.
- Tests for player bots.
- Local simulator for strategy testing.
