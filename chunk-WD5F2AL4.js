#!/usr/bin/env node
import { createLogger, LogLevel } from './chunk-U5TVNIXX.js';
import { __name } from './chunk-EWOJGXRX.js';
import { createClient } from 'redis';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
createLogger({
  name: "redis-factory",
  level: LogLevel.INFO
});
function isSocketTimeoutError(cause) {
  if (!cause) {
    return false;
  }
  return cause?.name === "SocketTimeoutError" || cause?.message?.includes("socket timeout");
}
__name(isSocketTimeoutError, "isSocketTimeoutError");

// ../../packages/platform/dist/cache/redis-metrics.js
var LATENCY_THRESHOLDS = {
  /** Under 100ms is healthy */
  healthy: 100,
  /** Under 500ms is degraded */
  degraded: 500
};
var RedisMetricsCollector = class {
  static {
    __name(this, "RedisMetricsCollector");
  }
  reconnectAttempts = 0;
  lastSuccessAt = null;
  lastErrorAt = null;
  lastError = null;
  keyPrefix;
  constructor(keyPrefix = "") {
    this.keyPrefix = keyPrefix;
  }
  /**
   * Record a successful operation
   */
  recordSuccess() {
    this.lastSuccessAt = Date.now();
  }
  /**
   * Record an error
   */
  recordError(error) {
    this.lastErrorAt = Date.now();
    this.lastError = error.message;
  }
  /**
   * Record a reconnection attempt
   */
  recordReconnect() {
    this.reconnectAttempts++;
  }
  /**
   * Reset reconnection counter (after successful connection)
   */
  resetReconnectCount() {
    this.reconnectAttempts = 0;
  }
  /**
   * Measure Redis latency using PING command
   */
  async measureLatency(client) {
    if (!client || !client.isReady) {
      return null;
    }
    try {
      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;
      this.recordSuccess();
      return latency;
    } catch (error) {
      this.recordError(error);
      return null;
    }
  }
  /**
   * Collect comprehensive metrics
   */
  async collect(client) {
    const isConnected = client?.isReady ?? false;
    const isOpen = client?.isOpen ?? false;
    const latency = await this.measureLatency(client);
    let status;
    let message;
    if (!isConnected) {
      status = "unhealthy";
      message = "Redis client not connected";
    } else if (latency === null) {
      status = "unhealthy";
      message = "Redis PING failed";
    } else if (latency < LATENCY_THRESHOLDS.healthy) {
      status = "healthy";
      message = `Redis latency: ${latency}ms`;
    } else if (latency < LATENCY_THRESHOLDS.degraded) {
      status = "degraded";
      message = `Redis latency elevated: ${latency}ms`;
    } else {
      status = "unhealthy";
      message = `Redis latency too high: ${latency}ms`;
    }
    return {
      isConnected,
      isOpen,
      latency,
      status,
      message,
      lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts,
      keyPrefix: this.keyPrefix
    };
  }
  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempts() {
    return this.reconnectAttempts;
  }
};
var metricsCollectors = /* @__PURE__ */ new Map();
function getMetricsCollector(keyPrefix = "") {
  let collector = metricsCollectors.get(keyPrefix);
  if (!collector) {
    collector = new RedisMetricsCollector(keyPrefix);
    metricsCollectors.set(keyPrefix, collector);
  }
  return collector;
}
__name(getMetricsCollector, "getMetricsCollector");

