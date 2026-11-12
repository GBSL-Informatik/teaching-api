FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Pre-create Claude Code config dir so the named volume is owned by node
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/.claude