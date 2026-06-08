# Client and starter project

The starter project is the onboarding surface for programmers. It should show how to call the API without becoming the main game.

## Client surfaces

The MVP starter client includes:

- Reusable TypeScript API wrapper.
- CLI commands for common actions.
- A small example bot.
- A simple web dashboard for onboarding and debugging.
- Tests for client behavior and helper logic.

## CLI commands

Required commands:

```text
status
sector
miners
scan [direction]
build-miner
upgrade-miner <minerId>
assign-miner <minerId> <siteId>
actions
action <actionId>
log
raw <method> <path>
bot
```

`scan` should default to a cardinal direction. The CLI should not mention non-MVP direction names.

## Web dashboard

The web dashboard is a teaching and debugging aid. It should make the current game state obvious.

It should show:

- API connection settings.
- Player and outpost.
- Current ore, ore rate, and energy capacity.
- A 2D grid map.
- Discovered asteroid sites.
- Active scans with countdowns.
- Miners, levels, rates, and assignments.
- Build, upgrade, scan, and assign controls.
- Recent log entries.

The dashboard should not introduce future-scope concepts. It should not mention galaxy rotation or galactic directions.

## Browser behavior

When served through a Coder forwarded port, the dashboard should use a same-origin API proxy such as `/api`. It should not default to `127.0.0.1` from the browser unless the page itself is running on loopback.

## Bot behavior

The example bot is intentionally simple. It should choose one safe action:

1. Assign idle miners if a useful unassigned site exists and energy capacity is available.
2. Build a miner if ore allows it.
3. Upgrade a miner if ore allows it.
4. Start a scan if no scan is active.

The bot is a teaching example, not an optimal strategy engine.

## Stability expectations

- The client should tolerate missing optional fields.
- The client should handle both direct API URLs and same-origin proxy URLs.
- The client should refresh after mutations.
- The client should avoid duplicate scans when one is already active.
- The client should keep polling gentle.
- The client should show useful errors without exposing tokens.
