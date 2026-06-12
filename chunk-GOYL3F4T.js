#!/usr/bin/env node
import { __name, __export, __require } from './chunk-EWOJGXRX.js';
import pino from 'pino';
import { LRUCache } from 'lru-cache';
import os from 'os';
import chokidar from 'chokidar';
import CircuitBreaker from 'opossum';
import PQueue from 'p-queue';
import pRetry, { AbortError } from 'p-retry';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var MCP_QUIET = process.env.MCP_QUIET === "1" || process.env.MCP_QUIET === "true";
var isProduction = process.env.NODE_ENV === "production";
var isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
var isVSCodeExtension = process.env.VSCODE_EXTENSION === "true";
var isNextJS = typeof process.env.NEXT_RUNTIME !== "undefined" || typeof process.env.__NEXT_PRIVATE_ORIGIN !== "undefined";
var isBundled = typeof process.env.VREKO_BUNDLED !== "undefined" || // Check if we're running from a bundled location (dist/server with no source)
typeof __dirname === "string" && !__dirname.includes("node_modules") && !__dirname.includes("packages/");
var serviceName = process.env.SERVICE_NAME || process.env.npm_package_name || "app";
var redactPaths = [
  "user.email",
  "user.password",
  "apiKey",
  "session.token",
  "req.headers.authorization",
  "auth.*.password",
  "config.*.secret",
  "env.*",
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "*.password",
  "*.token",
  "*.apiKey",
  "*.secret",
  "*.authorization",
  "*.cookie",
  "*.path",
  "*.file",
  "*.filePath"
];
function traceContextMixin() {
  try {
    const api = __require("@opentelemetry/api");
    const span = api.trace.getSpan(api.context.active());
    if (span) {
      const ctx = span.spanContext();
      return {
        trace_id: ctx.traceId,
        span_id: ctx.spanId
      };
    }
  } catch {
  }
  return {};
}
__name(traceContextMixin, "traceContextMixin");
var pinoLogger = pino({
  // When MCP_QUIET=1, set level to 'silent' to suppress all output
  level: MCP_QUIET ? "silent" : process.env.LOG_LEVEL || "info",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]"
  },
  // Add service name as base context for terminal multiplexer clarity
  base: {
    service: serviceName
  },
  // Inject trace context into every log line
  mixin: traceContextMixin,
  // Only use transport in non-production AND non-VSCode AND non-Next.js AND non-test environments
  // pino-pretty uses worker threads which fail in Next.js bundled contexts and vitest
  // Also disable in bundled mode (MCPB) where worker threads don't work
  ...isProduction || isTest || isVSCodeExtension || MCP_QUIET || isNextJS || isBundled ? {} : {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss.l",
        ignore: "pid,hostname,service",
        // Show service name in message prefix for terminal clarity
        messageFormat: "[{service}] {msg}",
        // Include trace context in output - this is your "local Grafana"
        // trace_id will appear inline when OTel is active
        include: "level,time,trace_id,span_id",
        // Single line for better terminal readability
        singleLine: true,
        // Custom colors for level differentiation
        levelColors: {
          trace: "gray",
          debug: "cyan",
          info: "green",
          warn: "yellow",
          error: "red",
          fatal: "bgRed"
        }
      }
    }
  }
}, pino.destination({
  fd: 2
}));
var logger = {
  debug: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
    if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg === "object")) {
      if (metaOrMsg) {
        pinoLogger.debug(metaOrMsg, messageOrObj);
      } else {
        pinoLogger.debug(messageOrObj);
      }
    } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
      pinoLogger.debug(messageOrObj, metaOrMsg);
    }
  }, "debug"),
  info: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
    if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg === "object")) {
      if (metaOrMsg) {
        pinoLogger.info(metaOrMsg, messageOrObj);
      } else {
        pinoLogger.info(messageOrObj);
      }
    } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
      pinoLogger.info(messageOrObj, metaOrMsg);
    }
  }, "info"),
  warn: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
    if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg === "object")) {
      if (metaOrMsg) {
        pinoLogger.warn(metaOrMsg, messageOrObj);
      } else {
        pinoLogger.warn(messageOrObj);
      }
    } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
      pinoLogger.warn(messageOrObj, metaOrMsg);
    }
  }, "warn"),
  error: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
    if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg !== "string")) {
      if (metaOrMsg) {
        pinoLogger.error(metaOrMsg, messageOrObj);
      } else {
        pinoLogger.error(messageOrObj);
      }
    } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
      pinoLogger.error(messageOrObj, metaOrMsg);
    }
  }, "error"),
  // Child method for creating scoped loggers
  child: /* @__PURE__ */ __name((bindings) => {
    const childLogger = pinoLogger.child(bindings);
    return {
      debug: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
        if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg === "object")) {
          if (metaOrMsg) {
            childLogger.debug(metaOrMsg, messageOrObj);
          } else {
            childLogger.debug(messageOrObj);
          }
        } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
          childLogger.debug(messageOrObj, metaOrMsg);
        }
      }, "debug"),
      info: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
        if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg === "object")) {
          if (metaOrMsg) {
            childLogger.info(metaOrMsg, messageOrObj);
          } else {
            childLogger.info(messageOrObj);
          }
        } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
          childLogger.info(messageOrObj, metaOrMsg);
        }
      }, "info"),
      warn: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
        if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg === "object")) {
          if (metaOrMsg) {
            childLogger.warn(metaOrMsg, messageOrObj);
          } else {
            childLogger.warn(messageOrObj);
          }
        } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
          childLogger.warn(messageOrObj, metaOrMsg);
        }
      }, "warn"),
      error: /* @__PURE__ */ __name((messageOrObj, metaOrMsg) => {
        if (typeof messageOrObj === "string" && (!metaOrMsg || typeof metaOrMsg !== "string")) {
          if (metaOrMsg) {
            childLogger.error(metaOrMsg, messageOrObj);
          } else {
            childLogger.error(messageOrObj);
          }
        } else if (typeof messageOrObj === "object" && typeof metaOrMsg === "string") {
          childLogger.error(messageOrObj, metaOrMsg);
        }
      }, "error"),
      level: childLogger.level,
      child: /* @__PURE__ */ __name((nestedBindings) => logger.child({
        ...bindings,
        ...nestedBindings
      }), "child")
    };
  }, "child")
};

