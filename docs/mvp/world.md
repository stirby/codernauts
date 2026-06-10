# World model

The world is a static, discrete 2D grid of nodes. Each node contains multiple sites. Keep it boring and easy to explain.

## Grid

Use integer coordinates:

```text
x increases to the east
y increases to the south
```

The home node is at the origin:

```text
{x: 0, y: 0}
```

## Directions

Directions are cardinal directions only:

| Direction | Delta |
| --- | --- |
| `north` | `{x: 0, y: -1}` |
| `east` | `{x: 1, y: 0}` |
| `south` | `{x: 0, y: 1}` |
| `west` | `{x: -1, y: 0}` |

Do not include `coreward`, `rimward`, `spinward`, or `trailing` in docs, APIs, clients, or UI.

## Nodes and sites

A node is a location on the grid: an asteroid field or planet. A site is a deposit inside a node that exactly one miner can work.

A node has:

- Stable ID such as `node_east_1`.
- Name.
- Kind: `asteroid_field` at distance 1, `planet` at distance 2 and beyond (flavor only).
- Trait: `metallic`, `frozen`, `volatile`, or `crystalline`.
- Coordinates and distance from home.
- Claim state: `claimed_by` once claimed, `claim_cost` while unclaimed.
- Exactly three sites once discovered.

A site has:

- Stable ID such as `site_east_1_a`.
- Name such as `Bleak Slush Pit A`.
- Kind `deposit`.
- Resource: `ore`, `ice`, `gas`, or `crystal`.
- Richness and base rate per second.
- Optional assigned miner ID.
- Depleted flag, reserved for later behavior.

## Codernaut home

The codernaut has a fixed location at the home node. There is no movement in this phase.

The home node `node_home` (`Vesta-41`, planet, metallic, origin, distance 0) is pre-claimed and discovered at server start with three sites:

| Site | Resource | Base rate | Richness |
| --- | --- | --- | --- |
| Anchor Rock | ore | 1.0 | 2 |
| Basalt Shelf | ore | 0.75 | 1 |
| Permafrost Pocket | ice | 0.5 | 1 |

The starter miner is assigned to Anchor Rock.

## Discovery

The player discovers nodes by scanning. Each scan in a direction reveals the next undiscovered node in that direction; the server tracks a per-direction next distance starting at 1. Node coordinates by direction: north `(0,-d)`, east `(d,0)`, south `(0,d)`, west `(-d,0)`.

Generation is deterministic with no RNG, so tests and debugging stay reproducible.

### Traits

Trait is a deterministic function of direction and distance:

| Distance | north | east | south | west |
| --- | --- | --- | --- | --- |
| 1 | metallic | frozen | metallic | frozen |
| 2 | frozen | volatile | volatile | metallic |
| 3 | volatile | crystalline | crystalline | volatile |
| 4+ | crystalline when `(d + dirIndex)` is even, else volatile (dirIndex: north 0, east 1, south 2, west 3) | | | |

Trait determines the primary resource P and the secondary resource S:

| Trait | Primary | Secondary |
| --- | --- | --- |
| metallic | ore | ice |
| frozen | ice | ore |
| volatile | gas | ore |
| crystalline | crystal | gas |

### Sites per node

Each discovered node has exactly three sites: one rich primary, one normal primary, one normal secondary.

| Site | Base rate | Richness |
| --- | --- | --- |
| rich primary (`_a`) | `0.5 + 0.5 * d` | `d + 1` |
| normal primary (`_b`) | `0.25 + 0.25 * d` | `max(1, d)` |
| normal secondary (`_c`) | `0.25 + 0.25 * d` | `max(1, d)` |

Distance makes nodes richer, which makes deeper claims worth their rising cost. Demand leads supply: the player sees the next ring before they can afford it.

### Names

Node names cycle deterministic per-trait lists in order of discovery, appending roman numerals (` II`, ` III`) on reuse:

- metallic: Rustbelt, Slagfield, Ironmaw, Hematite Shelf
- frozen: Bleak Slush, Permafrost Bank, Glacier's Spite, Rime Hollow
- volatile: Belcher's Pocket, Fumarole Drift, Wheeze Vent, Sulfur Gully
- crystalline: Glitterbed, Prism Hollow, Gaudy Reach, Chandelier Field

Site names are `<node name> Pit A`, `Pit B`, and `Pit C`. Site IDs are `site_<direction>_<distance>_<a|b|c>`.

## Claiming

A discovered node must be claimed before miners can be assigned to its sites. Claim cost scales with distance:

| Distance | ore | ice | gas |
| --- | --- | --- | --- |
| 1 | 150 | 0 | 0 |
| 2 | 600 | 100 | 0 |
| 3 | 1350 | 400 | 75 |
| 4 | 2400 | 900 | 300 |
| d | `150 * d * d` | `100 * (d-1) * (d-1)` when `d >= 2` | `75 * (d-2) * (d-2)` when `d >= 3` |

## Explicit non-goals

- No galaxy rotation.
- No galactic core or rim.
- No shared galaxy map.
- No wrapping map edges.
- No multiplayer occupancy rules.
- No codernaut movement or pathfinding.
