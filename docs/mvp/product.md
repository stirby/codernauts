# Product scope

Codernauts is a programming game where the main activity is building software around a game API. The player is a codernaut operating a space outpost that crushes everything it mines into gravel.

## Product goal

Make the playable version easy to understand, script, and extend. The game should teach the player that the API is the game surface, then give them one number to fight over.

## Primary output of play

Leaderboard position is the primary output of play. Everything the player does (mining, scanning, claiming, upgrading, converting) exists to raise season gravel and rank on the gravelboard. The cumulative total decides the winner; gravel per hour decides the trash talk. Both are always visible.

## Player fantasy

You run an outpost in a quiet patch of space. The galaxy is full of exotic materials, and your civilization has decided the optimal end state for all of them is gravel. Your tools discover and claim nodes, assign miners, upgrade the crusher, and convert harvest into score before the season ends.

The game should feel space-themed, not Coder-themed. Coder is the place where the starter project runs, not the fictional world.

## Audience

The game is for programmers who enjoy:

- Reading an API contract.
- Running CLI commands.
- Writing small scripts and bots.
- Seeing automation create visible progress.
- Competing on a leaderboard with code.

## Design pillars

- **API first**: Every meaningful action must be available through HTTP.
- **Simple mental model**: A grid of claimable nodes, persistent miners, one score.
- **Stable starter kit**: The starter client should be boring, readable, and reliable.
- **Automation over clicking**: Players should automate decisions, not repeat manual resource collection.
- **Ruthless but legible competition**: One number ranks players, and the rules that produce it stay simple. See [scaling.md](scaling.md).
- **Performance by default**: The server should stay cheap to run as player count grows.

## Non-goals

- Do not build a traditional browser idle game as the primary interface.
- Do not make workspace metrics part of the fiction or economy.
- Do not add a galactic navigation model.
- Do not add multiplayer interaction until the single-player gravel loop is clearly fun.
- Do not optimize for visual spectacle before the API loop is understandable.
