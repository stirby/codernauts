# Interface

## Interface recommendation

Build the slim web UI first, then add a CLI wrapper if there is interest.

Reasoning:

- Web UI has lower adoption friction.
- It can still feel text-first and lightweight.
- Coder apps make a tiny web service easy to expose.
- CLI can reuse the same API later.

[REVIEW] Confirm whether the first client must support terminal-only users. Recommendation: web first, API designed so CLI can follow.

## Slim web UI layout

Single page, no heavy graphics:

```text
Codernauts
Astronaut Finch-12 | Season 0 Day 1 | Planet Vesta-41

Resources
Ore:      12,430       +4.2/sec
Energy:   1,200/1,500 +0.8/sec
Research: 340         +0.1/sec

Production
Mining:     Mine III, +4.2 ore/sec
Energy:     Solar Array II, +0.8 energy/sec
Research:   Lab I, +0.1 research/sec
Storage:    Depot II

Recommended Next Action
Scout EAST, cost 250 energy, duration 30 minutes

Actions
[Upgrade Mine] [Build Solar Array] [Build Lab]
[Scout North] [Scout East] [Scout South] [Scout West]
[Claim Available Planet]

Visible Space
NORTH: Unknown
EAST: Uninhabited desert planet, copper-rich
SOUTH: Occupied by Unknown Astronaut
WEST: Blocked anomaly

Activity Log
09:35 Scout EAST started.
10:05 Scout EAST completed. Desert planet discovered.
```

## UI sections

### Header

- Game title
- Anonymous player name
- Season and day
- Current home planet or selected planet

### Resource panel

- Current balance
- Storage cap
- Production per second
- Time until storage full

### Action panel

- Upgrade buttons
- Scout buttons
- Claim button for valid targets
- Active timers
- Disabled buttons with reason text

### Map summary

Season 0 can be a list instead of a graphic grid:

```text
NORTH: Unknown
EAST: Uninhabited desert planet
SOUTH: Occupied
WEST: Frozen planet, claimable
```

Future can add a small ASCII or HTML grid.

### Leaderboard panel

- Daily rank for current player
- Top 5 anonymous players per category
- Link to full leaderboard

### Activity log

- Recent personal events
- Recent anonymized world events

## Interaction principles

- Every disabled action should say why it is disabled.
- Every purchase should show cost and effect before confirmation.
- Timed actions should show completion time.
- The page should not require constant refresh. Polling is acceptable.
- Resource numbers should be rounded in readable ways.

## CLI shape, future

Potential commands:

```bash
codernauts status
codernauts upgrade mine
codernauts scout east
codernauts claim east
codernauts leaderboard
codernauts log
```

Example status output:

```text
Planet Vesta-41

Ore:      12,430       +4.2/sec
Energy:   1,200/1,500 +0.8/sec
Research: 340         +0.1/sec

Visible:
NORTH unknown
EAST  uninhabited, copper-rich
SOUTH occupied, owner unknown
WEST  anomaly
```

## Onboarding flow

First visit:

1. Authenticate through workspace-provided identity.
2. Create or load active-season player.
3. Assign anonymous astronaut name.
4. Assign starting planet.
5. Show a short welcome panel.
6. Highlight first available upgrade.

Welcome panel:

```text
Welcome, Astronaut Finch-12.

Your outpost has landed on Vesta-41, a frozen silicate planet.
Your agents are mining ore at +1.0/sec.
Spend ore to upgrade your mine, then build enough energy production to scan nearby space.
```

## Accessibility and simplicity

- Use semantic HTML buttons and tables.
- Do not rely on color alone.
- Keep copy direct.
- Prefer server-rendered or simple client-rendered UI.
- Make the game usable from small browser panels.
