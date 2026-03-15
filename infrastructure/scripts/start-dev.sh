#!/usr/bin/env sh
set -eu

docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d --build

