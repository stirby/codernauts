# World model

## MVP world model

The MVP uses a private single-player sector. It can still be represented as a 2D grid so the future multiplayer world does not require a full rewrite.

```text
?   ?   ?
? [YOU] ?
?   ?   ?
```

The server owns the sector. The player discovers it through API actions.

## Decisions

- The map does not wrap around at edges.
- Do not use org chart, team, or coworker relationship data for placement.
- MVP sectors are private to one player.
- Multiplayer can later place players in a shared galaxy using the same coordinate model.

## MVP tile states

| State | Meaning | API visibility |
| --- | --- | --- |
| Home | Player starting outpost | Full state |
| Unknown | Not scanned | Direction and maybe signal hint |
| Scanned | Basic information known | Biome, resource hint, hazard hint |
| Resource | Useful miner site | Ore multiplier |
| Blocked | Not usable yet | Reason and required future capability |

Do not include occupied tiles in MVP. Occupied tiles are a future multiplayer concept.

## Coordinates

Use integer coordinates internally.

```text
home: x=0, y=0
north: x=0, y=-1
east: x=1, y=0
south: x=0, y=1
west: x=-1, y=0
```

The API can expose both coordinates and friendly directions.

## Generation

MVP generation should be deterministic per player and season or world seed.

Requirements:

- Every player has at least one useful tile nearby.
- No player can get stuck due to blocked neighbors.
- Biomes are flavor first, mechanics second.
- The server can regenerate expected tiles from seed if needed.

## Future multiplayer compatibility

Keep these fields even if they are empty in MVP:

- `world_id`
- `sector_id`
- `owner_player_id`
- `discovered_by_player_id`
- `visibility_level`

These allow the private sector model to evolve into shared sectors later.
