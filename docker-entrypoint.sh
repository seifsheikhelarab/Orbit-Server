#!/bin/bash
set -e

echo "Running Prisma migrations..."
bunx prisma migrate deploy

echo "Starting application..."
exec bun src/index.ts
