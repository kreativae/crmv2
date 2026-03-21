import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRedis } from '../config/redis.js';

// Basic rate limiter (in-memory for dev, Redis for prod)
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 100, // requests per window
    message = 'Muitas requisições, tente novamente mais tarde',
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: message });
    },
  });
};

// Specific rate limiters
export const authLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min
  message: 'Muitas tentativas de login, tente novamente em 15 minutos',
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `${ip}:${email}` : ip;
  },
});

export const authRefreshRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // allow frequent silent refresh without blocking login
  message: 'Muitas tentativas de renovação de sessão, aguarde 1 minuto',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Limite de requisições excedido, aguarde um momento',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: 'Muitos uploads, aguarde um momento',
});

// Redis-based rate limiter for production
export const redisRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}) => {
  const {
    windowMs = 60 * 1000,
    max = 100,
    keyPrefix = 'rl:',
  } = options;

  return async (req: Request, res: Response, next: () => void): Promise<void> => {
    const redis = getRedis();
    
    if (!redis) {
      // Fallback to no rate limiting if Redis unavailable
      next();
      return;
    }

    const key = `${keyPrefix}${req.ip}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }
      
      // Set headers
      const ttl = await redis.pttl(key);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl);
      
      if (current > max) {
        res.status(429).json({
          error: 'Limite de requisições excedido',
          retryAfter: Math.ceil(ttl / 1000),
        });
        return;
      }
      
      next();
    } catch (error) {
      // If Redis fails, allow the request
      next();
    }
  };
};