// ../../packages/infrastructure/dist/cache/index.js
var cache_exports = {};
__export(cache_exports, {
  cacheDefaults: () => cacheDefaults,
  clearDocCache: () => clearDocCache,
  dashboardCache: () => dashboardCache,
  docCache: () => docCache,
  getDashboardCached: () => getDashboardCached,
  getLibraryDocsCached: () => getLibraryDocsCached,
  getLibraryDocsCachedWithHint: () => getLibraryDocsCachedWithHint,
  invalidateDashboardCache: () => invalidateDashboardCache
});
var cacheDefaults = {
  mcp: {
    cache: {
      maxEntries: 500,
      ttlMs: 60 * 60 * 1e3
    }
  },
  dashboard: {
    cache: {
      maxEntries: 1e3,
      defaultTtlMs: 5 * 60 * 1e3
    }
  }
};
var docCache = new LRUCache({
  max: cacheDefaults.mcp.cache.maxEntries,
  ttl: cacheDefaults.mcp.cache.ttlMs,
  allowStale: true,
  updateAgeOnGet: true
});
function clearDocCache() {
  docCache.clear();
}
__name(clearDocCache, "clearDocCache");
var dashboardCache = new LRUCache({
  max: cacheDefaults.dashboard.cache.maxEntries,
  ttl: cacheDefaults.dashboard.cache.defaultTtlMs,
  allowStale: true,
  updateAgeOnGet: true
});
async function getLibraryDocsCached(key, fetcher, ttlMs) {
  const hit = docCache.get(key);
  if (hit) {
    logger.debug(`Cache hit for key: ${key}`);
    return hit;
  }
  try {
    logger.debug(`Cache miss for key: ${key}, fetching data`);
    const value = await fetcher();
    if (ttlMs) {
      docCache.set(key, value, {
        ttl: ttlMs
      });
    } else {
      docCache.set(key, value);
    }
    return value;
  } catch (error) {
    logger.error({
      error
    }, `Failed to fetch data for cache key: ${key}`);
    throw error;
  }
}
__name(getLibraryDocsCached, "getLibraryDocsCached");
async function getLibraryDocsCachedWithHint(cacheKey, ttlMs, fetcher) {
  if (cacheKey) {
    return await getLibraryDocsCached(cacheKey, fetcher, ttlMs);
  }
  return await fetcher();
}
__name(getLibraryDocsCachedWithHint, "getLibraryDocsCachedWithHint");
async function getDashboardCached(key, fetcher, ttlMs) {
  const hit = dashboardCache.get(key);
  if (hit) {
    logger.debug(`Dashboard cache hit for key: ${key}`);
    return hit;
  }
  try {
    logger.debug(`Dashboard cache miss for key: ${key}, fetching data`);
    const value = await fetcher();
    dashboardCache.set(key, value, {
      ttl: ttlMs ?? cacheDefaults.dashboard.cache.defaultTtlMs
    });
    return value;
  } catch (error) {
    logger.error({
      error
    }, `Failed to fetch dashboard data for cache key: ${key}`);
    throw error;
  }
}
__name(getDashboardCached, "getDashboardCached");
function invalidateDashboardCache(pattern) {
  const keysToDelete = [];
  for (const key of dashboardCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    dashboardCache.delete(key);
  }
  logger.info(`Invalidated ${keysToDelete.length} dashboard cache entries matching pattern: ${pattern}`);
}
__name(invalidateDashboardCache, "invalidateDashboardCache");
var watcherDefaults = {
  watcher: {
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50
    },
    ignored: [
      "**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**"
    ]
  }
};
function makeWatcher(root) {
  os.platform() === "darwin";
  return chokidar.watch(root, {
    ignoreInitial: true,
    ignored: [
      ...watcherDefaults.watcher.ignored
    ],
    awaitWriteFinish: watcherDefaults.watcher.awaitWriteFinish,
    ignorePermissionErrors: true,
    depth: 10
  });
}
__name(makeWatcher, "makeWatcher");

