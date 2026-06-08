# Coder template

This folder contains a Coder template for running Codernauts in a development workspace.

The template provisions a Docker workspace, clones the repository, starts the API server on port `8080`, starts the Vite web client on port `5174`, and exposes both as Coder apps.

## Apps

- `Codernauts API`: `http://localhost:8080`
- `Codernauts Web`: `http://localhost:5174`

The web client uses its same-origin `/api` proxy. The startup script sets `CODERNAUTS_API_PROXY_TARGET=http://127.0.0.1:8080` so the web app works through Coder app URLs.

## Publish

From this repository root:

```sh
coder templates push codernauts -d terraform -m "Initial Codernauts dev template"
```

If you do not want to commit a generated Terraform lockfile, use:

```sh
coder templates push codernauts -d terraform --ignore-lockfile -m "Initial Codernauts dev template"
```

The default repository URL is `https://github.com/stirby/codernauts.git`. If the repository is private, set the `repo_url` parameter to an SSH URL and make sure the workspace can authenticate to GitHub.