// ../../packages/platform/dist/cache/redis-client.js
var logger2 = createLogger({
  name: "redis-client",
  level: LogLevel.INFO
});
var KEY_PREFIX = "cache:";
var redisClient = null;
var redisAvailable = false;
var initializationPromise = null;
var metricsCollector = getMetricsCollector(KEY_PREFIX);
async function initializeRedis() {
  if (initializationPromise) {
    return initializationPromise;
  }
  initializationPromise = (async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger2.warn("REDIS_URL not configured - using in-memory fallback for caching");
      return;
    }
    try {
      redisClient = createClient({
        url: redisUrl,
        socket: {
          // Connection timeout - how long to wait for initial connection
          connectTimeout: 1e4,
          // TCP keepalive - prevents silent connection drops
          keepAlive: 5e3,
          // Reconnection strategy with exponential backoff + jitter
          reconnectStrategy: /* @__PURE__ */ __name((retries, cause) => {
            if (isSocketTimeoutError(cause)) {
              logger2.warn("Redis socket timeout - not reconnecting", {
                cause: cause?.message
              });
              return false;
            }
            if (retries > 20) {
              logger2.error("Redis max retries exceeded", {
                retries,
                cause: cause?.message
              });
              return new Error("Redis connection failed");
            }
            const baseDelay = Math.min(2 ** retries * 100, 3e4);
            const jitter = Math.floor(Math.random() * 200);
            return baseDelay + jitter;
          }, "reconnectStrategy")
        },
        // Application-level ping to keep connection alive
        pingInterval: 6e4
      });
      redisClient.on("error", (err) => {
        if (err.message.includes("ECONNRESET") || err.message.includes("ECONNREFUSED")) {
          logger2.debug("Redis connection error (will reconnect)", {
            error: err.message
          });
        } else {
          logger2.warn("Redis client error", {
            error: err.message
          });
        }
        redisAvailable = false;
        metricsCollector.recordError(err);
      });
      redisClient.on("connect", () => {
        redisAvailable = true;
        metricsCollector.resetReconnectCount();
        if (process.env.NODE_ENV !== "production") {
          logger2.info("Redis connected for platform caching");
        }
      });
      redisClient.on("ready", () => {
        redisAvailable = true;
        logger2.debug("Redis client ready for platform caching");
      });
      redisClient.on("reconnecting", () => {
        metricsCollector.recordReconnect();
        logger2.debug("Redis reconnecting for platform caching");
      });
      await redisClient.connect();
      redisAvailable = true;
      if (process.env.NODE_ENV !== "production") {
        logger2.info("\u2705 Redis client initialized for platform caching with production config");
      }
    } catch (error) {
      logger2.error("Redis initialization failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      redisAvailable = false;
    }
  })();
  return initializationPromise;
}
__name(initializeRedis, "initializeRedis");
async function getCache(key) {
  await initializeRedis();
  if (!redisAvailable || !redisClient) {
    return null;
  }
  try {
    const value = await redisClient.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  } catch (error) {
    logger2.error("Redis GET failed", {
      key,
      error
    });
    return null;
  }
}
__name(getCache, "getCache");
async function setCache(key, value, ttlSeconds) {
  await initializeRedis();
  if (!redisAvailable || !redisClient) {
    return false;
  }
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.set(key, serialized, {
        EX: ttlSeconds
      });
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (error) {
    logger2.error("Redis SET failed", {
      key,
      error
    });
    return false;
  }
}
__name(setCache, "setCache");
async function deleteCache(key) {
  await initializeRedis();
  if (!redisAvailable || !redisClient) {
    return false;
  }
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger2.error("Redis DEL failed", {
      key,
      error
    });
    return false;
  }
}
__name(deleteCache, "deleteCache");
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger2.info("Redis connection closed");
    } catch (error) {
      logger2.error("Error closing Redis connection", {
        error
      });
    }
    redisClient = null;
    redisAvailable = false;
  }
}
__name(closeRedis, "closeRedis");
function isRedisAvailable() {
  return redisAvailable;
}
__name(isRedisAvailable, "isRedisAvailable");
function getRedisClient() {
  return redisClient;
}
__name(getRedisClient, "getRedisClient");

export { closeRedis, deleteCache, getCache, getRedisClient, initializeRedis, isRedisAvailable, setCache };
//# sourceMappingURL=chunk-WD5F2AL4.js.map
//# sourceMappingURL=chunk-WD5F2AL4.js.map