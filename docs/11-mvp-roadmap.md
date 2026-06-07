# MVP roadmap

## Scope strategy

Build the smallest API-first game that proves programmers want to build clients around it.

The MVP is not multiplayer. It is not a polished web game. It is a central API plus a Coder template that makes players productive quickly.

## Phase 0: Planning and repo setup

Deliverables:

- API-first direction documented.
- True MVP scope agreed.
- Stack chosen.
- Repo and local development flow ready.
- First Coder template plan drafted.

Exit criteria:

- We know the server stack.
- We know the starter client language or languages.
- We know how API tokens are issued for prototype players.

## Phase 1: Central API skeleton

Features:

- Health endpoint.
- Player token auth.
- Player record creation.
- OpenAPI spec.
- Consistent JSON error format.
- Basic request logging.

Exit criteria:

- A player can authenticate and call `GET /v1/status`.

## Phase 2: Single-player game state

Features:

- Private outpost.
- Ore and energy balances.
- Lazy resource accrual.
- Extractor, scanner, and storage levels.
- Activity log.

Exit criteria:

- A player can leave, return, and see deterministic resource updates.

## Phase 3: API actions

Features:

- Scan action.
- Extract action.
- Upgrade action.
- Action IDs and statuses.
- Idempotency keys for action creation.
- Lazy action resolution on API reads.

Exit criteria:

- A simple script can run status, start an action, poll completion, and upgrade.

## Phase 4: Player template and starter kit

Features:

- Coder template with API URL and token setup.
- Starter CLI.
- Example bot.
- curl examples.
- OpenAPI file.
- README tutorial.
- Ignored local config for secrets.

Exit criteria:

- A new player can make their first API call in under five minutes.
- A new player can modify a sample client in under one hour.

## Phase 5: Single-player playtest

Playtest questions:

- Is the API understandable?
- Is the starter template useful without hiding the game?
- Does the first automation loop feel fun?
- What client do players naturally want to build next?

## Explicitly out of MVP

- Multiplayer.
- Trading.
- Economy or market systems.
- Factions.
- Combat.
- Slack reports.
- Public leaderboards.
- Seasons.
- Complex progression trees.
- Polished first-party UI.
