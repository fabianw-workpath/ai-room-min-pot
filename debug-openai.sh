#!/bin/bash

# Load environment variables
source .env

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing OpenAI API connection...${NC}"

# Display configuration
echo -e "\n${BLUE}OpenAI Configuration:${NC}"
echo -e "API Key exists: ${GREEN}$([ ! -z "$OPENAI_API_KEY" ] && echo "Yes" || echo "No")${NC}"
echo -e "API URL: ${GREEN}$OPENAI_API_URL${NC}"

# Test the direct API endpoint
echo -e "\n${BLUE}Testing direct API endpoint:${NC}"
curl -v -X POST "$OPENAI_API_URL" \
  -H "Content-Type: application/json" \
  -H "api-key: $OPENAI_API_KEY" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello, world!"}
    ],
    "temperature": 0.7,
    "max_tokens": 50
  }'

echo -e "\n${BLUE}Done testing OpenAI API.${NC}"
