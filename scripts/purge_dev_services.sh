#!/bin/bash

COMPOSE_FILE="dev_services.compose.yml"

# Ensure we are in the right directory
ls "$COMPOSE_FILE" &> /dev/null || (echo "Run from repository root!" && exit 1)

docker compose -f "$COMPOSE_FILE" down -v
docker compose -f "$COMPOSE_FILE" rm
