#!/bin/sh
set -e

# Apply pending database migrations before the app starts serving.
# Uses `migrate deploy` (production-safe): applies committed migrations only,
# never generates or resets.
echo "→ Applying database migrations (prisma migrate deploy)…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Starting server…"
exec "$@"
