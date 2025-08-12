#!/bin/bash

# Start staging server with .next-staging build

# Remove existing .next symlink if it exists
rm -f .next

# Create symlink to staging build
ln -s .next-staging .next

# Start Next.js server
PORT=3001 exec node ./node_modules/next/dist/bin/next start