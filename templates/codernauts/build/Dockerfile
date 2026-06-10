# Codernauts dev image: Go + Node toolchain for building and running the
# game server and the starter client inside a Coder workspace.
FROM ubuntu:24.04

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	ca-certificates \
	curl \
	git \
	jq \
	sudo \
	vim-tiny \
	&& rm -rf /var/lib/apt/lists/*

# Latest stable Go. The repository's go.mod requires go >= 1.26.
RUN GO_VERSION="$(curl -fsSL 'https://go.dev/VERSION?m=text' | head -1)" \
	&& curl -fsSL "https://go.dev/dl/${GO_VERSION}.linux-amd64.tar.gz" | tar -C /usr/local -xz
ENV PATH=/usr/local/go/bin:$PATH

# Node 22 and the pnpm major the repository is developed against.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
	&& apt-get install -y --no-install-recommends nodejs \
	&& rm -rf /var/lib/apt/lists/* \
	&& npm install -g pnpm@10

# Replace the default ubuntu user with a passwordless-sudo coder user.
RUN userdel -r ubuntu \
	&& useradd -m -s /bin/bash -u 1000 coder \
	&& echo "coder ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/coder \
	&& chmod 0440 /etc/sudoers.d/coder

USER coder
WORKDIR /home/coder
