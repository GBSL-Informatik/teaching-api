#!/bin/bash

COMPOSE_FILE="dev_services.compose.yml"
COMPOSE_PROJECT_NAME="teaching_website_backend_dev_services"

# Ensure we are in the right directory
ls "$COMPOSE_FILE" &> /dev/null || (echo "Run from repository root!" && exit 1)

docker-compose -f "$COMPOSE_FILE" down
docker-compose -f "$COMPOSE_FILE" rm

# TODO: Does not work yet.
docker volume rm "$COMPOSE_PROJECT_NAME"_postgres_data
