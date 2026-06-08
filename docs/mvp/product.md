# Product scope

Codernauts is a programming game where the main activity is building software around a game API. The player is a programmer-astronaut operating a small space outpost.

## Product goal

Make the first playable version easy to understand, script, and extend. The MVP should teach the player that the API is the game surface.

## Player fantasy

You run a small outpost in a quiet patch of space. Your tools discover asteroid sites, build miners, assign them to work, and read logs from the server.

The game should feel space-themed, not Coder-themed. Coder is the place where the starter project runs, not the fictional world.

## Audience

The MVP is for programmers who enjoy:

- Reading an API contract.
- Running CLI commands.
- Writing small scripts and bots.
- Seeing automation create visible progress.

## Design pillars

- **API first**: Every meaningful action must be available through HTTP.
- **Simple mental model**: Use a static 2D grid, persistent miners, and a small resource loop.
- **Stable starter kit**: The starter client should be boring, readable, and reliable.
- **Automation over clicking**: Players should automate decisions, not repeat manual resource collection.
- **Performance by default**: The server should stay cheap to run as player count grows.

## Non-goals

- Do not build a traditional browser idle game as the primary interface.
- Do not make workspace metrics part of the fiction or economy.
- Do not add a galactic navigation model for MVP.
- Do not add multiplayer systems until the single-player API loop is clearly fun.
- Do not optimize for visual spectacle before the API loop is understandable.
