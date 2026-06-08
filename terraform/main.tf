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

variable "docker_socket" {
  default     = ""
  description = "Optional Docker socket URI."
  type        = string
}

provider "docker" {
  host = var.docker_socket != "" ? var.docker_socket : null
}

locals {
  username = data.coder_workspace_owner.me.name
}

data "coder_provisioner" "me" {}
data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

data "coder_parameter" "repo_url" {
  name         = "repo_url"
  display_name = "Repository URL"
  description  = "Repository to clone into the workspace."
  type         = "string"
  default      = "https://github.com/stirby/codernauts.git"
  mutable      = true
  icon         = "/icon/git.svg"
  order        = 1
}

data "coder_parameter" "repo_branch" {
  name         = "repo_branch"
  display_name = "Repository branch"
  description  = "Leave empty to use the repository default branch."
  type         = "string"
  default      = ""
  mutable      = true
  icon         = "/icon/git.svg"
  order        = 2
}

resource "coder_agent" "main" {
  arch           = data.coder_provisioner.me.arch
  os             = "linux"
  startup_script = <<-EOT
    set -e

    if [ ! -f ~/.init_done ]; then
      cp -rT /etc/skel ~
      touch ~/.init_done
    fi
  EOT

  env = {
    CODERNAUTS_API_URL   = "http://127.0.0.1:8080"
    CODERNAUTS_API_TOKEN = "dev-token"
    GIT_AUTHOR_NAME      = coalesce(data.coder_workspace_owner.me.full_name, data.coder_workspace_owner.me.name)
    GIT_AUTHOR_EMAIL     = data.coder_workspace_owner.me.email
    GIT_COMMITTER_NAME   = coalesce(data.coder_workspace_owner.me.full_name, data.coder_workspace_owner.me.name)
    GIT_COMMITTER_EMAIL  = data.coder_workspace_owner.me.email
  }

  metadata {
    display_name = "CPU Usage"
    key          = "0_cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "RAM Usage"
    key          = "1_ram_usage"
    script       = "coder stat mem"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "Home Disk"
    key          = "2_home_disk"
    script       = "coder stat disk --path $${HOME}"
    interval     = 60
    timeout      = 1
  }
}

resource "coder_script" "start_codernauts" {
  agent_id           = coder_agent.main.id
  display_name       = "Start Codernauts"
  icon               = "/icon/code.svg"
  run_on_start       = true
  start_blocks_login = false

  script = <<-EOF
    #!/usr/bin/env bash
    set -euo pipefail

    REPO_URL=${jsonencode(data.coder_parameter.repo_url.value)}
    REPO_BRANCH=${jsonencode(data.coder_parameter.repo_branch.value)}
    APP_DIR="$HOME/codernauts"
    RUN_DIR="$HOME/.codernauts/run"
    LOG_DIR="$HOME/.codernauts/logs"

    mkdir -p "$RUN_DIR" "$LOG_DIR"

    if command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
      SUDO=sudo
    else
      SUDO=
    fi

    ensure_system_packages() {
      if ! command -v curl >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
        $SUDO apt-get update -y
        $SUDO apt-get install -y ca-certificates curl git
      fi
    }

    ensure_go() {
      if command -v go >/dev/null 2>&1; then
        return
      fi

      ARCH="$(uname -m)"
      case "$ARCH" in
        x86_64) GOARCH="amd64" ;;
        aarch64|arm64) GOARCH="arm64" ;;
        *) echo "Unsupported architecture for Go: $ARCH" >&2; exit 1 ;;
      esac

      curl -fsSL "https://go.dev/dl/go1.26.4.linux-$GOARCH.tar.gz" -o /tmp/go.tgz
      $SUDO rm -rf /usr/local/go
      $SUDO tar -C /usr/local -xzf /tmp/go.tgz
      rm -f /tmp/go.tgz
      echo 'export PATH=/usr/local/go/bin:$HOME/go/bin:$PATH' >> "$HOME/.bashrc"
      export PATH="/usr/local/go/bin:$HOME/go/bin:$PATH"
    }

    ensure_node() {
      if ! command -v node >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
        $SUDO apt-get install -y nodejs
      fi

      if ! command -v pnpm >/dev/null 2>&1; then
        corepack enable
        corepack prepare pnpm@10.33.2 --activate
      fi
    }

    clone_repo() {
      if [ -d "$APP_DIR/.git" ]; then
        echo "Using existing repository at $APP_DIR"
        return
      fi

      if [ -n "$REPO_BRANCH" ]; then
        git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
      else
        git clone "$REPO_URL" "$APP_DIR"
      fi
    }

    stop_pid() {
      PID_FILE="$1"
      if [ ! -f "$PID_FILE" ]; then
        return
      fi

      PID="$(cat "$PID_FILE")"
      if kill -0 "$PID" >/dev/null 2>&1; then
        kill "$PID" >/dev/null 2>&1 || true
      fi
      rm -f "$PID_FILE"
    }

    wait_for() {
      URL="$1"
      NAME="$2"
      for _ in $(seq 1 80); do
        if curl -fsS "$URL" >/dev/null 2>&1; then
          echo "$NAME is ready at $URL"
          return
        fi
        sleep 0.25
      done

      echo "$NAME did not become ready. Check logs in $LOG_DIR." >&2
      return 1
    }

    ensure_system_packages
    ensure_go
    ensure_node
    clone_repo

    cd "$APP_DIR/client"
    pnpm install

    stop_pid "$RUN_DIR/api.pid"
    stop_pid "$RUN_DIR/web.pid"

    cd "$APP_DIR"
    PATH="/usr/local/go/bin:$HOME/go/bin:$PATH" PORT=8080 CODERNAUTS_DEV_TOKEN=dev-token nohup ./scripts/dev-server.sh > "$LOG_DIR/api.log" 2>&1 &
    echo $! > "$RUN_DIR/api.pid"

    cd "$APP_DIR/client"
    CODERNAUTS_API_PROXY_TARGET=http://127.0.0.1:8080 VITE_CODERNAUTS_API_TOKEN=dev-token nohup pnpm web > "$LOG_DIR/web.log" 2>&1 &
    echo $! > "$RUN_DIR/web.pid"

    wait_for http://127.0.0.1:8080/v1/health "Codernauts API"
    wait_for http://127.0.0.1:5174 "Codernauts Web"
  EOF
}

