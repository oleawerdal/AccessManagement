#!/bin/sh
set -e

# Fail fast with a clear message if the database URL is missing, instead of a
# cryptic Prisma "Environment variable not found" error.
if [ -z "$DATABASE_URL" ]; then
  echo "✗ DATABASE_URL is not set on this container."
  echo "  In Coolify, open the APPLICATION (not the database) → Environment"
  echo "  Variables, and add DATABASE_URL pointing at your PostgreSQL resource."
  echo "  Also set AUTH_SECRET, AUTH_URL and AUTH_TRUST_HOST=true, then redeploy."
  exit 1
fi

# Apply pending database migrations before the app starts serving.
# Uses `migrate deploy` (production-safe): applies committed migrations only,
# never generates or resets.
echo "→ Applying database migrations (prisma migrate deploy)…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Starting server…"
exec "$@"
