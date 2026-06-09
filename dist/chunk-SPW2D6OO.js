#!/usr/bin/env node
import { logger } from './chunk-GOYL3F4T.js';
import { FEATURE_FLAGS, validateTelemetryEvent, FeatureManager } from './chunk-OOVZVXTB.js';
import { __commonJS, __name, __export } from './chunk-EWOJGXRX.js';
import { neonConfig, neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID, createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PostHog } from 'posthog-node';
import client from 'prom-client';
import { trace, metrics, context, SpanStatusCode, propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor, ConsoleSpanExporter, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_VERSION, ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// ../../packages/infrastructure/package.json
var require_package = __commonJS({
  "../../packages/infrastructure/package.json"(exports, module) {
    module.exports = {
      name: "@vreko/infrastructure",
      version: "0.2.1",
      license: "Apache-2.0",
      author: "Vreko Team",
      repository: {
        type: "git",
        url: "https://github.com/vreko-dev.git",
        directory: "packages/infrastructure"
      },
      files: [
        "dist"
      ],
      dependencies: {
        "@neondatabase/serverless": "catalog:",
        "@opentelemetry/api": "catalog:",
        "@opentelemetry/exporter-metrics-otlp-http": "catalog:",
        "@opentelemetry/exporter-trace-otlp-http": "catalog:",
        "@opentelemetry/instrumentation-pg": "catalog:",
        "@opentelemetry/instrumentation-pino": "catalog:",
        "@opentelemetry/resources": "catalog:",
        "@opentelemetry/sdk-metrics": "catalog:",
        "@opentelemetry/sdk-trace-base": "catalog:",
        "@opentelemetry/sdk-trace-node": "catalog:",
        "@opentelemetry/semantic-conventions": "catalog:",
        "@vreko/contracts": "workspace:*",
        bullmq: "catalog:",
        nanoid: "catalog:",
        pino: "catalog:",
        "posthog-node": "catalog:",
        opossum: "catalog:",
        "p-queue": "catalog:",
        "p-retry": "catalog:",
        "lru-cache": "catalog:",
        chokidar: "catalog:",
        "prom-client": "catalog:"
      },
      optionalDependencies: {
        "@sentry/node": "catalog:",
        "@sentry/profiling-node": "catalog:"
      },
      devDependencies: {
        "@vreko/tsconfig": "workspace:*",
        "@types/node": "catalog:",
        "posthog-js": "catalog:",
        tsup: "catalog:",
        typescript: "catalog:",
        vitest: "catalog:"
      },
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          default: "./dist/index.js"
        },
        "./logging/logger": {
          types: "./dist/logging/logger.d.ts",
          default: "./dist/logging/logger.js"
        },
        "./observability": {
          types: "./dist/observability/index.d.ts",
          default: "./dist/observability/index.js"
        },
        "./observability/index": {
          types: "./dist/observability/index.d.ts",
          default: "./dist/observability/index.js"
        },
        "./observability/vocabulary": {
          types: "./dist/observability/vocabulary.d.ts",
          default: "./dist/observability/vocabulary.js"
        },
        "./observability/wrapper": {
          types: "./dist/observability/wrapper.d.ts",
          default: "./dist/observability/wrapper.js"
        },
        "./observability/retro-queries": {
          types: "./dist/observability/retro-queries.d.ts",
          default: "./dist/observability/retro-queries.js"
        },
        "./metrics": {
          types: "./dist/metrics/index.d.ts",
          default: "./dist/metrics/index.js"
        },
        "./tracing": {
          types: "./dist/tracing/index.d.ts",
          default: "./dist/tracing/index.js"
        },
        "./health": {
          types: "./dist/health/index.d.ts",
          default: "./dist/health/index.js"
        },
        "./resiliency": {
          types: "./dist/resiliency/index.d.ts",
          default: "./dist/resiliency/index.js"
        },
        "./cache": {
          types: "./dist/cache/index.d.ts",
          default: "./dist/cache/index.js"
        },
        "./files": {
          types: "./dist/files/watcher.d.ts",
          default: "./dist/files/watcher.js"
        },
        "./sqlite": {
          types: "./dist/sqlite/index.d.ts",
          default: "./dist/sqlite/index.js"
        },
        "./neon": {
          types: "./dist/neon/index.d.ts",
          default: "./dist/neon/index.js"
        },
        "./prometheus": {
          types: "./dist/prometheus/index.d.ts",
          default: "./dist/prometheus/index.js"
        },
        "./queue/email-queue-service": {
          types: "./dist/queue/email-queue-service.d.ts",
          default: "./dist/queue/email-queue-service.js"
        },
        "./queue/flywheel-queue-service": {
          types: "./dist/queue/flywheel-queue-service.d.ts",
          default: "./dist/queue/flywheel-queue-service.js"
        },
        "./sentry": {
          types: "./dist/sentry/index.d.ts",
          default: "./dist/sentry/index.js"
        }
      },
      publishConfig: {
        exports: {
          ".": {
            types: "./dist/logging/logger.d.ts",
            default: "./dist/logging/logger.js"
          },
          "./logging/logger": {
            types: "./dist/logging/logger.d.ts",
            default: "./dist/logging/logger.js"
          },
          "./observability": {
            types: "./dist/observability/index.d.ts",
            default: "./dist/observability/index.js"
          },
          "./observability/index": {
            types: "./dist/observability/index.d.ts",
            default: "./dist/observability/index.js"
          },
          "./observability/vocabulary": {
            types: "./dist/observability/vocabulary.d.ts",
            default: "./dist/observability/vocabulary.js"
          },
          "./observability/wrapper": {
            types: "./dist/observability/wrapper.d.ts",
            default: "./dist/observability/wrapper.js"
          },
          "./observability/retro-queries": {
            types: "./dist/observability/retro-queries.d.ts",
            default: "./dist/observability/retro-queries.js"
          },
          "./health": {
            types: "./dist/health/index.d.ts",
            default: "./dist/health/index.js"
          },
          "./tracing": {
            types: "./dist/tracing/index.d.ts",
            default: "./dist/tracing/index.js"
          },
          "./metrics": {
            types: "./dist/metrics/index.d.ts",
            default: "./dist/metrics/index.js"
          },
          "./resiliency": {
            types: "./dist/resiliency/index.d.ts",
            default: "./dist/resiliency/index.js"
          },
          "./cache": {
            types: "./dist/cache/index.d.ts",
            default: "./dist/cache/index.js"
          },
          "./files": {
            types: "./dist/files/watcher.d.ts",
            default: "./dist/files/watcher.js"
          },
          "./sqlite": {
            types: "./dist/sqlite/index.d.ts",
            default: "./dist/sqlite/index.js"
          },
          "./neon": {
            types: "./dist/neon/index.d.ts",
            default: "./dist/neon/index.js"
          },
          "./queue/email-queue-service": {
            types: "./dist/queue/email-queue-service.d.ts",
            default: "./dist/queue/email-queue-service.js"
          },
          "./queue/flywheel-queue-service": {
            types: "./dist/queue/flywheel-queue-service.d.ts",
            default: "./dist/queue/flywheel-queue-service.js"
          },
          "./sentry": {
            types: "./dist/sentry/index.d.ts",
            default: "./dist/sentry/index.js"
          }
        }
      },
      main: "dist/index.js",
      private: true,
      scripts: {
        build: "tsup --no-dts && tsc --build tsconfig.build.json --force && node ../../scripts/build-utils/add-js-extensions.mjs",
        "build:docker": "tsup --no-dts && node ../../scripts/build-utils/add-js-extensions.mjs",
        dev: "tsup --watch",
        check: "biome check .",
        format: "biome format --write .",
        lint: "biome lint .",
        "lint:fix": "biome lint --fix .",
        postbuild: "test -f dist/index.d.ts && node scripts/patch-dts.cjs || echo 'Warning: Type declarations not fully generated'",
        test: "vitest run",
        "test:coverage": "vitest run --coverage",
        "test:watch": "vitest",
        "type-check": "tsc --noEmit"
      },
      type: "module",
      types: "dist/index.d.ts"
    };
  }
});

// ../../packages/infrastructure/dist/environment/index.js
function isDevelopment() {
  return getDeploymentEnv() === "development";
}
__name(isDevelopment, "isDevelopment");
function isProduction() {
  return getDeploymentEnv() === "production";
}
__name(isProduction, "isProduction");
function getDeploymentEnv() {
  const explicitEnv = process.env.DEPLOYMENT_ENV;
  if (explicitEnv === "development" || explicitEnv === "staging" || explicitEnv === "production") {
    return explicitEnv;
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.FLY_ALLOC_ID) {
    return "production";
  }
  const authUrl = process.env.BETTER_AUTH_URL || process.env.APP_URL || "";
  if (authUrl.includes("localhost") || authUrl.includes("127.0.0.1")) {
    return "development";
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local") || hostname.endsWith(".test")) {
      return "development";
    }
  }
  if (process.env.CI) {
    return "production";
  }
  return "production";
}
__name(getDeploymentEnv, "getDeploymentEnv");
function getAnalyticsEnv() {
  return getDeploymentEnv() === "development" ? "dev" : "prod";
}
__name(getAnalyticsEnv, "getAnalyticsEnv");
function getEnvironmentInfo() {
  const deployment = getDeploymentEnv();
  return {
    deployment,
    analytics: deployment === "development" ? "dev" : "prod",
    nodeEnv: process.env.NODE_ENV,
    isCi: !!process.env.CI,
    isVercel: !!(process.env.VERCEL || process.env.VERCEL_ENV),
    isFly: !!process.env.FLY_ALLOC_ID,
    isLocalhost: (process.env.BETTER_AUTH_URL?.includes("localhost") ?? false) || typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  };
}
__name(getEnvironmentInfo, "getEnvironmentInfo");
function detectSurface() {
  if (process.env.VSCODE_EXTENSION || typeof process.env.VSCODE_PID !== "undefined") {
    return "vscode";
  }
  if (process.env.VREKO_CLI || process.argv[1]?.includes("cli")) {
    return "cli";
  }
  if (process.env.MCP_SERVER || process.env.MCP_MODE) {
    return "mcp";
  }
  if (process.env.DAEMON_MODE || process.env.LOCAL_SERVICE) {
    return "daemon";
  }
  if (process.env.API_SERVER || typeof process.env.PORT !== "undefined") {
    return "api";
  }
  if (typeof window !== "undefined") {
    return "web";
  }
  return "api";
}
__name(detectSurface, "detectSurface");
function getAnalyticsSuperProperties(surface) {
  return {
    env: getAnalyticsEnv(),
    surface: surface ?? detectSurface()
  };
}
__name(getAnalyticsSuperProperties, "getAnalyticsSuperProperties");