resource "coder_app" "codernauts_api" {
  agent_id     = coder_agent.main.id
  slug         = "codernauts-api"
  display_name = "Codernauts API"
  icon         = "/icon/go.svg"
  url          = "http://localhost:8080"
  share        = "owner"
  subdomain    = true
  open_in      = "tab"
  order        = 1

  healthcheck {
    url       = "http://localhost:8080/v1/health"
    interval  = 5
    threshold = 12
  }
}

resource "coder_app" "codernauts_web" {
  agent_id     = coder_agent.main.id
  slug         = "codernauts-web"
  display_name = "Codernauts Web"
  icon         = "/icon/nodejs.svg"
  url          = "http://localhost:5174"
  share        = "owner"
  subdomain    = true
  open_in      = "tab"
  order        = 2

  healthcheck {
    url       = "http://localhost:5174"
    interval  = 5
    threshold = 24
  }
}

resource "docker_volume" "home_volume" {
  name = "coder-${data.coder_workspace.me.id}-home"

  lifecycle {
    ignore_changes = all
  }

  labels {
    label = "coder.owner"
    value = data.coder_workspace_owner.me.name
  }

  labels {
    label = "coder.owner_id"
    value = data.coder_workspace_owner.me.id
  }

  labels {
    label = "coder.workspace_id"
    value = data.coder_workspace.me.id
  }

  labels {
    label = "coder.workspace_name_at_creation"
    value = data.coder_workspace.me.name
  }
}

resource "docker_container" "workspace" {
  count    = data.coder_workspace.me.start_count
  image    = "codercom/enterprise-base:ubuntu"
  name     = "coder-${data.coder_workspace_owner.me.name}-${lower(data.coder_workspace.me.name)}"
  hostname = data.coder_workspace.me.name

  entrypoint = [
    "sh",
    "-c",
    replace(coder_agent.main.init_script, "/localhost|127\\.0\\.0\\.1/", "host.docker.internal"),
  ]

  env = [
    "CODER_AGENT_TOKEN=${coder_agent.main.token}",
  ]

  host {
    host = "host.docker.internal"
    ip   = "host-gateway"
  }

  volumes {
    container_path = "/home/${local.username}"
    volume_name    = docker_volume.home_volume.name
    read_only      = false
  }

  labels {
    label = "coder.owner"
    value = data.coder_workspace_owner.me.name
  }

  labels {
    label = "coder.owner_id"
    value = data.coder_workspace_owner.me.id
  }

  labels {
    label = "coder.workspace_id"
    value = data.coder_workspace.me.id
  }

  labels {
    label = "coder.workspace_name"
    value = data.coder_workspace.me.name
  }
}
