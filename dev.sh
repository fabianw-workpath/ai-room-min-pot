#!/bin/bash
set -e

# Start the backend and frontend concurrently
echo "Starting development servers..."
npx concurrently "npm run dev:backend" "npm run dev:frontend"
