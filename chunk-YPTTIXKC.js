#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import * as node from '@sentry/node';
export { node as Sentry };

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var EXTRA_ALLOWLIST = /* @__PURE__ */ new Set([
  "requestId",
  "workspaceHash",
  "sessionId",
  "tier",
  "cliVersion",
  "daemonVersion",
  "extensionVersion",
  "platform",
  "nodeVersion"
]);
var BLOCKED_BREADCRUMB_CATEGORIES = /* @__PURE__ */ new Set([
  "fetch",
  "xhr",
  "console"
]);
var HOME_PATH_RE = /\/(Users|home)\/[^/]+\//g;
var GH_TOKEN_RE = /(ghp|gho|ghu|ghs)_[A-Za-z0-9]{36}/g;
var API_KEY_RE = /sk-[A-Za-z0-9]{32,}/g;
var MAX_STRING_LEN = 2048;
function scrubString(value) {
  if (value.length > MAX_STRING_LEN) {
    return `[TRUNCATED:${value.length}]`;
  }
  return value.replace(HOME_PATH_RE, "/~/").replace(GH_TOKEN_RE, "[REDACTED_GH_TOKEN]").replace(API_KEY_RE, "[REDACTED_API_KEY]");
}
__name(scrubString, "scrubString");
__name2(scrubString, "scrubString");
function createNextjsSentryConfig(options) {
  const { dsn, release, environment, tracesSampleRate, ignoreErrors } = options;
  const resolvedEnv = resolveDeploymentEnv(environment);
  return {
    dsn,
    environment: resolvedEnv,
    release: release ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.npm_package_version,
    sendDefaultPii: false,
    tracesSampleRate: tracesSampleRate ?? (resolvedEnv === "development" ? 1 : 0.1),
    ignoreErrors: ignoreErrors ?? [
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      "AbortError"
    ],
    beforeSend(event) {
      const req = event.request;
      if (req?.headers) {
        const headers = req.headers;
        delete headers.authorization;
        delete headers.cookie;
        delete headers["x-api-key"];
      }
      const user = event.user;
      if (user?.email) {
        user.email = "[REDACTED]";
      }
      const exception = event.exception;
      if (exception?.values) {
        for (const exc of exception.values) {
          if (exc.value && typeof exc.value === "string") {
            exc.value = scrubString(exc.value);
          }
          const st = exc.stacktrace;
          if (st?.frames) {
            for (const frame of st.frames) {
              if (typeof frame.filename === "string") {
                frame.filename = scrubString(frame.filename);
              }
              if (typeof frame.abs_path === "string") {
                frame.abs_path = scrubString(frame.abs_path);
              }
            }
          }
        }
      }
      return event;
    }
  };
}
__name(createNextjsSentryConfig, "createNextjsSentryConfig");
__name2(createNextjsSentryConfig, "createNextjsSentryConfig");
function resolveDeploymentEnv(override) {
  if (override) return override;
  const explicit = process.env.DEPLOYMENT_ENV;
  if (explicit === "development" || explicit === "staging" || explicit === "production") {
    return explicit;
  }
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return process.env.NODE_ENV ?? "production";
}
__name(resolveDeploymentEnv, "resolveDeploymentEnv");
__name2(resolveDeploymentEnv, "resolveDeploymentEnv");
function createSentryConfig(options) {
  const { dsn, surface, workspaceHash, tier, release, environment } = options;
  const resolvedEnv = resolveDeploymentEnv(environment);
  return {
    dsn,
    environment: resolvedEnv,
    release: release ?? process.env.GIT_SHA ?? process.env.npm_package_version,
    sendDefaultPii: false,
    attachStacktrace: true,
    // Full sampling in development; reduced in staging/production to limit overhead.
    tracesSampleRate: resolvedEnv === "development" ? 1 : 0.1,
    initialScope: {
      tags: {
        surface,
        ...tier ? {
          tier
        } : {}
      },
      ...workspaceHash ? {
        user: {
          id: workspaceHash
        }
      } : {}
    },
    // Drop auto-capture integrations that can produce breadcrumbs with sensitive data
    integrations(defaultIntegrations) {
      return defaultIntegrations.filter((i) => ![
        "Breadcrumbs",
        "Console",
        "Http"
      ].includes(i.name));
    },
    beforeSend(event) {
      if (event.extra) {
        const filtered = {};
        for (const key of EXTRA_ALLOWLIST) {
          if (key in event.extra) {
            filtered[key] = event.extra[key];
          }
        }
        event.extra = filtered;
      }
      if (event.contexts?.runtime) {
        event.contexts.runtime.args = void 0;
      }
      if (event.request) {
        event.request.data = void 0;
      }
      if (event.breadcrumbs?.values) {
        const breadcrumbs = event.breadcrumbs.values();
        for (const crumb of breadcrumbs) {
          crumb.data = void 0;
        }
      }
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.value) {
            exc.value = scrubString(exc.value);
          }
          if (exc.stacktrace?.frames) {
            for (const frame of exc.stacktrace.frames) {
              if (frame.filename) {
                frame.filename = scrubString(frame.filename);
              }
              if (frame.abs_path) {
                frame.abs_path = scrubString(frame.abs_path);
              }
            }
          }
        }
      }
      if (event.message) {
        event.message = scrubString(event.message);
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      const cat = breadcrumb.category ?? "";
      if (BLOCKED_BREADCRUMB_CATEGORIES.has(cat)) {
        const data = breadcrumb.data;
        if (data?._allow === true) {
          const { _allow: _, ...rest } = data;
          breadcrumb.data = rest;
          return breadcrumb;
        }
        return null;
      }
      return breadcrumb;
    }
  };
}
__name(createSentryConfig, "createSentryConfig");
__name2(createSentryConfig, "createSentryConfig");

export { createSentryConfig };
//# sourceMappingURL=chunk-YPTTIXKC.js.map
//# sourceMappingURL=chunk-YPTTIXKC.js.map