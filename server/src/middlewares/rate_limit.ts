import { envMappingLocal } from "./../configs/const";
import { Request, Response, NextFunction } from "express";
import { redis } from "../connect/redis";

export interface RateLimit {
  tokensPerInterval: number;
  interval: number; // in milliseconds
  bucketSize: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining?: number;
  retryAfter?: number;
}

export interface Bucket {
  tokens: number;
  lastRefill: number;
}

export type LimitLevel = "LOW" | "MEDIUM" | "HIGH" | "UNLIMITED";

export class RateLimitFactory {
  private readonly limitLevels: Record<LimitLevel, RateLimit>;
  redis: any;

  constructor() {
    this.redis = redis.client;
    this.limitLevels = {
      LOW: {
        tokensPerInterval: 10,
        interval: 60000,
        bucketSize: 10,
      },
      MEDIUM: {
        tokensPerInterval: 30,
        interval: 60000,
        bucketSize: 30,
      },
      HIGH: {
        tokensPerInterval: 100,
        interval: 60000,
        bucketSize: 100,
      },
      UNLIMITED: {
        tokensPerInterval: 1000,
        interval: 60000,
        bucketSize: 1000,
      },
    };
  }
  private readonly luaScript = `
  local key = KEYS[1]
  local now = ARGV[1]
  local tokensPerInterval = ARGV[2]
  local interval = ARGV[3]
  local bucketSize = ARGV[4]
  
  local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
  local tokens = tonumber(bucket[1] or bucketSize)
  local lastRefill = tonumber(bucket[2] or now)
  
  -- Convert to milliseconds for integer calculation
  local timePassed = now - lastRefill
  local tokensToAdd = math.floor((timePassed * tokensPerInterval * 1000) / interval) / 1000
  tokens = math.min(bucketSize, tokens + tokensToAdd)
  if tokens >= 1 then
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tostring(tokens), 'lastRefill', tostring(now))
    redis.call('EXPIRE', key, interval * 2)
    return {1, math.floor(tokens)}
  else
    local retryAfter = math.ceil((1 - tokens) * (interval / tokensPerInterval))
    return {0, retryAfter}
  end
  `;
  private async handleRateLimitLua(
    key: string,
    limit: RateLimit,
    now: number
  ): Promise<RateLimitResult> {
    try {
      console.log("key: ", key);
      const args = [
        now.toString(),
        limit.tokensPerInterval.toString(),
        limit.interval.toString(),
        limit.bucketSize.toString(),
      ];

      const result = await this.redis.eval(this.luaScript, {
        keys: [key], // Các keys
        arguments: args, // Các args
      });

      if (result[0] === 1) {
        console.log("result: ", result);
        return {
          success: true,
          remaining: Math.floor(result[1]),
        };
      } else {
        return {
          success: false,
          retryAfter: result[1],
        };
      }
    } catch (error) {
      console.error("Rate limit error:", error);
      return { success: true };
    }
  }
  private async handleRateLimit(
    key: string,
    limit: RateLimit,
    now: number
  ): Promise<RateLimitResult> {
    try {
      const data = await this.redis.hGetAll(key);
      let bucket: Bucket | null = data.tokens
        ? {
            tokens: parseFloat(data.tokens),
            lastRefill: parseInt(data.lastRefill),
          }
        : null;
      if (!bucket) {
        bucket = {
          tokens: limit.bucketSize,
          lastRefill: now,
        };
      } else {
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd =
          (timePassed * limit.tokensPerInterval) / limit.interval;
        bucket.tokens = Math.min(limit.bucketSize, bucket.tokens + tokensToAdd);
        console.log("bucket.tokens: ", bucket.tokens);
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        bucket.lastRefill = now;

        await this.redis.hSet(key, {
          tokens: bucket.tokens,
          lastRefill: bucket.lastRefill,
        });
        await this.redis.expire(key, limit.interval * 2);

        return {
          success: true,
          remaining: Math.floor(bucket.tokens),
        };
      }

      const retryAfter = Math.ceil(
        (1 - bucket.tokens) * (limit.interval / limit.tokensPerInterval)
      );

      return {
        success: false,
        retryAfter,
      };
    } catch (error) {
      console.error("Rate limit error:", error);
      return { success: true };
    }
  }

  private createMiddleware(limit: RateLimit) {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const now = Date.now();
      const ip = req.ip;
      const key = `ratelimit:${req.ip}:${req.method}:${req.path}`;

      const result = await this.handleRateLimitLua(key, limit, now);

      if (result.success) {
        res.set("X-RateLimit-Remaining", String(result.remaining));
        next();
      } else {
        res.set("Retry-After", String(result.retryAfter));
        res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds`,
          retryAfter: result.retryAfter,
        });
      }
    };
  }

  public createLowLimitMiddleware() {
    return this.createMiddleware(this.limitLevels.LOW);
  }

  public createMediumLimitMiddleware() {
    return this.createMiddleware(this.limitLevels.MEDIUM);
  }

  public createHighLimitMiddleware() {
    return this.createMiddleware(this.limitLevels.HIGH);
  }

  public createUnlimitedMiddleware() {
    return this.createMiddleware(this.limitLevels.UNLIMITED);
  }

  public createCustomLimitMiddleware(limit: RateLimit) {
    return this.createMiddleware(limit);
  }
}

export default RateLimitFactory;
export const RateLimitInstance = new RateLimitFactory();
