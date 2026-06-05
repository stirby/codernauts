# Product vision

## One-line pitch

Workspace Frontier is an asynchronous multiplayer idle strategy game where each Coder employee provisions into a hidden planet, grows an outpost, scouts a shared galaxy, expands, and competes on anonymous daily leaderboards.

## Player fantasy

You are an astronaut provisioned into a random planet inside a corporate galaxy. Your workspace is your outpost. The game feels like infrastructure turned into a tiny sci-fi economy.

Example first-run copy:

```text
Provisioning colony...
Applying terraform...
Workspace initialized.
Planet assigned: Vesta-41.
Agent online.
Mining process started.

Welcome, Astronaut Finch-12.
```

## Design pillars

1. **Async by default**
   - No one needs to be online at the same time.
   - Idle production continues while players are away.
   - Long actions resolve on timers.

2. **Slim interface**
   - The game should be playable in a Coder app panel or terminal.
   - No rich graphics are required for Season 0.
   - Text, numbers, buttons, and small map summaries carry the experience.

3. **Mystery without workplace weirdness**
   - Players are anonymous to each other by default.
   - Discovery reveals nearby game state, not real-world identity.
   - Optional reveal can be added later for trusted alliances.

4. **Corporate meta-game**
   - Daily Slack reports make the game feel alive.
   - Names, upgrades, and events use Coder and developer infrastructure flavor.
   - Short seasons reduce pressure and make balance mistakes recoverable.

5. **Low punishment**
   - The first playable version should not include destructive conflict.
   - Future conflict should sting but not erase progress.
   - Catch-up mechanics should prevent hopeless snowballs.

## Audience

Primary audience:

- Coder employees who can create a workspace from an internal template.
- People who enjoy checking a small game during the workday.
- Both terminal-friendly and non-terminal players.

Secondary audience:

- People who mainly follow the Slack leaderboard and jump in when it looks fun.
- People who join later in a season and need a viable path to relevance.

## Non-goals for early versions

- No full graphical space map in Season 0.
- No real-time multiplayer.
- No permanent death or irreversible loss.
- No planet capture from other players in MVP.
- No complex combat in MVP.
- No player-to-player chat system in MVP.
- No requirement that every workspace stores game state locally.

## Working title options

Recommended:

1. **Workspace Frontier**
2. **Coder Colonies**
3. **Planetfall**

Other options from the original plan:

- Terraform Galaxy
- Idle Orbit
- The Grid
- Provisioned Worlds
- Astronauts of Coder

[REVIEW] Choose a working title before creating a repository, template, and Slack bot identity. The docs use Workspace Frontier as the default.

## Coder flavor vocabulary

| Game concept | Coder-flavored term |
| --- | --- |
| Home base | Workspace Outpost |
| Starting planet | Provisioned World |
| Expansion | Terraforming |
| Mining drones | Agents |
| Trade route | Port Route |
| Storage | Persistent Volume |
| Scanner | Port Forwarding Array |
| Research network | AI Gateway |
| Rare artifact | Secret |
| Colonization ship | Dev Container |
| Faction | Organization |

[REVIEW] Decide how heavily to lean into Coder product terms. Too much internal jargon may be funny for employees but confusing for future reuse.
