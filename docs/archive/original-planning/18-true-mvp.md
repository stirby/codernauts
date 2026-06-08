# The true MVP

## MVP statement

Codernauts MVP is a central API server plus a starter programming project that lets one programmer automate one private space outpost.

That is it.

## MVP player experience

A player should be able to:

1. Open the starter project.
2. Run one command to see game state.
3. Read the API docs and OpenAPI spec.
4. Build or upgrade a persistent miner.
5. Assign miners to known tiles.
6. Start a scan action to discover a new tile.
7. Poll for scan completion.
8. Edit the starter client.
9. Run a basic bot loop.

## MVP server features

- Bearer token auth.
- Player record.
- Private outpost.
- Private sector map.
- Ore and energy balances.
- Lazy resource accrual.
- Persistent miners that generate ore over time.
- Miner build, upgrade, and assignment.
- Scanner and storage levels.
- Scan actions.
- Action status and resolution.
- Activity log.
- OpenAPI spec.
- Consistent JSON errors.

## MVP client and starter project features

- API URL and token setup.
- OpenAPI spec included locally.
- Starter CLI.
- curl example.
- Basic bot example.
- Editable client library.
- README tutorial.
- Secret-safe local config.

## MVP excludes

- Manual repeated mine or extract loop.
- platform-themed gameplay objects.
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

The first loop should be educational and API-first. Players learn to authenticate, fetch state, start asynchronous work, handle idempotency, and automate resource decisions. Persistent miners make automation strategic because bots decide what to build, upgrade, and assign instead of clicking the same extract endpoint forever.

If this is not fun with one player and one outpost, multiplayer will only hide the problem. If it is fun, multiplayer can be added as shared world state and shared API objects later.

## Success criteria

- A new player can make the first API call in under 5 minutes.
- A new player can modify starter code in under 1 hour.
- The basic bot is useful but obviously improvable.
- The API feels stable enough that players trust it.
- Resource production continues through server-side state, not through manual extract clicks.
- The server state survives starter project deletion.
- The design has clear seams for future multiplayer.
