#!/bin/bash
set -e

# Detect deployment platform
if [ -n "$AWS_EXECUTION_ENV" ] || [ -n "$AWS_REGION" ]; then
  PLATFORM="AWS Elastic Beanstalk"
elif [ -n "$RAILWAY_STATIC_URL" ] || [ -n "$RAILWAY_SERVICE_ID" ]; then
  PLATFORM="Railway"
else
  PLATFORM="Unknown platform"
fi

echo "🔄 Running database migrations on $PLATFORM..."
echo "Timestamp: $(date)"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo "Please set DATABASE_URL before running migrations."
  exit 1
fi

# Make sure migrations directory exists
if [ ! -d "migrations" ]; then
  echo "⚠️ WARNING: migrations directory not found, creating it..."
  mkdir -p migrations
fi

# Count migration files
if [ "$(ls -A migrations 2>/dev/null | grep -c '\.sql$')" -eq 0 ]; then
  echo "⚠️ WARNING: No SQL migration files found in migrations directory."
  echo "If this is your first deployment, you may need to generate migrations first."
  echo "Otherwise, this might be normal if no schema changes were made."
fi

# Run migrations
echo "📦 Applying database migrations..."
npx tsx server/migrate.ts

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully!"
else
  echo "❌ Migration failed! See errors above."
  exit 1
fi

echo "Migration completed at: $(date)"
echo "🚀 Your database is now ready for the application!"
