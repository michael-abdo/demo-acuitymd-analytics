#!/bin/bash

# Industry standard build script for staging environment

echo "Building staging environment (industry standard)..."

# Clean previous builds
rm -rf .next-staging

# Build using env-cmd to load env files properly
# This loads .env first, then env/.env.staging overrides
npm run build:staging

# Move build to staging directory
mv .next .next-staging

echo "Staging build complete!"