// ../../packages/infrastructure/dist/resiliency/index.js
var resiliency_exports = {};
__export(resiliency_exports, {
  AbortError: () => AbortError,
  RetryPresets: () => RetryPresets,
  batchCall: () => batchCall,
  calculateBackoff: () => calculateBackoff,
  callTool: () => callTool,
  clearCircuitBreakers: () => clearCircuitBreakers,
  getCircuitBreakerState: () => getCircuitBreakerState,
  resilienceDefaults: () => resilienceDefaults,
  withBreaker: () => withBreaker,
  withRetry: () => withRetry
});
function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/api[_-]?key[=:]\s*["']?\S+["']?/gi, "api_key=[REDACTED]").replace(/token[=:]\s*["']?\S+["']?/gi, "token=[REDACTED]").replace(/password[=:]\s*["']?\S+["']?/gi, "password=[REDACTED]").replace(/bearer\s+\S+/gi, "Bearer [REDACTED]").replace(/authorization[=:]\s*["']?\S+["']?/gi, "authorization=[REDACTED]").replace(/secret[=:]\s*["']?\S+["']?/gi, "secret=[REDACTED]").replace(/credential[s]?[=:]\s*["']?\S+["']?/gi, "credentials=[REDACTED]");
}
__name(sanitizeError, "sanitizeError");
var resilienceDefaults = {
  mcp: {
    timeoutMs: 5e3,
    maxConcurrent: 4,
    retry: {
      maxAttempts: 2,
      baseDelayMs: 250,
      maxDelayMs: 1500,
      jitter: true
    },
    circuit: {
      enabled: true,
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeoutMs: 5e3,
      resetMs: 3e4,
      rollingCountMs: 6e4,
      rollingCountBuckets: 6
    },
    batch: {
      size: 5,
      maxWaitMs: 150
    }
  }
};
var circuitBreakers = /* @__PURE__ */ new Map();
function withBreaker(toolName, fn, cfg = resilienceDefaults.mcp.circuit) {
  if (!circuitBreakers.has(toolName)) {
    const br2 = new CircuitBreaker(async (input) => fn(input), {
      timeout: cfg.timeoutMs,
      errorThresholdPercentage: cfg.errorThresholdPercentage,
      resetTimeout: cfg.resetMs,
      rollingCountTimeout: cfg.rollingCountMs,
      rollingCountBuckets: cfg.rollingCountBuckets,
      volumeThreshold: cfg.volumeThreshold
    });
    br2.on("open", () => {
      logger.warn(`Circuit breaker opened for tool: ${toolName}`, {
        tool: toolName,
        state: "open",
        stats: br2.stats
      });
    });
    br2.on("halfOpen", () => {
      logger.warn(`Circuit breaker half-open for tool: ${toolName}`, {
        tool: toolName,
        state: "half-open",
        stats: br2.stats
      });
    });
    br2.on("close", () => {
      logger.info(`Circuit breaker closed for tool: ${toolName}`, {
        tool: toolName,
        state: "closed",
        stats: br2.stats
      });
    });
    br2.on("success", () => {
      logger.debug(`Circuit breaker success for tool: ${toolName}`, {
        tool: toolName,
        event: "success",
        successes: br2.stats.successes,
        failures: br2.stats.failures
      });
    });
    br2.on("failure", (error) => {
      logger.warn(`Circuit breaker failure for tool: ${toolName}`, {
        tool: toolName,
        event: "failure",
        error: sanitizeError(error),
        successes: br2.stats.successes,
        failures: br2.stats.failures
      });
    });
    br2.on("timeout", () => {
      logger.warn(`Circuit breaker timeout for tool: ${toolName}`, {
        tool: toolName,
        event: "timeout",
        timeoutMs: cfg.timeoutMs
      });
    });
    br2.on("reject", () => {
      logger.warn(`Circuit breaker rejected call for tool: ${toolName}`, {
        tool: toolName,
        event: "reject",
        state: br2.opened ? "open" : br2.halfOpen ? "half-open" : "closed"
      });
    });
    circuitBreakers.set(toolName, br2);
  }
  const br = circuitBreakers.get(toolName);
  if (!br) {
    throw new Error(`Circuit breaker not found for tool: ${toolName}`);
  }
  return (input) => br.fire(input);
}
__name(withBreaker, "withBreaker");
function getCircuitBreakerState(toolName) {
  const br = circuitBreakers.get(toolName);
  if (!br) {
    return null;
  }
  return {
    isOpen: br.opened,
    isHalfOpen: br.halfOpen,
    isClosed: br.closed
  };
}
__name(getCircuitBreakerState, "getCircuitBreakerState");
function clearCircuitBreakers() {
  circuitBreakers.clear();
}
__name(clearCircuitBreakers, "clearCircuitBreakers");
var RetryPresets = {
  /** Fast retries for network requests (max 5s delay) */
  network: {
    maxAttempts: 3,
    baseDelayMs: 1e3,
    maxDelayMs: 5e3,
    jitter: true
  },
  /** Medium retries for API calls (max 30s delay) */
  api: {
    maxAttempts: 5,
    baseDelayMs: 2e3,
    maxDelayMs: 3e4,
    jitter: true
  },
  /** Aggressive retries for critical operations (max 1min delay) */
  critical: {
    maxAttempts: 10,
    baseDelayMs: 1e3,
    maxDelayMs: 6e4,
    jitter: true
  },
  /** Quick retries for fast operations (max 2s delay) */
  fast: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 2e3,
    jitter: false
  }
};
async function withRetry(operation, options) {
  const { maxAttempts, baseDelayMs, maxDelayMs = 3e4, jitter = false, onRetry, shouldRetry } = options;
  return pRetry(operation, {
    retries: maxAttempts,
    minTimeout: baseDelayMs,
    maxTimeout: maxDelayMs,
    randomize: jitter,
    onFailedAttempt: /* @__PURE__ */ __name((error) => {
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }
      if (onRetry) {
        onRetry(error, error.attemptNumber);
      }
    }, "onFailedAttempt")
  });
}
__name(withRetry, "withRetry");
function calculateBackoff(attempt, baseMs, maxMs, jitter) {
  const exponential = baseMs * 2 ** (attempt - 1);
  const capped = Math.min(exponential, maxMs);
  if (jitter) {
    const jitterAmount = Math.random() * capped;
    return capped + jitterAmount;
  }
  return capped;
}
__name(calculateBackoff, "calculateBackoff");

