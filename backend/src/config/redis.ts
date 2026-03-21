import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redis: Redis | null = null;

export const connectRedis = async (): Promise<Redis | null> => {
  if (!env.REDIS_URL) {
    logger.warn('⚠️ Redis URL not configured, caching disabled');
    return null;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    } as any);
    
    await redis.connect();
    logger.info('✅ Redis connected successfully');
    
    redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });
    
    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
    
    return redis;
  } catch (error) {
    logger.warn('⚠️ Redis connection failed, caching disabled:', error);
    return null;
  }
};

export const getRedis = (): Redis | null => redis;

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    logger.info('Redis disconnected');
  }
};

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    if (!redis) return;
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },
  
  async del(key: string): Promise<void> {
    if (!redis) return;
    await redis.del(key);
  },
  
  async delPattern(pattern: string): Promise<void> {
    if (!redis) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
