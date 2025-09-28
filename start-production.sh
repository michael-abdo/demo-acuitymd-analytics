#!/bin/bash

# Start production server with .next-production build

# Remove existing .next symlink if it exists
rm -f .next

# Create symlink to production build
ln -s .next-production .next

# Start Next.js server
PORT=3000 exec node ./node_modules/next/dist/bin/next start