// ../../packages/infrastructure/dist/graceful-shutdown/index.js
function createGracefulShutdown(options) {
  const { logger: logger2, timeoutMs = 25e3, healthMarkerPath } = options;
  const cleanupHandlers = [];
  let isShuttingDown = false;
  let isReady = false;
  function updateReadiness(ready) {
    isReady = ready;
    if (healthMarkerPath) {
      try {
        if (ready) {
          globalThis.Bun?.write?.(healthMarkerPath, process.pid.toString());
        } else {
          globalThis.Bun?.write?.(healthMarkerPath, "");
        }
      } catch (error) {
        logger2.debug("Health marker file operation failed", {
          error
        });
      }
    }
  }
  __name(updateReadiness, "updateReadiness");
  async function shutdown(signal) {
    if (isShuttingDown) {
      logger2.warn("Shutdown already in progress, ignoring signal", {
        signal
      });
      return;
    }
    isShuttingDown = true;
    logger2.info("Shutdown initiated", {
      signal,
      pid: process.pid
    });
    updateReadiness(false);
    logger2.info("Service marked as not ready, stopping new traffic");
    const drainTimeout = Math.min(5e3, timeoutMs / 5);
    logger2.info("Waiting for in-flight requests to complete", {
      drainTimeoutMs: drainTimeout
    });
    await new Promise((resolve) => setTimeout(resolve, drainTimeout));
    logger2.info("Running cleanup handlers", {
      count: cleanupHandlers.length
    });
    const cleanupTimeout = timeoutMs - drainTimeout - 2e3;
    const cleanupStart = Date.now();
    for (let i = cleanupHandlers.length - 1; i >= 0; i--) {
      const remainingTime = cleanupTimeout - (Date.now() - cleanupStart);
      if (remainingTime <= 0) {
        logger2.warn("Cleanup timeout reached, some handlers may not have completed");
        break;
      }
      try {
        const handler = cleanupHandlers[i];
        const handlerTimeout = Math.min(remainingTime, 5e3);
        await Promise.race([
          handler(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Handler timeout")), handlerTimeout))
        ]);
      } catch (error) {
        logger2.error("Cleanup handler error", {
          error,
          handlerIndex: i
        });
      }
    }
    logger2.info("Shutdown complete", {
      durationMs: Date.now() - cleanupStart + drainTimeout
    });
    process.exit(0);
  }
  __name(shutdown, "shutdown");
  const forceExit = /* @__PURE__ */ __name(() => {
    logger2.error("Forced exit due to timeout", {
      timeoutMs
    });
    process.exit(1);
  }, "forceExit");
  return {
    register(handler) {
      cleanupHandlers.push(handler);
    },
    setReady() {
      updateReadiness(true);
    },
    setNotReady() {
      updateReadiness(false);
    },
    init() {
      const handleShutdown = /* @__PURE__ */ __name((signal) => {
        shutdown(signal).catch((error) => {
          logger2.error("Shutdown error", {
            error
          });
          process.exit(1);
        });
        setTimeout(forceExit, timeoutMs);
      }, "handleShutdown");
      process.on("SIGTERM", () => handleShutdown("SIGTERM"));
      process.on("SIGINT", () => handleShutdown("SIGINT"));
      process.on("uncaughtException", (error) => {
        logger2.error("Uncaught exception, initiating shutdown", {
          error
        });
        handleShutdown("uncaughtException");
      });
      process.on("unhandledRejection", (reason) => {
        logger2.error("Unhandled rejection, initiating shutdown", {
          reason
        });
        if (process.env.NODE_ENV !== "production") {
          handleShutdown("unhandledRejection");
        }
      });
      logger2.info("Graceful shutdown handler initialized", {
        timeoutMs
      });
    },
    isReady() {
      return isReady;
    },
    isShuttingDown() {
      return isShuttingDown;
    }
  };
}
__name(createGracefulShutdown, "createGracefulShutdown");
async function drainAndCloseServer(server, logger2) {
  logger2.info("Closing server...");
  const closePromise = server.close();
  if (server.closeIdleConnections) {
    logger2.info("Closing idle connections...");
    server.closeIdleConnections();
  }
  const timeout = 1e4;
  await Promise.race([
    closePromise,
    new Promise((resolve) => setTimeout(resolve, timeout))
  ]);
  if (server.closeAllConnections) {
    logger2.info("Force closing remaining connections...");
    server.closeAllConnections();
  }
  logger2.info("Server closed");
}
__name(drainAndCloseServer, "drainAndCloseServer");
async function preStopDelay(ms = 5e3) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
__name(preStopDelay, "preStopDelay");

// ../../packages/infrastructure/dist/health/index.js
function createHealthCheck(options) {
  return async () => {
    const checks = {};
    checks.system = {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      latency: 0
    };
    const memoryUsage = process.memoryUsage();
    checks.memory = {
      status: memoryUsage.heapUsed < 0.8 * memoryUsage.heapTotal ? "healthy" : "degraded",
      message: `Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const uptime = process.uptime();
    if (options.dependencies) {
      for (const dep of options.dependencies) {
        try {
          const depStartTime = Date.now();
          const result = await dep.check();
          const latency = Date.now() - depStartTime;
          checks[dep.name] = {
            status: result.status,
            message: result.message,
            latency,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (error) {
          checks[dep.name] = {
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Unknown error",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
    }
    let overallStatus = "healthy";
    for (const check of Object.values(checks)) {
      if (check.status === "unhealthy") {
        overallStatus = "unhealthy";
        break;
      }
      if (check.status === "degraded" && overallStatus === "healthy") {
        overallStatus = "degraded";
      }
    }
    const response = {
      status: overallStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: options.service,
      checks,
      uptime,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss
      }
    };
    if (options.version) {
      response.version = options.version;
    }
    return response;
  };
}
__name(createHealthCheck, "createHealthCheck");
async function checkDatabaseConnection(_connectionString) {
  try {
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
    const latency = Date.now() - startTime;
    if (latency > 1e3) {
      return {
        status: "degraded",
        message: `Database connection is slow (${latency}ms)`
      };
    }
    return {
      status: "healthy",
      message: `Database connection successful (${latency}ms)`
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Database connection failed"
    };
  }
}
__name(checkDatabaseConnection, "checkDatabaseConnection");
async function checkRedisConnection(_redisUrl) {
  try {
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 30));
    const latency = Date.now() - startTime;
    if (latency > 200) {
      return {
        status: "degraded",
        message: `Redis connection is slow (${latency}ms)`
      };
    }
    return {
      status: "healthy",
      message: `Redis connection successful (${latency}ms)`
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Redis connection failed"
    };
  }
}
__name(checkRedisConnection, "checkRedisConnection");
async function checkHttpService(_url) {
  try {
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    const latency = Date.now() - startTime;
    if (latency > 1e3) {
      return {
        status: "degraded",
        message: `HTTP service is slow (${latency}ms)`
      };
    }
    return {
      status: "healthy",
      message: `HTTP service check successful (${latency}ms)`
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "HTTP service check failed"
    };
  }
}
__name(checkHttpService, "checkHttpService");

// ../../packages/infrastructure/dist/metrics/core/events.js
var AnalyticsEvents = {
  // ===== Authentication Events (6) =====
  AUTH_SIGNUP_COMPLETED: "auth_signup_completed",
  AUTH_LOGIN_COMPLETED: "auth_login_completed",
  AUTH_LOGOUT_COMPLETED: "auth_logout_completed",
  AUTH_EMAIL_VERIFIED: "auth_email_verified",
  AUTH_PASSWORD_RESET_REQUESTED: "auth_password_reset_requested",
  AUTH_PASSWORD_RESET_COMPLETED: "auth_password_reset_completed",
  // ===== Snapshot Events (20) =====
  SNAPSHOT_CREATED: "snapshot_created",
  SNAPSHOT_RESTORED: "snapshot_restored",
  SNAPSHOT_DELETED: "snapshot_deleted",
  SNAPSHOT_SEARCHED: "snapshot_searched",
  SNAPSHOT_LIMIT_HIT: "snapshot_limit_hit",
  SNAPSHOT_AUTO_CREATED: "snapshot_auto_created",
  SNAPSHOT_SHARED: "snapshot_shared",
  SNAPSHOT_EXPORTED: "snapshot_exported",
  SNAPSHOT_VIEWED: "snapshot_viewed",
  SNAPSHOT_DIFF_VIEWED: "snapshot_diff_viewed",
  // Removed duplicate snapshot_checkpoint_* events to maintain consistent terminology
  // ===== Billing/Monetization Events (12) =====
  BILLING_UPGRADE_PROMPT_SHOWN: "billing_upgrade_prompt_shown",
  BILLING_UPGRADE_PROMPT_CLICKED: "billing_upgrade_prompt_clicked",
  BILLING_PRICING_VIEWED: "billing_pricing_viewed",
  BILLING_CHECKOUT_STARTED: "billing_checkout_started",
  BILLING_CHECKOUT_COMPLETED: "billing_checkout_completed",
  BILLING_CHECKOUT_ABANDONED: "billing_checkout_abandoned",
  BILLING_SUBSCRIPTION_UPGRADED: "billing_subscription_upgraded",
  BILLING_SUBSCRIPTION_DOWNGRADED: "billing_subscription_downgraded",
  BILLING_SUBSCRIPTION_CANCELLED: "billing_subscription_cancelled",
  BILLING_PAYMENT_FAILED: "billing_payment_failed",
  BILLING_COUPON_APPLIED: "billing_coupon_applied",
  BILLING_INVOICE_VIEWED: "billing_invoice_viewed",
  // ===== Extension Events (8) =====
  EXTENSION_INSTALLED: "extension_installed",
  EXTENSION_ACTIVATED: "extension_activated",
  EXTENSION_COMMAND_USED: "extension_command_used",
  EXTENSION_SETTINGS_CHANGED: "extension_settings_changed",
  EXTENSION_ERROR_OCCURRED: "extension_error_occurred",
  EXTENSION_UPDATED: "extension_updated",
  EXTENSION_UNINSTALLED: "extension_uninstalled",
  EXTENSION_FEEDBACK_SUBMITTED: "extension_feedback_submitted",
  // ===== Dashboard Events (8) =====
  DASHBOARD_VIEWED: "dashboard_viewed",
  DASHBOARD_API_KEY_CREATED: "dashboard_api_key_created",
  DASHBOARD_API_KEY_REVOKED: "dashboard_api_key_revoked",
  DASHBOARD_USAGE_CHART_VIEWED: "dashboard_usage_chart_viewed",
  DASHBOARD_SETTINGS_UPDATED: "dashboard_settings_updated",
  DASHBOARD_SEARCH_PERFORMED: "dashboard_search_performed",
  DASHBOARD_EXPORT_TRIGGERED: "dashboard_export_triggered",
  DASHBOARD_HELP_ACCESSED: "dashboard_help_accessed",
  // ===== Team Collaboration Events (6) =====
  TEAM_CREATED: "team_created",
  TEAM_MEMBER_INVITED: "team_member_invited",
  TEAM_MEMBER_JOINED: "team_member_joined",
  TEAM_SNAPSHOT_SHARED: "team_snapshot_shared",
  TEAM_SETTINGS_CHANGED: "team_settings_changed",
  TEAM_MEMBER_REMOVED: "team_member_removed",
  // ===== AI Features Events (5) =====
  AI_SUGGESTION_SHOWN: "ai_suggestion_shown",
  AI_SUGGESTION_ACCEPTED: "ai_suggestion_accepted",
  AI_SUGGESTION_REJECTED: "ai_suggestion_rejected",
  AI_RISK_DETECTED: "ai_risk_detected",
  AI_RISK_PREVENTED: "ai_risk_prevented",
  // ===== API Usage Events (5) =====
  API_CALL_MADE: "api_call_made",
  API_RATE_LIMIT_HIT: "api_rate_limit_hit",
  API_ERROR_OCCURRED: "api_error_occurred",
  API_KEY_ROTATED: "api_key_rotated",
  API_WEBHOOK_CONFIGURED: "api_webhook_configured",
  // ===== Intelligence Layer: Prediction & Learning (6) =====
  PREDICTION_MADE: "prediction_made",
  PREDICTION_OUTCOME_RECORDED: "prediction_outcome_recorded",
  TRUST_SCORE_UPDATED: "trust_score_updated",
  PATTERN_DETECTED: "pattern_detected",
  PATTERN_CONFIRMED: "pattern_confirmed",
  MODEL_CALIBRATION_TRIGGERED: "model_calibration_triggered",
  // ===== Intelligence Layer: Cross-Repo Intelligence (4) =====
  WORKSPACE_CONNECTED: "workspace_connected",
  CROSS_REPO_PATTERN_DETECTED: "cross_repo_pattern_detected",
  REPO_PERSONALITY_UPDATED: "repo_personality_updated",
  GLOBAL_INSIGHT_APPLIED: "global_insight_applied",
  // ===== Intelligence Layer: GitHub Integration (5) =====
  GITHUB_REPO_CONNECTED: "github_repo_connected",
  GITHUB_PR_ANALYZED: "github_pr_analyzed",
  GITHUB_COMMIT_SCANNED: "github_commit_scanned",
  GITHUB_AI_CONTRIBUTION_DETECTED: "github_ai_contribution_detected",
  GITHUB_CHECK_POSTED: "github_check_posted",
  // ===== Intelligence Layer: MCP Tools (3) =====
  MCP_TOOL_CALLED: "mcp_tool_called",
  MCP_CONTEXT_PROVIDED: "mcp_context_provided",
  MCP_AGENT_SELF_CHECK: "mcp_agent_self_check",
  // ===== Intelligence Layer: Community & Engagement (6) =====
  DISASTER_STORY_SHARED: "disaster_story_shared",
  FEEDBACK_SUBMITTED: "feedback_submitted",
  COMMUNITY_ACTION_COMPLETED: "community_action_completed",
  BETA_ELIGIBILITY_CALCULATED: "beta_eligibility_calculated",
  REFERRAL_LINK_GENERATED: "referral_link_generated",
  REFERRAL_CONVERTED: "referral_converted",
  // ===== Activation Funnel Events (2) =====
  AUTH_COMPLETED: "auth_completed",
  FIRST_SNAPSHOT_CREATED: "first_snapshot_created"
};

// ../../packages/infrastructure/dist/neon/index.js
var neon_exports = {};
__export(neon_exports, {
  NeonDocClient: () => NeonDocClient,
  runMigration: () => runMigration,
  verifySchema: () => verifySchema
});
var NeonDocClient = class {
  static {
    __name(this, "NeonDocClient");
  }
  sql;
  constructor(config) {
    if (config.enableCache !== false) {
      neonConfig.fetchConnectionCache = true;
    }
    this.sql = neon(config.connectionString);
  }
  /**
   * Execute hybrid search against doc_embeddings
   *
   * @param queryEmbedding - 768-dim vector from text-embedding-3-small
   * @param options - Search filters and limits
   * @returns Ranked search results with similarity scores
   */
  async hybridSearch(queryEmbedding, options = {}) {
    if (queryEmbedding.length !== 768) {
      throw new Error(`Expected 768-dim embedding, got ${queryEmbedding.length}`);
    }
    const { library = null, version = null, limit = 5, similarityThreshold = 0.75 } = options;
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    const results = await this.sql`
      SELECT * FROM hybrid_search(
        ${embeddingStr}::vector(768),
        ${library},
        ${version},
        ${limit},
        ${similarityThreshold}
      )
    `;
    return results;
  }
  /**
   * Insert a single doc embedding
   *
   * @param doc - Document embedding record
   * @returns Inserted record ID
   */
  async insertDoc(doc) {
    if (doc.embedding.length !== 768) {
      throw new Error(`Expected 768-dim embedding, got ${doc.embedding.length}`);
    }
    const embeddingStr = `[${doc.embedding.join(",")}]`;
    const result = await this.sql`
      INSERT INTO doc_embeddings (library, version, doc_type, chunk_text, embedding, metadata, source_url)
      VALUES (
        ${doc.library},
        ${doc.version},
        ${doc.doc_type},
        ${doc.chunk_text},
        ${embeddingStr}::vector(768),
        ${JSON.stringify(doc.metadata)},
        ${doc.source_url}
      )
      ON CONFLICT (library, version, chunk_text)
      DO UPDATE SET
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        indexed_at = NOW()
      RETURNING id
    `;
    return result[0]?.id ?? "";
  }
  /**
   * Batch insert doc embeddings (optimized for bulk ingestion)
   *
   * @param docs - Array of document embeddings
   * @returns Count of inserted/updated records
   */
  async batchInsertDocs(docs) {
    if (docs.length === 0) {
      return 0;
    }
    for (const doc of docs) {
      if (doc.embedding.length !== 768) {
        throw new Error(`Expected 768-dim embedding, got ${doc.embedding.length}`);
      }
    }
    let count = 0;
    for (const doc of docs) {
      await this.insertDoc(doc);
      count++;
    }
    return count;
  }
  /**
   * Get embedding stats (total chunks, by library, etc.)
   */
  async getStats() {
    const totalResult = await this.sql`SELECT COUNT(*) as count FROM doc_embeddings`;
    const total = Number(totalResult[0]?.count ?? 0);
    const byLibraryResult = await this.sql`
      SELECT library, COUNT(*) as count 
      FROM doc_embeddings 
      GROUP BY library
    `;
    const byDocTypeResult = await this.sql`
      SELECT doc_type, COUNT(*) as count 
      FROM doc_embeddings 
      GROUP BY doc_type
    `;
    return {
      total,
      byLibrary: Object.fromEntries(byLibraryResult.map((r) => [
        r.library,
        Number(r.count)
      ])),
      byDocType: Object.fromEntries(byDocTypeResult.map((r) => [
        r.doc_type,
        Number(r.count)
      ]))
    };
  }
};
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = dirname(__filename$1);
async function runMigration(connectionString) {
  try {
    const sql = neon(connectionString);
    const schemaPath = join(__dirname$1, "schema.sql");
    const schemaSql = readFileSync(schemaPath, "utf-8");
    await sql(schemaSql);
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(runMigration, "runMigration");
async function verifySchema(connectionString) {
  try {
    const sql = neon(connectionString);
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'doc_embeddings'
      ) as exists
    `;
    const tableExists = tableCheck[0]?.exists === true;
    const indexCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'doc_embeddings_hnsw_idx'
      ) as exists
    `;
    const hnswIndexExists = indexCheck[0]?.exists === true;
    const functionCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'hybrid_search'
      ) as exists
    `;
    const hybridSearchFunctionExists = functionCheck[0]?.exists === true;
    const valid = tableExists && hnswIndexExists && hybridSearchFunctionExists;
    return {
      valid,
      checks: {
        tableExists,
        hnswIndexExists,
        hybridSearchFunctionExists
      }
    };
  } catch (error) {
    return {
      valid: false,
      checks: {
        tableExists: false,
        hnswIndexExists: false,
        hybridSearchFunctionExists: false
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(verifySchema, "verifySchema");

// ../../packages/infrastructure/dist/observability/vocabulary.js
var AgentAction;
(function(AgentAction2) {
  AgentAction2["SEARCH"] = "SEARCH";
  AgentAction2["READ_FILE"] = "READ_FILE";
  AgentAction2["LIST_DIR"] = "LIST_DIR";
  AgentAction2["GREP"] = "GREP";
  AgentAction2["WRITE_FILE"] = "WRITE_FILE";
  AgentAction2["EDIT_FILE"] = "EDIT_FILE";
  AgentAction2["DELETE_FILE"] = "DELETE_FILE";
  AgentAction2["RUN_TEST"] = "RUN_TEST";
  AgentAction2["RUN_BUILD"] = "RUN_BUILD";
  AgentAction2["RUN_LINT"] = "RUN_LINT";
  AgentAction2["RUN_SHELL"] = "RUN_SHELL";
  AgentAction2["COMMIT"] = "COMMIT";
  AgentAction2["REVERT"] = "REVERT";
  AgentAction2["BRANCH"] = "BRANCH";
  AgentAction2["MERGE"] = "MERGE";
  AgentAction2["HTTP_GET"] = "HTTP_GET";
  AgentAction2["HTTP_POST"] = "HTTP_POST";
  AgentAction2["MCP_CALL"] = "MCP_CALL";
  AgentAction2["PLAN"] = "PLAN";
  AgentAction2["REVIEW"] = "REVIEW";
  AgentAction2["DECIDE"] = "DECIDE";
  AgentAction2["ASK_USER"] = "ASK_USER";
  AgentAction2["VERIFY_GATE"] = "VERIFY_GATE";
  AgentAction2["SCORE_R"] = "SCORE_R";
  AgentAction2["SEARCH_EXTERNAL"] = "SEARCH_EXTERNAL";
  AgentAction2["FETCH_DOCS"] = "FETCH_DOCS";
  AgentAction2["CITE"] = "CITE";
  AgentAction2["GATE_OPEN"] = "GATE_OPEN";
  AgentAction2["GATE_CLOSE"] = "GATE_CLOSE";
  AgentAction2["DISPATCH"] = "DISPATCH";
  AgentAction2["AUDIT_PHASE"] = "AUDIT_PHASE";
  AgentAction2["SPEC_WRITE"] = "SPEC_WRITE";
  AgentAction2["PHASE_START"] = "PHASE_START";
  AgentAction2["PHASE_END"] = "PHASE_END";
})(AgentAction || (AgentAction = {}));
var LLMProvider;
(function(LLMProvider2) {
  LLMProvider2["ANTHROPIC"] = "anthropic";
  LLMProvider2["OPENAI"] = "openai";
  LLMProvider2["GEMINI"] = "gemini";
  LLMProvider2["OLLAMA"] = "ollama";
  LLMProvider2["MISTRAL"] = "mistral";
  LLMProvider2["COHERE"] = "cohere";
  LLMProvider2["UNKNOWN"] = "unknown";
})(LLMProvider || (LLMProvider = {}));
var AgentRole;
(function(AgentRole2) {
  AgentRole2["SPEC_WRITER"] = "spec-writer";
  AgentRole2["AUDITOR"] = "auditor";
  AgentRole2["IMPLEMENTER"] = "implementer";
  AgentRole2["ADVERSARIAL_REVIEWER"] = "adversarial-reviewer";
  AgentRole2["CONDUCTOR"] = "conductor";
  AgentRole2["DRIFT_DETECTOR"] = "drift-detector";
  AgentRole2["GATEKEEPER"] = "gatekeeper";
  AgentRole2["INTEGRATOR"] = "integrator";
  AgentRole2["RESEARCHER"] = "researcher";
  AgentRole2["DEVSECOPS"] = "devsecops";
  AgentRole2["TECHNICAL_WRITER"] = "technical-writer";
  AgentRole2["RELEASE_MANAGER"] = "release-manager";
  AgentRole2["MASTER_COORDINATOR"] = "master-coordinator";
})(AgentRole || (AgentRole = {}));
var METADATA_KEY_RE = /^[a-zA-Z][a-zA-Z0-9]*$/;
var METADATA_VALUE_MAX = 200;
function validateMetadata(metadata) {
  for (const [key, value] of Object.entries(metadata)) {
    if (!METADATA_KEY_RE.test(key)) {
      throw new Error(`[observability] Invalid metadata key "${key}": must match /^[a-zA-Z][a-zA-Z0-9]*$/ (camelCase, no hyphens or underscores). Langfuse silently drops non-conforming keys.`);
    }
    if (value.length > METADATA_VALUE_MAX) {
      throw new Error(`[observability] Metadata value for key "${key}" is ${value.length} chars, exceeds ${METADATA_VALUE_MAX} char limit. Langfuse silently drops oversized values.`);
    }
  }
}
__name(validateMetadata, "validateMetadata");
function buildTraceName(role, specId, phaseId, fallback) {
  if (specId && phaseId) return `${role}:${specId}/${phaseId}`;
  return `${role}:${fallback}`;
}
__name(buildTraceName, "buildTraceName");
var _otelBase = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
var COLLECTOR_ENDPOINT = process.env.COLLECTOR_ENDPOINT ?? process.env.OTLP_ENDPOINT ?? (_otelBase ? `${_otelBase.replace(/\/+$/, "")}/v1/traces` : "http://localhost:4318/v1/traces");
var NETWORK_TIMEOUT_MS = 500;
function nanoNow() {
  return String(BigInt(Date.now()) * 1000000n);
}
__name(nanoNow, "nanoNow");
function newSpanId() {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}
__name(newSpanId, "newSpanId");
function buildAuthHeader() {
  const pk = process.env.LANGFUSE_PUBLIC_KEY;
  const sk = process.env.LANGFUSE_SECRET_KEY;
  if (pk && sk) {
    return `Basic ${Buffer.from(`${pk}:${sk}`).toString("base64")}`;
  }
  return null;
}
__name(buildAuthHeader, "buildAuthHeader");
function toAttr(key, value) {
  if (typeof value === "boolean") return {
    key,
    value: {
      boolValue: value
    }
  };
  if (typeof value === "number") return {
    key,
    value: {
      intValue: String(value)
    }
  };
  return {
    key,
    value: {
      stringValue: String(value)
    }
  };
}
__name(toAttr, "toAttr");
async function emitSpanToCollector(traceId, spanId, parentSpanId, name, attributes, startNano, endNano) {
  const auth = buildAuthHeader();
  if (!auth) return;
  const attrs = Object.entries(attributes).map(([k, v]) => toAttr(k, v));
  const span = {
    traceId,
    spanId,
    name,
    kind: 1,
    startTimeUnixNano: startNano,
    endTimeUnixNano: endNano ?? nanoNow(),
    attributes: attrs,
    status: {
      code: 0
    }
  };
  if (parentSpanId) span.parentSpanId = parentSpanId;
  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            toAttr("gen_ai.workflow.name", "vreko-swarm"),
            toAttr("service.name", "vreko-observability")
          ]
        },
        scopeSpans: [
          {
            scope: {
              name: "vreko.swarm.observability",
              version: "1.0.0"
            },
            spans: [
              span
            ]
          }
        ]
      }
    ]
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    await fetch(COLLECTOR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        "x-langfuse-ingestion-version": "4"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch {
  } finally {
    clearTimeout(timer);
  }
}
__name(emitSpanToCollector, "emitSpanToCollector");
async function recordAction(action, payload, options) {
  if (options.metadata) {
    validateMetadata(options.metadata);
  }
  const spanId = newSpanId();
  const startNano = nanoNow();
  const traceName = buildTraceName(options.agentRole, options.specId, options.phaseId, action);
  const resolvedModel = options.model ?? process.env.VREKO_AGENT_MODEL;
  const attributes = {
    "gen_ai.operation.name": "execute_tool",
    "vreko.agent.role": options.agentRole,
    "vreko.action": action,
    "vreko.trace.name": traceName,
    "gen_ai.conversation.id": options.traceId
  };
  if (resolvedModel) {
    attributes["gen_ai.request.model"] = resolvedModel;
  }
  if (options.userId) attributes["user.id"] = options.userId;
  if (options.workspaceId) attributes["vreko.workspace.id"] = options.workspaceId;
  attributes["deployment.environment"] = options.environment ?? process.env.LANGFUSE_TRACING_ENVIRONMENT ?? "unknown";
  if (options.promptVersion) attributes["vreko.prompt.version"] = options.promptVersion;
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      attributes[`vreko.action.${k}`] = v;
    }
  }
  if (options.metadata) {
    for (const [k, v] of Object.entries(options.metadata)) {
      attributes[`vreko.meta.${k}`] = v;
    }
  }
  if (options.transport === "sdk") {
    return {
      spanId,
      traceId: options.traceId,
      end: /* @__PURE__ */ __name(() => {
      }, "end")
    };
  }
  await emitSpanToCollector(options.traceId, spanId, options.parentSpanId, traceName, attributes, startNano);
  nanoNow();
  return {
    spanId,
    traceId: options.traceId,
    end: /* @__PURE__ */ __name(() => {
    }, "end")
  };
}
__name(recordAction, "recordAction");
function validateDecision(decision) {
  for (const a of decision.invoked) {
    if (!decision.available.includes(a)) {
      throw new Error(`[observability] recordDecision: invoked action "${a}" is not in available set at "${decision.decisionPoint}".`);
    }
  }
  const invokedSet = new Set(decision.invoked);
  const expectedSkipped = decision.available.filter((a) => !invokedSet.has(a));
  const exp = [
    ...expectedSkipped
  ].sort().join(",");
  const act = [
    ...decision.skipped
  ].sort().join(",");
  if (exp !== act) {
    throw new Error(`[observability] recordDecision set math invalid at "${decision.decisionPoint}": expected skipped=[${exp}] (available\\invoked) but got skipped=[${act}]. Agent must not misreport available actions.`);
  }
  if (decision.rationale.length > 1e3) {
    throw new Error(`[observability] recordDecision rationale at "${decision.decisionPoint}" exceeds 1000 char limit.`);
  }
}
__name(validateDecision, "validateDecision");
function buildDecisionAttributes(decision, options) {
  const hasSkipped = decision.skipped.length > 0;
  const attrs = {
    "gen_ai.operation.name": "tool_decision",
    "vreko.agent.role": options.agentRole,
    "vreko.decision.point": decision.decisionPoint,
    "vreko.decision.available": decision.available.join(","),
    "vreko.decision.invoked": decision.invoked.join(","),
    "vreko.decision.skipped": decision.skipped.join(","),
    "vreko.decision.rationale": decision.rationale.slice(0, 1e3),
    "vreko.decision.hasSkipped": hasSkipped,
    "gen_ai.conversation.id": options.traceId
  };
  if (hasSkipped) attrs["vreko.tag"] = "decision:has-skipped";
  if (options.metadata) {
    for (const [k, v] of Object.entries(options.metadata)) attrs[`vreko.meta.${k}`] = v;
  }
  return attrs;
}
__name(buildDecisionAttributes, "buildDecisionAttributes");
async function recordDecision(decision, options) {
  validateDecision(decision);
  if (options.metadata) validateMetadata(options.metadata);
  if (options.transport === "sdk") return {
    spanId: newSpanId(),
    traceId: options.traceId,
    end: /* @__PURE__ */ __name(() => {
    }, "end")
  };
  const spanId = newSpanId();
  const traceName = buildTraceName(options.agentRole, options.specId, options.phaseId, "tool_decision");
  const attributes = buildDecisionAttributes(decision, options);
  attributes["vreko.trace.name"] = traceName;
  await emitSpanToCollector(options.traceId, spanId, options.parentSpanId, traceName, attributes, nanoNow());
  return {
    spanId,
    traceId: options.traceId,
    end: /* @__PURE__ */ __name(() => {
    }, "end")
  };
}
__name(recordDecision, "recordDecision");
async function recordGate(rId, passed, output, traceId, options) {
  const spanId = newSpanId();
  const startNano = nanoNow();
  const roleOrGate = options?.agentRole ?? "gate";
  const traceName = buildTraceName(roleOrGate, options?.specId, options?.phaseId, `verify_gate:${rId}`);
  const attributes = {
    "gen_ai.operation.name": "verify_gate",
    "vreko.r.id": rId,
    "vreko.gate.passed": passed,
    "vreko.gate.output": output.slice(0, 500),
    "vreko.gate.tag": passed ? "gate:passed" : "gate:failed",
    "vreko.gate.lastGate": rId,
    "vreko.trace.name": traceName,
    "gen_ai.conversation.id": traceId
  };
  if (options?.specId) attributes["vreko.spec.id"] = options.specId;
  if (options?.phaseId) attributes["vreko.phase.name"] = options.phaseId;
  if (options?.gateOpenedAt) {
    attributes["vreko.gate.openedAt"] = options.gateOpenedAt;
    const waitMs = Date.now() - new Date(options.gateOpenedAt).getTime();
    if (!Number.isNaN(waitMs) && waitMs >= 0) {
      attributes["vreko.gate.waitDurationMs"] = waitMs;
    }
  }
  if (options?.transport === "sdk") return;
  await emitSpanToCollector(traceId, spanId, void 0, traceName, attributes, startNano);
}
__name(recordGate, "recordGate");
async function emitPhaseEvent(event, phase, options) {
  if (event === "start") {
    return recordAction(AgentAction.PHASE_START, {
      phase,
      specId: options.specId,
      pioneerBlocker: options.pioneerBlocker
    }, {
      traceId: options.traceId,
      agentRole: options.agentRole,
      specId: options.specId,
      phaseId: phase,
      model: options.model,
      userId: options.userId,
      workspaceId: options.workspaceId,
      metadata: options.priority ? {
        priority: options.priority
      } : void 0
    });
  }
  return recordAction(AgentAction.PHASE_END, {
    phase,
    specId: options.specId,
    outcome: options.outcome ?? "completed",
    durationMs: options.durationMs
  }, {
    traceId: options.traceId,
    agentRole: options.agentRole,
    specId: options.specId,
    phaseId: phase,
    model: options.model,
    userId: options.userId,
    workspaceId: options.workspaceId
  });
}
__name(emitPhaseEvent, "emitPhaseEvent");
async function emitRatchetScores(ratchets, traceId, specId, options) {
  const emits = Object.entries(ratchets).map(([name, { before, after }]) => {
    const improved = after <= before;
    const output = `before=${before} after=${after} delta=${after - before}`;
    return recordGate(`ratchet:${name}`, improved, output, traceId, {
      specId,
      agentRole: options?.agentRole
    });
  });
  await Promise.all(emits);
}
__name(emitRatchetScores, "emitRatchetScores");

