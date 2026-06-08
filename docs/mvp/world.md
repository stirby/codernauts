# World model

The MVP world is a static, discrete 2D grid. Keep it boring and easy to explain.

## Grid

Use integer coordinates:

```text
x increases to the east
y increases to the south
```

The starting outpost is at the origin:

```text
{x: 0, y: 0}
```

Example local view:

```text
[-1,-1] [ 0,-1] [ 1,-1]
[-1, 0] [ 0, 0] [ 1, 0]
[-1, 1] [ 0, 1] [ 1, 1]
```

## Directions

MVP directions are cardinal directions only:

| Direction | Delta |
| --- | --- |
| `north` | `{x: 0, y: -1}` |
| `east` | `{x: 1, y: 0}` |
| `south` | `{x: 0, y: 1}` |
| `west` | `{x: -1, y: 0}` |

Do not include `coreward`, `rimward`, `spinward`, or `trailing` in MVP docs, APIs, clients, or UI.

## Sites

A site is a discovered point of interest on the grid. MVP site types are limited to asteroid sites that miners can work.

A site has:

- Stable ID.
- Name.
- Kind, currently `asteroid`.
- Coordinates.
- Richness.
- Base ore rate.
- Optional assigned miner ID.
- Depleted flag, reserved for later behavior.

## Discovery

The player discovers sites by scanning. The server owns discovery results. The client only asks to scan a direction and polls for the result.

MVP generation requirements:

- The starting site is always useful.
- New scans should reveal useful asteroid sites often enough to keep the loop moving.
- A player should not get stuck because all nearby tiles are unusable.
- Generation should be deterministic enough for tests and reproducible debugging.

## Explicit non-goals

- No galaxy rotation.
- No galactic core or rim.
- No shared galaxy map.
- No wrapping map edges.
- No multiplayer occupancy rules.
- No pathfinding requirement.
