#!/bin/sh
# Build script for Docker that skips type checking

echo "Building Next.js application..."

# Build without type checking
NODE_ENV=production npx next build

echo "Build complete!"