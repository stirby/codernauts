# The true MVP

## MVP statement

Codernauts MVP is a central API server plus a Coder starter template that lets one programmer automate one private space outpost.

That is it.

## MVP player experience

A player should be able to:

1. Launch the Codernauts template.
2. Run one command to see game state.
3. Read the API docs.
4. Start a scan or extract action.
5. Poll for completion.
6. Buy a simple upgrade.
7. Edit the starter client.
8. Run a basic bot loop.

## MVP server features

- Bearer token auth.
- Player record.
- Private outpost.
- Ore and energy balances.
- Lazy resource accrual.
- Extractor, scanner, and storage upgrades.
- Scan and extract actions.
- Action status and resolution.
- Activity log.
- OpenAPI spec.
- Consistent JSON errors.

## MVP client/template features

- API URL and token setup.
- Starter CLI.
- curl example.
- Basic bot example.
- Editable client library.
- README tutorial.
- Secret-safe local config.

## MVP excludes

- Multiplayer.
- Shared galaxy.
- Other players on the map.
- Trade.
- Market economy.
- Credits.
- Rare resources.
- Factions.
- Combat.
- Slack reports.
- Public leaderboards.
- Seasons.
- Polished first-party UI.
- Complex progression.

## Why this is the right smallest version

This version proves the unique idea: a game for programmers where the fun is building the client.

If this is not fun with one player and one outpost, multiplayer will only hide the problem. If it is fun, multiplayer can be added as shared world state and shared API objects later.

## Success criteria

- A new player can make the first API call in under 5 minutes.
- A new player can modify starter code in under 1 hour.
- The basic bot is useful but obviously improvable.
- The API feels stable enough that players trust it.
- The server state survives workspace deletion.
- The design has clear seams for future multiplayer.
