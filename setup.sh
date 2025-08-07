#!/bin/bash
set -e

# Install root project dependencies
echo "Installing backend dependencies..."
npm install

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your Recall.ai API key"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd src/frontend
npm install

echo "Setup complete! You can now run the application with:"
echo "npm run dev"
