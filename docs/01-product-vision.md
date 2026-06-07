# Product vision

## One-line pitch

Codernauts is an API-first space automation game for programmers. Players provision a Coder workspace, receive starter tooling, and build their own clients and bots against a central game server API.

## Player fantasy

You are a programmer-astronaut dropped onto a small outpost. The game is not about clicking the best button in our UI. The game is about reading the API, writing code, and building tools that make your outpost smarter.

Example first-run copy:

```text
Provisioning Codernauts starter workspace...
API token installed.
Starter client generated.
Outpost assigned: Vesta-41.

Try:
  codernauts status
  codernauts scan north
  codernauts run examples/basic-bot.ts
```

## Design pillars

1. **API first**
   - The central game server exposes the primary game surface.
   - Every meaningful action is available through documented endpoints.
   - The server owns authoritative state.

2. **Build your own client**
   - Players can use the starter CLI, but the real fun is editing it or replacing it.
   - A player might build a terminal dashboard, web UI, cron bot, Slack bot, or agent.
   - The template should make the first API call easy and the second tool idea obvious.

3. **Single-player first, multiplayer-ready later**
   - MVP players get private outpost state and a private sector.
   - Data models should include player IDs and world IDs so shared state can arrive later.
   - No MVP feature should require simultaneous players.

4. **Small programmable loop**
   - Read state.
   - Decide in code.
   - Submit an action.
   - Poll or wait.
   - Improve the tool.

5. **Coder flavor, lightly**
   - Use workspace and developer infrastructure language for charm.
   - Do not make every mechanic a Coder product metaphor.
   - The game should still make sense to a programmer who only knows APIs.

## Audience

Primary audience:

- Programmers who enjoy APIs, automation, and coding games.
- Coder employees or users who can launch a prepared template.
- Players who want to vibe-code their own client rather than use a finished UI.

Secondary audience:

- People who want to inspect or fork other clients later.
- People who will join future multiplayer seasons after the single-player loop works.

## Non-goals for MVP

- No polished first-party game UI.
- No multiplayer interactions.
- No shared map competition.
- No trading, market, or economy systems beyond simple resources.
- No factions.
- No combat.
- No Slack leaderboard.
- No deep upgrade tree.
- No dependency on real workspace resource usage.

## Working name

Codernauts is the working name for the repository, docs, template, and future bot identity.

## Coder flavor guidelines

Use terms like workspace, template, agent, and outpost when they make copy better. Avoid forcing product metaphors into every mechanic.

Examples that fit:

| Game concept | Light Coder flavor |
| --- | --- |
| Player starter environment | Coder workspace |
| Onboarding package | Template |
| Mining helper | Agent |
| Base | Outpost |
| Generated starter code | Client kit |

Examples to avoid in MVP:

- Real CPU as production.
- Real uptime as score.
- Real workspace size as an advantage.
- Org chart data as game placement.
