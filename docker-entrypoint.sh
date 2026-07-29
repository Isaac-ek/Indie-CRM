#!/bin/sh
set -e

echo "🚀 [Indie CRM] Starting container entrypoint script..."

if [ -n "$DATABASE_URL" ]; then
  echo "📦 [Indie CRM] Pushing Prisma schema to PostgreSQL..."
  npx prisma db push --url "$DATABASE_URL" --accept-data-loss || echo "⚠️ Prisma db push warning, continuing..."

  if [ "$AUTO_SEED" = "true" ] || [ "$AUTO_SEED" = "1" ]; then
    echo "🌱 [Indie CRM] Seeding demo workspace data..."
    npx tsx prisma/seed.ts || echo "⚠️ Prisma seed warning, continuing..."
  fi
else
  echo "⚠️ [Indie CRM] DATABASE_URL not set; skipping database initialization."
fi

echo "🔥 [Indie CRM] Launching Next.js standalone server on port ${PORT:-3000}..."
exec node server.js
