# Additional gameplay ideas

These are optional ideas after the API-first MVP works.

## Programming-game ideas

### Client showcases

Players can submit or demo tools they built:

- Terminal dashboards.
- Web dashboards.
- Bots.
- Alerting scripts.
- Strategy simulators.

### Bot challenges

Future events can score automation quality:

- Lowest API calls per upgrade.
- Best ore per energy spent.
- Fastest sector scan.
- Most reliable bot over 24 hours.

### Contracts

Contracts can add goals without multiplayer complexity.

```text
Contract: Survey three metallic tiles.
Reward: Scanner calibration upgrade.
```

### Event stream

A future API could add server-sent events or webhooks so clients react without polling.

```text
GET /v1/events/stream
POST /v1/webhooks
```

## Platform-adjacent ideas

Keep MVP gameplay objects plain. Later docs can mention development environments as onboarding surfaces, but game mechanics should not reward real resource consumption.

Good flavor:

- Starter kits.
- Client examples.
- Player labs.

Bad incentives:

- Scoring CPU usage.
- Scoring uptime.
- Scoring memory usage.
- Scoring infrastructure spend.

## Future multiplayer ideas

- Shared sectors.
- Anonymous leaderboards.
- Public contracts.
- Trade APIs.
- Faction APIs.
- Limited raids.

Do not pull these into MVP until the single-player API loop has playtest evidence.