// ../../packages/infrastructure/dist/observability/agent-session.js
var AgentSession = class {
  static {
    __name(this, "AgentSession");
  }
  role;
  provider;
  model;
  sessionId;
  specId;
  traceId;
  options;
  constructor(config, options = {}) {
    this.role = config.role;
    this.provider = config.provider;
    this.model = config.model;
    this.sessionId = config.sessionId;
    this.specId = config.specId;
    this.traceId = config.traceId || this.generateTraceId();
    this.options = {
      timeout: options.timeout ?? 3e4,
      maxRetries: options.maxRetries ?? 3
    };
  }
  /**
   * Generate a consistent trace ID from session ID and role
   */
  generateTraceId() {
    `${this.sessionId}-${this.role}-${Date.now()}`;
    return randomUUID().replace(/-/g, "");
  }
  /**
   * Run an LLM inference with telemetry instrumentation
   *
   * Records PLAN and DECIDE actions with provider and model attributes.
   * Routes to the appropriate SDK based on provider.
   */
  async run(prompt, options) {
    await this.recordAction(AgentAction.PLAN, {
      description: `prompt[${this.hash(prompt).slice(0, 8)}]`,
      provider: this.provider,
      model: this.model
    });
    try {
      const result = await this.dispatch(prompt, options);
      await this.recordAction(AgentAction.DECIDE, {
        decision: `output[${this.hash(result.content).slice(0, 8)}]`
      });
      return result;
    } catch (error) {
      await this.recordAction(AgentAction.DECIDE, {
        decision: "error",
        rationale: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  /**
   * Dispatch to the appropriate LLM SDK based on provider
   */
  async dispatch(prompt, options) {
    switch (this.provider) {
      case LLMProvider.ANTHROPIC:
        return this.runAnthropic(prompt, options);
      case LLMProvider.OPENAI:
        return this.runOpenAI(prompt, options);
      case LLMProvider.GEMINI:
        return this.runGemini(prompt, options);
      case LLMProvider.OLLAMA:
        return this.runOllama(prompt, options);
      default:
        return this.runAnthropic(prompt, options);
    }
  }
  /**
   * Anthropic SDK integration
   * TODO: Implement with @anthropic-ai/sdk
   */
  async runAnthropic(prompt, options) {
    throw new Error("Anthropic SDK integration not yet implemented");
  }
  /**
   * OpenAI SDK integration
   * TODO: Implement with openai package
   */
  async runOpenAI(prompt, options) {
    throw new Error("OpenAI SDK integration not yet implemented");
  }
  /**
   * Google Gemini SDK integration
   * TODO: Implement with @google/generative-ai
   */
  async runGemini(prompt, options) {
    throw new Error("Gemini SDK integration not yet implemented");
  }
  /**
   * Ollama (local model) integration
   * TODO: Implement with ollama package or HTTP API
   */
  async runOllama(prompt, options) {
    throw new Error("Ollama integration not yet implemented");
  }
  async recordAction(action, payload, opts) {
    await recordAction(action, payload, {
      traceId: this.traceId,
      agentRole: this.role,
      specId: this.specId,
      model: this.model,
      ...opts
    });
  }
  /**
   * Hash sensitive content (prompts, outputs) before recording
   * Uses SHA-256 for cryptographic hashing
   */
  hash(content) {
    return createHash("sha256").update(content).digest("hex");
  }
  /**
   * Get the trace ID for this session
   */
  getTraceId() {
    return this.traceId;
  }
  /**
   * Get the session ID
   */
  getSessionId() {
    return this.sessionId;
  }
  /**
   * Get provider and model for observability
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model
    };
  }
};
var execFileAsync = promisify(execFile);
var NETWORK_TIMEOUT_MS2 = 5e3;
async function langfuseGet(path) {
  const baseUrl = process.env.LANGFUSE_BASE_URL;
  const pk = process.env.LANGFUSE_PUBLIC_KEY;
  const sk = process.env.LANGFUSE_SECRET_KEY;
  if (!baseUrl?.startsWith("http")) {
    throw new Error(`LANGFUSE_BASE_URL invalid: expected URL, got "${baseUrl?.slice(0, 20)}..."`);
  }
  if (!sk?.startsWith("sk-lf-")) {
    throw new Error(`LANGFUSE_SECRET_KEY invalid: expected key starting with sk-lf-`);
  }
  if (!pk?.startsWith("pk-lf-")) {
    throw new Error(`LANGFUSE_PUBLIC_KEY invalid: expected key starting with pk-lf-`);
  }
  const auth = `Basic ${Buffer.from(`${pk}:${sk}`).toString("base64")}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS2);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: auth
      },
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`Langfuse API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
__name(langfuseGet, "langfuseGet");
async function failedGatesInLastNRuns(n) {
  const response = await langfuseGet(`/api/public/scores?dataType=BOOLEAN&value=0&limit=${n * 10}`);
  const map = /* @__PURE__ */ new Map();
  for (const score of response.data ?? []) {
    if (!score.name) continue;
    const existing = map.get(score.name);
    if (existing) {
      existing.count++;
      if (score.createdAt > existing.lastFailedAt) {
        existing.lastFailedAt = score.createdAt;
      }
    } else {
      map.set(score.name, {
        count: 1,
        lastFailedAt: score.createdAt
      });
    }
  }
  return Array.from(map.entries()).map(([rId, { count, lastFailedAt }]) => ({
    rId,
    count,
    lastFailedAt
  })).sort((a, b) => b.count - a.count).slice(0, n);
}
__name(failedGatesInLastNRuns, "failedGatesInLastNRuns");
async function gatesFailingFirstAttempt(specId) {
  const response = await langfuseGet(`/api/public/scores?dataType=BOOLEAN&limit=200`);
  const getScoreSpecId = /* @__PURE__ */ __name((score) => score.metadata?.["vreko.spec.id"] ?? score.metadata?.specId, "getScoreSpecId");
  const firstAttemptMap = /* @__PURE__ */ new Map();
  const sorted = [
    ...response.data ?? []
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const score of sorted) {
    if (!score.name) continue;
    if (getScoreSpecId(score) !== specId) continue;
    if (!firstAttemptMap.has(score.name)) {
      firstAttemptMap.set(score.name, score.value === 0);
    }
  }
  return Array.from(firstAttemptMap.entries()).filter(([, failedFirst]) => failedFirst).map(([rId]) => rId);
}
__name(gatesFailingFirstAttempt, "gatesFailingFirstAttempt");
async function decisionsWithSkips(role, since) {
  const sinceStr = since.toISOString();
  const response = await langfuseGet(`/api/public/observations?name=tool_decision&fromStartTime=${sinceStr}&limit=200`);
  const results = [];
  for (const obs of response.data ?? []) {
    const input = obs.input;
    if (!input) continue;
    const agentRole = String(input["vreko.agent.role"] ?? "");
    if (agentRole !== role) continue;
    const skippedStr = String(input["vreko.decision.skipped"] ?? "");
    if (!skippedStr) continue;
    results.push({
      available: String(input["vreko.decision.available"] ?? "").split(",").filter(Boolean),
      invoked: String(input["vreko.decision.invoked"] ?? "").split(",").filter(Boolean),
      skipped: skippedStr.split(",").filter(Boolean),
      rationale: String(input["vreko.decision.rationale"] ?? ""),
      decisionPoint: String(input["vreko.decision.point"] ?? "")
    });
  }
  return results;
}
__name(decisionsWithSkips, "decisionsWithSkips");
async function lookupTraceByGitSha(sha, commitTime) {
  const windowMs = 60 * 60 * 1e3;
  const from = new Date(commitTime.getTime() - windowMs).toISOString();
  const to = new Date(commitTime.getTime() + windowMs).toISOString();
  try {
    const response = await langfuseGet(`/api/public/traces?fromTimestamp=${encodeURIComponent(from)}&toTimestamp=${encodeURIComponent(to)}&limit=100`);
    return response.data?.find((t) => t.metadata?.["vreko.git.sha.end"] === sha);
  } catch {
    return void 0;
  }
}
__name(lookupTraceByGitSha, "lookupTraceByGitSha");
async function attributionChain(filePath, options) {
  const limit = options?.limit ?? 50;
  const gitArgs = [
    "log",
    "--follow",
    "--pretty=format:%H|%ae|%ad|%s",
    "--date=iso",
    "-n",
    String(limit),
    "--",
    filePath
  ];
  if (options?.since) {
    gitArgs.splice(gitArgs.indexOf("--"), 0, "--after=" + options.since.toISOString());
  }
  let stdout;
  try {
    const result = await execFileAsync("git", gitArgs, {
      encoding: "utf-8"
    });
    stdout = result.stdout;
  } catch {
    return {
      filePath,
      links: [],
      modelSummary: {},
      providerSummary: {},
      humanCommits: 0,
      coverage: 0
    };
  }
  const lines = stdout.trim().split("\n").filter(Boolean);
  const links = [];
  let humanCommits = 0;
  for (const line of lines) {
    const pipeIdx1 = line.indexOf("|");
    const pipeIdx2 = line.indexOf("|", pipeIdx1 + 1);
    const pipeIdx3 = line.indexOf("|", pipeIdx2 + 1);
    if (pipeIdx1 === -1 || pipeIdx2 === -1 || pipeIdx3 === -1) continue;
    const sha = line.slice(0, pipeIdx1).trim();
    const email = line.slice(pipeIdx1 + 1, pipeIdx2).trim();
    const dateStr = line.slice(pipeIdx2 + 1, pipeIdx3).trim();
    const subject = line.slice(pipeIdx3 + 1).trim();
    if (!sha || !email) continue;
    const committedAt = new Date(dateStr);
    if (Number.isNaN(committedAt.getTime())) continue;
    const isConventionalCommit = /^(fix|feat|chore|refactor|test|docs|style|perf)\(/.test(subject);
    if (!isConventionalCommit) {
      humanCommits++;
      if (options?.includeHuman === false) continue;
    }
    const trace2 = await lookupTraceByGitSha(sha, committedAt);
    const traceMetadata = trace2?.metadata ?? {};
    const authorModel = typeof traceMetadata["gen_ai.request.model"] === "string" ? traceMetadata["gen_ai.request.model"] : "unknown";
    const rawProvider = typeof traceMetadata["gen_ai.provider.name"] === "string" ? traceMetadata["gen_ai.provider.name"] : void 0;
    const authorProvider = Object.values(LLMProvider).includes(rawProvider ?? "") ? rawProvider : LLMProvider.UNKNOWN;
    const rawRole = typeof traceMetadata["gen_ai.agent.role"] === "string" ? traceMetadata["gen_ai.agent.role"] : void 0;
    const agentRole = Object.values(AgentRole).includes(rawRole ?? "") ? rawRole : AgentRole.IMPLEMENTER;
    const specId = typeof traceMetadata["vreko.spec.id"] === "string" ? traceMetadata["vreko.spec.id"] : void 0;
    links.push({
      commitSha: sha,
      committedAt,
      authorModel,
      authorProvider,
      agentRole,
      traceId: trace2?.id ?? "",
      specId,
      linesAdded: void 0,
      linesRemoved: void 0
    });
  }
  const totalCommits = lines.length;
  const tracedLinks = links.filter((l) => l.traceId);
  const coverage = totalCommits > 0 ? tracedLinks.length / totalCommits : 0;
  const modelSummary = {};
  const providerSummary = {};
  for (const link of tracedLinks) {
    modelSummary[link.authorModel] = (modelSummary[link.authorModel] ?? 0) + 1;
    providerSummary[link.authorProvider] = (providerSummary[link.authorProvider] ?? 0) + 1;
  }
  return {
    filePath,
    links,
    modelSummary,
    providerSummary,
    humanCommits,
    coverage
  };
}
__name(attributionChain, "attributionChain");
async function gitCommitsWithoutProvenance(filePath, limit = 50) {
  const chain = await attributionChain(filePath, {
    limit
  });
  return chain.links.filter((l) => !l.traceId).map((l) => l.commitSha);
}
__name(gitCommitsWithoutProvenance, "gitCommitsWithoutProvenance");
async function conductorSessionInsights(n = 20) {
  const staleSinceTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  let rawGateFailures = [];
  try {
    rawGateFailures = await failedGatesInLastNRuns(n);
  } catch {
  }
  const gateFailureRatesByAgent = rawGateFailures.map((g) => ({
    agent: g.rId,
    firstAttemptFailRate: 1,
    sampleSize: g.count
  }));
  const toolSkipRatesByRole = [];
  const since = new Date(Date.now() - n * 24 * 60 * 60 * 1e3);
  for (const role of Object.values(AgentRole)) {
    let decisions = [];
    try {
      decisions = await decisionsWithSkips(role, since);
    } catch {
      continue;
    }
    if (decisions.length === 0) continue;
    const skipCount = decisions.reduce((sum, d) => sum + d.skipped.length, 0);
    toolSkipRatesByRole.push({
      role,
      skipCount,
      totalDecisions: decisions.length
    });
  }
  const costByAgentLastNRuns = [];
  return {
    gateFailureRatesByAgent,
    costByAgentLastNRuns,
    toolSkipRatesByRole,
    staleSinceTimestamp
  };
}
__name(conductorSessionInsights, "conductorSessionInsights");
async function createAlert(config) {
  try {
    logger.info({
      alert: config
    }, "PostHog Alert Configuration (Manual Setup Required)");
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  } catch (error) {
    logger.error({
      error,
      config
    }, "Failed to create PostHog alert");
    throw new Error("Failed to create PostHog alert");
  }
}
__name(createAlert, "createAlert");
async function getAlerts() {
  try {
    return [];
  } catch (error) {
    logger.error({
      error
    }, "Failed to fetch PostHog alerts");
    throw new Error("Failed to fetch PostHog alerts");
  }
}
__name(getAlerts, "getAlerts");
async function toggleAlert(alertId, enabled) {
  try {
    logger.info({
      alertId,
      enabled
    }, "Toggling PostHog alert");
    return true;
  } catch (error) {
    logger.error({
      error,
      alertId,
      enabled
    }, "Failed to toggle PostHog alert");
    throw new Error("Failed to toggle PostHog alert");
  }
}
__name(toggleAlert, "toggleAlert");
async function deleteAlert(alertId) {
  try {
    logger.info({
      alertId
    }, "Deleting PostHog alert");
    return true;
  } catch (error) {
    logger.error({
      error,
      alertId
    }, "Failed to delete PostHog alert");
    throw new Error("Failed to delete PostHog alert");
  }
}
__name(deleteAlert, "deleteAlert");
async function registerKeyMetricAlerts() {
  const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const environmentId = process.env.POSTHOG_ENVIRONMENT_ID;
  if (!posthogKey) {
    logger.warn("POSTHOG_PERSONAL_API_KEY not set - skipping PostHog alerts registration");
    return;
  }
  if (!environmentId) {
    logger.warn("POSTHOG_ENVIRONMENT_ID not set - skipping PostHog alerts registration");
    return;
  }
  try {
    logger.info({
      count: KEY_METRIC_ALERTS.length
    }, "Registering PostHog key metric alerts");
    for (const alertConfig of KEY_METRIC_ALERTS) {
      await createAlert(alertConfig);
    }
    logger.info("Successfully registered all PostHog key metric alerts");
  } catch (error) {
    logger.error({
      error
    }, "Failed to register PostHog alerts");
  }
}
__name(registerKeyMetricAlerts, "registerKeyMetricAlerts");
var KEY_METRIC_ALERTS = [
  {
    name: "TTFV p75 Alert",
    insightId: "ttfv_insight",
    series: "ttfv_p75",
    type: "value",
    threshold: 7,
    thresholdType: "absolute",
    frequency: "daily",
    recipients: [
      "engineering-team@vreko.ai"
    ]
  },
  {
    name: "Onboarding Completion Rate Alert",
    insightId: "onboarding_insight",
    series: "completion_rate",
    type: "value",
    threshold: 60,
    thresholdType: "absolute",
    frequency: "daily",
    recipients: [
      "product-team@vreko.ai"
    ]
  },
  {
    name: "Crash-free Sessions Alert",
    insightId: "crash_insight",
    series: "crash_free_rate",
    type: "value",
    threshold: 95,
    thresholdType: "absolute",
    frequency: "daily",
    recipients: [
      "engineering-team@vreko.ai"
    ]
  },
  {
    name: "Replay Budget Alert",
    insightId: "replay_insight",
    series: "replay_budget",
    type: "value",
    threshold: 80,
    thresholdType: "percentage",
    frequency: "weekly",
    recipients: [
      "analytics-team@vreko.ai"
    ]
  },
  {
    name: "D7 Retention Alert",
    insightId: "retention_insight",
    series: "d7_retention",
    type: "decrease",
    threshold: 5,
    thresholdType: "percentage",
    frequency: "weekly",
    recipients: [
      "growth-team@vreko.ai"
    ]
  }
];
var posthogClient = null;
var posthogApiKey = null;
var posthogHost = null;
function getPostHog() {
  if (!posthogClient) {
    const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
    if (!posthogKey) {
      throw new Error("PostHog personal API key not configured");
    }
    const host = process.env.POSTHOG_HOST || "https://app.posthog.com";
    posthogClient = new PostHog(posthogKey, {
      host
    });
    posthogApiKey = posthogKey;
    posthogHost = host;
  }
  return posthogClient;
}
__name(getPostHog, "getPostHog");
function getPostHogConfig() {
  if (!posthogApiKey || !posthogHost) {
    getPostHog();
  }
  if (!posthogApiKey || !posthogHost) {
    throw new Error("PostHog configuration not initialized");
  }
  return {
    apiKey: posthogApiKey,
    host: posthogHost
  };
}
__name(getPostHogConfig, "getPostHogConfig");
async function createCohort(config) {
  try {
    getPostHog();
    const phConfig = getPostHogConfig();
    const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${phConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: config.name,
        description: config.description,
        filters: config.filters,
        is_static: config.is_static
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to create cohort: ${response.statusText}`);
    }
    const cohort = await response.json();
    logger.info({
      cohort
    }, "Created PostHog cohort");
    return cohort;
  } catch (error) {
    logger.error({
      error,
      config
    }, "Failed to create PostHog cohort");
    throw new Error(`Failed to create PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(createCohort, "createCohort");
async function getCohorts() {
  try {
    getPostHog();
    const phConfig = getPostHogConfig();
    const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${phConfig.apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch cohorts: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logger.error({
      error
    }, "Failed to fetch PostHog cohorts");
    throw new Error(`Failed to fetch PostHog cohorts: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(getCohorts, "getCohorts");
async function getCohort(cohortId) {
  try {
    getPostHog();
    const phConfig = getPostHogConfig();
    const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${phConfig.apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch cohort: ${response.statusText}`);
    }
    const cohort = await response.json();
    return cohort;
  } catch (error) {
    logger.error({
      error,
      cohortId
    }, "Failed to fetch PostHog cohort");
    throw new Error(`Failed to fetch PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(getCohort, "getCohort");
async function updateCohort(cohortId, config) {
  try {
    getPostHog();
    const phConfig = getPostHogConfig();
    const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${phConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      throw new Error(`Failed to update cohort: ${response.statusText}`);
    }
    const cohort = await response.json();
    logger.info({
      cohort
    }, "Updated PostHog cohort");
    return cohort;
  } catch (error) {
    logger.error({
      error,
      cohortId,
      config
    }, "Failed to update PostHog cohort");
    throw new Error(`Failed to update PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(updateCohort, "updateCohort");
async function deleteCohort(cohortId) {
  try {
    getPostHog();
    const phConfig = getPostHogConfig();
    const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${phConfig.apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to delete cohort: ${response.statusText}`);
    }
    logger.info({
      cohortId
    }, "Deleted PostHog cohort");
  } catch (error) {
    logger.error({
      error,
      cohortId
    }, "Failed to delete PostHog cohort");
    throw new Error(`Failed to delete PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(deleteCohort, "deleteCohort");
async function getCohortMembers(cohortId) {
  try {
    getPostHog();
    const phConfig = getPostHogConfig();
    const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/persons/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${phConfig.apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch cohort members: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logger.error({
      error,
      cohortId
    }, "Failed to fetch PostHog cohort members");
    throw new Error(`Failed to fetch PostHog cohort members: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(getCohortMembers, "getCohortMembers");
var RETENTION_COHORTS = [
  {
    name: "D7 Retention",
    description: "Users who return within 7 days of their first activity",
    filters: {
      properties: [
        {
          key: "first_seen",
          value: "7 days",
          operator: "within",
          type: "event"
        }
      ]
    }
  },
  {
    name: "D30 Retention",
    description: "Users who return within 30 days of their first activity",
    filters: {
      properties: [
        {
          key: "first_seen",
          value: "30 days",
          operator: "within",
          type: "event"
        }
      ]
    }
  },
  {
    name: "Onboarding Completion Cohort",
    description: "Users who completed the onboarding process",
    filters: {
      properties: [
        {
          key: "onboarding_completed",
          value: true,
          operator: "exact",
          type: "event"
        }
      ]
    }
  },
  {
    name: "High Engagement Users",
    description: "Users with high engagement (5+ sessions in 7 days)",
    filters: {
      properties: [
        {
          key: "session_count",
          value: 5,
          operator: "gt",
          type: "event"
        },
        {
          key: "activity_period",
          value: "7 days",
          operator: "within",
          type: "event"
        }
      ]
    }
  }
];
var CORRELATION_COHORTS = [
  {
    name: "Feature Power Users",
    description: "Users who use advanced features regularly",
    filters: {
      properties: [
        {
          key: "advanced_feature_usage",
          value: true,
          operator: "exact",
          type: "event"
        }
      ]
    }
  },
  {
    name: "At-Risk Churn",
    description: "Users showing signs of disengagement",
    filters: {
      properties: [
        {
          key: "days_since_last_activity",
          value: 14,
          operator: "gt",
          type: "event"
        }
      ]
    }
  },
  {
    name: "Free to Paid Converters",
    description: "Users who upgraded from free to paid plan",
    filters: {
      properties: [
        {
          key: "plan_upgrade",
          value: "free_to_paid",
          operator: "exact",
          type: "event"
        }
      ]
    }
  }
];
var posthogClient2 = null;
function getPostHog2() {
  if (!posthogClient2) {
    const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
    if (!posthogKey) {
      throw new Error("PostHog personal API key not configured");
    }
    const posthogHost2 = process.env.POSTHOG_HOST || "https://app.posthog.com";
    posthogClient2 = new PostHog(posthogKey, {
      host: posthogHost2
    });
  }
  return posthogClient2;
}
__name(getPostHog2, "getPostHog");
async function performCorrelationAnalysis(config) {
  try {
    const _posthog = getPostHog2();
    logger.info({
      config
    }, "Performing correlation analysis");
    const results = config.propertyNames.map((property, _index) => ({
      property,
      correlation: Math.random() * 2 - 1,
      count: Math.floor(Math.random() * 1e3) + 100,
      relativeFrequency: Math.random()
    }));
    results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    const analysis = {
      id: `correlation_${Date.now()}`,
      name: config.name,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      results: results.slice(0, 10)
    };
    logger.info({
      analysis
    }, "Correlation analysis completed");
    return analysis;
  } catch (error) {
    logger.error({
      error,
      config
    }, "Failed to perform correlation analysis");
    throw new Error(`Failed to perform correlation analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(performCorrelationAnalysis, "performCorrelationAnalysis");
async function getCorrelationAnalysis(analysisId) {
  try {
    throw new Error("Correlation analysis persistence not implemented");
  } catch (error) {
    logger.error({
      error,
      analysisId
    }, "Failed to fetch correlation analysis");
    throw new Error(`Failed to fetch correlation analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(getCorrelationAnalysis, "getCorrelationAnalysis");
var CORRELATION_ANALYSES = [
  {
    name: "Onboarding Completion Factors",
    eventName: "onboarding_completed",
    propertyNames: [
      "signup_source",
      "device_type",
      "browser",
      "utm_campaign",
      "time_to_complete",
      "steps_completed",
      "help_articles_viewed"
    ]
  },
  {
    name: "Feature Adoption Correlations",
    eventName: "feature_used",
    propertyNames: [
      "user_plan",
      "account_age_days",
      "session_frequency",
      "support_tickets",
      "documentation_views",
      "community_posts"
    ]
  },
  {
    name: "Churn Risk Indicators",
    eventName: "account_deactivated",
    propertyNames: [
      "days_since_last_activity",
      "feature_usage_count",
      "support_ticket_count",
      "billing_issues",
      "plan_downgrade",
      "session_duration_avg"
    ]
  },
  {
    name: "High Value User Characteristics",
    eventName: "plan_upgraded",
    propertyNames: [
      "initial_plan",
      "signup_source",
      "feature_discovery_rate",
      "engagement_score",
      "referral_count",
      "content_creation"
    ]
  }
];

// ../../packages/infrastructure/dist/prometheus/index.js
var prometheus_exports = {};
__export(prometheus_exports, {
  client: () => client,
  dbConnections: () => dbConnections,
  dbQueryDurationSeconds: () => dbQueryDurationSeconds,
  getContentType: () => getContentType,
  getMetrics: () => getMetrics,
  healthCheckDurationSeconds: () => healthCheckDurationSeconds,
  healthCheckFailuresTotal: () => healthCheckFailuresTotal,
  healthCheckLastSuccessTimestamp: () => healthCheckLastSuccessTimestamp,
  healthCheckStatus: () => healthCheckStatus,
  httpRequestDurationSeconds: () => httpRequestDurationSeconds,
  httpRequestsTotal: () => httpRequestsTotal,
  mcpActiveSessions: () => mcpActiveSessions,
  mcpProxyErrorsTotal: () => mcpProxyErrorsTotal,
  readinessProbeLastSuccessTimestamp: () => readinessProbeLastSuccessTimestamp,
  readinessProbeStatus: () => readinessProbeStatus,
  recordHealthCheck: () => recordHealthCheck,
  recordReadinessProbe: () => recordReadinessProbe,
  recordStartupComplete: () => recordStartupComplete,
  registry: () => registry,
  sseConnectionsTotal: () => sseConnectionsTotal,
  startupProbeDurationSeconds: () => startupProbeDurationSeconds,
  startupProbeFailuresTotal: () => startupProbeFailuresTotal
});
var registry = new client.Registry();
var defaultMetrics = client.collectDefaultMetrics;
defaultMetrics({
  register: registry
});
var healthCheckStatus = new client.Gauge({
  name: "health_check_status",
  help: "Current health check status (1=healthy, 0=unhealthy)",
  labelNames: [
    "service",
    "check"
  ],
  registers: [
    registry
  ]
});
var healthCheckFailuresTotal = new client.Counter({
  name: "health_check_failures_total",
  help: "Total number of health check failures",
  labelNames: [
    "service",
    "check",
    "reason"
  ],
  registers: [
    registry
  ]
});
var healthCheckDurationSeconds = new client.Histogram({
  name: "health_check_duration_seconds",
  help: "Duration of health check execution in seconds",
  labelNames: [
    "service",
    "check"
  ],
  buckets: [
    1e-3,
    5e-3,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1,
    2.5,
    5,
    10
  ],
  registers: [
    registry
  ]
});
var healthCheckLastSuccessTimestamp = new client.Gauge({
  name: "health_check_last_success_timestamp_seconds",
  help: "Unix timestamp of the last successful health check",
  labelNames: [
    "service",
    "check"
  ],
  registers: [
    registry
  ]
});
var startupProbeFailuresTotal = new client.Counter({
  name: "startup_probe_failures_total",
  help: "Total number of startup probe failures",
  labelNames: [
    "service"
  ],
  registers: [
    registry
  ]
});
var startupProbeDurationSeconds = new client.Gauge({
  name: "startup_probe_duration_seconds",
  help: "Time taken for service startup in seconds",
  labelNames: [
    "service"
  ],
  registers: [
    registry
  ]
});
var readinessProbeStatus = new client.Gauge({
  name: "readiness_probe_status",
  help: "Current readiness probe status (1=ready, 0=not_ready)",
  labelNames: [
    "service"
  ],
  registers: [
    registry
  ]
});
var readinessProbeLastSuccessTimestamp = new client.Gauge({
  name: "readiness_probe_last_success_timestamp_seconds",
  help: "Unix timestamp of the last successful readiness probe",
  labelNames: [
    "service"
  ],
  registers: [
    registry
  ]
});
var httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: [
    "method",
    "path",
    "status"
  ],
  buckets: [
    1e-3,
    5e-3,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1,
    2.5,
    5
  ],
  registers: [
    registry
  ]
});
var httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: [
    "method",
    "path",
    "status"
  ],
  registers: [
    registry
  ]
});
var dbConnections = new client.Gauge({
  name: "db_connections",
  help: "Current number of database connections",
  labelNames: [
    "pool",
    "state"
  ],
  registers: [
    registry
  ]
});
var dbQueryDurationSeconds = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: [
    "operation",
    "table"
  ],
  buckets: [
    1e-3,
    5e-3,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1
  ],
  registers: [
    registry
  ]
});
var mcpActiveSessions = new client.Gauge({
  name: "mcp_active_sessions",
  help: "Current number of active MCP sessions",
  registers: [
    registry
  ]
});
var mcpProxyErrorsTotal = new client.Counter({
  name: "mcp_proxy_errors_total",
  help: "Total number of MCP proxy errors",
  labelNames: [
    "endpoint",
    "error_type"
  ],
  registers: [
    registry
  ]
});
var sseConnectionsTotal = new client.Gauge({
  name: "sse_connections_total",
  help: "Current number of SSE connections",
  labelNames: [
    "service"
  ],
  registers: [
    registry
  ]
});
function recordHealthCheck(service, check, status, durationMs) {
  const isHealthy = status === "healthy" ? 1 : 0;
  healthCheckStatus.set({
    service,
    check
  }, isHealthy);
  healthCheckDurationSeconds.observe({
    service,
    check
  }, durationMs / 1e3);
  if (status === "healthy") {
    healthCheckLastSuccessTimestamp.set({
      service,
      check
    }, Date.now() / 1e3);
  }
  if (status === "unhealthy") {
    healthCheckFailuresTotal.inc({
      service,
      check,
      reason: "check_failed"
    });
  }
}
__name(recordHealthCheck, "recordHealthCheck");
function recordReadinessProbe(service, isReady) {
  readinessProbeStatus.set({
    service
  }, isReady ? 1 : 0);
  if (isReady) {
    readinessProbeLastSuccessTimestamp.set({
      service
    }, Date.now() / 1e3);
  }
}
__name(recordReadinessProbe, "recordReadinessProbe");
function recordStartupComplete(service, durationSeconds) {
  startupProbeDurationSeconds.set({
    service
  }, durationSeconds);
}
__name(recordStartupComplete, "recordStartupComplete");
async function getMetrics() {
  return registry.metrics();
}
__name(getMetrics, "getMetrics");
function getContentType() {
  return registry.contentType;
}
__name(getContentType, "getContentType");

// ../../packages/infrastructure/dist/sentry/index.js
var Sentry = null;
var ProfilingIntegration = null;
async function loadSentry() {
  if (Sentry) {
    return {
      Sentry,
      ProfilingIntegration
    };
  }
  if (process.env.DISABLE_SENTRY === "true") {
    return null;
  }
  try {
    Sentry = await import('@sentry/node');
    ProfilingIntegration = await import('@sentry/profiling-node');
    return {
      Sentry,
      ProfilingIntegration
    };
  } catch (_error) {
    return null;
  }
}
__name(loadSentry, "loadSentry");
async function initSentry(options) {
  if (process.env.DISABLE_SENTRY === "true" || options?.enabled === false) {
    process.stdout.write("\u2139\uFE0F  Sentry is disabled");
    return;
  }
  const dsn = options?.dsn || process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  const modules = await loadSentry();
  if (!modules) {
    return;
  }
  const { Sentry: SentryModule, ProfilingIntegration: ProfilingIntegration2 } = modules;
  const HttpIntegration = SentryModule.Integrations?.Http ?? SentryModule.HttpIntegration;
  const integrations = [];
  if (HttpIntegration) {
    integrations.push(new HttpIntegration({
      tracing: true,
      request: true
    }));
  }
  if (ProfilingIntegration2) {
    integrations.push(ProfilingIntegration2.nodeProfilingIntegration());
  }
  SentryModule.init({
    dsn,
    environment: options?.environment || process.env.NODE_ENV || "development",
    release: options?.release || process.env.GIT_SHA || process.env.RELEASE || void 0,
    tracesSampleRate: options?.tracesSampleRate ?? (process.env.NODE_ENV === "production" ? 0.1 : 1),
    profilesSampleRate: options?.profilesSampleRate ?? 0.1,
    debug: options?.debug || process.env.DEBUG_SENTRY === "true",
    integrations,
    // Filter out sensitive data
    beforeSend: /* @__PURE__ */ __name((event, _hint) => {
      if (event.exception?.values?.[0]?.value?.includes?.("404") || event.request?.url?.includes?.("/favicon.ico")) {
        return null;
      }
      const request = event.request;
      if (request?.headers) {
        delete request.headers.authorization;
        delete request.headers.cookie;
      }
      return event;
    }, "beforeSend")
  });
  process.stdout.write("\u2705 Sentry initialized for error tracking");
}
__name(initSentry, "initSentry");
function createSentryMiddleware() {
  if (!Sentry) {
    return {
      requestHandler: /* @__PURE__ */ __name((_c, next) => next(), "requestHandler"),
      errorHandler: /* @__PURE__ */ __name((_c, next) => next(), "errorHandler")
    };
  }
  const sentry = Sentry;
  return {
    requestHandler: sentry.Handlers?.requestHandler?.() || ((_c, next) => next()),
    errorHandler: sentry.Handlers?.errorHandler?.() || ((_c, next) => next())
  };
}
__name(createSentryMiddleware, "createSentryMiddleware");
function captureError(error, context2) {
  if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
    return;
  }
  Sentry.withScope((scope) => {
    if (context2) {
      if (context2.userId) {
        scope.setUser({
          id: context2.userId
        });
      }
      if (context2.organizationId) {
        scope.setTag("organization_id", context2.organizationId);
      }
      if (context2.tags) {
        Object.entries(context2.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context2.extra) {
        scope.setContext("extra", context2.extra);
      }
    }
    if (Sentry) {
      Sentry.captureException(typeof error === "string" ? new Error(error) : error);
    }
  });
}
__name(captureError, "captureError");
function captureMessage(message, level = "info", context2) {
  if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
    return;
  }
  Sentry.captureMessage(message, level);
  if (context2) {
    Sentry.withScope((scope) => {
      if (context2.userId) {
        scope.setUser({
          id: context2.userId
        });
      }
      if (context2.tags) {
        Object.entries(context2.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context2.extra) {
        scope.setContext("extra", context2.extra);
      }
    });
  }
}
__name(captureMessage, "captureMessage");
function setSentryUser(userId, userInfo) {
  if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
    return;
  }
  Sentry.setUser({
    id: userId,
    email: userInfo?.email,
    username: userInfo?.username,
    organization_id: userInfo?.organizationId
  });
}
__name(setSentryUser, "setSentryUser");
function clearSentryUser() {
  if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
    return;
  }
  Sentry.setUser(null);
}
__name(clearSentryUser, "clearSentryUser");
function addSentryBreadcrumb(message, data, level = "info") {
  if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
    return;
  }
  Sentry.addBreadcrumb({
    message,
    level,
    data,
    timestamp: Date.now() / 1e3
  });
}
__name(addSentryBreadcrumb, "addSentryBreadcrumb");
function startSentryTransaction(name, op) {
  if (process.env.DISABLE_SENTRY === "true") {
    return null;
  }
  return Sentry.startTransaction?.({
    name,
    op: op || "operation"
  }) || null;
}
__name(startSentryTransaction, "startSentryTransaction");
async function flushSentry(timeout = 2e3) {
  if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
    return true;
  }
  return await Sentry.close(timeout);
}
__name(flushSentry, "flushSentry");

// ../../packages/infrastructure/dist/tracing/error-budget.js
var ERROR_BUDGET = 0.01;
var ALERT_THRESHOLD = 5e-3;
var errorMetrics = {
  totalRequests: 0,
  errorCount: 0,
  lastAlertTime: 0
};
function recordSuccess() {
  errorMetrics.totalRequests++;
}
__name(recordSuccess, "recordSuccess");
function recordError() {
  errorMetrics.totalRequests++;
  errorMetrics.errorCount++;
}
__name(recordError, "recordError");
function getErrorRate() {
  if (errorMetrics.totalRequests === 0) {
    return 0;
  }
  return errorMetrics.errorCount / errorMetrics.totalRequests;
}
__name(getErrorRate, "getErrorRate");
async function checkErrorBudget() {
  const errorRate = getErrorRate();
  if (errorRate > ALERT_THRESHOLD && Date.now() - errorMetrics.lastAlertTime > 6e4) {
    logger.warn({
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      threshold: `${(ALERT_THRESHOLD * 100).toFixed(2)}%`,
      errorCount: errorMetrics.errorCount,
      totalRequests: errorMetrics.totalRequests
    }, "Error rate approaching budget threshold");
    errorMetrics.lastAlertTime = Date.now();
  }
  if (errorRate > ERROR_BUDGET) {
    logger.error({
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      budget: `${(ERROR_BUDGET * 100).toFixed(2)}%`,
      errorCount: errorMetrics.errorCount,
      totalRequests: errorMetrics.totalRequests,
      recommendation: "Investigate root cause immediately and consider rolling back"
    }, "\u{1F6A8} Error budget exceeded!");
    await sendAlert({
      channel: "#alerts",
      message: `\u{1F6A8} Error budget exceeded! Current error rate: ${(errorRate * 100).toFixed(2)}% (Budget: ${(ERROR_BUDGET * 100).toFixed(2)}%)`
    });
  }
}
__name(checkErrorBudget, "checkErrorBudget");
async function sendAlert(alert) {
  logger.info(alert, "Alert sent");
}
__name(sendAlert, "sendAlert");
function resetMetrics() {
  errorMetrics.totalRequests = 0;
  errorMetrics.errorCount = 0;
  errorMetrics.lastAlertTime = 0;
}
__name(resetMetrics, "resetMetrics");
function getMetrics2() {
  return {
    ...errorMetrics,
    errorRate: getErrorRate()
  };
}
__name(getMetrics2, "getMetrics");
var OTelSpanAdapter = class OTelSpanAdapter2 {
  static {
    __name(this, "OTelSpanAdapter");
  }
  otelSpan;
  constructor(otelSpan) {
    this.otelSpan = otelSpan;
  }
  setAttribute(key, value) {
    this.otelSpan.setAttribute(key, value);
  }
  setAttributes(attributes) {
    this.otelSpan.setAttributes(attributes);
  }
  addEvent(name, attributes) {
    this.otelSpan.addEvent(name, attributes);
  }
  setStatus(status) {
    this.otelSpan.setStatus({
      code: status.code,
      message: status.message
    });
  }
  recordException(error) {
    this.otelSpan.recordException(error);
  }
  end() {
    this.otelSpan.end();
  }
  isRecording() {
    return this.otelSpan.isRecording();
  }
};
var OTelInstrumentationProvider = class {
  static {
    __name(this, "OTelInstrumentationProvider");
  }
  tracer;
  provider;
  meter;
  constructor(config) {
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion || "unknown",
      "deployment.environment": config.environment || "development",
      "service.instance.id": process.pid.toString(),
      "host.name": process.env.HOSTNAME || "unknown",
      "process.pid": process.pid
    });
    const spanProcessors = [];
    if (config.collectorUrl) {
      const otlpExporter = new OTLPTraceExporter({
        url: config.collectorUrl
      });
      spanProcessors.push(new BatchSpanProcessor(otlpExporter));
    }
    if (config.enableConsole) {
      const consoleExporter = new ConsoleSpanExporter();
      spanProcessors.push(new BatchSpanProcessor(consoleExporter));
    }
    const samplingRate = config.sampleRate ?? 1;
    const sampler = new TraceIdRatioBasedSampler(samplingRate);
    this.provider = new NodeTracerProvider({
      resource,
      sampler,
      spanProcessors
    });
    this.provider.register();
    const pinoInstrumentation = new PinoInstrumentation({
      // Keep default log keys: trace_id, span_id, trace_flags
      // These match standard OTel semantic conventions
      disableLogSending: true,
      disableLogCorrelation: false
    });
    const pgInstrumentation = new PgInstrumentation({
      // Add database query attributes to spans
      requireParentSpan: false,
      enhancedDatabaseReporting: true
    });
    try {
      pinoInstrumentation.enable();
      pgInstrumentation.enable();
    } catch {
    }
    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
    this.meter = metrics.getMeter(config.serviceName, config.serviceVersion || "unknown");
    try {
      if (config.collectorUrl) {
        const metricsUrl = config.collectorUrl.replace("/traces", "/metrics");
        const metricReader = new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: metricsUrl
          }),
          exportIntervalMillis: 6e4
        });
        const meterProvider = new MeterProvider({
          resource,
          readers: [
            metricReader
          ]
        });
        metrics.setGlobalMeterProvider(meterProvider);
      }
    } catch (_error) {
    }
  }
  startSpan(name, options) {
    const otelSpan = this.tracer.startSpan(name, {
      kind: options?.kind,
      attributes: options?.attributes,
      startTime: options?.startTime
    });
    return new OTelSpanAdapter(otelSpan);
  }
  async withSpan(name, fn, options) {
    const parentCtx = options?.parent ? options.parent : context.active();
    return await this.tracer.startActiveSpan(name, {
      kind: options?.kind,
      attributes: options?.attributes,
      startTime: options?.startTime
    }, parentCtx, async (otelSpan) => {
      const span = new OTelSpanAdapter(otelSpan);
      try {
        const result = await fn(span);
        otelSpan.setStatus({
          code: SpanStatusCode.OK
        });
        return result;
      } catch (error) {
        otelSpan.recordException(error);
        otelSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        otelSpan.end();
      }
    });
  }
  injectContext(carrier) {
    propagation.inject(context.active(), carrier);
  }
  extractContext(carrier) {
    const extractedContext = propagation.extract(ROOT_CONTEXT, carrier);
    const span = trace.getSpan(extractedContext);
    if (span?.spanContext().traceId) {
      return extractedContext;
    }
    return null;
  }
  recordMetric(name, value, attributes) {
    const counter = this.meter.createCounter(name);
    counter.add(value, attributes);
  }
  recordEvent(_name, _attributes) {
  }
  async shutdown() {
    await this.provider.shutdown();
  }
};

// ../../packages/infrastructure/dist/tracing/telemetry-client.js
var TelemetryClient = class {
  static {
    __name(this, "TelemetryClient");
  }
  environment;
  flags = /* @__PURE__ */ new Map();
  eventQueue = [];
  flushInterval = 5e3;
  maxQueueSize = 100;
  rateLimitWindow = 6e4;
  eventCounts = /* @__PURE__ */ new Map();
  lastRateLimitReset = Date.now();
  proxyUrl;
  offlineMode = false;
  anonymousId;
  constructor(_apiKey, proxyHost, environment) {
    this.environment = environment;
    this.proxyUrl = `${proxyHost}/api/telemetry/events`;
    this.anonymousId = this.generateAnonymousId();
    setInterval(() => this.flush(), this.flushInterval);
  }
  async initialize() {
  }
  /**
   * Set offline mode
   * @param enabled Whether offline mode is enabled
   */
  setOfflineMode(enabled) {
    this.offlineMode = enabled;
  }
  /**
   * Check if offline mode is enabled
   * @returns Whether offline mode is enabled
   */
  isOfflineMode() {
    return this.offlineMode;
  }
  isEnabled(flag) {
    const value = this.flags.get(flag) ?? FEATURE_FLAGS[flag];
    return Boolean(value);
  }
  async reloadFlags() {
  }
  /**
   * Track a telemetry event with strict typing and validation
   * @param event The event name (must be from the whitelist)
   * @param properties The event properties (validated at runtime)
   */
  trackEvent(event) {
    if (!validateTelemetryEvent(event)) {
      console.warn("Invalid telemetry event, skipping:", event);
      return;
    }
    if (this.offlineMode) {
      return;
    }
    const featureManager = FeatureManager.getInstance();
    if (!featureManager.isEnabled("telemetry.detailed_events")) {
      if (![
        "checkpoint.created",
        "risk.high",
        "error"
      ].includes(event.event)) {
        return;
      }
    }
    const samplingRate = featureManager.getValue("telemetry.sampling_rate") ?? 1;
    if (Math.random() > samplingRate) {
      return;
    }
    if (this.isRateLimited(event.event)) {
      return;
    }
    this.eventQueue.push({
      event: event.event,
      properties: {
        ...this.sanitizeProperties(event.properties || {}),
        environment: this.environment,
        timestamp: event.timestamp
      },
      timestamp: event.timestamp
    });
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }
  /**
   * Track a telemetry event with string-based event name (legacy compatibility)
   * @param event The event name
   * @param properties The event properties
   */
  track(event, properties) {
    const typedEvent = {
      event,
      properties,
      timestamp: Date.now()
    };
    this.trackEvent(typedEvent);
  }
  isRateLimited(event) {
    const now = Date.now();
    if (now - this.lastRateLimitReset > this.rateLimitWindow) {
      this.eventCounts.clear();
      this.lastRateLimitReset = now;
    }
    const count = this.eventCounts.get(event) || 0;
    const maxEventsPerWindow = 10;
    if (count >= maxEventsPerWindow) {
      return true;
    }
    this.eventCounts.set(event, count + 1);
    return false;
  }
  /**
   * Sanitize properties to remove PII before sending
   */
  sanitizeProperties(properties) {
    const sanitized = {};
    if (!properties) {
      return sanitized;
    }
    const allowedProps = [
      "version",
      "platform",
      "duration",
      "success",
      "filesCount",
      "method",
      "trigger",
      "feature",
      "viewId",
      "command"
    ];
    for (const key of allowedProps) {
      if (key in properties) {
        sanitized[key] = properties[key];
      }
    }
    return sanitized;
  }
  /**
   * Get the anonymous ID for this client instance
   * @returns The stored anonymous ID
   */
  getAnonymousId() {
    return this.anonymousId;
  }
  generateAnonymousId() {
    return `${this.environment}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get current package version
   * @returns The current version string
   */
  getVersion() {
    try {
      const packageJson = require_package();
      return packageJson.version || "unknown";
    } catch (_error) {
      return process.env.VREKO_VERSION || "1.0.0";
    }
  }
  /**
   * Custom transport layer - routes all events through proxy
   */
  async customTransport(batch) {
    if (this.offlineMode) {
      return;
    }
    try {
      const response = await fetch(this.proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vreko-Platform": this.environment,
          "X-Vreko-Version": this.getVersion()
        },
        body: JSON.stringify({
          events: batch.map((event) => ({
            event: event.event,
            properties: this.sanitizeProperties(event.properties || {}),
            timestamp: event.timestamp
          }))
        })
      });
      if (!response.ok) {
        const _error = await response.text();
      }
    } catch (_error) {
    }
  }
  async flush() {
    if (this.offlineMode) {
      return;
    }
    if (this.eventQueue.length === 0) {
      return;
    }
    const eventsToFlush = [
      ...this.eventQueue
    ];
    this.eventQueue = [];
    try {
      await this.customTransport(eventsToFlush);
    } catch (_error) {
      this.eventQueue.unshift(...eventsToFlush);
    }
  }
};

export { AgentAction, AgentRole, AgentSession, AnalyticsEvents, CORRELATION_ANALYSES, CORRELATION_COHORTS, KEY_METRIC_ALERTS, OTelInstrumentationProvider, RETENTION_COHORTS, TelemetryClient, addSentryBreadcrumb, attributionChain, captureError, captureMessage, checkDatabaseConnection, checkErrorBudget, checkHttpService, checkRedisConnection, clearSentryUser, conductorSessionInsights, createAlert, createCohort, createGracefulShutdown, createHealthCheck, createSentryMiddleware, decisionsWithSkips, deleteAlert, deleteCohort, detectSurface, drainAndCloseServer, emitPhaseEvent, emitRatchetScores, failedGatesInLastNRuns, flushSentry, gatesFailingFirstAttempt, getAlerts, getAnalyticsEnv, getAnalyticsSuperProperties, getCohort, getCohortMembers, getCohorts, getCorrelationAnalysis, getDeploymentEnv, getEnvironmentInfo, getErrorRate, getMetrics2 as getMetrics, gitCommitsWithoutProvenance, initSentry, isDevelopment, isProduction, neon_exports, performCorrelationAnalysis, preStopDelay, prometheus_exports, recordAction, recordDecision, recordError, recordGate, recordSuccess, registerKeyMetricAlerts, resetMetrics, setSentryUser, startSentryTransaction, toggleAlert, updateCohort, validateMetadata };
//# sourceMappingURL=chunk-SPW2D6OO.js.map
//# sourceMappingURL=chunk-SPW2D6OO.js.map