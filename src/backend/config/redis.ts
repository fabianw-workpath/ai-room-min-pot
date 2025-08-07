import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

// Create Redis client
const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
});

// Set up Redis client event handlers
redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Redis pub/sub client for real-time updates
const redisPubSub = redisClient.duplicate();

// Function to set up Redis client
export const setupRedisClient = () => {
  return { redisClient, redisPubSub };
};

// Export Redis client for use in other modules
export { redisClient, redisPubSub };
