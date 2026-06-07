# Future multiplayer systems

## Status

Multiplayer is not MVP scope. This file is future direction only.

The MVP should prove that a single programmer can build useful clients against the API. Multiplayer comes after the API, action model, resource model, and starter template are fun on their own.

## Future multiplayer order

Recommended order after MVP:

1. Shared read-only world events.
2. Anonymous leaderboard for API achievements.
3. Shared sectors with occupied tile discovery.
4. Structured trade or contracts.
5. Factions.
6. Conflict or raids, only if the culture and balance support it.

## Future shared world

The private sector model should evolve into a shared galaxy by changing visibility and ownership rules, not by replacing the whole data model.

Future occupied tile response:

```json
{
  "tile_id": "tile_12_8",
  "state": "occupied",
  "owner": "unknown_astronaut",
  "public_name": null
}
```

## Future trade

Trade is deferred. If added, it should be structured and API-friendly.

Possible future flow:

```text
POST /v1/trade/offers
GET  /v1/trade/offers
POST /v1/trade/offers/{id}/accept
```

Do not design MVP resources around future trade.

## Future conflict

Conflict is deferred even further. If added, start with low-punishment raids and strong cooldowns. Do not allow permanent deletion or planet capture until the game has proven trust and balance.
