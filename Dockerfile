FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install Redis
RUN apk add --no-cache redis

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/package*.json ./
COPY --from=base /app/src/frontend/dist ./public

# Install production dependencies only
RUN npm ci --only=production

# Copy startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Start the application
CMD ["docker-entrypoint.sh"]