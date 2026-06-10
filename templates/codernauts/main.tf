terraform {
  required_providers {
    coder = {
      source = "coder/coder"
    }
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

provider "coder" {}
provider "docker" {}

data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

data "coder_parameter" "repo_url" {
  name         = "repo_url"
  display_name = "Game repository"
  description  = "Git URL the workspace clones the game from."
  type         = "string"
  default      = "https://github.com/stirby/codernauts"
  mutable      = true
  order        = 1
}

data "coder_parameter" "branch" {
  name         = "branch"
  display_name = "Branch"
  description  = "Branch to check out and run."
  type         = "string"
  default      = "feat/phase2-gravel"
  mutable      = true
  order        = 2
}

data "coder_parameter" "time_scale" {
  name         = "time_scale"
  display_name = "Game clock speed"
  description  = "Multiplier for the game clock. Faster speeds compress scans, resource accrual, and the gravel-per-hour window for quick playtests. Restart the workspace to apply; the world resets."
  type         = "number"
  default      = 1
  mutable      = true
  order        = 3

  option {
    name  = "1x (normal)"
    value = 1
  }
  option {
    name  = "2x"
    value = 2
  }
  option {
    name  = "5x"
    value = 5
  }
  option {
    name  = "10x"
    value = 10
  }
}

locals {
  repo_dir = "/home/coder/codernauts"
}

resource "coder_agent" "main" {
  os   = "linux"
  arch = "amd64"

  env = {
    CODERNAUTS_API_URL   = "http://127.0.0.1:8035"
    CODERNAUTS_API_TOKEN = "dev-token"
  }

  startup_script = <<-EOT
    #!/usr/bin/env bash
    set -euo pipefail

    REPO_URL='${data.coder_parameter.repo_url.value}'
    BRANCH='${data.coder_parameter.branch.value}'
    TIME_SCALE='${data.coder_parameter.time_scale.value}'
    REPO_DIR='${local.repo_dir}'

    if [ ! -d "$${REPO_DIR}/.git" ]; then
      git clone --branch "$${BRANCH}" "$${REPO_URL}" "$${REPO_DIR}"
    else
      git -C "$${REPO_DIR}" fetch origin "$${BRANCH}"
      git -C "$${REPO_DIR}" checkout "$${BRANCH}"
      git -C "$${REPO_DIR}" pull --ff-only origin "$${BRANCH}"
    fi

    cd "$${REPO_DIR}"
    go build -o /tmp/codernauts-server ./cmd/codernauts-server
    (cd client && pnpm install --frozen-lockfile)

    # Restart the game cleanly on every workspace start. The world is
    # in-memory, so each start is a fresh season at the selected speed.
    pkill -f '/tmp/codernauts-server' || true
    pkill -f 'vite --port 5197' || true
    sleep 1

    CODERNAUTS_TIME_SCALE="$${TIME_SCALE}" nohup /tmp/codernauts-server \
      -addr 127.0.0.1:8035 \
      -openapi "$${REPO_DIR}/openapi/codernauts.yaml" \
      > /tmp/codernauts-server.log 2>&1 &

    cd "$${REPO_DIR}/client"
    CODERNAUTS_API_URL=http://127.0.0.1:8035 nohup pnpm exec vite --port 5197 --host 0.0.0.0 \
      > /tmp/codernauts-web.log 2>&1 &
  EOT

  metadata {
    display_name = "Season gravel"
    key          = "gravel"
    script       = "curl -fsS -H 'Authorization: Bearer dev-token' http://127.0.0.1:8035/v1/status | jq -r '.gravel.total' || echo n/a"
    interval     = 30
    timeout      = 5
  }

  metadata {
    display_name = "Gravel per hour"
    key          = "gravel_per_hour"
    script       = "curl -fsS -H 'Authorization: Bearer dev-token' http://127.0.0.1:8035/v1/status | jq -r '.gravel.per_hour' || echo n/a"
    interval     = 30
    timeout      = 5
  }
}

# The web dashboard. Subdomain routing keeps vite's absolute asset paths and
# the /api proxy working without extra configuration.
resource "coder_app" "control_deck" {
  agent_id     = coder_agent.main.id
  slug         = "codernauts"
  display_name = "Control Deck"
  url          = "http://127.0.0.1:5197"
  icon         = "/icon/coder.svg"
  subdomain    = true
  share        = "owner"

  healthcheck {
    url       = "http://127.0.0.1:5197/"
    interval  = 10
    threshold = 30
  }
}

resource "docker_volume" "home" {
  name = "coder-${data.coder_workspace.me.id}-home"
  lifecycle {
    ignore_changes = all
  }
}

resource "docker_image" "codernauts" {
  name = "codernauts-dev:${data.coder_workspace.me.id}"
  build {
    context = "./build"
  }
  triggers = {
    dockerfile_sha1 = sha1(file("./build/Dockerfile"))
  }
}

resource "docker_container" "workspace" {
  count    = data.coder_workspace.me.start_count
  image    = docker_image.codernauts.image_id
  name     = "coder-${data.coder_workspace_owner.me.name}-${lower(data.coder_workspace.me.name)}"
  hostname = data.coder_workspace.me.name
  command  = ["sh", "-c", coder_agent.main.init_script]
  env      = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]

  host {
    host = "host.docker.internal"
    ip   = "host-gateway"
  }

  volumes {
    container_path = "/home/coder"
    volume_name    = docker_volume.home.name
    read_only      = false
  }
}
