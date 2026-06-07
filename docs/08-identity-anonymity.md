# Identity and API tokens

## MVP identity goals

The MVP needs stable player identity and safe API authentication. Anonymity is mostly a future multiplayer concern.

Requirements:

- A player can delete and recreate the Coder workspace without losing server state.
- The template can call the API without asking the player to manually paste secrets into code.
- Starter tools do not leak tokens to logs or commits.
- The server can revoke or rotate tokens.

## MVP auth model

Recommended starting model:

1. Server creates a player record.
2. Server issues an API token for that player.
3. The Coder template stores the token in an environment variable or local ignored config file.
4. Starter clients read the token and call the API.

Example environment:

```text
CODERNAUTS_API_URL=https://example.internal
CODERNAUTS_API_TOKEN=cnp_...
```

## Future Coder identity integration

A later version can bind player records to Coder user ID or verified email so workspaces can be recreated safely without manual token transfer.

Gameplay requirement:

```text
same employee + new workspace = same active player record
```

## Public identity

MVP has no public leaderboard, so anonymous names are not required for gameplay. Still, the server can assign a display name early so future multiplayer has a path.

Example:

```text
Astronaut Finch-12
```

## Token safety checklist

- [ ] `.env` files are ignored by git.
- [ ] Starter clients read tokens from environment or local config.
- [ ] Logs redact tokens.
- [ ] API errors never echo secrets.
- [ ] Docs warn players not to commit tokens.
- [ ] Token rotation exists before broader playtests.
