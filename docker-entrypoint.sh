#!/bin/sh
set -e

# Start Redis server in the background
redis-server --daemonize yes

# Wait for Redis to be ready
echo "Waiting for Redis to start..."
while ! redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "Redis is ready!"

# Start the Node.js application
echo "Starting Node.js application..."
exec node dist/backend/server.js
