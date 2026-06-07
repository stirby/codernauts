# Core loop

## Core loop summary

```text
Inspect API state -> modify client code -> submit action -> observe result -> automate repeat behavior -> unlock a small new capability
```

The loop should make players think, "I can write a better tool for this." That is more important than having a polished UI.

## True MVP loop

1. Player launches the Codernauts template.
2. Template provides API URL, API token, starter CLI, examples, and docs.
3. Player runs `codernauts status` or calls `GET /v1/status`.
4. Server returns outpost state, resources, upgrades, and active actions.
5. Player starts a simple action, such as scan or extract.
6. Player polls `GET /v1/actions` or reruns status.
7. Player spends ore on one upgrade.
8. Player edits the starter client to automate the same loop.

## First five minutes

The first five minutes should prove the product direction.

```text
$ codernauts status
Outpost: Vesta-41
Ore: 120 / 500
Ore rate: +1.0/sec
Scanner: Level 0
Active actions: none

Suggested next calls:
  codernauts upgrade extractor
  codernauts scan north
```

Then the player opens the starter client and sees readable code:

```text
examples/basic-bot.ts
src/client.ts
openapi/codernauts.yaml
```

## First hour

A successful first hour looks like this:

- Player understands the API token and base URL.
- Player calls status from CLI or curl.
- Player starts a scan.
- Player upgrades the extractor.
- Player edits one file in the starter client.
- Player has an idea for a custom tool.

## What should be fun before multiplayer exists

- Seeing game state as clean JSON.
- Writing a script that makes a good decision.
- Watching a bot loop improve the outpost.
- Discovering a new tile or signal through the API.
- Replacing the starter CLI with something personal.

## Failure cases to avoid

- The starter template hides the API behind too much framework code.
- The API is undocumented or inconsistent.
- Actions require manual UI interaction.
- The optimal bot is trivial after one minute.
- The player has no reason to edit code.
- Rate limits or timers make experimentation feel broken.
