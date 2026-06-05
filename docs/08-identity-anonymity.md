# Identity and anonymity

## Identity goals

The game should let employees keep progress across workspace deletion while preserving public anonymity.

Requirements:

- A player's game account should attach to their Coder identity or email.
- Public game surfaces should use anonymous astronaut names.
- Admins should be able to map anonymous players to real identities for support and abuse prevention.
- Players should not lose progress when deleting and recreating the game workspace.

## Identity layers

### Layer 1: Public leaderboard identity

Displayed in Slack and global pages:

```text
1. Astronaut Cobalt-7      1,204,000 ore
2. Astronaut Vela-3          947,000 ore
3. Astronaut Ash-12          881,500 ore
```

No real names, emails, or team names.

### Layer 2: Local discovered identity

Displayed after discovery or interaction:

```text
Neighbor EAST: Unknown Astronaut
After stronger scan: Astronaut Vela-3
After accepted trade: Astronaut Vela-3
After optional reveal: Real identity, only if both players opt in
```

[REVIEW] Decide whether optional real-name reveal should exist at all. Recommendation: defer until after Season 0.

### Layer 3: Admin/internal identity

Stored server-side:

- Coder user ID
- Coder username or email
- Anonymous astronaut name
- Season participation records
- Audit events for sensitive actions

This mapping should not appear in normal game UI.

## Anonymous name generation

Recommended format:

```text
Astronaut Finch-12
Astronaut Cobalt-7
Astronaut Vela-3
Astronaut Umber-9
```

Properties:

- Human-readable
- Short enough for Slack
- Not chosen by players in MVP
- Unique per season or persistent across seasons, depending on decision

[REVIEW] Decide whether anonymous names are stable across seasons. Recommendation: stable within a season, rotate between seasons to preserve mystery.

## Auth source

Likely identity source:

- Coder workspace environment provides user context.
- Game client authenticates to central server with a token or Coder-provided identity.
- Server resolves identity to a stable Coder user ID or verified email.

[REVIEW] This requires architecture discussion. The key gameplay requirement is stable identity across workspaces.

## Privacy boundaries

Do:

- Use anonymous names in leaderboards.
- Store real identity only where needed.
- Make admin access explicit and auditable.
- Avoid using org chart, team, or manager data in gameplay.

Do not:

- Show real names by default.
- Leak email in client payloads.
- Put real identity in Slack reports.
- Let players choose impersonating names.
- Use workplace hierarchy as a gameplay mechanic.

## Abuse and support needs

Admins may need to answer:

- Who owns a problematic custom faction name?
- Who is exploiting a bug?
- Who needs their account reset?
- Who lost progress due to auth mismatch?

Admin mapping is justified for these cases. It should not become part of normal gameplay.

## Account continuity

If a player deletes and recreates their workspace:

1. They open the game app again.
2. Server identifies the same Coder user.
3. Server returns the same active-season player record.
4. Local client has no authoritative game state.

This implies all important state belongs on the central game server.

## Identity review checklist

- [ ] Does every public display use anonymous identity?
- [ ] Can a user recover progress from a new workspace?
- [ ] Can an admin support a user without exposing mappings broadly?
- [ ] Are custom names disabled or moderated?
- [ ] Is Slack output safe to post in company channels?
