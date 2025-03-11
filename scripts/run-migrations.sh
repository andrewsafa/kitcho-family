#!/bin/bash
echo "Running database migrations..."
npx tsx server/migrate.ts

