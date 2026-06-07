# API and client interface

## Interface recommendation

The primary interface is the HTTP API. The template should include starter tools, but those tools are examples and scaffolding, not the finished product.

## MVP surfaces

| Surface | Role |
| --- | --- |
| HTTP API | Authoritative game interface |
| OpenAPI spec | Contract players and generated clients use |
| Starter CLI | First successful interaction |
| Example bot | First automation loop |
| Minimal sample dashboard | Optional reference client, not MVP-critical |

## Starter CLI commands

```bash
codernauts status
codernauts actions
codernauts scan north
codernauts extract
codernauts upgrade extractor
codernauts log
```

## API examples

```bash
curl -H "Authorization: Bearer $CODERNAUTS_API_TOKEN"   "$CODERNAUTS_API_URL/v1/status"
```

## Client design principles

- Keep the generated or starter client readable.
- Make every request easy to inspect.
- Prefer boring JSON over clever abstractions.
- Include retries only where the server supports idempotency.
- Keep sample bots small enough to edit in one sitting.

## Optional web UI

A slim web UI can exist as a sample client later. It should not define the game. If a web UI is included early, it should be explicitly framed as example code players can fork.

## Onboarding flow

First visit to the workspace:

1. Template shows API URL and docs path.
2. Player runs `codernauts status`.
3. Player runs an example script.
4. Player edits the script.
5. Player builds their own tool.