// ../../packages/infrastructure/dist/resiliency/concurrency.js
var queue = new PQueue({
  concurrency: resilienceDefaults.mcp.maxConcurrent
});
var batchQueues = /* @__PURE__ */ new Map();
var callTool = /* @__PURE__ */ __name((name, raw) => {
  const wrapped = withBreaker(name, raw);
  return (input) => queue.add(() => withRetry(() => wrapped(input), {
    maxAttempts: resilienceDefaults.mcp.retry.maxAttempts,
    baseDelayMs: resilienceDefaults.mcp.retry.baseDelayMs,
    maxDelayMs: resilienceDefaults.mcp.retry.maxDelayMs,
    jitter: resilienceDefaults.mcp.retry.jitter,
    onRetry: /* @__PURE__ */ __name((e, n) => logger.warn({
      error: e
    }, `Retrying tool ${name} attempt ${n}: ${e.message}`), "onRetry")
  }));
}, "callTool");
async function batchCall(batchKey, input, processor) {
  if (!batchQueues.has(batchKey)) {
    batchQueues.set(batchKey, []);
  }
  const queue2 = batchQueues.get(batchKey);
  if (!queue2) {
    throw new Error(`Batch queue not found for key: ${batchKey}`);
  }
  return new Promise((resolve, reject) => {
    queue2.push({
      input,
      resolve,
      reject
    });
    if (queue2.length >= resilienceDefaults.mcp.batch.size) {
      processBatch(batchKey, processor);
      return;
    }
    setTimeout(() => {
      const queue3 = batchQueues.get(batchKey);
      if (queue3 && queue3.length > 0) {
        processBatch(batchKey, processor);
      }
    }, resilienceDefaults.mcp.batch.maxWaitMs);
  });
}
__name(batchCall, "batchCall");
async function processBatch(batchKey, processor) {
  const queue2 = batchQueues.get(batchKey);
  if (!queue2 || queue2.length === 0) {
    return;
  }
  const batch = queue2.splice(0, resilienceDefaults.mcp.batch.size);
  const inputs = batch.map((item) => item.input);
  try {
    logger.debug(`Processing batch of ${inputs.length} requests for ${batchKey}`);
    const results = await processor(inputs);
    batch.forEach((item, index) => {
      if (index < results.length) {
        item.resolve(results[index]);
      } else {
        item.reject(new Error(`No result for batch item ${index}`));
      }
    });
  } catch (error) {
    for (const item of batch) {
      item.reject(error);
    }
    logger.error({
      error
    }, `Batch processing failed for ${batchKey}: ${error.message}`);
  }
}
__name(processBatch, "processBatch");

export { cache_exports, getCircuitBreakerState, logger, makeWatcher, resiliency_exports, withBreaker };
//# sourceMappingURL=chunk-GOYL3F4T.js.map
//# sourceMappingURL=chunk-GOYL3F4T.js.map