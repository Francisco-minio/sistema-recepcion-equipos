#!/bin/sh
set -e

mkdir -p /app/data

if [ ! -f /app/data/servicehub.db ]; then
  sqlite3 /app/data/servicehub.db < /app/prisma/init.sql
  node /app/dist/seed.js
fi

npx prisma db push --skip-generate --accept-data-loss

node /app/dist/server.js
