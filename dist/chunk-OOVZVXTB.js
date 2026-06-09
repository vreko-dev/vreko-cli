#!/usr/bin/env node
import { JsonRpcMessageSchema } from './chunk-VNFWNWEY.js';
import { __name } from './chunk-EWOJGXRX.js';
import { z } from 'zod';
import 'neverthrow';
import 'crypto';
import 'eventemitter2';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import 'ts-pattern';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// ../../packages/contracts/dist/logger.js
var _loggerFactory = null;
function getLoggerFactory() {
  return _loggerFactory;
}
__name(getLoggerFactory, "getLoggerFactory");
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["SILENT"] = 4] = "SILENT";
})(LogLevel || (LogLevel = {}));
function createLogger(options) {
  const { name, level = LogLevel.INFO, timestamps = false } = options;
  return {
    debug(messageOrObj, metaOrMsg) {
      if (level <= LogLevel.DEBUG) ;
    },
    info(messageOrObj, metaOrMsg) {
      if (level <= LogLevel.INFO) ;
    },
    warn(messageOrObj, metaOrMsg) {
      if (level <= LogLevel.WARN) ;
    },
    error(messageOrObj, metaOrMsg) {
      if (level <= LogLevel.ERROR) ;
    }
  };
}
__name(createLogger, "createLogger");

// ../../packages/contracts/dist/observability/InstrumentationProvider.js
var NoOpInstrumentationProvider = class _NoOpInstrumentationProvider {
  static {
    __name(this, "NoOpInstrumentationProvider");
  }
  static noopSpan = {
    setAttribute: /* @__PURE__ */ __name(() => {
    }, "setAttribute"),
    setAttributes: /* @__PURE__ */ __name(() => {
    }, "setAttributes"),
    addEvent: /* @__PURE__ */ __name(() => {
    }, "addEvent"),
    setStatus: /* @__PURE__ */ __name(() => {
    }, "setStatus"),
    recordException: /* @__PURE__ */ __name(() => {
    }, "recordException"),
    end: /* @__PURE__ */ __name(() => {
    }, "end"),
    isRecording: /* @__PURE__ */ __name(() => false, "isRecording")
  };
  startSpan(_name, _options) {
    return _NoOpInstrumentationProvider.noopSpan;
  }
  async withSpan(_name, fn, _options) {
    return await fn(_NoOpInstrumentationProvider.noopSpan);
  }
  injectContext(_carrier) {
  }
  extractContext(_carrier) {
    return null;
  }
  recordMetric(_name, _value, _attributes) {
  }
  recordEvent(_name, _attributes) {
  }
  async shutdown() {
  }
};

// ../../packages/contracts/dist/constants/sensitive-patterns.js
var SENSITIVE_PATTERNS = [
  // Environment / secrets
  /\.env$/i,
  /\.pem$/i,
  /\.key$/i,
  /secret/i,
  /password/i,
  /credential/i,
  /private/i,
  // Auth / access control
  /auth/i,
  // Configuration files
  /config\.json$/i,
  /package\.json$/i,
  // Financial / business-critical (from MCP)
  /payment/i,
  // Infrastructure / data (from MCP)
  /security/i,
  /database/i
];
var ImplicitRollbackBucketSchema = z.object({
  count: z.number().int().min(0),
  weightedSum: z.number().min(0)
}).strict();
var RollbackRateTraceSchema = z.object({
  /** Explicit rollbacks (user-initiated restore). */
  explicit: z.number().int().min(0),
  /** Implicit rollbacks attributed to AI-generated code. */
  implicitAIAttributed: ImplicitRollbackBucketSchema,
  /** Implicit rollbacks not attributed to AI-generated code. */
  implicitUnattributed: ImplicitRollbackBucketSchema,
  /** Total file modifications in the observation window. */
  totalModifications: z.number().int().min(0),
  /** Computed rate: (explicit + weighted implicit) / totalModifications. */
  computedRate: z.number().min(0).max(1)
}).strict();
var FragilityPillarTraceSchema = z.object({
  pillar: z.enum([
    "churn",
    "rollback",
    "ai_fraction",
    "time_since_commit",
    "file_count"
  ]),
  weight: z.number().min(0).max(1),
  rawValue: z.number(),
  contribution: z.number().min(0).max(1)
}).strict();
var FragilityTraceSchema = z.object({
  pillars: z.array(FragilityPillarTraceSchema).min(1),
  /** Weighted sum across all pillars before clamping. */
  rawScore: z.number(),
  /** Final fragility score after clamping to [0, 1]. */
  computedScore: z.number().min(0).max(1)
}).strict();
var TrustScoreTraceSchema = z.object({
  /** Agent rollback rate for this workspace. */
  agentRollbackRate: z.number().min(0).max(1),
  /** Fleet-wide average rollback rate for comparison. */
  workspaceAvgRollbackRate: z.number().min(0).max(1),
  /** Number of observations used to compute the rate. */
  observationCount: z.number().int().min(0),
  /** Bayesian prior weight (lower = more observations = less prior pull). */
  priorWeight: z.number().min(0).max(1),
  /** Final trust score after Bayesian smoothing. */
  computedScore: z.number().min(0).max(1)
}).strict();
z.object({
  /** ISO 8601 timestamp of the calculation. */
  calculatedAt: z.string().datetime(),
  /** Opaque workspace identifier (sha256-derived, never raw path). */
  workspaceId: z.string(),
  /** Fragility pillar breakdown. */
  fragility: FragilityTraceSchema,
  /** Rollback rate decomposition  -  the novel AI-attribution signal. */
  rollbackRate: RollbackRateTraceSchema,
  /** Trust score Bayesian trace. */
  trustScore: TrustScoreTraceSchema
}).strict();
var DaemonTierSchema = z.enum([
  "free",
  "pro",
  "team",
  "enterprise"
]);
z.object({
  userId: z.string().nullable(),
  email: z.string().email().nullable(),
  tier: DaemonTierSchema.default("free"),
  pioneer: z.boolean().default(false),
  cohort: z.number().int().nullable(),
  keyPreview: z.string().nullable(),
  // NOTE: 'cli-token' covers device auth flow; 'api-key' is raw key from env
  authenticatedVia: z.enum([
    "github",
    "google",
    "api-key",
    "cli-token"
  ]).nullable(),
  tokenExpiresAt: z.coerce.date().nullable(),
  lastValidatedAt: z.coerce.date().nullable(),
  isStale: z.boolean()
});
z.object({
  version: z.literal("1").default("1"),
  lastIdentityValidatedAt: z.coerce.date().nullable().default(null),
  startCount: z.number().int().default(0),
  lastStartedAt: z.coerce.date().nullable().default(null)
});
var WorkspaceRegistrationSchema = z.object({
  id: z.string(),
  path: z.string(),
  alias: z.string().optional(),
  ownership: z.enum([
    "personal",
    "team"
  ]),
  teamId: z.string().optional(),
  createdAt: z.coerce.date(),
  lastSeenAt: z.coerce.date(),
  stackSummary: z.string().optional()
});
z.object({
  version: z.literal("1").default("1"),
  detectedAt: z.coerce.date(),
  repoType: z.enum([
    "monorepo",
    "single",
    "multi-package",
    "unknown"
  ]),
  primaryLanguage: z.string(),
  buildSystem: z.enum([
    "turborepo",
    "nx",
    "lerna",
    "none",
    "unknown"
  ]),
  packageManager: z.enum([
    "pnpm",
    "npm",
    "yarn",
    "bun",
    "unknown"
  ]),
  detectedAiTools: z.array(z.enum([
    "cursor",
    "copilot",
    "claude-code",
    "windsurf",
    "unknown"
  ])),
  estimatedFileCount: z.number().int(),
  estimatedContributors: z.number().int(),
  hasCI: z.boolean(),
  hasTests: z.boolean(),
  // SEMANTIC DISTINCTION:
  // - null  = CTI has not run yet (default, unanalyzed)
  // - []    = CTI ran, no critical paths found (analysis complete, no results)
  // This distinction drives onboarding flow and CTI scheduling decisions.
  criticalPaths: z.array(z.string()).nullable().default(null),
  detectionFailed: z.boolean().default(false),
  detectionError: z.string().optional()
});

// ../../packages/contracts/dist/api/attribution.js
function shouldMergeAttribution(existing, incoming) {
  if (existing.source === incoming.source && existing.campaignId === incoming.campaignId) {
    return true;
  }
  return false;
}
__name(shouldMergeAttribution, "shouldMergeAttribution");
var ApiErrorCodeSchema = z.enum([
  // Authentication (401)
  "AUTH_REQUIRED",
  "AUTH_INVALID_TOKEN",
  "AUTH_EXPIRED_TOKEN",
  "AUTH_INVALID_API_KEY",
  "AUTH_REVOKED_KEY",
  // Authorization (403)
  "FORBIDDEN",
  "PERMISSION_DENIED",
  "PLAN_LIMIT_EXCEEDED",
  "FEATURE_NOT_AVAILABLE",
  "TRIAL_EXPIRED",
  // Validation (400)
  "VALIDATION_ERROR",
  "VALIDATION_MISSING_FIELD",
  "VALIDATION_INVALID_FORMAT",
  "VALIDATION_CONSTRAINT_VIOLATION",
  // Resource Errors (404, 409, 410)
  "RESOURCE_NOT_FOUND",
  "RESOURCE_ALREADY_EXISTS",
  "RESOURCE_DELETED",
  "RESOURCE_CONFLICT",
  "RESOURCE_LOCKED",
  // Rate Limiting (429)
  "RATE_LIMIT_EXCEEDED",
  "RATE_LIMIT_API_KEY",
  "RATE_LIMIT_USER",
  "RATE_LIMIT_IP",
  // Payment/Billing (402)
  "PAYMENT_REQUIRED",
  "PAYMENT_FAILED",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_CANCELLED",
  // External Integration Errors (502, 503)
  "INTEGRATION_UNAVAILABLE",
  "INTEGRATION_TIMEOUT",
  "INTEGRATION_ERROR",
  // Security (400, 403)
  "SECURITY_CSRF_INVALID",
  "SECURITY_CAPTCHA_REQUIRED",
  "SECURITY_CAPTCHA_FAILED",
  "SECURITY_PRIVACY_VIOLATION",
  // Server Errors (500, 503)
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
  "DATABASE_ERROR",
  "CONFIGURATION_ERROR",
  // Request Errors (400, 413, 415)
  "BAD_REQUEST",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "METHOD_NOT_ALLOWED"
]);
var ValidationErrorDetailSchema = z.object({
  field: z.string().describe("The field path that failed validation"),
  message: z.string().describe("Human-readable error message"),
  code: z.string().optional().describe("Zod error code")
});
z.object({
  /** Human-readable error message (safe to display to users) */
  error: z.string(),
  /** Machine-readable error code for programmatic handling */
  code: ApiErrorCodeSchema,
  /** Optional detailed error information */
  details: z.union([
    z.array(ValidationErrorDetailSchema),
    z.record(z.string(), z.unknown())
  ]).optional(),
  /** Request ID for support correlation (from X-Request-Id header) */
  requestId: z.string().optional(),
  /** Timestamp when error occurred */
  timestamp: z.string().datetime().optional()
});
var ApiTierSchema = z.enum([
  "api_free",
  "api_starter",
  "api_pro",
  "api_enterprise"
]);
var ApiFeatureSchema = z.enum([
  // Core analysis features
  "risk_scoring",
  "ai_detection",
  "session_grouping",
  "rollback_validation",
  // Advanced features
  "batch_analysis",
  "webhook_notifications",
  "custom_thresholds",
  "priority_queue",
  // Enterprise features
  "dedicated_instance",
  "sla_guarantee",
  "audit_logs",
  "sso_integration"
]);
var RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().int().positive(),
  requestsPerDay: z.number().int().positive(),
  maxBatchSize: z.number().int().positive(),
  maxPayloadBytes: z.number().int().positive()
});
z.object({
  tier: ApiTierSchema,
  name: z.string(),
  description: z.string(),
  features: z.array(ApiFeatureSchema),
  rateLimits: RateLimitConfigSchema,
  priceMonthly: z.number().nonnegative(),
  priceYearly: z.number().nonnegative()
});
z.object({
  id: z.string().uuid(),
  key: z.string().regex(/^sb_live_[a-zA-Z0-9]{32}$/, "Invalid API key format"),
  tier: ApiTierSchema,
  organizationId: z.string().uuid().optional(),
  name: z.string().max(100).optional(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  lastUsedAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true)
});
z.object({
  keyId: z.string().uuid(),
  endpoint: z.string(),
  requestCount: z.number().int().nonnegative(),
  bytesProcessed: z.number().int().nonnegative(),
  period: z.enum([
    "minute",
    "hour",
    "day",
    "month"
  ]),
  timestamp: z.coerce.date()
});
z.object({
  name: z.string().max(100).optional(),
  expiresAt: z.coerce.date().optional()
});
var AuthErrorCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "USER_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
  "SESSION_EXPIRED",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "INVALID_TOKEN",
  "USER_ALREADY_EXISTS",
  "WEAK_PASSWORD",
  "INVALID_EMAIL",
  "OAUTH_ERROR",
  "NETWORK_ERROR",
  "UNKNOWN_ERROR"
]);
var AuthErrorSchema = z.object({
  code: AuthErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional()
});
var UserRoleSchema = z.enum([
  "admin",
  "user",
  "viewer"
]).nullable();
var AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable().optional(),
  emailVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Role field from database - nullable as not all users have a role assigned
  role: UserRoleSchema.optional()
});
var SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Better Auth session metadata
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional()
});
var SessionWithUserSchema = z.object({
  session: SessionSchema,
  user: AuthUserSchema
});
z.discriminatedUnion("status", [
  z.object({
    status: z.literal("authenticated"),
    user: AuthUserSchema,
    session: SessionSchema
  }),
  z.object({
    status: z.literal("unauthenticated")
  }),
  z.object({
    status: z.literal("loading")
  })
]);

// ../../packages/contracts/dist/auth/api.js
var PasswordSchema = z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number");
var EmailSchema = z.string().email("Invalid email address").toLowerCase().trim();
z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name is too long").trim()
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    user: AuthUserSchema
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false)
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    user: AuthUserSchema,
    session: z.object({
      id: z.string(),
      expiresAt: z.coerce.date()
    })
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.union([
  SessionWithUserSchema,
  z.null()
]);
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true)
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  name: z.string().min(1).max(100).trim().optional(),
  image: z.string().url().optional()
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    user: AuthUserSchema
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: PasswordSchema
});
z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true)
  }),
  z.object({
    success: z.literal(false),
    error: AuthErrorSchema
  })
]);
z.object({
  provider: z.enum([
    "github",
    "google"
  ]),
  callbackURL: z.string().url().optional()
});
var AuthScope = z.enum([
  "console",
  "api"
]);

// ../../packages/contracts/dist/auth/identity.js
z.object({
  pioneer: z.boolean().default(false),
  pioneerCohort: z.number().int().optional(),
  referralCode: z.string().optional(),
  invitedBy: z.string().nullable().optional()
});
var OrgType = z.enum([
  "personal",
  "team"
]);
var OrgRole = z.enum([
  "owner",
  "admin",
  "member"
]);
z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: OrgType,
  tier: z.enum([
    "free",
    "pro",
    "team",
    "enterprise"
  ]),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  metadata: z.object({
    saml: z.object({
      entryPoint: z.string().url(),
      issuer: z.string(),
      cert: z.string()
    }).optional()
  }).optional(),
  createdAt: z.string().datetime()
});
z.object({
  id: z.string().uuid(),
  keyPreview: z.string(),
  name: z.string(),
  orgId: z.string().uuid(),
  createdBy: z.string().uuid(),
  scopes: z.array(AuthScope).default([
    "api"
  ]),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable()
});
z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  role: OrgRole,
  tier: z.enum([
    "free",
    "pro",
    "team",
    "enterprise"
  ]),
  scopes: z.array(AuthScope),
  pioneer: z.boolean(),
  authenticatedVia: z.enum([
    "session",
    "api_key",
    "device_token"
  ])
});
z.object({
  deviceCode: z.string(),
  userCode: z.string(),
  verificationUri: z.string().url(),
  expiresIn: z.number().int(),
  interval: z.number().int()
});
z.discriminatedUnion("status", [
  z.object({
    status: z.literal("pending"),
    error: z.literal("authorization_pending")
  }),
  z.object({
    status: z.literal("success"),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int(),
    orgId: z.string().uuid()
  }),
  z.object({
    status: z.literal("denied"),
    error: z.literal("access_denied")
  }),
  z.object({
    status: z.literal("expired"),
    error: z.literal("expired_token")
  })
]);
z.object({
  version: z.string(),
  riskClasses: z.record(z.enum([
    "safe",
    "low",
    "medium",
    "high",
    "critical"
  ]), z.object({
    description: z.string(),
    defaultSandbox: z.enum([
      "none",
      "basic",
      "strict",
      "isolated"
    ]),
    requiresAuth: z.boolean(),
    requiresSnapshot: z.boolean(),
    maxConcurrent: z.number().positive(),
    timeoutMs: z.number().positive(),
    requiresApproval: z.boolean().optional()
  })),
  categories: z.record(z.string(), z.object({
    description: z.string(),
    namespace: z.string(),
    defaultRiskClass: z.enum([
      "safe",
      "low",
      "medium",
      "high",
      "critical"
    ])
  })),
  tools: z.array(z.object({
    urn: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    riskClass: z.enum([
      "safe",
      "low",
      "medium",
      "high",
      "critical"
    ]),
    caps: z.array(z.string()),
    requiredPermissions: z.array(z.string()),
    requiredFeatures: z.array(z.string()),
    minTier: z.enum([
      "free",
      "pro",
      "team",
      "enterprise"
    ]).optional(),
    inputSchema: z.object({
      type: z.literal("object"),
      properties: z.record(z.string(), z.any()).optional(),
      required: z.array(z.string()).optional()
    })
  })),
  permissions: z.array(z.object({
    id: z.string(),
    description: z.string(),
    scope: z.enum([
      "workspace",
      "channel",
      "admin"
    ]),
    requiresTier: z.enum([
      "free",
      "pro",
      "team",
      "enterprise"
    ]).optional()
  })),
  sandboxes: z.record(z.enum([
    "none",
    "basic",
    "strict",
    "isolated"
  ]), z.object({
    description: z.string(),
    capabilities: z.array(z.string()),
    restrictions: z.array(z.string()),
    implementation: z.enum([
      "container",
      "vm",
      "process"
    ]).optional()
  }))
});

// ../../packages/contracts/dist/tiers.js
function isTierBypassEnabled() {
  return process.env.VREKO_BYPASS_TIER_RESTRICTIONS === "true";
}
__name(isTierBypassEnabled, "isTierBypassEnabled");
function getEffectiveTier(actualTier) {
  if (isTierBypassEnabled()) {
    return "pro";
  }
  return actualTier;
}
__name(getEffectiveTier, "getEffectiveTier");

// ../../packages/contracts/dist/entitlements.js
var TIER_FEATURES = {
  free: [
    "api_access"
  ],
  pro: [
    "cloud_backup",
    "api_access",
    "advanced_analytics",
    "unlimited_workspaces",
    "cli_full_features"
  ],
  team: [
    "cloud_backup",
    "api_access",
    "advanced_analytics",
    "unlimited_workspaces",
    "cli_full_features",
    "team_dashboard",
    "multi_workspace",
    "priority_support"
  ],
  enterprise: [
    "cloud_backup",
    "api_access",
    "advanced_analytics",
    "unlimited_workspaces",
    "cli_full_features",
    "team_dashboard",
    "multi_workspace",
    "sso_authentication",
    "audit_logs",
    "priority_support",
    "custom_retention"
  ]
};
var TIER_LIMITS = {
  free: {
    cloud_backup: 0,
    api_access: 100,
    unlimited_workspaces: 1
  },
  pro: {
    cloud_backup: 100 * 1024,
    api_access: 1e5,
    unlimited_workspaces: null
  },
  team: {
    cloud_backup: 500 * 1024,
    api_access: 1e6,
    unlimited_workspaces: null
  },
  enterprise: {
    cloud_backup: null,
    api_access: null,
    unlimited_workspaces: null
  }
};
function getTierFeatures(tier) {
  const effectiveTier = getEffectiveTier(tier);
  return TIER_FEATURES[effectiveTier] || [];
}
__name(getTierFeatures, "getTierFeatures");
function isFeatureAvailableAtTier(feature, tier) {
  const effectiveTier = getEffectiveTier(tier);
  return TIER_FEATURES[effectiveTier]?.includes(feature) || false;
}
__name(isFeatureAvailableAtTier, "isFeatureAvailableAtTier");
function getTierLimit(tier, feature) {
  const effectiveTier = getEffectiveTier(tier);
  return TIER_LIMITS[effectiveTier]?.[feature] ?? null;
}
__name(getTierLimit, "getTierLimit");

// ../../packages/contracts/dist/errors/base.js
function extractErrorCode(error) {
  if (error.code) {
    return error.code;
  }
  if (error.name && error.name !== "Error") {
    return error.name.toUpperCase().replace(/ERROR$/, "").replace(/\s+/g, "_");
  }
  return void 0;
}
__name(extractErrorCode, "extractErrorCode");

// ../../packages/contracts/dist/errors/domain/base.js
var ErrorCategory;
(function(ErrorCategory2) {
  ErrorCategory2["NOT_FOUND"] = "NOT_FOUND";
  ErrorCategory2["VALIDATION"] = "VALIDATION";
  ErrorCategory2["PERMISSION"] = "PERMISSION";
  ErrorCategory2["CONFLICT"] = "CONFLICT";
  ErrorCategory2["EXTERNAL"] = "EXTERNAL";
  ErrorCategory2["INTERNAL"] = "INTERNAL";
})(ErrorCategory || (ErrorCategory = {}));
var VrekoEvent;
(function(VrekoEvent2) {
  VrekoEvent2["SNAPSHOT_CREATED"] = "snapshot:created";
  VrekoEvent2["SNAPSHOT_DELETED"] = "snapshot:deleted";
  VrekoEvent2["SNAPSHOT_RESTORED"] = "snapshot:restored";
  VrekoEvent2["RESTORE_STARTED"] = "snapshot:restore_started";
  VrekoEvent2["PROTECTION_CHANGED"] = "protection:changed";
  VrekoEvent2["FILE_PROTECTED"] = "file:protected";
  VrekoEvent2["FILE_UNPROTECTED"] = "file:unprotected";
  VrekoEvent2["ANALYSIS_REQUESTED"] = "analysis:requested";
  VrekoEvent2["ANALYSIS_COMPLETED"] = "analysis:completed";
})(VrekoEvent || (VrekoEvent = {}));
var QoSLevel;
(function(QoSLevel2) {
  QoSLevel2[QoSLevel2["BEST_EFFORT"] = 0] = "BEST_EFFORT";
  QoSLevel2[QoSLevel2["AT_LEAST_ONCE"] = 1] = "AT_LEAST_ONCE";
  QoSLevel2[QoSLevel2["EXACTLY_ONCE"] = 2] = "EXACTLY_ONCE";
})(QoSLevel || (QoSLevel = {}));
process.env.MCP_QUIET === "1" || process.env.MCP_QUIET === "true";

// ../../packages/contracts/dist/telemetry/events.js
var TELEMETRY_EVENTS = {
  EXTENSION_ACTIVATED: "extension.activated",
  EXTENSION_DEACTIVATED: "extension.deactivated",
  COMMAND_EXECUTION: "command.execution",
  SNAPSHOT_CREATED: "snapshot.created",
  VREKO_USED: "vreko.used",
  SNAPBACK_USED: "snapback.used",
  RISK_DETECTED: "risk.detected",
  VIEW_ACTIVATED: "view.activated",
  NOTIFICATION_SHOWN: "notification.shown",
  FEATURE_USED: "feature.used",
  ERROR: "error",
  WALKTHROUGH_STEP_COMPLETED: "walkthrough.step.completed",
  ONBOARDING_PROTECTION_ASSIGNED: "onboarding.protection.assigned",
  ONBOARDING_PHASE_PROGRESSED: "onboarding.phase.progressed",
  ONBOARDING_CONTEXTUAL_PROMPT_SHOWN: "onboarding.contextualPrompt.shown",
  SIGNATURE_VERIFICATION_SUCCESS: "signature.verification.success",
  SIGNATURE_VERIFICATION_FAILED: "signature.verification.failed",
  RULES_CACHED_FALLBACK: "rules.cached.fallback",
  // Vitals Events
  VITALS_TRAJECTORY_CHANGED: "vitals_trajectory_changed",
  VITALS_CRITICAL_STATE: "vitals_critical_state",
  VITALS_AUTO_SNAPSHOT: "vitals_auto_snapshot",
  VITALS_NUDGE_SHOWN: "vitals_nudge_shown"
};
function validateTelemetryEvent(event) {
  switch (event.event) {
    case TELEMETRY_EVENTS.EXTENSION_ACTIVATED:
      return validateExtensionActivatedEvent(event);
    case TELEMETRY_EVENTS.EXTENSION_DEACTIVATED:
      return validateExtensionDeactivatedEvent(event);
    case TELEMETRY_EVENTS.COMMAND_EXECUTION:
      return validateCommandExecutionEvent(event);
    case TELEMETRY_EVENTS.SNAPSHOT_CREATED:
      return validateSnapshotCreatedEvent(event);
    case TELEMETRY_EVENTS.VREKO_USED:
      return validateVrekoUsedEvent(event);
    case TELEMETRY_EVENTS.SNAPBACK_USED:
      return validateSnapBackUsedEvent(event);
    case TELEMETRY_EVENTS.RISK_DETECTED:
      return validateRiskDetectedEvent(event);
    case TELEMETRY_EVENTS.VIEW_ACTIVATED:
      return validateViewActivatedEvent(event);
    case TELEMETRY_EVENTS.NOTIFICATION_SHOWN:
      return validateNotificationShownEvent(event);
    case TELEMETRY_EVENTS.FEATURE_USED:
      return validateFeatureUsedEvent(event);
    case TELEMETRY_EVENTS.ERROR:
      return validateErrorEvent(event);
    case TELEMETRY_EVENTS.WALKTHROUGH_STEP_COMPLETED:
      return validateWalkthroughStepCompletedEvent(event);
    case TELEMETRY_EVENTS.ONBOARDING_PROTECTION_ASSIGNED:
      return validateOnboardingProtectionAssignedEvent(event);
    case TELEMETRY_EVENTS.ONBOARDING_PHASE_PROGRESSED:
      return validateOnboardingPhaseProgressedEvent(event);
    case TELEMETRY_EVENTS.ONBOARDING_CONTEXTUAL_PROMPT_SHOWN:
      return validateOnboardingContextualPromptShownEvent(event);
    case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_SUCCESS:
      return validateSignatureVerificationSuccessEvent(event);
    case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_FAILED:
      return validateSignatureVerificationFailedEvent(event);
    case TELEMETRY_EVENTS.RULES_CACHED_FALLBACK:
      return validateRulesCachedFallbackEvent(event);
    case TELEMETRY_EVENTS.VITALS_TRAJECTORY_CHANGED:
      return validateVitalsTrajectoryChangedEvent(event);
    case TELEMETRY_EVENTS.VITALS_CRITICAL_STATE:
      return validateVitalsCriticalStateEvent(event);
    case TELEMETRY_EVENTS.VITALS_AUTO_SNAPSHOT:
      return validateVitalsAutoSnapshotEvent(event);
    case TELEMETRY_EVENTS.VITALS_NUDGE_SHOWN:
      return validateVitalsNudgeShownEvent(event);
    default:
      return false;
  }
}
__name(validateTelemetryEvent, "validateTelemetryEvent");
function validateExtensionActivatedEvent(event) {
  return typeof event.properties.version === "string" && typeof event.properties.vscodeVersion === "string";
}
__name(validateExtensionActivatedEvent, "validateExtensionActivatedEvent");
function validateExtensionDeactivatedEvent(event) {
  return Object.keys(event.properties).length === 0;
}
__name(validateExtensionDeactivatedEvent, "validateExtensionDeactivatedEvent");
function validateCommandExecutionEvent(event) {
  return typeof event.properties.command === "string" && typeof event.properties.duration === "number" && typeof event.properties.success === "boolean";
}
__name(validateCommandExecutionEvent, "validateCommandExecutionEvent");
function validateSnapshotCreatedEvent(event) {
  return typeof event.properties.method === "string" && typeof event.properties.filesCount === "number";
}
__name(validateSnapshotCreatedEvent, "validateSnapshotCreatedEvent");
function validateVrekoUsedEvent(event) {
  return typeof event.properties.filesRestored === "number" && typeof event.properties.duration === "number" && typeof event.properties.success === "boolean";
}
__name(validateVrekoUsedEvent, "validateVrekoUsedEvent");
function validateSnapBackUsedEvent(event) {
  return typeof event.properties.filesRestored === "number" && typeof event.properties.duration === "number" && typeof event.properties.success === "boolean";
}
__name(validateSnapBackUsedEvent, "validateSnapBackUsedEvent");
function validateRiskDetectedEvent(event) {
  return typeof event.properties.riskLevel === "string" && Array.isArray(event.properties.patterns) && typeof event.properties.confidence === "number";
}
__name(validateRiskDetectedEvent, "validateRiskDetectedEvent");
function validateViewActivatedEvent(event) {
  return typeof event.properties.viewId === "string";
}
__name(validateViewActivatedEvent, "validateViewActivatedEvent");
function validateNotificationShownEvent(event) {
  return typeof event.properties.notificationType === "string" && (event.properties.actionTaken === null || typeof event.properties.actionTaken === "string");
}
__name(validateNotificationShownEvent, "validateNotificationShownEvent");
function validateFeatureUsedEvent(event) {
  return typeof event.properties.feature === "string";
}
__name(validateFeatureUsedEvent, "validateFeatureUsedEvent");
function validateErrorEvent(event) {
  return typeof event.properties.errorType === "string" && typeof event.properties.errorMessage === "string";
}
__name(validateErrorEvent, "validateErrorEvent");
function validateWalkthroughStepCompletedEvent(event) {
  return typeof event.properties.stepId === "string" && typeof event.properties.stepTitle === "string";
}
__name(validateWalkthroughStepCompletedEvent, "validateWalkthroughStepCompletedEvent");
function validateOnboardingProtectionAssignedEvent(event) {
  return typeof event.properties.level === "string" && typeof event.properties.trigger === "string" && typeof event.properties.fileType === "string" && typeof event.properties.isFirstProtection === "boolean";
}
__name(validateOnboardingProtectionAssignedEvent, "validateOnboardingProtectionAssignedEvent");
function validateOnboardingPhaseProgressedEvent(event) {
  return typeof event.properties.phase === "number" && typeof event.properties.trigger === "string" && Array.isArray(event.properties.unlockedFeatures);
}
__name(validateOnboardingPhaseProgressedEvent, "validateOnboardingPhaseProgressedEvent");
function validateOnboardingContextualPromptShownEvent(event) {
  return typeof event.properties.promptType === "string" && (event.properties.actionTaken === null || typeof event.properties.actionTaken === "string");
}
__name(validateOnboardingContextualPromptShownEvent, "validateOnboardingContextualPromptShownEvent");
function validateSignatureVerificationSuccessEvent(event) {
  return Object.keys(event.properties).length === 0;
}
__name(validateSignatureVerificationSuccessEvent, "validateSignatureVerificationSuccessEvent");
function validateSignatureVerificationFailedEvent(event) {
  return Object.keys(event.properties).length === 0;
}
__name(validateSignatureVerificationFailedEvent, "validateSignatureVerificationFailedEvent");
function validateRulesCachedFallbackEvent(event) {
  return Object.keys(event.properties).length === 0;
}
__name(validateRulesCachedFallbackEvent, "validateRulesCachedFallbackEvent");
var VALID_TRAJECTORIES = [
  "stable",
  "escalating",
  "critical",
  "recovering"
];
var VALID_TEMP_LEVELS = [
  "cold",
  "warm",
  "hot",
  "burning"
];
function validateVitalsTrajectoryChangedEvent(event) {
  return VALID_TRAJECTORIES.includes(event.properties.previousTrajectory) && VALID_TRAJECTORIES.includes(event.properties.newTrajectory) && typeof event.properties.pressure === "number" && typeof event.properties.oxygen === "number" && VALID_TEMP_LEVELS.includes(event.properties.tempLevel);
}
__name(validateVitalsTrajectoryChangedEvent, "validateVitalsTrajectoryChangedEvent");
function validateVitalsCriticalStateEvent(event) {
  return typeof event.properties.pressure === "number" && typeof event.properties.oxygen === "number" && VALID_TEMP_LEVELS.includes(event.properties.tempLevel) && typeof event.properties.unsnapshotedChanges === "number";
}
__name(validateVitalsCriticalStateEvent, "validateVitalsCriticalStateEvent");
function validateVitalsAutoSnapshotEvent(event) {
  return VALID_TRAJECTORIES.includes(event.properties.trajectory) && typeof event.properties.pressure === "number" && typeof event.properties.oxygen === "number" && typeof event.properties.filesCount === "number";
}
__name(validateVitalsAutoSnapshotEvent, "validateVitalsAutoSnapshotEvent");
function validateVitalsNudgeShownEvent(event) {
  return VALID_TRAJECTORIES.includes(event.properties.trajectory) && typeof event.properties.suggestion === "string" && (event.properties.actionTaken === null || typeof event.properties.actionTaken === "string");
}
__name(validateVitalsNudgeShownEvent, "validateVitalsNudgeShownEvent");
var SeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info"
]);
var RiskSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low"
]);
var ValidationSeveritySchema = z.enum([
  "critical",
  "warning",
  "info"
]);
var BaseIssueSchema = z.object({
  /** Severity level */
  severity: z.union([
    SeveritySchema,
    ValidationSeveritySchema
  ]),
  /** Issue type code (e.g., UNSAFE_EVAL, PATH_TRAVERSAL) */
  type: z.string(),
  /** Human-readable message */
  message: z.string(),
  /** Line number (1-indexed) */
  line: z.number().optional(),
  /** Suggested fix */
  fix: z.string().optional()
});
BaseIssueSchema.extend({
  severity: ValidationSeveritySchema
});
BaseIssueSchema.extend({
  /** Unique identifier for deduplication: analyzer/type/file/line */
  id: z.string(),
  /** Severity level */
  severity: SeveritySchema,
  /** File path where issue was found */
  file: z.string().optional(),
  /** Column number (1-indexed) */
  column: z.number().optional(),
  /** Code snippet showing the issue */
  snippet: z.string().optional(),
  /** Rule ID if from a lint tool */
  rule: z.string().optional()
});
z.object({
  /** Whether validation passed */
  passed: z.boolean(),
  /** Issues found */
  issues: z.array(BaseIssueSchema),
  /** Duration in milliseconds */
  duration: z.number().optional()
});
var CircuitBreakerStateEnumSchema = z.enum([
  "closed",
  "open",
  "half-open"
]);
z.object({
  /** Current state */
  state: CircuitBreakerStateEnumSchema,
  /** Failure count */
  failures: z.number(),
  /** Failure threshold */
  threshold: z.number(),
  /** Last failure timestamp */
  lastFailure: z.number().optional(),
  /** Cooldown period in ms */
  cooldownMs: z.number()
});

// ../../packages/contracts/dist/events/core.js
extendZodWithOpenApi(z);
var EVENT_VERSION = "1.0.0";
var BaseEventSchema = z.object({
  event_version: z.string().default(EVENT_VERSION).openapi({
    example: "1.0.0"
  }),
  timestamp: z.number().default(() => Date.now()).openapi({
    example: 162e10
  })
});
var SaveAttemptSchema = BaseEventSchema.extend({
  event: z.literal("save_attempt"),
  properties: z.object({
    protection: z.enum([
      "watch",
      "warn",
      "block"
    ]).openapi({
      description: "Protection level applied to the file"
    }),
    severity: z.enum([
      "low",
      "medium",
      "high",
      "critical"
    ]).openapi({
      description: "Severity of the risk detected"
    }),
    file_kind: z.string().openapi({
      description: "Type of file being protected",
      example: "typescript"
    }),
    reason: z.string().openapi({
      description: "Reason for the save attempt",
      example: "User tried to save a file with a secret"
    }),
    ai_present: z.boolean().openapi({
      description: "Whether AI was involved in the decision"
    }),
    ai_burst: z.boolean().openapi({
      description: "Whether this was part of an AI burst operation"
    }),
    outcome: z.enum([
      "saved",
      "canceled",
      "blocked"
    ]).openapi({
      description: "Outcome of the save attempt"
    })
  })
}).openapi("SaveAttemptEvent");
var SnapshotCreatedSchema = BaseEventSchema.extend({
  event: z.literal("snapshot_created"),
  properties: z.object({
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    snapshot_id: z.string().openapi({
      description: "Unique identifier for the snapshot",
      example: "snap_67890"
    }),
    bytes_original: z.number().openapi({
      description: "Original size of the file in bytes",
      example: 1024
    }),
    bytes_stored: z.number().openapi({
      description: "Size of the stored snapshot in bytes",
      example: 512
    }),
    dedup_hit: z.boolean().openapi({
      description: "Whether deduplication was applied"
    }),
    latency_ms: z.number().openapi({
      description: "Time taken to create the snapshot in milliseconds",
      example: 45
    })
  })
}).openapi("SnapshotCreatedEvent");
var SessionFinalizedSchema = BaseEventSchema.extend({
  event: z.literal("session_finalized"),
  properties: z.object({
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    files: z.array(z.string()).openapi({
      description: "List of files in the session",
      example: [
        "src/index.ts",
        "package.json"
      ]
    }),
    triggers: z.array(z.string()).openapi({
      description: "List of triggers that activated during the session",
      example: [
        "save_attempt",
        "risk_detected"
      ]
    }),
    duration_ms: z.number().openapi({
      description: "Duration of the session in milliseconds",
      example: 12e4
    }),
    ai_present: z.boolean().openapi({
      description: "Whether AI was involved in the session"
    }),
    ai_burst: z.boolean().openapi({
      description: "Whether this was part of an AI burst operation"
    }),
    highest_severity: z.enum([
      "info",
      "low",
      "medium",
      "high",
      "critical"
    ]).openapi({
      description: "Highest severity of issues in the session"
    }),
    // AI detection v1 fields
    ai_assist_level: z.enum([
      "none",
      "light",
      "medium",
      "heavy",
      "unknown"
    ]).optional().openapi({
      description: "AI assistance level inferred from change patterns",
      example: "medium"
    }),
    ai_confidence_score: z.number().min(0).max(10).optional().openapi({
      description: "Confidence score for AI detection (0-10)",
      example: 7.5
    }),
    ai_provider: z.enum([
      "cursor",
      "claude",
      "unknown",
      "none"
    ]).optional().openapi({
      description: "Detected AI tool/provider",
      example: "cursor"
    }),
    ai_large_insert_count: z.number().int().min(0).optional().openapi({
      description: "Count of large insertions detected",
      example: 5
    }),
    ai_total_chars: z.number().int().min(0).optional().openapi({
      description: "Total characters in large insertions",
      example: 2e3
    }),
    context: z.record(z.string(), z.any()).optional().openapi({
      description: "Additional context for the session"
    })
  })
}).openapi("SessionFinalizedEvent");
var IssueCreatedSchema = BaseEventSchema.extend({
  event: z.literal("issue_created"),
  properties: z.object({
    issue_id: z.string().openapi({
      description: "Unique identifier for the issue",
      example: "issue_12345"
    }),
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    file_kind: z.string().openapi({
      description: "Type of file where the issue was detected",
      example: "typescript"
    }),
    type: z.enum([
      "secret",
      "mock",
      "phantom"
    ]).openapi({
      description: "Type of issue detected"
    }),
    severity: RiskSeveritySchema.openapi({
      description: "Severity of the issue"
    }),
    recommendation: z.string().openapi({
      description: "Recommendation for resolving the issue",
      example: "Remove the secret from the file"
    }),
    context: z.record(z.string(), z.any()).optional().openapi({
      description: "Additional context for the issue"
    })
  })
}).openapi("IssueCreatedEvent");
var IssueResolvedSchema = BaseEventSchema.extend({
  event: z.literal("issue_resolved"),
  properties: z.object({
    issue_id: z.string().openapi({
      description: "Unique identifier for the issue",
      example: "issue_12345"
    }),
    resolution: z.enum([
      "fixed",
      "ignored",
      "allowlisted"
    ]).openapi({
      description: "How the issue was resolved"
    })
  })
}).openapi("IssueResolvedEvent");
var SessionRestoredSchema = BaseEventSchema.extend({
  event: z.literal("session_restored"),
  properties: z.object({
    session_id: z.string().openapi({
      description: "Unique identifier for the session",
      example: "sess_12345"
    }),
    files_restored: z.array(z.string()).openapi({
      description: "List of files that were restored",
      example: [
        "src/index.ts",
        "package.json"
      ]
    }),
    time_to_restore_ms: z.number().openapi({
      description: "Time taken to restore the session in milliseconds",
      example: 2500
    }),
    reason: z.string().openapi({
      description: "Reason for the session restoration",
      example: "User requested rollback"
    })
  })
}).openapi("SessionRestoredEvent");
var PolicyChangedSchema = BaseEventSchema.extend({
  event: z.literal("policy_changed"),
  properties: z.object({
    pattern: z.string().openapi({
      description: "File pattern that the policy applies to",
      example: "*.env"
    }),
    from: z.enum([
      "watch",
      "warn",
      "block",
      "unprotected",
      "unauthenticated",
      "unaware"
    ]).openapi({
      description: "Previous protection level"
    }),
    to: z.enum([
      "watch",
      "warn",
      "block",
      "unprotected",
      "authenticated",
      "aware"
    ]).openapi({
      description: "New protection level"
    }),
    source: z.string().openapi({
      description: "Source of the policy change",
      example: "cli"
    }),
    context: z.record(z.string(), z.any()).optional().openapi({
      description: "Additional context for the policy change"
    })
  })
}).openapi("PolicyChangedEvent");
var AuthProviderSelectedSchema = BaseEventSchema.extend({
  event: z.literal("auth.provider.selected"),
  properties: z.object({
    provider: z.enum([
      "oauth",
      "device_flow"
    ]).openapi({
      description: "Authentication provider selected"
    }),
    trigger: z.enum([
      "user_selected",
      "fallback",
      "auto"
    ]).openapi({
      description: "How the provider was selected"
    })
  })
}).openapi("AuthProviderSelectedEvent");
var AuthBrowserOpenedSchema = BaseEventSchema.extend({
  event: z.literal("auth.browser.opened"),
  properties: z.object({
    method: z.enum([
      "external_command",
      "clipboard",
      "error"
    ]).openapi({
      description: "Method used to open browser"
    }),
    success: z.boolean().openapi({
      description: "Whether browser was successfully opened"
    }),
    error: z.string().optional().openapi({
      description: "Error message if browser opening failed"
    })
  })
}).openapi("AuthBrowserOpenedEvent");
var AuthCodeEntrySchema = BaseEventSchema.extend({
  event: z.literal("auth.code.entry"),
  properties: z.object({
    code_format: z.enum([
      "valid",
      "invalid_chars",
      "wrong_length"
    ]).openapi({
      description: "Validity of the entered code format"
    }),
    time_to_enter_ms: z.number().openapi({
      description: "Time taken to enter the code in milliseconds"
    }),
    attempts: z.number().int().min(1).openapi({
      description: "Number of attempts to enter the code correctly"
    }),
    code_length: z.number().int().optional().openapi({
      description: "Length of the entered code"
    })
  })
}).openapi("AuthCodeEntryEvent");
var AuthApprovalReceivedSchema = BaseEventSchema.extend({
  event: z.literal("auth.approval.received"),
  properties: z.object({
    polling_attempts: z.number().int().min(1).openapi({
      description: "Number of polling attempts before approval"
    }),
    total_wait_ms: z.number().openapi({
      description: "Total time waited for approval in milliseconds"
    }),
    device_code_expired: z.boolean().openapi({
      description: "Whether the device code had expired"
    })
  })
}).openapi("AuthApprovalReceivedEvent");
var WelcomeFeatureViewedSchema = BaseEventSchema.extend({
  event: z.literal("welcome.feature.viewed"),
  properties: z.object({
    feature: z.string().openapi({
      description: "Feature name shown in welcome panel",
      example: "ai_detection"
    }),
    position: z.number().int().min(0).openapi({
      description: "Position in feature carousel",
      example: 0
    }),
    trigger: z.enum([
      "onboarding",
      "nudge",
      "manual"
    ]).openapi({
      description: "How the welcome panel was triggered"
    })
  })
}).openapi("WelcomeFeatureViewedEvent");
var WelcomeActionTriggeredSchema = BaseEventSchema.extend({
  event: z.literal("welcome.action.triggered"),
  properties: z.object({
    action: z.string().openapi({
      description: "Action triggered by user",
      example: "try_now"
    }),
    feature: z.string().openapi({
      description: "Feature associated with the action",
      example: "ai_detection"
    }),
    time_viewed_ms: z.number().openapi({
      description: "How long the feature was viewed before action",
      example: 2500
    })
  })
}).openapi("WelcomeActionTriggeredEvent");
z.discriminatedUnion("event", [
  SaveAttemptSchema,
  SnapshotCreatedSchema,
  SessionFinalizedSchema,
  IssueCreatedSchema,
  IssueResolvedSchema,
  SessionRestoredSchema,
  PolicyChangedSchema,
  AuthProviderSelectedSchema,
  AuthBrowserOpenedSchema,
  AuthCodeEntrySchema,
  AuthApprovalReceivedSchema,
  WelcomeFeatureViewedSchema,
  WelcomeActionTriggeredSchema
]);

// ../../packages/contracts/dist/events/accountability.js
extendZodWithOpenApi(z);
var PerceivedHelpSchema = z.enum([
  "significantly",
  "somewhat",
  "not_really",
  "blocked"
]).openapi({
  description: "User's perception of how much SnapBack helped"
});
var ActualChangesSchema = z.object({
  files_modified: z.number().int().min(0).openapi({
    description: "Number of files modified during session",
    example: 5
  }),
  lines_added: z.number().int().min(0).openapi({
    description: "Total lines added",
    example: 150
  }),
  lines_removed: z.number().int().min(0).openapi({
    description: "Total lines removed",
    example: 30
  }),
  snapshots_used: z.number().int().min(0).openapi({
    description: "Number of snapshots created or restored",
    example: 2
  })
}).openapi("ActualChanges");
var PreventedIssuesSchema = z.object({
  rollbacks_avoided: z.number().int().min(0).openapi({
    description: "Rollbacks avoided due to snapshots",
    example: 1
  }),
  pattern_violations_caught: z.number().int().min(0).openapi({
    description: "Pattern violations caught before commit",
    example: 3
  }),
  skipped_tests_flagged: z.number().int().min(0).openapi({
    description: "Skipped tests flagged for attention",
    example: 2
  })
}).openapi("PreventedIssues");
var TierSchema = z.enum([
  "free",
  "pro",
  "team",
  "enterprise"
]).openapi({
  description: "User's subscription tier"
});
BaseEventSchema.extend({
  event: z.literal("session:feedback_submitted"),
  properties: z.object({
    // Session identification
    session_id: z.string().openapi({
      description: "Unique session identifier",
      example: "sess_12345"
    }),
    session_duration_ms: z.number().int().min(0).openapi({
      description: "Session duration in milliseconds",
      example: 36e5
    }),
    // User perception
    perceived_help: PerceivedHelpSchema,
    // Reality metrics (counts only, no PII)
    actual_changes: ActualChangesSchema,
    prevented_issues: PreventedIssuesSchema,
    // Tier for consent checking
    tier: TierSchema
  })
}).openapi("AccountabilityEffectEvent");
var ClaimSubjectKind = z.enum([
  "pr",
  "spec",
  "session",
  "commit",
  "file",
  "phase",
  "workspace",
  "claim"
]);
var ClaimantUrn = z.string().regex(/^urn:claimant:[a-z0-9.-]+$/);
z.enum([
  "immediate",
  "deferred-manual",
  "deferred-observational"
]);
var EvidenceGate = z.object({
  name: z.string(),
  passed: z.boolean(),
  output: z.string().optional()
});
var BaseClaim = z.object({
  // Identity
  claimId: z.string().uuid(),
  claimedAt: z.number().int().positive(),
  // Attribution
  claimant: ClaimantUrn,
  claimType: z.string(),
  claimFamily: z.enum([
    "completion",
    "verdict",
    "attribution",
    "prediction"
  ]),
  // Subject (what the claim is about)
  subject: z.object({
    kind: ClaimSubjectKind,
    ref: z.string().min(1)
  }),
  // Confidence (null for mechanical claims, [0,1] for predictive/attribution)
  confidence: z.number().min(0).max(1).nullable(),
  // Evidence supporting the claim
  evidence: z.object({
    gates: z.array(EvidenceGate).default([]),
    referenced: z.array(z.string()).default([])
  })
});
var OutcomeType = z.enum([
  "verified",
  "refuted",
  "ambiguous",
  "expired"
]);
var Outcome = z.object({
  // Identity
  outcomeId: z.string().uuid(),
  claimId: z.string().uuid(),
  observedAt: z.number().int().positive(),
  // Outcome classification
  outcomeType: OutcomeType,
  // Evidence for the outcome
  evidence: z.record(z.unknown()),
  // For predictive claims: comparison between predicted and actual
  delta: z.object({
    predicted: z.unknown(),
    actual: z.unknown()
  }).optional()
});
BaseClaim.extend({
  outcome: Outcome.optional()
});
var AttributionSource = z.enum([
  "ai-tool",
  "human",
  "automation",
  "import",
  "unknown"
]);
BaseClaim.extend({
  claimFamily: z.literal("attribution"),
  // Attribution requires confidence per spec
  confidence: z.number().min(0).max(1),
  // Attribution-specific payload
  claim: z.object({
    source: AttributionSource,
    toolUrn: z.string().optional(),
    confidenceRationale: z.string().optional(),
    indicators: z.array(z.string()).default([])
  })
});
var CompletionStatus = z.enum([
  "complete",
  "partial",
  "failed"
]);
BaseClaim.extend({
  claimFamily: z.literal("completion"),
  // Completion-specific payload
  claim: z.object({
    status: CompletionStatus,
    completedGates: z.number().int().min(0),
    totalGates: z.number().int().positive(),
    phase: z.string().optional()
  })
});
var PredictedOutcomeType = z.enum([
  "rollback",
  "bug-introduced",
  "performance-degradation",
  "security-issue",
  "drift",
  "failure",
  "success"
]);
var PredictionWindow = z.object({
  days: z.number().int().positive(),
  since: z.number().int().positive().optional()
});
BaseClaim.extend({
  claimFamily: z.literal("prediction"),
  // Predictions require confidence per spec
  confidence: z.number().min(0).max(1),
  // Prediction-specific payload
  claim: z.object({
    outcomeType: PredictedOutcomeType,
    window: PredictionWindow,
    rationale: z.string().optional(),
    modelVersion: z.string().optional()
  })
});
var VerdictStatus = z.enum([
  "pass",
  "fail",
  "needs-review",
  "drift-detected",
  "clean",
  "suspect"
]);
BaseClaim.extend({
  claimFamily: z.literal("verdict"),
  // Verdict-specific payload
  claim: z.object({
    status: VerdictStatus,
    details: z.string().optional(),
    criteria: z.array(z.string()).default([]),
    severity: z.enum([
      "info",
      "low",
      "medium",
      "high",
      "critical"
    ]).optional()
  })
});
var REGISTERED_CLAIMANTS = [
  "urn:claimant:subagent-stop-hook",
  "urn:claimant:drift-detector",
  "urn:claimant:tool-identity",
  "urn:claimant:spec-writer",
  "urn:claimant:intelligence.risk-scorer",
  "urn:claimant:intelligence.fragility-detector",
  "urn:claimant:intelligence.pattern-detector"
];
z.enum(REGISTERED_CLAIMANTS);

// ../../packages/contracts/dist/events/claims.js
extendZodWithOpenApi(z);
var CLAIMS_EVENT_VERSION = "1.0.0";
z.object({
  event_version: z.string().default(CLAIMS_EVENT_VERSION).openapi({
    example: "1.0.0"
  }),
  timestamp: z.number().default(() => Date.now()).openapi({
    example: 162e10
  }),
  event: z.literal("claim.recorded"),
  payload: z.object({
    claim: BaseClaim.openapi({
      description: "The claim that was recorded"
    }),
    workspaceHash: z.string().openapi({
      description: "SHA-256 hash of workspace path",
      example: "a1b2c3d4..."
    })
  })
});
z.object({
  event_version: z.string().default(CLAIMS_EVENT_VERSION).openapi({
    example: "1.0.0"
  }),
  timestamp: z.number().default(() => Date.now()).openapi({
    example: 162e10
  }),
  event: z.literal("claim.resolved"),
  payload: z.object({
    claimId: z.string().uuid().openapi({
      description: "ID of the resolved claim"
    }),
    outcome: Outcome.openapi({
      description: "The outcome record"
    }),
    workspaceHash: z.string().openapi({
      description: "SHA-256 hash of workspace path",
      example: "a1b2c3d4..."
    })
  })
});
z.object({
  event_version: z.string().default(CLAIMS_EVENT_VERSION).openapi({
    example: "1.0.0"
  }),
  timestamp: z.number().default(() => Date.now()).openapi({
    example: 162e10
  }),
  event: z.literal("claim.expired"),
  payload: z.object({
    claimId: z.string().uuid().openapi({
      description: "ID of the expired claim"
    }),
    outcomeId: z.string().uuid().openapi({
      description: "ID of the expiration outcome"
    }),
    expiredAt: z.number().openapi({
      description: "Timestamp when expiry was recorded"
    }),
    workspaceHash: z.string().openapi({
      description: "SHA-256 hash of workspace path",
      example: "a1b2c3d4..."
    })
  })
});
var toolUrnPattern = /^urn:ai-tool:[a-z0-9-]+:\d+\.\d+$/;
var toolUrnSchema = z.string().regex(toolUrnPattern, "Invalid tool URN format. Expected: urn:ai-tool:<vendor>:<version>").max(64, "Tool URN must be \u226464 characters");
var attributionSourceSchema = z.enum([
  "fingerprint",
  "session-correlation",
  "temporal",
  "mcp-direct"
]);
var toolAttributionSchema = z.object({
  kind: z.literal("tool"),
  /** Tool URN (e.g., urn:ai-tool:claude-code:1.0) */
  toolUrn: toolUrnSchema,
  /** Confidence score 0.0-1.0 */
  confidence: z.number().min(0).max(1),
  /** Attribution source method */
  source: attributionSourceSchema
});
var userAttributionSchema = z.object({
  kind: z.literal("user"),
  /** User authored the change without AI mediation */
  description: z.literal("user authored the change without AI mediation").optional()
});
var systemAttributionSchema = z.object({
  kind: z.literal("system"),
  /** System operation source */
  source: z.enum([
    "scheduled",
    "startup",
    "shutdown",
    "gc"
  ])
});
var unknownAttributionSchema = z.object({
  kind: z.literal("unknown"),
  /** Signal was insufficient to attribute; emitted rather than dropped */
  description: z.literal("signal was insufficient to attribute").optional()
});
var attributionSchema = z.discriminatedUnion("kind", [
  toolAttributionSchema,
  userAttributionSchema,
  systemAttributionSchema,
  unknownAttributionSchema
]);

// ../../packages/contracts/dist/events/spine/envelope.js
var uuidv7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var uuidv7Schema = z.string().regex(uuidv7Pattern, "Invalid UUIDv7 format. Expected: xxxxxxxx-xxxx-7xxx-8xxx-xxxxxxxxxxxx");
var sha256Pattern = /^[0-9a-f]{64}$/i;
var sha256Schema = z.string().regex(sha256Pattern, "Invalid SHA-256 hash format. Expected: 64 hex characters");
var eventTypePattern = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
var eventTypeSchema = z.string().regex(eventTypePattern, "Invalid event type format. Expected: domain.entity.action (e.g., snapshot.blob.created)").max(64, "Event type must be \u226464 characters");
z.enum([
  "immediate",
  "normal",
  "batch"
]);
var spineEnvelopeSchema = z.object({
  /** UUIDv7 for ordering + deduplication */
  eventId: uuidv7Schema,
  /** Integer schema version; increments on breaking change (M9) */
  schemaVersion: z.number().int().positive(),
  /** Domain.Entity.Action naming convention (§3.3) */
  eventType: eventTypeSchema,
  /** Unix timestamp in milliseconds (daemon-local clock) */
  occurredAt: z.number().int().positive(),
  /** SHA-256 of workspace path (M7) */
  workspaceHash: sha256Schema,
  /** Attribution discriminated union (§3.2) */
  attribution: attributionSchema
});
var spineOptionalFieldsSchema = z.object({
  /** Session identifier when operation is session-bound (S1) */
  sessionId: z.string().uuid().optional(),
  /** SHA-256 of userId; present only for Pro+ (M7) */
  userHash: sha256Schema.optional(),
  /** SHA-256 of orgId; present only for Team+ (M7) */
  orgHash: sha256Schema.optional(),
  /** SHA-256 of file path; never raw path (M7, N3) */
  filePathHash: sha256Schema.optional()
});
function createSpineEventSchema(dataSchema) {
  return spineEnvelopeSchema.merge(spineOptionalFieldsSchema).merge(z.object({
    data: dataSchema
  }));
}
__name(createSpineEventSchema, "createSpineEventSchema");
var snapshotTriggerSchema = z.enum([
  "manual",
  "auto-save",
  "pre-command",
  "session-end",
  "shutdown"
]);
var riskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical"
]);
var snapshotRiskSchema = z.object({
  score: z.number().min(0),
  level: riskLevelSchema
});
var snapshotBlobCreatedDataSchema = z.object({
  /** Unique snapshot identifier */
  snapshotId: z.string().uuid(),
  /** SHA-256 hash of file content (never raw content) */
  contentHash: z.string().regex(/^[0-9a-f]{64}$/i),
  /** Size of snapshot in bytes */
  sizeBytes: z.number().int().nonnegative(),
  /** What triggered the snapshot creation */
  trigger: snapshotTriggerSchema,
  /** Risk assessment at time of snapshot */
  risk: snapshotRiskSchema.optional(),
  /** AI tool attribution confidence if detected */
  toolConfidence: z.number().min(0).max(1).optional()
});
var snapshotBlobCreatedSchema = createSpineEventSchema(snapshotBlobCreatedDataSchema);
var SNAPSHOT_BLOB_CREATED = "snapshot.blob.created";
var snapshotBlobRestoredDataSchema = z.object({
  /** Snapshot identifier that was restored */
  snapshotId: z.string().uuid(),
  /** Time when snapshot was originally created */
  originalCreatedAt: z.number().int().positive(),
  /** Trigger for the restore operation */
  trigger: z.enum([
    "manual",
    "rollback",
    "undo",
    "system"
  ]),
  /** Time taken to restore in milliseconds */
  durationMs: z.number().int().nonnegative()
});
var snapshotBlobRestoredSchema = createSpineEventSchema(snapshotBlobRestoredDataSchema);
var SNAPSHOT_BLOB_RESTORED = "snapshot.blob.restored";
var snapshotBlobDeletedDataSchema = z.object({
  /** Array of snapshot identifiers that were deleted */
  snapshotIds: z.array(z.string().uuid()),
  /** Reason for deletion */
  reason: z.enum([
    "retention-policy",
    "user-request",
    "corrupted",
    "gc"
  ]),
  /** Number of bytes freed */
  bytesFreed: z.number().int().nonnegative()
});
var snapshotBlobDeletedSchema = createSpineEventSchema(snapshotBlobDeletedDataSchema);
var SNAPSHOT_BLOB_DELETED = "snapshot.blob.deleted";
var snapshotMetadataUpdatedDataSchema = z.object({
  /** Snapshot identifier */
  snapshotId: z.string().uuid(),
  /** Fields that were updated */
  updatedFields: z.array(z.enum([
    "tags",
    "risk",
    "annotation",
    "protection"
  ])),
  /** Previous risk level if risk was updated */
  previousRisk: riskLevelSchema.optional(),
  /** New risk level if risk was updated */
  newRisk: riskLevelSchema.optional()
});
var snapshotMetadataUpdatedSchema = createSpineEventSchema(snapshotMetadataUpdatedDataSchema);
var SNAPSHOT_METADATA_UPDATED = "snapshot.metadata.updated";
var SNAPSHOT_EVENT_SCHEMAS = {
  [SNAPSHOT_BLOB_CREATED]: snapshotBlobCreatedSchema,
  [SNAPSHOT_BLOB_RESTORED]: snapshotBlobRestoredSchema,
  [SNAPSHOT_BLOB_DELETED]: snapshotBlobDeletedSchema,
  [SNAPSHOT_METADATA_UPDATED]: snapshotMetadataUpdatedSchema
};
var coherenceAssessmentSchema = z.enum([
  "focused",
  "moderate",
  "scattered",
  "chaotic"
]);
var sessionOutcomeSchema = z.enum([
  "completed",
  "interrupted",
  "abandoned",
  "timeout",
  "rolled-back"
]);
var sessionLifecycleStartedDataSchema = z.object({
  /** Session identifier */
  sessionId: z.string().uuid(),
  /** Task description provided by user or inferred */
  task: z.string().min(1).max(500),
  /** Session start timestamp */
  startedAt: z.number().int().positive(),
  /** Initial coherence score */
  initialCoherence: z.number().min(0).max(1).optional(),
  /** Client that initiated the session */
  clientType: z.enum([
    "vscode",
    "jetbrains",
    "cli",
    "mcp",
    "unknown"
  ])
});
var sessionLifecycleStartedSchema = createSpineEventSchema(sessionLifecycleStartedDataSchema);
var SESSION_LIFECYCLE_STARTED = "session.lifecycle.started";
var sessionLifecycleEndedDataSchema = z.object({
  /** Session identifier */
  sessionId: z.string().uuid(),
  /** Session end timestamp */
  endedAt: z.number().int().positive(),
  /** Duration in milliseconds */
  durationMs: z.number().int().nonnegative(),
  /** Session outcome */
  outcome: sessionOutcomeSchema,
  /** Final coherence score */
  finalCoherence: z.number().min(0).max(1),
  /** Number of snapshots created during session */
  snapshotCount: z.number().int().nonnegative(),
  /** Number of rollbacks performed */
  rollbackCount: z.number().int().nonnegative()
});
var sessionLifecycleEndedSchema = createSpineEventSchema(sessionLifecycleEndedDataSchema);
var SESSION_LIFECYCLE_ENDED = "session.lifecycle.ended";
var sessionCoherenceUpdatedDataSchema = z.object({
  /** Session identifier */
  sessionId: z.string().uuid(),
  /** Updated coherence score 0.0-1.0 */
  score: z.number().min(0).max(1),
  /** Assessment category */
  assessment: coherenceAssessmentSchema,
  /** Number of detected context clusters */
  clusterCount: z.number().int().nonnegative(),
  /** Time since session start in milliseconds */
  elapsedMs: z.number().int().nonnegative()
});
var sessionCoherenceUpdatedSchema = createSpineEventSchema(sessionCoherenceUpdatedDataSchema);
var SESSION_COHERENCE_UPDATED = "session.coherence.updated";
var sessionCheckpointCreatedDataSchema = z.object({
  /** Session identifier */
  sessionId: z.string().uuid(),
  /** Checkpoint identifier */
  checkpointId: z.string().uuid(),
  /** Description of checkpoint state */
  description: z.string().min(1).max(500),
  /** Coherence score at checkpoint time */
  coherenceAtCheckpoint: z.number().min(0).max(1),
  /** Number of changes since session start */
  changeCount: z.number().int().nonnegative()
});
var sessionCheckpointCreatedSchema = createSpineEventSchema(sessionCheckpointCreatedDataSchema);
var SESSION_CHECKPOINT_CREATED = "session.checkpoint.created";
var SESSION_EVENT_SCHEMAS = {
  [SESSION_LIFECYCLE_STARTED]: sessionLifecycleStartedSchema,
  [SESSION_LIFECYCLE_ENDED]: sessionLifecycleEndedSchema,
  [SESSION_COHERENCE_UPDATED]: sessionCoherenceUpdatedSchema,
  [SESSION_CHECKPOINT_CREATED]: sessionCheckpointCreatedSchema
};
var riskLevelSchema2 = z.enum([
  "low",
  "medium",
  "high",
  "critical"
]);
var riskScoreSchema = z.number().min(0);
var riskSignalFatigueDetectedDataSchema = z.object({
  /** Workspace hash (from envelope, but also referenced in data for clarity) */
  workspaceHash: z.string().regex(/^[0-9a-f]{64}$/i),
  /** Fatigue level assessment */
  level: z.enum([
    "rested",
    "normal",
    "elevated",
    "fatigued"
  ]),
  /** Risk score boost factor from fatigue */
  riskBoost: z.number().min(0),
  /** Ratio of rapid accepts to total suggestions */
  rapidAcceptRatio: z.number().min(0).max(1),
  /** Time window for fatigue detection in milliseconds */
  windowMs: z.number().int().positive(),
  /** Number of suggestions in detection window */
  suggestionCount: z.number().int().nonnegative(),
  /** Session ID if part of tracked session */
  sessionId: z.string().uuid().optional()
});
var riskSignalFatigueDetectedSchema = createSpineEventSchema(riskSignalFatigueDetectedDataSchema);
var RISK_SIGNAL_FATIGUE_DETECTED = "risk.signal.fatigue-detected";
var riskSignalFragileDetectedDataSchema = z.object({
  /** Fragility score 0.0-1.0 */
  fragilityScore: z.number().min(0).max(1),
  /** Severity assessment */
  severity: z.enum([
    "moderate",
    "high",
    "critical"
  ]),
  /** Detection reason code */
  reason: z.enum([
    "rapid-changes",
    "incomplete-pattern",
    "dependency-risk",
    "complexity-spike",
    "unknown-tool"
  ]),
  /** Confidence in fragility assessment */
  confidence: z.number().min(0).max(1),
  /** Related snapshot hash if applicable */
  snapshotHash: z.string().regex(/^[0-9a-f]{64}$/i).optional()
});
var riskSignalFragileDetectedSchema = createSpineEventSchema(riskSignalFragileDetectedDataSchema);
var RISK_SIGNAL_FRAGILE_DETECTED = "risk.signal.fragile-detected";
var riskSignalPoisoningDetectedDataSchema = z.object({
  /** Unique fingerprint of poisoning pattern */
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/i),
  /** Number of distinct sessions showing this pattern */
  distinctSessions: z.number().int().positive(),
  /** Tools involved in poisoning pattern */
  toolFingerprints: z.array(z.string().regex(/^[0-9a-f]{64}$/i)).max(10),
  /** Detection confidence */
  confidence: z.number().min(0).max(1),
  /** Pattern category */
  category: z.enum([
    "repeated-error",
    "anti-pattern",
    "degraded-quality",
    "attribution-drift"
  ])
});
var riskSignalPoisoningDetectedSchema = createSpineEventSchema(riskSignalPoisoningDetectedDataSchema);
var RISK_SIGNAL_POISONING_DETECTED = "risk.signal.poisoning-detected";
var riskScoreUpdatedDataSchema = z.object({
  /** New risk score */
  score: riskScoreSchema,
  /** New risk level */
  level: riskLevelSchema2,
  /** Previous score */
  previousScore: riskScoreSchema,
  /** Previous level */
  previousLevel: riskLevelSchema2,
  /** Contributing factors to score change */
  factors: z.array(z.object({
    name: z.string().min(1).max(100),
    impact: z.enum([
      "positive",
      "negative",
      "neutral"
    ]),
    weight: z.number().min(0).max(1)
  })).max(10),
  /** Risk change trigger */
  trigger: z.enum([
    "snapshot-created",
    "snapshot-restored",
    "session-changed",
    "manual-adjustment",
    "auto-recalculation"
  ])
});
var riskScoreUpdatedSchema = createSpineEventSchema(riskScoreUpdatedDataSchema);
var RISK_SCORE_UPDATED = "risk.score.updated";
var RISK_EVENT_SCHEMAS = {
  [RISK_SIGNAL_FATIGUE_DETECTED]: riskSignalFatigueDetectedSchema,
  [RISK_SIGNAL_FRAGILE_DETECTED]: riskSignalFragileDetectedSchema,
  [RISK_SIGNAL_POISONING_DETECTED]: riskSignalPoisoningDetectedSchema,
  [RISK_SCORE_UPDATED]: riskScoreUpdatedSchema
};
var learningTypeSchema = z.enum([
  "recovery",
  "workflow",
  "risk",
  "attribution",
  "tool-preference"
]);
var learningConfidenceSchema = z.enum([
  "hypothesis",
  "emerging",
  "established",
  "validated"
]);
var learningPatternRecordedDataSchema = z.object({
  /** Pattern identifier */
  patternId: z.string().uuid(),
  /** Pattern type category */
  type: learningTypeSchema,
  /** Human-readable pattern description */
  description: z.string().min(1).max(1e3),
  /** Pattern confidence level */
  confidence: learningConfidenceSchema,
  /** Occurrence count for this pattern */
  occurrenceCount: z.number().int().nonnegative(),
  /** First observed timestamp */
  firstObservedAt: z.number().int().positive(),
  /** Pattern features (hashed/anonymized) */
  featureHash: z.string().regex(/^[0-9a-f]{64}$/i),
  /** Whether pattern has been validated through outcomes */
  isValidated: z.boolean()
});
var learningPatternRecordedSchema = createSpineEventSchema(learningPatternRecordedDataSchema);
var LEARNING_PATTERN_RECORDED = "learning.pattern.recorded";
var learningPatternPromotedDataSchema = z.object({
  /** Pattern identifier */
  patternId: z.string().uuid(),
  /** Previous confidence level */
  previousConfidence: learningConfidenceSchema,
  /** New confidence level */
  newConfidence: learningConfidenceSchema,
  /** Number of occurrences at promotion time */
  occurrenceCount: z.number().int().positive(),
  /** Outcome ratio (successes / total) */
  outcomeRatio: z.number().min(0).max(1),
  /** Promotion timestamp */
  promotedAt: z.number().int().positive()
});
var learningPatternPromotedSchema = createSpineEventSchema(learningPatternPromotedDataSchema);
var LEARNING_PATTERN_PROMOTED = "learning.pattern.promoted";
var learningPatternPrunedDataSchema = z.object({
  /** Number of patterns pruned */
  count: z.number().int().nonnegative(),
  /** Pruning reason */
  reason: z.enum([
    "stale",
    "low-confidence",
    "invalidated",
    "redundant"
  ]),
  /** Oldest pattern age at pruning in milliseconds */
  oldestPatternAgeMs: z.number().int().nonnegative(),
  /** Pruning timestamp */
  prunedAt: z.number().int().positive()
});
var learningPatternPrunedSchema = createSpineEventSchema(learningPatternPrunedDataSchema);
var LEARNING_PATTERN_PRUNED = "learning.pattern.pruned";
var learningAnnotationAddedDataSchema = z.object({
  /** Annotation identifier */
  annotationId: z.string().uuid(),
  /** Tag/category for the annotation */
  tag: z.string().min(1).max(100),
  /** Risk signal direction */
  riskSignal: z.object({
    direction: z.enum([
      "increasing",
      "decreasing",
      "stable"
    ]),
    magnitude: z.number().min(0).max(1)
  }),
  /** Related snapshot hash */
  snapshotHash: z.string().regex(/^[0-9a-f]{64}$/i),
  /** Annotation timestamp */
  annotatedAt: z.number().int().positive(),
  /** Session ID if part of tracked session */
  sessionId: z.string().uuid().optional()
});
var learningAnnotationAddedSchema = createSpineEventSchema(learningAnnotationAddedDataSchema);
var LEARNING_ANNOTATION_ADDED = "learning.annotation.added";
var LEARNING_EVENT_SCHEMAS = {
  [LEARNING_PATTERN_RECORDED]: learningPatternRecordedSchema,
  [LEARNING_PATTERN_PROMOTED]: learningPatternPromotedSchema,
  [LEARNING_PATTERN_PRUNED]: learningPatternPrunedSchema,
  [LEARNING_ANNOTATION_ADDED]: learningAnnotationAddedSchema
};
var fileOperationSchema = z.enum([
  "create",
  "modify",
  "delete",
  "rename"
]);
var fileCategorySchema = z.enum([
  "source-code",
  "configuration",
  "documentation",
  "test",
  "asset",
  "other"
]);
var fileWatchModifiedDataSchema = z.object({
  /** SHA-256 hash of file path (never raw path per M7, N3) */
  filePathHash: z.string().regex(/^[0-9a-f]{64}$/i),
  /** File extension category */
  category: fileCategorySchema,
  /** Operation type */
  operation: fileOperationSchema,
  /** Size change in bytes (positive for growth, negative for shrinkage) */
  sizeChangeBytes: z.number().int(),
  /** Lines changed (if applicable) */
  linesChanged: z.number().int().optional(),
  /** Whether change is attributed to AI tool */
  aiAttributed: z.boolean(),
  /** Tool confidence if AI attributed */
  toolConfidence: z.number().min(0).max(1).optional(),
  /** Time since last modification in milliseconds */
  timeSinceLastModifyMs: z.number().int().nonnegative().optional()
});
var fileWatchModifiedSchema = createSpineEventSchema(fileWatchModifiedDataSchema);
var FILE_WATCH_MODIFIED = "file.watch.modified";
var fileWatchBatchDataSchema = z.object({
  /** Number of files in batch */
  fileCount: z.number().int().positive().max(100),
  /** Operations summary */
  operations: z.object({
    create: z.number().int().nonnegative(),
    modify: z.number().int().nonnegative(),
    delete: z.number().int().nonnegative(),
    rename: z.number().int().nonnegative()
  }),
  /** Categories summary */
  categories: z.object({
    "source-code": z.number().int().nonnegative(),
    configuration: z.number().int().nonnegative(),
    documentation: z.number().int().nonnegative(),
    test: z.number().int().nonnegative(),
    asset: z.number().int().nonnegative(),
    other: z.number().int().nonnegative()
  }),
  /** Batch time window in milliseconds */
  windowMs: z.number().int().positive(),
  /** Whether any changes are AI attributed */
  aiAttributed: z.boolean()
});
var fileWatchBatchSchema = createSpineEventSchema(fileWatchBatchDataSchema);
var FILE_WATCH_BATCH = "file.watch.batch";
var fileProtectionChangedDataSchema = z.object({
  /** SHA-256 hash of file path */
  filePathHash: z.string().regex(/^[0-9a-f]{64}$/i),
  /** New protection level */
  newLevel: z.enum([
    "watch",
    "warn",
    "block"
  ]),
  /** Previous protection level */
  previousLevel: z.enum([
    "watch",
    "warn",
    "block"
  ]).optional(),
  /** Source of protection change */
  source: z.enum([
    "auto-risk",
    "manual-user",
    "config-rule",
    "session-context"
  ]),
  /** Risk score at time of change */
  riskScore: z.number().min(0).optional(),
  /** Session ID if part of tracked session */
  sessionId: z.string().uuid().optional()
});
var fileProtectionChangedSchema = createSpineEventSchema(fileProtectionChangedDataSchema);
var FILE_PROTECTION_CHANGED = "file.protection.changed";
var FILE_EVENT_SCHEMAS = {
  [FILE_WATCH_MODIFIED]: fileWatchModifiedSchema,
  [FILE_WATCH_BATCH]: fileWatchBatchSchema,
  [FILE_PROTECTION_CHANGED]: fileProtectionChangedSchema
};

// ../../packages/contracts/dist/events/spine/index.js
[
  ...Object.keys(SNAPSHOT_EVENT_SCHEMAS),
  ...Object.keys(SESSION_EVENT_SCHEMAS),
  ...Object.keys(RISK_EVENT_SCHEMAS),
  ...Object.keys(LEARNING_EVENT_SCHEMAS),
  ...Object.keys(FILE_EVENT_SCHEMAS)
];

// ../../packages/contracts/dist/features.js
var FEATURE_FLAGS = {
  // Core protection features
  "protection.enabled": true,
  "protection.auto_checkpoint": true,
  "protection.pre_save_hook": true,
  // Risk analysis
  "risk.guardian_v2": false,
  "risk.dependency_analysis": true,
  "risk.deep_analysis": false,
  "risk.ai_detection": true,
  // Storage
  "storage.compression": true,
  "storage.deduplication": false,
  "storage.encryption": false,
  // UI/UX
  "ui.chat_participant": true,
  "ui.status_bar": true,
  "ui.timeline_view": true,
  // Telemetry
  "telemetry.detailed_events": false,
  "telemetry.performance_metrics": true,
  "telemetry.sampling_rate": 1,
  // Experimental
  "experimental.mcp_tools": false,
  "experimental.recovery_mode": false,
  // Intelligence Layer (WU-4.1b)
  "intelligence.layer": false,
  "intelligence.trust_calibration": false,
  "intelligence.pattern_library": false,
  // A/B Testing - DeepScan
  "deepscan.v2_algorithm": false,
  "deepscan.enhanced_analysis": false,
  "deepscan.real_time_processing": false,
  // Event System Migration
  "events.eventemitter2": false
};

// ../../packages/contracts/dist/feature-manager.js
var logger = createLogger({
  name: "feature-manager",
  level: LogLevel.INFO
});
var FeatureManager = class _FeatureManager {
  static {
    __name(this, "FeatureManager");
  }
  static instance;
  flags = /* @__PURE__ */ new Map();
  posthogClient = null;
  constructor() {
    for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
      this.flags.set(key, value);
    }
    this.loadEnvironmentOverrides();
  }
  static getInstance() {
    if (!_FeatureManager.instance) {
      _FeatureManager.instance = new _FeatureManager();
    }
    return _FeatureManager.instance;
  }
  isEnabled(flag) {
    const value = this.flags.get(flag) ?? FEATURE_FLAGS[flag];
    if (flag === "telemetry.sampling_rate" && typeof value === "number") {
      return Math.random() < value;
    }
    return Boolean(value);
  }
  getValue(flag) {
    return this.flags.get(flag);
  }
  setFlag(flag, value) {
    this.flags.set(flag, value);
  }
  /**
   * Set PostHog client for dynamic feature flag evaluation
   */
  setPostHogClient(client) {
    this.posthogClient = client;
    if (client) {
      logger.info("PostHog client configured");
    } else {
      logger.info("PostHog client cleared, falling back to static config");
    }
  }
  /**
   * Get configured PostHog client
   */
  getPostHogClient() {
    return this.posthogClient;
  }
  /**
   * Asynchronously check if feature is enabled (with PostHog fallback)
   * @param flag - Feature flag name
   * @param userId - User ID for targeting rules (optional)
   * @param context - Additional context for PostHog targeting (optional)
   * @returns Promise<boolean> - True if feature is enabled
   */
  async isEnabledAsync(flag, userId, context) {
    if (this.posthogClient && userId) {
      try {
        const defaultSubscriptionTier = process.env.VREKO_DEFAULT_SUBSCRIPTION_TIER || "free";
        const posthogContext = {
          subscriptionTier: defaultSubscriptionTier,
          ...context
        };
        const result = await this.posthogClient.isFeatureEnabled(flag, userId, posthogContext);
        if (result !== null && result !== void 0) {
          logger.info("Feature flag evaluated via PostHog", {
            flag,
            userId,
            enabled: result
          });
          return result;
        }
      } catch (error) {
        logger.warn("PostHog feature flag check failed, falling back to static config", {
          flag,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return this.isEnabled(flag);
  }
  loadEnvironmentOverrides() {
    for (const flag of Object.keys(FEATURE_FLAGS)) {
      const envVar = `VREKO_${flag.replace(/\./g, "_").toUpperCase()}`;
      const envValue = process.env[envVar];
      if (envValue !== void 0) {
        if (envValue === "true" || envValue === "false") {
          this.flags.set(flag, envValue === "true");
        } else if (!Number.isNaN(Number(envValue))) {
          this.flags.set(flag, Number(envValue));
        }
      }
    }
  }
  reset() {
    this.flags.clear();
    this.posthogClient = null;
    for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
      this.flags.set(key, value);
    }
    this.loadEnvironmentOverrides();
  }
};
z.object({
  /** Internal ingest record ID */
  ingestId: z.string().uuid(),
  /** User ID (for scope resolution) */
  userId: z.string(),
  /** Organization ID (null for personal sessions) */
  organizationId: z.string().uuid().nullable(),
  /** Session payload (JSONB content) */
  payload: z.record(z.unknown()),
  /** Feature flag state for this session */
  enabledFeatures: z.array(z.string()),
  /** Tier-based limits */
  maxReflectionTokens: z.number().int().positive()
});
z.object({
  /** Internal ingest record ID */
  ingestId: z.string().uuid(),
  /** User ID */
  userId: z.string(),
  /** Organization ID */
  organizationId: z.string().uuid().nullable(),
  /** Session payload (for pattern analysis) */
  payload: z.record(z.unknown()),
  /** User's outcome assessment (optional - can be computed) */
  userOutcome: z.object({
    /** Was the session successful? */
    success: z.boolean(),
    /** User's description of outcome */
    description: z.string().max(500).optional()
  }).optional()
});
var MissingContextCategorySchema = z.enum([
  "eventual_consistency_contract",
  "shared_dependency",
  "test_coverage_gap",
  "implicit_ownership",
  "prior_breakage_history",
  "async_message_contract",
  "environment_coupling",
  "undocumented_invariant",
  "other"
]);
var MissingContextItemSchema = z.object({
  category: MissingContextCategorySchema,
  description: z.string().max(200),
  affectedFiles: z.array(z.string()).optional(),
  severity: z.enum([
    "high",
    "medium",
    "low"
  ])
});
var ConfidenceGapItemSchema = z.object({
  filePath: z.string().min(1),
  reason: z.string().max(150),
  confidenceScore: z.number().min(0).max(1)
});
var ContributingFactorSchema = z.enum([
  "multi_service_change",
  "high_churn_file",
  "ai_generated_without_tests",
  "dependency_boundary_crossed",
  "config_file_modified",
  "auth_middleware_touched",
  "database_schema_changed"
]);
z.object({
  schemaVersion: z.literal("sb.reflection.v1"),
  missingContext: z.array(MissingContextItemSchema),
  confidenceGaps: z.array(ConfidenceGapItemSchema),
  wouldHaveChangedApproach: z.boolean(),
  contributingFactors: z.array(ContributingFactorSchema),
  rawSummary: z.string().max(600),
  generatedBy: z.enum([
    "llm",
    "heuristic"
  ])
});
var OrgModeSchema = z.enum([
  "none",
  "shared",
  "ring_fenced"
]);
z.object({
  personal: z.boolean(),
  global: z.boolean(),
  org: z.object({
    orgId: z.string(),
    mode: OrgModeSchema
  }).nullable()
});

// ../../packages/contracts/dist/observability/types.js
var SpanStatusCode;
(function(SpanStatusCode2) {
  SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
  SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
  SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
})(SpanStatusCode || (SpanStatusCode = {}));
var SpanKind;
(function(SpanKind2) {
  SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
  SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
  SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
  SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
  SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
})(SpanKind || (SpanKind = {}));

// ../../packages/contracts/dist/pioneer/events.js
var PIONEER_EVENTS = {
  INVITE_CODE_REDEEMED: "invite_code_redeemed",
  CLI_INSTALLED: "cli_installed",
  EXTENSION_INSTALLED: "extension_installed",
  FIRST_SESSION: "first_session",
  FIRST_SNAPSHOT: "first_snapshot",
  FIRST_CEREMONY: "first_ceremony",
  FIRST_INTELLIGENCE_FILE_CARD: "first_intelligence_file_card",
  FIRST_RECOVERY: "first_recovery"
};
var IDE_VALUES = [
  "vscode",
  "cursor",
  "windsurf",
  "qoder",
  "jetbrains",
  "neovim",
  "other"
];
var AI_TOOL_VALUES = [
  "github-copilot",
  "cursor-ai",
  "claude-code",
  "claude-chat",
  "chatgpt",
  "codeium",
  "amazon-q",
  "gemini",
  "morph",
  "other"
];
z.object({
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()),
  // Optional enrichment branches downstream sequences without gating the capture.
  intent: z.enum([
    "solo",
    "team"
  ]).optional(),
  referralCode: z.string().max(64).optional(),
  // Turnstile token is OPTIONAL at the schema level. Whether it is REQUIRED is
  // decided at runtime by whether a server secret is configured (see route).
  turnstileToken: z.string().optional()
});
var codeRegex = /^[23456789A-HJ-NP-Z]{8}$/;
z.object({
  code: z.string().regex(codeRegex, "invalid_format"),
  primaryIde: z.enum(IDE_VALUES),
  aiTools: z.array(z.enum(AI_TOOL_VALUES)).min(1).max(AI_TOOL_VALUES.length)
});
z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  specversion: z.literal("1.0"),
  type: z.string().min(1),
  datacontenttype: z.string().optional(),
  dataschema: z.string().url().optional(),
  subject: z.string().optional(),
  time: z.string().datetime().optional(),
  data: z.unknown().optional(),
  // Vreko extensions
  traceid: z.string().optional(),
  workspaceid: z.string().optional(),
  userid: z.string().optional(),
  sessionid: z.string().optional(),
  toolurn: z.string().optional(),
  riskclass: z.enum([
    "safe",
    "low",
    "medium",
    "high",
    "critical"
  ]).optional(),
  sandboxed: z.boolean().optional(),
  privacysig: z.string().optional()
});
z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/, "Invalid semver format. Expected: MAJOR.MINOR.PATCH[-prerelease]");
var ToolURNSchema = z.string().regex(/^urn:(vreko|openclaw|community|enterprise):[\w-]+:[\w-]+:\d+\.\d+\.\d+(?:-[\w.]+)?$/, "Invalid URN format. Expected: urn:{namespace}:{pluginId}:{capability}:{semver}").brand();

// ../../packages/contracts/dist/primitives/tool-invocation.js
var AGENT_RUNTIMES = [
  "claude-code",
  "cursor",
  "copilot",
  "openclaw",
  "windsurf",
  "cline",
  "aider",
  "continue",
  "unknown"
];
var SANDBOX_LEVELS = [
  "none",
  "basic",
  "strict",
  "isolated"
];
var RISK_CLASSES = [
  "safe",
  "low",
  "medium",
  "high",
  "critical"
];
var CHANNELS = [
  "api",
  "mcp",
  "vscode",
  "cli",
  "web",
  "whatsapp",
  "telegram",
  "discord",
  "slack",
  "teams",
  "matrix"
];
var SessionContextSchema = z.object({
  /** Channel through which request was made */
  channel: z.enum(CHANNELS),
  /** Workspace identifier (local path hash or cloud workspace ID) */
  workspaceId: z.string().min(1),
  /** Session ID for request correlation */
  sessionId: z.string().uuid(),
  /** OpenClaw session ID if bridged */
  openclawSessionId: z.string().optional(),
  /** Channel-specific user identifier */
  channelUserId: z.string().optional()
});
var IdentityContextSchema = z.object({
  /** User ID (authenticated) */
  userId: z.string().uuid().optional(),
  /** Anonymous identifier for unauthenticated requests */
  anonymousId: z.string().optional(),
  /** Current subscription tier */
  tier: z.enum([
    "free",
    "pro",
    "team",
    "enterprise"
  ]).default("free"),
  /** Enabled features for this user */
  features: z.array(z.string()).default([]),
  /** Pre-resolved entitlements (optional, can be fetched) */
  entitlements: z.object({
    tier: z.enum([
      "free",
      "pro",
      "team",
      "enterprise"
    ]),
    features: z.array(z.string()),
    limits: z.record(z.string(), z.number().nullable())
  }).optional(),
  /** API key identifier (if using API key auth) */
  apiKeyId: z.string().optional()
});
var ToolSpecSchema = z.object({
  /** Tool URN (canonical identifier) */
  urn: ToolURNSchema,
  /** Tool risk classification */
  riskClass: z.enum(RISK_CLASSES),
  /** Required permissions to invoke this tool */
  requiredPermissions: z.array(z.string()).default([]),
  /** Required features (entitlement check) */
  requiredFeatures: z.array(z.string()).default([]),
  /** Minimum tier required */
  minTier: z.enum([
    "free",
    "pro",
    "team",
    "enterprise"
  ]).optional()
});
var ExecutionContextSchema = z.object({
  /** Agent runtime that initiated the call */
  agentRuntime: z.enum(AGENT_RUNTIMES).default("unknown"),
  /** Required sandbox level */
  sandboxLevel: z.enum(SANDBOX_LEVELS).default("basic"),
  /** Timeout in milliseconds */
  timeoutMs: z.number().positive().default(3e4),
  /** Whether to auto-snapshot before execution */
  snapshotBefore: z.boolean().default(false),
  /** Maximum concurrent executions allowed */
  maxConcurrent: z.number().positive().default(1),
  /** Retry configuration */
  retry: z.object({
    maxAttempts: z.number().min(1).max(5).default(1),
    backoffMs: z.number().min(100).max(3e4).default(1e3)
  }).optional()
});
z.object({
  /** Unique trace ID for request correlation and audit */
  traceId: z.string().uuid(),
  /** Timestamp when invocation was created */
  createdAt: z.coerce.date().default(() => /* @__PURE__ */ new Date()),
  /** Session context - channel and workspace */
  session: SessionContextSchema,
  /** Identity context - who and what permissions */
  identity: IdentityContextSchema,
  /** Tool specification - what tool and risk class */
  tool: ToolSpecSchema,
  /** Tool arguments (validated against tool's input schema) */
  args: z.record(z.string(), z.unknown()).default({}),
  /** Execution context - how to execute */
  context: ExecutionContextSchema,
  /**
   * Metadata for observability and debugging
   * Not used in execution logic, only for tracing
   */
  metadata: z.object({
    /** Source surface that created this invocation */
    source: z.string().optional(),
    /** Parent trace ID for nested calls */
    parentTraceId: z.string().uuid().optional(),
    /** Custom labels for filtering */
    labels: z.record(z.string(), z.string()).optional(),
    /** Original request payload hash (for audit) */
    requestHash: z.string().optional()
  }).optional()
});
var PipelineStepResultSchema = z.object({
  /** Step name */
  step: z.string(),
  /** Whether step passed */
  passed: z.boolean(),
  /** Duration in milliseconds */
  durationMs: z.number(),
  /** Error if step failed */
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  }).optional(),
  /** Step-specific data */
  data: z.unknown().optional()
});
z.object({
  /** Trace ID from invocation */
  traceId: z.string().uuid(),
  /** Whether execution succeeded */
  success: z.boolean(),
  /** Result data (if successful) */
  result: z.unknown().optional(),
  /** Error details (if failed) */
  error: z.object({
    code: z.string(),
    message: z.string(),
    step: z.string().optional(),
    details: z.unknown().optional()
  }).optional(),
  /** Pipeline step results */
  steps: z.array(PipelineStepResultSchema),
  /** Total execution duration */
  durationMs: z.number(),
  /** Snapshot ID if created */
  snapshotId: z.string().optional(),
  /** Audit log ID */
  auditId: z.string().optional()
});

// ../../packages/contracts/dist/primitives/execution-pipeline.js
var PIPELINE_STEPS = [
  "validate",
  "authenticate",
  "authorize",
  "rate_limit",
  "pre_scan",
  "lease",
  "snapshot",
  "execute",
  "post_scan",
  "egress",
  "audit",
  "finalize"
];
z.object({
  skipSteps: z.array(z.enum(PIPELINE_STEPS)).optional(),
  timeoutMs: z.number().positive().optional(),
  continueOnNonCriticalFailure: z.boolean().optional()
});
z.object({
  /** Whether the lease was acquired */
  acquired: z.boolean(),
  /** Lease ID if acquired */
  leaseId: z.string().optional(),
  /** Reason if not acquired */
  reason: z.string().optional(),
  /** Conflicting leases if acquisition failed */
  conflicts: z.array(z.object({
    leaseId: z.string(),
    files: z.array(z.string()),
    heldBy: z.object({
      agentRuntime: z.enum(AGENT_RUNTIMES),
      sessionId: z.string()
    }),
    expiresAt: z.coerce.date()
  })).optional()
});
z.object({
  /** Whether there are conflicts */
  hasConflicts: z.boolean(),
  /** Conflicting files grouped by lease */
  conflicts: z.array(z.object({
    leaseId: z.string(),
    files: z.array(z.string()),
    heldBy: z.object({
      agentRuntime: z.enum(AGENT_RUNTIMES),
      sessionId: z.string()
    }),
    expiresAt: z.coerce.date(),
    /** Whether this conflict is blocking (cannot proceed) */
    blocking: z.boolean()
  })),
  /** Files that are safe to modify */
  safeFiles: z.array(z.string()),
  /** Files that are blocked */
  blockedFiles: z.array(z.string())
});
z.object({
  /** Unique lease identifier */
  leaseId: z.string(),
  /** Workspace this lease belongs to */
  workspaceId: z.string(),
  /** Files covered by this lease */
  files: z.array(z.string()),
  /** Agent that holds this lease */
  agentRuntime: z.enum(AGENT_RUNTIMES),
  /** Session that holds this lease */
  sessionId: z.string(),
  /** Trace ID for correlation */
  traceId: z.string().optional(),
  /** When the lease was acquired */
  acquiredAt: z.coerce.date(),
  /** When the lease expires */
  expiresAt: z.coerce.date(),
  /** Time-to-live in milliseconds */
  ttlMs: z.number().positive(),
  /** Whether the lease is still active */
  active: z.boolean().default(true),
  /** Number of times the lease has been extended */
  extensionCount: z.number().default(0)
});

// ../../packages/contracts/dist/saga/tier-upgrade-saga.js
var TIER_UPGRADE_SAGA = {
  sagaType: "tier_upgrade",
  maxRetries: 3,
  persistenceInterval: 1e3,
  steps: [
    {
      stepId: "update_subscription",
      stepName: "Update Subscription in Payment Provider",
      execute: /* @__PURE__ */ __name(async (_input) => {
        throw new Error("Not implemented - to be injected");
      }, "execute"),
      compensate: /* @__PURE__ */ __name(async (_input, output) => {
        const typedOutput = output;
        if (typedOutput?.subscriptionId) ;
      }, "compensate"),
      retryable: true,
      timeout: 3e4
    },
    {
      stepId: "update_user_tier",
      stepName: "Update User Tier in Database",
      execute: /* @__PURE__ */ __name(async (_input) => {
        throw new Error("Not implemented - to be injected");
      }, "execute"),
      compensate: /* @__PURE__ */ __name(async (_input, output) => {
        const typedOutput = output;
        if (typedOutput?.previousTier) ;
      }, "compensate"),
      retryable: true,
      timeout: 5e3
    },
    {
      stepId: "update_entitlements",
      stepName: "Update Entitlements with New Tier Features",
      execute: /* @__PURE__ */ __name(async (_input) => {
        throw new Error("Not implemented - to be injected");
      }, "execute"),
      compensate: /* @__PURE__ */ __name(async (_input, output) => {
        const typedOutput = output;
        if (typedOutput?.previousVersion !== void 0) ;
      }, "compensate"),
      retryable: true,
      timeout: 5e3
    },
    {
      stepId: "send_confirmation",
      stepName: "Send Upgrade Confirmation Email",
      execute: /* @__PURE__ */ __name(async (_input) => {
        throw new Error("Not implemented - to be injected");
      }, "execute"),
      compensate: /* @__PURE__ */ __name(async (_input, output) => {
        const typedOutput = output;
        if (typedOutput?.emailJobId) ;
      }, "compensate"),
      retryable: true,
      timeout: 1e4
    },
    {
      stepId: "emit_event",
      stepName: "Emit Tier Upgraded Event",
      execute: /* @__PURE__ */ __name(async (_input) => {
        throw new Error("Not implemented - to be injected");
      }, "execute"),
      // No compensation needed for events (idempotent)
      retryable: false,
      timeout: 3e3
    }
  ]
};
var DiffChangeSchema = z.object({
  added: z.boolean().optional().default(false),
  removed: z.boolean().optional().default(false),
  value: z.string(),
  count: z.number().optional()
});
var RiskScoreDetailSchema = z.object({
  score: z.number().min(0).max(10),
  factors: z.array(z.string()),
  severity: RiskSeveritySchema
});
z.object({
  metrics: z.record(z.string(), z.number()),
  trends: z.record(z.string(), z.array(z.number())),
  insights: z.array(z.string()),
  timestamp: z.number(),
  snapshotRecommendations: z.object({
    shouldCreateSnapshot: z.boolean(),
    reason: z.string(),
    urgency: RiskSeveritySchema,
    suggestedTiming: z.string()
  }).optional()
});
z.object({
  trigger: z.string().default("manual"),
  risk: z.number().min(0).max(10).optional(),
  content: z.string().optional(),
  files: z.array(z.string()).optional()
});
z.object({
  trigger: z.string().default("manual"),
  risk: z.number().min(0).max(10).optional(),
  content: z.string().optional()
});
z.object({
  id: z.string(),
  timestamp: z.number(),
  meta: z.object({
    trigger: z.string().optional(),
    risk: z.number().optional()
  }).optional()
});
z.object({
  changes: z.array(DiffChangeSchema)
});
z.object({
  before: z.record(z.string(), z.any()),
  after: z.record(z.string(), z.any())
});
z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional()
});
var RetrySchema = z.object({
  retries: z.number().int().min(0).default(2),
  factor: z.number().min(1).default(2),
  min: z.number().int().default(250),
  max: z.number().int().default(1500),
  jitter: z.boolean().default(true)
});
var CircuitSchema = z.object({
  enabled: z.boolean().default(true),
  errorThresholdPercentage: z.number().int().min(1).max(100).default(50),
  volumeThreshold: z.number().int().min(1).default(10),
  timeoutMs: z.number().int().default(5e3),
  resetMs: z.number().int().default(3e4),
  rollingCountMs: z.number().int().default(6e4),
  rollingCountBuckets: z.number().int().default(6)
});
z.object({
  timeoutMs: z.number().int().default(5e3),
  maxConcurrent: z.number().int().min(1).default(4),
  retry: RetrySchema,
  circuit: CircuitSchema,
  batch: z.object({
    size: z.number().int().min(1).default(5),
    maxWaitMs: z.number().int().default(150)
  })
});
z.object({
  debounceMs: z.number().int().default(120),
  awaitWriteFinish: z.object({
    stabilityThreshold: z.number().int().default(200),
    pollInterval: z.number().int().default(50)
  }),
  ignored: z.array(z.string()).default([
    "**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**"
  ])
});
var SessionSchemaVersion = "sb.session.v1";
var ChangeOpSchema = z.enum([
  "created",
  "modified",
  "deleted",
  "renamed"
]);
var EOLTypeSchema = z.enum([
  "lf",
  "crlf"
]);
var SessionTriggerSchema = z.enum([
  "filewatch",
  "pre-commit",
  "manual",
  "idle-finalize"
]);
var SessionChangeSchema = z.object({
  /** Relative POSIX path from workspace root */
  p: z.string(),
  /** Operation type */
  op: ChangeOpSchema,
  /** Prior relative path (for rename operations only) */
  from: z.string().optional(),
  /** SHA-256 hash before change (CAS reference) - computed on finalize */
  hOld: z.string().optional(),
  /** SHA-256 hash after change (CAS reference) - computed on finalize */
  hNew: z.string().optional(),
  /** File size before change (bytes) */
  sizeBefore: z.number().int().nonnegative().optional(),
  /** File size after change (bytes) */
  sizeAfter: z.number().int().nonnegative().optional(),
  /** Modification time before change (Unix epoch ms) */
  mtimeBefore: z.number().int().nonnegative().optional(),
  /** Modification time after change (Unix epoch ms) */
  mtimeAfter: z.number().int().nonnegative().optional(),
  /** File permissions before change (Unix mode) */
  modeBefore: z.number().int().nonnegative().optional(),
  /** File permissions after change (Unix mode) */
  modeAfter: z.number().int().nonnegative().optional(),
  /** Line ending style before change */
  eolBefore: EOLTypeSchema.optional(),
  /** Line ending style after change */
  eolAfter: EOLTypeSchema.optional()
});
z.object({
  /** Schema version for backward compatibility */
  schema: z.literal(SessionSchemaVersion),
  /** Unique session identifier (CUID) */
  sessionId: z.string(),
  /** Session start timestamp (ISO 8601) */
  startedAt: z.string().datetime(),
  /** Session end timestamp (ISO 8601) - undefined if active */
  endedAt: z.string().datetime().optional(),
  /** VS Code workspace folder URI (multi-root workspace safe) */
  workspaceUri: z.string(),
  /** Offline-generated semantic label (never transmitted) */
  name: z.string().optional(),
  /** Trigger sources for this session */
  triggers: z.array(SessionTriggerSchema),
  /** Total number of file changes in this session */
  changeCount: z.number().int().nonnegative(),
  /** Chronological list of file changes */
  filesChanged: z.array(SessionChangeSchema),
  /** Array of snapshot IDs created during this session */
  snapshots: z.array(z.string()).optional()
});
z.object({
  sessionId: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  name: z.string().optional(),
  changeCount: z.number().int().nonnegative(),
  triggers: z.array(SessionTriggerSchema)
});
z.object({
  /** Only return sessions for this workspace URI */
  workspaceUri: z.string().optional(),
  /** Only return active sessions (endedAt is null) */
  activeOnly: z.boolean().optional(),
  /** Only return finalized sessions (endedAt is not null) */
  finalizedOnly: z.boolean().optional(),
  /** Return sessions that started after this timestamp */
  after: z.date().optional(),
  /** Return sessions that started before this timestamp */
  before: z.date().optional(),
  /** Maximum number of results */
  limit: z.number().int().positive().optional(),
  /** Offset for pagination */
  offset: z.number().int().nonnegative().optional()
});
z.object({
  /** VS Code workspace folder URI */
  workspaceUri: z.string(),
  /** Initial trigger sources */
  triggers: z.array(SessionTriggerSchema).default([
    "filewatch"
  ]),
  /** Optional semantic name (generated offline) */
  name: z.string().optional()
});
z.object({
  /** VS Code workspace folder URI (multi-root safe) */
  workspaceUri: z.string(),
  /** Idle timeout in milliseconds (default: 15 minutes) */
  idleMs: z.number().int().positive().default(15 * 6e4),
  /** Batch size for flushing changes to database (default: 50) */
  flushBatchSize: z.number().int().positive().default(50),
  /** Flush interval in milliseconds (default: 5 seconds) */
  flushIntervalMs: z.number().int().positive().default(5e3),
  /** Use VS Code file system watcher (default: true) */
  useVSCodeWatcher: z.boolean().default(true),
  /** Patterns to ignore (.vrekoignore) */
  ignorePatterns: z.array(z.string()).default([
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
    ".git/**",
    "*.log",
    "*.tmp",
    "*.swp",
    ".DS_Store"
  ]),
  /** @enterprise User tier (for analytics) */
  tier: z.enum([
    "free",
    "pro"
  ]).default("free"),
  /** @enterprise Analytics consent (Pro tier only) */
  consent: z.boolean().default(false)
});
var SessionFileSummarySchema = z.object({
  path: z.string().min(1),
  operation: z.enum([
    "create",
    "modify",
    "delete",
    "rename"
  ]),
  riskScore: z.number().min(0).max(10),
  aiAttributed: z.boolean(),
  aiTool: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  serviceTag: z.string().optional()
});
var RiskTimelineEntrySchema = z.object({
  timestamp: z.string().datetime(),
  riskScore: z.number().min(0).max(10),
  trigger: z.enum([
    "file_change",
    "ai_detection",
    "pattern_match"
  ]),
  fileCount: z.number().int().nonnegative()
});
var RollbackEventSummarySchema = z.object({
  timestamp: z.string().datetime(),
  snapshotId: z.string().min(1),
  triggerReason: z.enum([
    "user_initiated",
    "auto_threshold",
    "policy_rule"
  ]),
  filesRestored: z.number().int().nonnegative(),
  filesAffected: z.array(z.string()),
  riskScoreAtTrigger: z.number().min(0).max(10)
});
var AIToolAttributionSchema = z.object({
  tool: z.enum([
    "cursor",
    "copilot",
    "windsurf",
    "claude",
    "unknown"
  ]),
  confidence: z.number().min(0).max(1),
  changesAttributed: z.number().int().nonnegative()
});
var ConsentSnapshotSchema = z.object({
  personalSyncEnabled: z.boolean(),
  sharedLearningEnabled: z.boolean(),
  consentedAt: z.string().datetime(),
  promptVersion: z.string().min(1)
});
z.object({
  externalSessionId: z.string().min(1),
  workspaceId: z.string().min(1),
  schemaVersion: z.literal("sb.base.v1"),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  consentSnapshot: ConsentSnapshotSchema,
  filesTouched: z.array(SessionFileSummarySchema),
  serviceBoundariesCrossed: z.number().int().nonnegative(),
  peakRiskScore: z.number().min(0).max(10),
  riskScoreTimeline: z.array(RiskTimelineEntrySchema),
  riskEventCount: z.number().int().nonnegative(),
  rollbackEvents: z.array(RollbackEventSummarySchema),
  aiToolsActive: z.array(AIToolAttributionSchema),
  aiAttributedChangeRatio: z.number().min(0).max(1)
});
var ModificationSourceSchema = z.enum([
  "extension",
  "mcp",
  "daemon",
  "cli"
]);
var ModificationTypeSchema = z.enum([
  "create",
  "update",
  "delete"
]);
z.object({
  /** Absolute path to the modified file */
  path: z.string().min(1, "Path cannot be empty"),
  /** Modification timestamp (ms since epoch) */
  timestamp: z.number().positive("Timestamp must be positive"),
  /** Type of modification */
  type: ModificationTypeSchema,
  /** Lines changed (0 if unknown or delete) */
  linesChanged: z.number().int().nonnegative().default(0),
  /** Whether this change was AI-attributed (detected by AIPresenceDetector) */
  aiAttributed: z.boolean().default(false),
  /** Which AI tool made the change, if detected (e.g., 'copilot', 'cursor', 'claude') */
  aiTool: z.string().nullable().default(null),
  /** Source surface that recorded this modification */
  source: ModificationSourceSchema
});
z.object({
  /** Active extension IDs in the IDE environment */
  extensionIds: z.array(z.string()).default([]),
  /** Optional file content to analyze for AI signatures */
  content: z.string().optional(),
  /** Character velocity (chars/ms) from burst detection */
  velocity: z.number().nonnegative().optional(),
  /** Total characters changed in the operation */
  charCount: z.number().int().nonnegative().optional()
});
var AiDetectionOutputSchema = z.object({
  /** Detected AI tool name, or null if none detected */
  tool: z.string().nullable(),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** Detection method that triggered */
  method: z.enum([
    "extension",
    "velocity",
    "pattern",
    "combined"
  ]).nullable(),
  /** Indicators that contributed to detection */
  indicators: z.array(z.string()).optional()
});
z.object({
  /** Code content to scan for threats */
  content: z.string()
});
var ThreatPatternSchema = z.object({
  /** Description of the threat pattern */
  description: z.string(),
  /** Severity score (0-1), where 1 is most critical */
  severity: z.number().min(0).max(1)
});
var ThreatDetectionOutputSchema = z.object({
  /** Total number of threats detected */
  threatCount: z.number().int().nonnegative(),
  /** List of detected threat patterns */
  patterns: z.array(ThreatPatternSchema),
  /** Overall severity level */
  severity: z.enum([
    "none",
    "low",
    "medium",
    "high",
    "critical"
  ]),
  /** Aggregated threat score (0-10) */
  score: z.number().min(0).max(10)
});
z.object({
  /** File path being analyzed */
  filePath: z.string(),
  /** Number of characters changed */
  charCount: z.number().int().nonnegative(),
  /** Timestamp of the change (ms since epoch) */
  timestamp: z.number().int().positive().optional()
});
var BurstDetectionOutputSchema = z.object({
  /** Whether a burst was detected */
  isBurst: z.boolean(),
  /** Character velocity (chars/ms) */
  velocity: z.number().nonnegative(),
  /** File path analyzed */
  filePath: z.string(),
  /** Total characters in the change */
  charCount: z.number().int().nonnegative(),
  /** Timestamp of detection */
  timestamp: z.number().int().positive()
});
var ComplexityFileInputSchema = z.object({
  /** File path */
  path: z.string(),
  /** File content */
  content: z.string(),
  /** Line count of the file */
  lineCount: z.number().int().nonnegative()
});
z.object({
  /** Files to analyze */
  files: z.array(ComplexityFileInputSchema)
});
var ComplexityAnalysisOutputSchema = z.object({
  /** Average complexity score across all files (0-1) */
  avgComplexity: z.number().min(0).max(1),
  /** Maximum complexity score of any single file (0-1) */
  maxComplexity: z.number().min(0).max(1),
  /** List of files with complexity > 0.7 */
  highComplexityFiles: z.array(z.string()),
  /** Number of files analyzed */
  fileCount: z.number().int().nonnegative(),
  /** Overall complexity value (same as avgComplexity) */
  value: z.number().min(0).max(1)
});
z.object({
  /** Extension IDs for AI detection */
  extensionIds: z.array(z.string()).default([]),
  /** Content to analyze (for threats, AI patterns, complexity) */
  content: z.string(),
  /** File path being analyzed */
  filePath: z.string(),
  /** Line count (for complexity calculation) */
  lineCount: z.number().int().nonnegative().optional(),
  /** Character count (for burst detection) */
  charCount: z.number().int().nonnegative().optional(),
  /** Velocity (for AI detection) */
  velocity: z.number().nonnegative().optional(),
  /** Timestamp (for burst detection) */
  timestamp: z.number().int().positive().optional()
});
z.object({
  /** Signal name */
  signal: z.enum([
    "ai",
    "threats",
    "burst",
    "complexity"
  ]),
  /** Signal-specific score/value */
  value: z.number(),
  /** Whether this signal is considered "triggered" */
  triggered: z.boolean()
});
z.object({
  /** Individual signal results */
  signals: z.object({
    ai: AiDetectionOutputSchema,
    threats: ThreatDetectionOutputSchema,
    burst: BurstDetectionOutputSchema.optional(),
    complexity: ComplexityAnalysisOutputSchema
  }),
  /** Overall risk score (0-1), weighted combination of all signals */
  overallRisk: z.number().min(0).max(1),
  /** Risk level classification */
  riskLevel: z.enum([
    "low",
    "medium",
    "high",
    "critical"
  ]),
  /** Summary of triggered signals */
  triggeredSignals: z.array(z.enum([
    "ai",
    "threats",
    "burst",
    "complexity"
  ])),
  /** Processing time in milliseconds */
  processingTimeMs: z.number().nonnegative()
});
var SignalTypeSchema = z.enum([
  "ai",
  "threats",
  "burst",
  "complexity",
  "comprehensive"
]);
z.object({
  /** Error code */
  code: z.string(),
  /** Human-readable error message */
  message: z.string(),
  /** Signal type that failed */
  signal: SignalTypeSchema.optional()
});
z.object({
  sessionId: z.string().uuid(),
  workspaceId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  durationMs: z.number().nullable(),
  clientType: z.string(),
  snapshotCount: z.number().int().min(0),
  learningCount: z.number().int().min(0),
  touchedFileCount: z.number().int().min(0),
  riskScores: z.array(z.number().min(0).max(1))
}).strict();
var TaskStatusSchema = z.enum([
  "created",
  "active",
  "completed",
  "abandoned",
  "failed",
  "auto-ended",
  "ceremony_blocked"
]);
var TaskOutcomeSchema = z.enum([
  "completed",
  "abandoned",
  "failed"
]);
z.object({
  /** Monotonic integer ID for system tracking */
  id: z.number().int().positive(),
  /** Deterministic kebab-case identifier generated from name */
  slug: z.string().min(1).max(64),
  /** Human-readable task name provided by LLM */
  name: z.string().min(1).max(256),
  /** Current status of the task */
  status: TaskStatusSchema,
  /** Outcome when task was closed (null if active) */
  outcome: TaskOutcomeSchema.nullable(),
  /** ISO 8601 timestamp when task was created */
  createdAt: z.string().datetime(),
  /** ISO 8601 timestamp when task was last updated */
  updatedAt: z.string().datetime(),
  /** ISO 8601 timestamp when task was closed (null if active) */
  closedAt: z.string().datetime().nullable(),
  /** JSON-serialized ceremony object (null until task closes) */
  ceremonyJson: z.string().nullable(),
  /** Task ID this task explicitly continues from (lineage) */
  continuesFrom: z.number().int().positive().nullable(),
  /** Source of migration for legacy sessions */
  migrationSource: z.enum([
    "active_session",
    "completed_session"
  ]).nullable()
});
var TaskEventTypeSchema = z.enum([
  "task_created",
  "task_resumed",
  "task_ended",
  "learning_captured",
  "pulse_recorded",
  "file_changed",
  "session_connected",
  "session_disconnected",
  "ceremony_blocked",
  "ceremony_completed"
]);
z.object({
  /** Monotonic integer ID */
  id: z.number().int().positive(),
  /** Task this event belongs to */
  taskId: z.number().int().positive(),
  /** Sequence number within task (monotonically increasing) */
  seq: z.number().int().nonnegative(),
  /** Type of event */
  type: TaskEventTypeSchema,
  /** JSON-serialized event payload */
  payloadJson: z.string().nullable(),
  /** ISO 8601 timestamp when event occurred */
  timestamp: z.string().datetime()
});
var FileActionSchema = z.enum([
  "added",
  "modified",
  "deleted"
]);
var TaskFileSchema = z.object({
  /** Monotonic integer ID */
  id: z.number().int().positive(),
  /** Task this file change belongs to */
  taskId: z.number().int().positive(),
  /** Relative POSIX path from workspace root */
  path: z.string().min(1),
  /** Type of file operation */
  action: FileActionSchema,
  /** SHA-256 hash before change (null for added files) */
  hashBefore: z.string().nullable(),
  /** SHA-256 hash after change (null for deleted files) */
  hashAfter: z.string().nullable(),
  /** ISO 8601 timestamp when change was detected */
  timestamp: z.string().datetime()
});
var LearningCategorySchema = z.enum([
  "pattern",
  "gotcha",
  "decision",
  "convention",
  "discovery"
]);
var LearningConfidenceSchema = z.enum([
  "low",
  "medium",
  "high"
]);
var TaskLearningSchema = z.object({
  /** Monotonic integer ID */
  id: z.number().int().positive(),
  /** Task this learning belongs to */
  taskId: z.number().int().positive(),
  /** SHA-256 hash of content for deduplication */
  contentHash: z.string().min(1),
  /** The actual learning content */
  content: z.string().min(1),
  /** Where this learning came from */
  source: z.string().nullable(),
  /** Confidence level of the insight */
  confidence: LearningConfidenceSchema,
  /** ISO 8601 timestamp when learning was captured */
  timestamp: z.string().datetime()
});
z.object({
  /** Monotonic integer ID */
  id: z.number().int().positive(),
  /** Task this session belongs to */
  taskId: z.number().int().positive(),
  /** Unique session identifier (UUID) */
  sessionId: z.string().min(1),
  /** ISO 8601 timestamp when session connected */
  connectedAt: z.string().datetime(),
  /** ISO 8601 timestamp when session disconnected (null if active) */
  disconnectedAt: z.string().datetime().nullable()
});
var CeremonyMetricsSchema = z.object({
  /** Number of unique files modified */
  filesModified: z.number().int().nonnegative(),
  /** Number of unique files created */
  filesCreated: z.number().int().nonnegative(),
  /** Number of files deleted */
  filesDeleted: z.number().int().nonnegative(),
  /** Number of learnings captured */
  learningsCaptured: z.number().int().nonnegative(),
  /** Number of pulse snapshots recorded */
  pulsesRecorded: z.number().int().nonnegative(),
  /** Number of sessions that connected to this task */
  sessionsCount: z.number().int().nonnegative(),
  /** Total file operations (sum of all actions) */
  totalFileOperations: z.number().int().nonnegative()
});
var CeremonyDurationSchema = z.object({
  /** ISO 8601 timestamp of first session start */
  firstSessionStart: z.string().datetime(),
  /** ISO 8601 timestamp of last session end */
  lastSessionEnd: z.string().datetime().nullable(),
  /** Total active time in milliseconds */
  totalActiveTimeMs: z.number().int().nonnegative()
});
var QualityGateStatusSchema = z.object({
  /** Whether all required gates passed */
  allPassed: z.boolean(),
  /** Whether audit passed */
  auditPassed: z.boolean().nullable(),
  /** Whether lint is clean */
  lintClean: z.boolean().nullable(),
  /** Whether tests pass */
  testsPass: z.boolean().nullable()
});
var CeremonySchema = z.object({
  /** Task ID */
  taskId: z.number().int().positive(),
  /** Human-readable task name */
  taskName: z.string().min(1),
  /** Deterministic slug */
  slug: z.string().min(1),
  /** How the task ended */
  outcome: TaskOutcomeSchema,
  /** Duration information */
  duration: CeremonyDurationSchema,
  /** Derived metrics from accumulated state */
  metrics: CeremonyMetricsSchema,
  /** All learnings captured during this task */
  learnings: z.array(TaskLearningSchema),
  /** Complete file change log */
  fileChanges: z.array(TaskFileSchema),
  /** Quality gate results from most recent pulse */
  qualityGates: QualityGateStatusSchema,
  /** LLM-generated summary for context injection into future tasks */
  briefingForNextTask: z.string().nullable()
});
var BriefingModeSchema = z.enum([
  "standard",
  "comprehensive"
]);
var BriefingSchema = z.object({
  /** Summary of most recent completed task's ceremony (1-2 paragraphs) */
  recentCeremonySummary: z.string().nullable(),
  /** Top 5 most recent learnings from across all tasks */
  recentLearnings: z.array(TaskLearningSchema).max(5),
  /** Any active warnings or known issues from the project */
  activeWarnings: z.array(z.string()),
  /** Full ceremony from continued task (if continues parameter provided) */
  continuedCeremony: CeremonySchema.nullable(),
  /** Lineage chain (task IDs this task continues from) */
  lineageChain: z.array(z.number().int().positive())
});
z.object({
  /** Human-readable task name from LLM */
  taskName: z.string().min(1).max(256)
});
z.object({
  /** Generated kebab-case slug */
  slug: z.string().min(1).max(64),
  /** Whether a counter suffix was added for uniqueness */
  hasCounterSuffix: z.boolean(),
  /** Counter value if suffix was added (null otherwise) */
  counterValue: z.number().int().positive().nullable()
});
z.object({
  /** Human-readable task name. Vreko generates a deterministic slug for matching. */
  task: z.string().min(1).max(256),
  /** Task ID or slug of a completed task that this new task continues. */
  continues: z.string().optional(),
  /** Level of context to include in the briefing. Default "standard". */
  mode: BriefingModeSchema.default("standard")
});
z.object({
  /** Task ID */
  taskId: z.number().int().positive(),
  /** Deterministic slug */
  slug: z.string().min(1),
  /** Human-readable task name */
  name: z.string().min(1),
  /** Current status */
  status: TaskStatusSchema,
  /** Whether this was a resume of an existing task */
  resumed: z.boolean(),
  /** Slug of auto-ended task (if any) */
  autoEnded: z.string().nullable(),
  /** Contextual briefing from recent work history */
  briefing: BriefingSchema,
  /** Number of sessions that have connected to this task */
  sessionsCount: z.number().int().nonnegative()
});
var PulseFocusSchema = z.enum([
  "vitals",
  "advice"
]);
var PulseEnrichmentSchema = z.object({
  /** Patterns, concerns the LLM noticed */
  observations: z.array(z.string()).optional(),
  /** Confidence in observations */
  confidence: LearningConfidenceSchema.optional()
});
z.object({
  /** What to focus on. "vitals" returns workspace health diagnostics.
   * "advice" returns proactive recommendations based on current task context. */
  focus: PulseFocusSchema.default("vitals"),
  /** When focus is "advice", a specific question or area.
   * When focus is "vitals", optional hint about what to prioritize. */
  query: z.string().optional(),
  /** LLM-observed context to attach. Additive, not replacing. */
  enrichment: PulseEnrichmentSchema.optional()
});
var WorkspaceVitalsSchema = z.object({
  /** Whether configured tests pass */
  testsPass: z.boolean().nullable(),
  /** Whether lint is clean */
  lintClean: z.boolean().nullable(),
  /** Whether typecheck passes */
  typecheckPass: z.boolean().nullable(),
  /** Git branch name */
  gitBranch: z.string().nullable(),
  /** Whether there are uncommitted changes */
  hasUncommittedChanges: z.boolean(),
  /** Number of modified files (from git status) */
  modifiedFilesCount: z.number().int().nonnegative(),
  /** Error details if any check failed */
  errorDetails: z.string().nullable()
});
z.object({
  /** Whether there is an active task */
  hasActiveTask: z.boolean(),
  /** Task ID if active */
  taskId: z.number().int().positive().nullable(),
  /** Daemon-collected workspace vitals */
  vitals: WorkspaceVitalsSchema,
  /** Whether task is flagged as stale (inactivity timeout exceeded) */
  isStale: z.boolean(),
  /** Proactive recommendations (when focus is "advice") */
  recommendations: z.array(z.string()).optional(),
  /** Pulse sequence number for this task */
  pulseSeq: z.number().int().nonnegative()
});
z.object({
  /** The learning to capture. Should be a concrete, actionable insight. */
  insight: z.string().min(1),
  /** Classification of the learning. Default: inferred by the daemon. */
  category: LearningCategorySchema.optional(),
  /** Where this learning came from. Default: "llm-observation". */
  source: z.string().optional(),
  /** How confident the LLM is in this insight. Default: "medium". */
  confidence: LearningConfidenceSchema.default("medium")
});
z.object({
  /** Learning ID */
  learningId: z.number().int().positive(),
  /** Content hash for deduplication */
  contentHash: z.string().min(1),
  /** Whether this was a new learning or duplicate */
  isNew: z.boolean(),
  /** Total learnings count for this task */
  taskLearningsCount: z.number().int().nonnegative()
});
var VrekoEndFeedbackSchema = z.object({
  /** Rating 1-5 */
  rating: z.number().int().min(1).max(5),
  /** Optional notes */
  notes: z.string().optional()
});
z.object({
  /** How the task ended */
  outcome: TaskOutcomeSchema,
  /** LLM's summary of what was accomplished. Included in ceremony. */
  summary: z.string().optional(),
  /** Bypass quality gate blocks. Not recommended. */
  force: z.boolean().default(false),
  /** User/LLM feedback on the task experience */
  feedback: VrekoEndFeedbackSchema.optional()
});
z.object({
  /** Whether the ceremony was blocked by quality gates */
  blocked: z.boolean(),
  /** The produced ceremony (null if blocked and force=false) */
  ceremony: CeremonySchema.nullable(),
  /** Quality gate failures if blocked */
  gateFailures: z.object({
    testsPass: z.boolean().optional(),
    lintClean: z.boolean().optional(),
    auditPassed: z.boolean().optional()
  }).nullable(),
  /** Instructions to resolve blockage */
  resolution: z.string().nullable()
});
var PurchaseTypeEnum = z.enum([
  "ONE_TIME",
  "SUBSCRIPTION",
  "addon"
]);
z.object({
  id: z.string(),
  organizationId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  type: PurchaseTypeEnum,
  customerId: z.string(),
  subscriptionId: z.string().nullable().optional(),
  productId: z.string(),
  status: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional()
});
var ConfigFileTypeSchema = z.enum([
  "package",
  "typescript",
  "linting",
  "build",
  "environment",
  "testing",
  "framework",
  "database",
  "ci"
]);
var SupportedLanguageSchema = z.enum([
  "javascript",
  "typescript",
  "python",
  "universal"
]);
var FileBaselineSchema = z.object({
  path: z.string(),
  hash: z.string(),
  timestamp: z.number(),
  size: z.number()
});
z.object({
  path: z.string(),
  type: ConfigFileTypeSchema,
  language: SupportedLanguageSchema,
  critical: z.boolean().default(false),
  baseline: FileBaselineSchema.optional()
});
z.object({
  type: z.string(),
  path: z.string(),
  name: z.string(),
  critical: z.boolean().default(false)
});
z.object({
  content: z.any(),
  valid: z.boolean(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});
z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});
z.object({
  type: z.enum([
    "added",
    "modified",
    "deleted"
  ]),
  file: z.string(),
  timestamp: z.number(),
  baseline: FileBaselineSchema.optional()
});
z.object({
  autoDetect: z.boolean().default(true),
  watchChanges: z.boolean().default(true),
  autoProtect: z.boolean().default(true),
  customPatterns: z.array(z.any()).optional()
});
z.object({
  enabled: z.boolean(),
  patterns: z.array(z.string()).optional(),
  threshold: z.number().optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional()
});
var ProtectionLevelSchema = z.enum([
  "watch",
  "warn",
  "block"
]);
z.object({
  level: ProtectionLevelSchema,
  icon: z.string(),
  label: z.string(),
  description: z.string(),
  color: z.string(),
  themeColor: z.string().optional()
});
var ProtectedFileSchema = z.object({
  path: z.string(),
  level: ProtectionLevelSchema,
  reason: z.string().optional(),
  addedAt: z.date(),
  pattern: z.string().optional()
});
var PatternRuleSchema = z.object({
  pattern: z.string(),
  level: ProtectionLevelSchema,
  reason: z.string().optional(),
  enabled: z.boolean().default(true)
});
var ProtectionConfigSchema = z.object({
  patterns: z.array(PatternRuleSchema).default([]),
  defaultLevel: ProtectionLevelSchema.default("watch"),
  enabled: z.boolean().default(true),
  autoProtectConfigs: z.boolean().default(true)
});
z.object({
  config: ProtectionConfigSchema.optional(),
  persistRegistry: z.boolean().default(true),
  registryPath: z.string().optional()
});
z.object({
  isProtected: z.boolean(),
  level: ProtectionLevelSchema.optional(),
  reason: z.string().optional(),
  file: ProtectedFileSchema.optional()
});
var DEFAULT_CRITICAL_PATTERNS = Object.freeze([
  // Dependency locks - wrong versions break builds
  {
    pattern: "**/package-lock.json",
    level: "block",
    reason: "Lock file - wrong version breaks reproducible Node.js builds"
  },
  {
    pattern: "**/yarn.lock",
    level: "block",
    reason: "Lock file - ensures reproducible Yarn installs"
  },
  {
    pattern: "**/pnpm-lock.yaml",
    level: "block",
    reason: "Lock file - critical for pnpm monorepos"
  },
  {
    pattern: "**/poetry.lock",
    level: "block",
    reason: "Lock file - Python dependency lock"
  },
  {
    pattern: "**/Cargo.lock",
    level: "block",
    reason: "Lock file - Rust dependency lock"
  },
  {
    pattern: "**/go.sum",
    level: "block",
    reason: "Lock file - Go module checksums"
  },
  {
    pattern: "**/Gemfile.lock",
    level: "block",
    reason: "Lock file - Ruby gem dependencies"
  },
  {
    pattern: "**/composer.lock",
    level: "block",
    reason: "Lock file - PHP composer dependencies"
  },
  // Environment & Secrets - exposing causes immediate security breaches
  {
    pattern: "**/.env*",
    level: "block",
    reason: "Sensitive environment variables and secrets"
  },
  // Core configuration files - wrong changes break builds
  {
    pattern: "package.json",
    level: "warn",
    reason: "Core Node.js configuration - dependencies and scripts"
  },
  {
    pattern: "tsconfig.json",
    level: "warn",
    reason: "TypeScript compiler configuration"
  },
  // Infrastructure - controls deployment and infrastructure
  {
    pattern: "Dockerfile",
    level: "warn",
    reason: "Container image definition"
  },
  {
    pattern: "docker-compose.yml",
    level: "warn",
    reason: "Multi-container orchestration"
  },
  {
    pattern: "**/docker-compose.yaml",
    level: "warn",
    reason: "Multi-container orchestration (yaml variant)"
  },
  {
    pattern: "**/*.tf",
    level: "warn",
    reason: "Terraform infrastructure definitions"
  },
  {
    pattern: ".github/workflows/*.yml",
    level: "warn",
    reason: "GitHub Actions CI/CD workflows"
  },
  {
    pattern: ".github/workflows/*.yaml",
    level: "warn",
    reason: "GitHub Actions CI/CD workflows (yaml variant)"
  }
]);
var EXTENDED_PATTERNS = Object.freeze([
  // Documentation - passive watching
  {
    pattern: "*.md",
    level: "watch",
    reason: "Documentation files"
  },
  {
    pattern: "*.txt",
    level: "watch",
    reason: "Text files"
  },
  {
    pattern: "README*",
    level: "watch",
    reason: "README documentation"
  },
  // General configuration files
  {
    pattern: "*.json",
    level: "watch",
    reason: "JSON configuration files"
  },
  {
    pattern: ".editorconfig",
    level: "watch",
    reason: "Editor configuration"
  },
  {
    pattern: ".prettierrc*",
    level: "watch",
    reason: "Prettier formatting configuration"
  },
  {
    pattern: ".eslintrc*",
    level: "watch",
    reason: "ESLint configuration"
  },
  {
    pattern: ".babelrc",
    level: "watch",
    reason: "Babel transpiler configuration"
  },
  {
    pattern: ".gitignore",
    level: "warn",
    reason: "Git ignore rules"
  },
  // IDE and editor settings
  {
    pattern: ".vscode/settings.json",
    level: "watch",
    reason: "VS Code settings"
  },
  {
    pattern: ".idea/**",
    level: "watch",
    reason: "IDE configuration directory"
  },
  // Build tool configurations
  {
    pattern: "vite.config.*",
    level: "warn",
    reason: "Vite bundler configuration"
  },
  {
    pattern: "webpack.config.*",
    level: "warn",
    reason: "Webpack bundler configuration"
  },
  {
    pattern: "rollup.config.*",
    level: "warn",
    reason: "Rollup bundler configuration"
  },
  {
    pattern: "esbuild.config.*",
    level: "warn",
    reason: "esbuild bundler configuration"
  },
  {
    pattern: "Makefile",
    level: "watch",
    reason: "Make build configuration"
  },
  {
    pattern: "CMakeLists.txt",
    level: "watch",
    reason: "CMake build configuration"
  },
  // Language-specific package managers and configs
  {
    pattern: "requirements.txt",
    level: "watch",
    reason: "Python dependencies"
  },
  {
    pattern: "Gemfile",
    level: "warn",
    reason: "Ruby gem configuration"
  },
  {
    pattern: "composer.json",
    level: "warn",
    reason: "PHP composer configuration"
  },
  {
    pattern: "setup.py",
    level: "warn",
    reason: "Python package setup"
  },
  {
    pattern: "pyproject.toml",
    level: "warn",
    reason: "Python project configuration"
  },
  {
    pattern: "pom.xml",
    level: "warn",
    reason: "Maven Java build configuration"
  },
  {
    pattern: "build.gradle*",
    level: "warn",
    reason: "Gradle Java build configuration"
  },
  {
    pattern: "*.csproj",
    level: "warn",
    reason: ".NET C# project file"
  },
  {
    pattern: "go.mod",
    level: "warn",
    reason: "Go module definition"
  },
  {
    pattern: "Cargo.toml",
    level: "warn",
    reason: "Rust package configuration"
  },
  {
    pattern: "bunfig.toml",
    level: "warn",
    reason: "Bun runtime configuration"
  },
  {
    pattern: "*.sln",
    level: "watch",
    reason: "Visual Studio solution file"
  },
  // Kubernetes and container orchestration
  {
    pattern: "kubernetes/*.yaml",
    level: "warn",
    reason: "Kubernetes manifests"
  }
]);
Object.freeze([
  ...DEFAULT_CRITICAL_PATTERNS,
  ...EXTENDED_PATTERNS
]);
var SnapshotTriggerSchema = z.enum([
  "manual",
  "auto",
  "auto_save",
  "ai_detected",
  "ai-detected",
  "pre_save",
  "pre-save",
  "session_start",
  "session_end",
  "mcp_snap_start",
  "cli_protect",
  "api_request",
  "engine_internal",
  "recovery"
]);
var SnapshotOriginSchema = z.enum([
  "manual",
  "auto",
  "ai-detected",
  "recovery",
  "INTERACTIVE",
  "AUTOMATED"
]);
var SnapshotReasonCodeSchema = z.enum([
  // AI detection
  "AI_DETECTED",
  // Manual operations
  "MANUAL_CHECKPOINT",
  "MANUAL_SAVE",
  // Risk-based triggers
  "CRITICAL_FILE",
  "HIGH_RISK",
  "RISK_BURST_START",
  "RISK_LARGE_DELETE",
  "RISK_MULTI_FILE",
  // Session lifecycle
  "SESSION_START",
  "SESSION_END",
  "IDLE_FINALIZE",
  // Rollback operations
  "PRE_ROLLBACK",
  // Optimization modes
  "BURST_MODE"
]);
var CheckpointTypeSchema = z.enum([
  "PRE",
  "POST",
  "PRE_ROLLBACK"
]);
var SnapshotSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  version: z.string().optional().default("1.0"),
  meta: z.record(z.string(), z.any()).optional(),
  files: z.array(z.string()).optional(),
  fileContents: z.record(z.string(), z.string()).optional()
});
var FileStateSchema = z.object({
  path: z.string(),
  content: z.string(),
  /** SHA-256 hash of content (optional, computed for dedup) */
  hash: z.string().optional(),
  /** File size in bytes */
  size: z.number().optional(),
  /** Encrypted data (for sensitive files - VSCode format) */
  encrypted: z.object({
    /** Initialization vector */
    iv: z.string(),
    /** Authentication tag */
    tag: z.string(),
    /** Optional: algorithm used (default: aes-256-gcm) */
    algorithm: z.string().optional()
  }).optional()
});
var CompressionCodecSchema = z.enum([
  "zstd",
  "gzip",
  "none"
]);
var SnapshotFileRefV2Schema = z.object({
  /** SHA-256 hash of file content (CAS reference) */
  blobHash: z.string(),
  /** File size in bytes */
  size: z.number(),
  /** Compression codec used (optional, defaults to 'none') */
  codec: CompressionCodecSchema.optional()
});
z.object({
  id: z.string(),
  timestamp: z.number(),
  files: z.array(FileStateSchema)
});
z.enum([
  "pending",
  "complete",
  "failed",
  "deleted"
]);
SnapshotSchema.extend({
  name: z.string(),
  fileStates: z.array(FileStateSchema).optional(),
  isProtected: z.boolean(),
  icon: z.string().optional(),
  iconColor: z.string().optional()
});
z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.number(),
  fileCount: z.number(),
  origin: SnapshotOriginSchema.optional(),
  isProtected: z.boolean(),
  label: z.string().optional()
});
z.object({
  path: z.string(),
  content: z.string(),
  action: z.enum([
    "add",
    "modify",
    "delete"
  ])
});
z.object({
  /** Description/reason for the snapshot */
  description: z.string().optional(),
  /** Whether to protect from auto-deletion */
  protected: z.boolean().optional(),
  /** What triggered the snapshot */
  trigger: SnapshotTriggerSchema.optional(),
  /** Origin classification for DORA metrics */
  origin: SnapshotOriginSchema.optional(),
  /** Time since last file change in ms (DORA lead time metric) */
  timeSinceLastChangeMs: z.number().optional()
});
z.object({
  filePath: z.string().optional(),
  before: z.date().optional(),
  after: z.date().optional(),
  protected: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});
var FileDiffSchema = z.object({
  path: z.string(),
  operation: z.enum([
    "create",
    "modify",
    "delete"
  ]),
  linesAdded: z.number(),
  linesRemoved: z.number(),
  preview: z.string(),
  currentChecksum: z.string().optional(),
  snapshotChecksum: z.string().optional()
});
var DiffPreviewSchema = z.object({
  totalFiles: z.number(),
  filesCreated: z.number(),
  filesModified: z.number(),
  filesDeleted: z.number(),
  totalLinesAdded: z.number(),
  totalLinesRemoved: z.number(),
  diffs: z.array(FileDiffSchema)
});
var ConflictReportSchema = z.object({
  path: z.string(),
  reason: z.string(),
  currentChecksum: z.string(),
  snapshotChecksum: z.string()
});
z.object({
  success: z.boolean(),
  restoredFiles: z.array(z.string()),
  errors: z.array(z.string()).optional(),
  diffPreview: DiffPreviewSchema.optional(),
  conflicts: z.array(ConflictReportSchema).optional(),
  verification: z.object({
    allVerified: z.boolean(),
    results: z.array(z.object({
      path: z.string(),
      verified: z.boolean(),
      checksum: z.string(),
      expected: z.string()
    }))
  }).optional()
});
z.object({
  enableDeduplication: z.boolean().default(true),
  namingStrategy: z.enum([
    "git",
    "semantic",
    "timestamp",
    "custom"
  ]).default("semantic"),
  autoProtect: z.boolean().default(false),
  maxSnapshots: z.number().int().positive().optional()
});
z.object({
  id: z.string(),
  path: z.string(),
  hash: z.string().optional(),
  size: z.number().optional(),
  language: z.string().optional(),
  risk: RiskScoreDetailSchema.optional(),
  lastModified: z.number().optional(),
  createdAt: z.number().optional()
});
z.object({
  // Core fields (required)
  id: z.string(),
  timestamp: z.number(),
  fileCount: z.number(),
  // Analytics fields (optional)
  totalSize: z.number().optional(),
  riskScore: RiskScoreDetailSchema.optional(),
  tags: z.array(z.string()).optional(),
  // V2 Hierarchy fields (from VSCode ManifestV2)
  /** Sequential snapshot number (1-based, monotonic) */
  seq: z.number().int().positive().optional(),
  /** Parent snapshot seq (null for root) */
  parentSeq: z.number().int().positive().nullable().optional(),
  /** Parent snapshot ID */
  parentId: z.string().nullable().optional(),
  /** Checkpoint type */
  type: CheckpointTypeSchema.optional(),
  /** Main file that triggered this snapshot */
  anchorFile: z.string().optional(),
  // DORA Metrics fields
  /** Time since last file change in ms (for lead time metric) */
  timeSinceLastChangeMs: z.number().optional(),
  /** Compression ratio achieved (for storage efficiency) */
  compressionRatio: z.number().optional(),
  /** Storage size in bytes (after compression) */
  storageSizeBytes: z.number().optional(),
  // Origin & Classification
  /** Origin classification for analytics */
  origin: SnapshotOriginSchema.optional(),
  /** Reason codes for explainability */
  reasons: z.array(SnapshotReasonCodeSchema).optional(),
  // AI Detection
  aiDetection: z.object({
    detected: z.boolean(),
    tool: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  }).optional(),
  // Session linkage
  /** Vreko session ID */
  sessionId: z.string().optional(),
  /** External task ID (from LLM agent) */
  taskId: z.string().optional(),
  // UI fields
  name: z.string().optional(),
  icon: z.string().optional()
});
z.object({
  /** Schema version - always 2 for V2 */
  schemaVersion: z.literal(2),
  /** Unique ID: vreko-{timestamp}-{random} */
  id: z.string(),
  /** Sequential snapshot number (1-based, monotonic) */
  seq: z.number().int().positive(),
  /** Parent snapshot seq (null for root) */
  parentSeq: z.number().int().positive().nullable(),
  /** Parent snapshot ID (null for root) */
  parentId: z.string().nullable(),
  /** Unix timestamp (ms) */
  timestamp: z.number(),
  /** Human-readable name */
  name: z.string(),
  /** Checkpoint type */
  type: CheckpointTypeSchema,
  /** The main file that triggered this snapshot */
  anchorFile: z.string(),
  /** Files in snapshot (path → ref). Empty for PRE checkpoints. */
  files: z.record(z.string(), SnapshotFileRefV2Schema),
  /** Optional metadata */
  metadata: z.object({
    /** Risk score 0-1 */
    riskScore: z.number().min(0).max(1).optional(),
    /** Origin classification */
    origin: SnapshotOriginSchema.optional(),
    /** Stable reason codes */
    reasons: z.array(SnapshotReasonCodeSchema).optional(),
    /** AI detection info */
    aiDetection: z.object({
      detected: z.boolean(),
      tool: z.string().optional(),
      confidence: z.number().optional()
    }).optional(),
    /** Vreko session ID */
    sessionId: z.string().optional(),
    /** External task ID */
    taskId: z.string().optional(),
    /** DORA: Time since last change */
    timeSinceLastChangeMs: z.number().optional()
  }).optional()
});
z.object({
  /** Unique ID */
  id: z.string(),
  /** Unix timestamp (ms) */
  timestamp: z.number(),
  /** Human-readable name */
  name: z.string(),
  /** Trigger reason */
  trigger: z.enum([
    "auto",
    "manual",
    "ai-detected",
    "pre-save"
  ]),
  /** Main file that triggered snapshot */
  anchorFile: z.string(),
  /** Files in snapshot (path → ref) */
  files: z.record(z.string(), z.object({
    blob: z.string(),
    size: z.number()
  })),
  /** Optional metadata */
  metadata: z.object({
    riskScore: z.number().optional(),
    aiDetection: z.object({
      detected: z.boolean(),
      tool: z.string().optional(),
      confidence: z.number().optional()
    }).optional(),
    sessionId: z.string().optional(),
    taskId: z.string().optional()
  }).optional()
});
z.object({
  /** Total files in snapshot */
  totalFiles: z.number().int().nonnegative(),
  /** New blobs written to storage (not deduplicated) */
  newBlobsWritten: z.number().int().nonnegative(),
  /** Files that were deduplicated (already existed in CAS) */
  dedupedFiles: z.number().int().nonnegative(),
  /** Deduplication ratio (0-1) - higher means more storage saved */
  dedupRatio: z.number().min(0).max(1),
  /** Actual bytes written to storage */
  bytesWritten: z.number().int().nonnegative(),
  /** Original size of all files (before dedup) */
  originalSize: z.number().int().nonnegative(),
  /** Storage savings in bytes (originalSize - bytesWritten) */
  bytesSaved: z.number().int().nonnegative()
});
z.object({
  workspaceId: z.string(),
  period: z.object({
    start: z.number(),
    end: z.number()
  }),
  risk: RiskScoreDetailSchema,
  fileStats: z.object({
    total: z.number(),
    byLanguage: z.record(z.string(), z.number()),
    byRisk: z.record(z.string(), z.number())
  }),
  snapshotStats: z.object({
    total: z.number(),
    frequency: z.number(),
    averageSize: z.number().optional()
  }),
  snapshotRecommendations: z.object({
    shouldCreateSnapshot: z.boolean(),
    reason: z.string(),
    urgency: RiskSeveritySchema,
    suggestedTiming: z.string()
  }),
  trends: z.object({
    risk: z.array(z.object({
      timestamp: z.number(),
      score: z.number()
    })),
    activity: z.array(z.object({
      timestamp: z.number(),
      count: z.number()
    }))
  })
});
var DashboardSnapshotSchema = z.object({
  id: z.string(),
  file: z.string(),
  message: z.string(),
  time: z.string(),
  risk: z.enum([
    "Low",
    "Medium",
    "High",
    "Critical"
  ]),
  ai: z.string()
});
var LearningDataSchema = z.object({
  day: z.string(),
  learned: z.number()
});
var AttributionDataSchema = z.object({
  name: z.string(),
  value: z.number(),
  color: z.string()
});
var DashboardDataSchema = z.object({
  // Pulse view
  trustScore: z.number().min(0).max(100),
  patternsCaught: z.number().int().nonnegative(),
  activeSessions: z.number().int().nonnegative(),
  // User context
  userName: z.string(),
  userInitials: z.string(),
  tier: z.string(),
  // Sessions view
  snapshots: z.array(DashboardSnapshotSchema),
  // Intelligence view
  learningVelocity: z.array(LearningDataSchema),
  aiAttribution: z.array(AttributionDataSchema),
  totalLearned: z.number().int().nonnegative(),
  growthPercentage: z.number().int().nonnegative()
});
var DashboardDataErrorSchema = z.object({
  error: z.literal(true),
  code: z.enum([
    "UNAUTHORIZED",
    "NOT_FOUND",
    "INTERNAL_ERROR"
  ]),
  message: z.string()
});
z.union([
  DashboardDataSchema,
  DashboardDataErrorSchema
]);
var PROTECTION_STATUSES = [
  "active",
  "inactive"
];
var RECENT_ACTIVITY_ACTIONS = [
  "snapshot_created",
  "recovery_performed",
  "ai_detected"
];
var AI_TOOLS = [
  "copilot",
  "cursor",
  "claude",
  "windsurf"
];
var RecentActivitySchema = z.object({
  timestamp: z.number().int().positive(),
  action: z.enum(RECENT_ACTIVITY_ACTIONS),
  file: z.string().min(1),
  ai_tool: z.enum(AI_TOOLS).optional()
});
var AIActivityBreakdownSchema = z.object({
  copilot: z.number().int().nonnegative(),
  cursor: z.number().int().nonnegative(),
  claude: z.number().int().nonnegative(),
  windsurf: z.number().int().nonnegative().optional()
});
var DashboardMetricsSchema = z.object({
  protection_status: z.enum(PROTECTION_STATUSES),
  total_snapshots: z.number().int().nonnegative(),
  total_recoveries: z.number().int().nonnegative(),
  files_protected: z.number().int().nonnegative(),
  ai_detection_rate: z.number().min(0).max(100),
  recent_activity: z.array(RecentActivitySchema).max(10),
  ai_breakdown: AIActivityBreakdownSchema
});
var DashboardMetricsErrorSchema = z.object({
  error: z.literal(true),
  code: z.enum([
    "UNAUTHORIZED",
    "NOT_FOUND",
    "INTERNAL_ERROR"
  ]),
  message: z.string()
});
z.union([
  DashboardMetricsSchema,
  DashboardMetricsErrorSchema
]);
var AI_TOOLS2 = [
  "cursor",
  "copilot",
  "claude"
];
var EVENT_TYPES = [
  "ai_detected",
  "snapshot",
  "recovery",
  "quiet"
];
var RISK_LEVELS = [
  "high",
  "medium",
  "low"
];
var FILE_CATEGORIES = [
  "auth",
  "config",
  "api",
  "ui",
  "lib",
  "test",
  "infra",
  "types",
  "hooks",
  "util"
];
var DAYS_OF_WEEK = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
];
var PIONEER_TIERS = [
  "Pioneer",
  "Active Pioneer",
  "Contributing Pioneer",
  "Founding Pioneer"
];
var ProtectionSchema = z.object({
  score: z.number().min(0).max(100).describe("Protection confidence score (0-100)"),
  risksPrevented: z.number().int().nonnegative().describe("Count of proactive protections this week"),
  context: z.string().describe("Human-readable summary of protected areas"),
  weekLabel: z.string().default("this week").describe("Rolling window label")
});
var TimelineEventSchema = z.object({
  hour: z.number().int().min(0).max(23).describe("Hour of day (0-23)"),
  type: z.enum(EVENT_TYPES).describe("Visual category for dot color"),
  tool: z.enum(AI_TOOLS2).optional().describe("AI tool detected (if applicable)"),
  file: z.string().min(1).describe("Relative file path"),
  risk: z.enum(RISK_LEVELS).describe("Risk tier for this event"),
  action: z.string().describe("What Vreko did: auto-protected | monitored | recovered"),
  blast: z.number().int().nonnegative().optional().describe("Transitive dependency count")
});
var HeatmapFileSchema = z.object({
  file: z.string().min(1).describe("Relative file path"),
  risk: z.number().min(0).max(1).describe("Composite risk score (0-1)"),
  changes: z.number().int().nonnegative().describe("Change count in rolling window"),
  aiRatio: z.number().min(0).max(1).describe("Percentage of AI-authored changes (0-1)"),
  cat: z.enum(FILE_CATEGORIES).describe("File category for color coding")
});
var AIAttributionSchema = z.object({
  cursor: z.number().int().nonnegative().describe("Percentage attributed to Cursor"),
  copilot: z.number().int().nonnegative().describe("Percentage attributed to Copilot"),
  claude: z.number().int().nonnegative().describe("Percentage attributed to Claude")
});
var DailyActivitySchema = z.object({
  day: z.enum(DAYS_OF_WEEK).describe("Day of week"),
  ai: z.number().int().nonnegative().describe("AI-attributed changes"),
  human: z.number().int().nonnegative().describe("Human-only changes"),
  prevented: z.number().int().nonnegative().describe("Proactive protections triggered")
});
var WeeklyVelocitySchema = z.object({
  week: z.string().min(1).describe("Week label (e.g., 'W1', 'W2')"),
  learnings: z.number().int().nonnegative().describe("Cumulative pattern count"),
  accuracy: z.number().min(0).max(100).describe("AutoDecisionEngine accuracy percentage")
});
var PioneerSchema = z.object({
  tier: z.enum(PIONEER_TIERS).describe("Current Pioneer tier"),
  tierIndex: z.number().int().min(0).max(3).describe("Numeric index for rendering (0-3)"),
  recentUnlock: z.string().optional().describe("Most recent capability unlocked"),
  impact: z.string().describe("Cross-user impact statement")
});
var QuickInsightsSchema = z.object({
  sessionsThisWeek: z.number().int().nonnegative().describe("Development sessions started"),
  avgSessionMinutes: z.number().int().nonnegative().describe("Mean session length"),
  coherencePercent: z.number().min(0).max(100).describe("Session coherence score"),
  preventedToRecoveredRatio: z.string().describe("Ratio string like '3 : 1'"),
  fragileFileCount: z.number().int().nonnegative().describe("High-change, high-risk files"),
  fragileHotspots: z.string().describe("Directory summary like 'auth/ and config/'")
});
var UserInfoSchema = z.object({
  name: z.string().nullable().describe("User display name"),
  email: z.string().email().describe("User email address")
});
var SessionMetricsSchema = z.object({
  activeSessionCount: z.number().int().nonnegative().describe("Currently active sessions"),
  lastActivityTime: z.string().datetime().describe("ISO timestamp of last activity")
});
var PioneerDashboardSchema = z.object({
  version: z.literal(1).describe("Schema version for migrations"),
  computedAt: z.number().int().positive().describe("Unix timestamp when digest was computed"),
  // User info (from old dashboard)
  user: UserInfoSchema.describe("Current user information"),
  sessionMetrics: SessionMetricsSchema.describe("Active session metrics"),
  protection: ProtectionSchema.describe("Hero section data"),
  timeline: z.array(TimelineEventSchema).max(24).describe("24h activity timeline"),
  heatmap: z.array(HeatmapFileSchema).describe("File risk treemap data"),
  ai: AIAttributionSchema.describe("AI tool attribution"),
  weekly: z.array(DailyActivitySchema).length(7).describe("Weekly activity bars"),
  velocity: z.array(WeeklyVelocitySchema).min(4).describe("Learning velocity curve"),
  pioneer: PioneerSchema.describe("Pioneer journey data"),
  insights: QuickInsightsSchema.describe("Quick insight cards")
});
var PioneerDashboardSuccessSchema = z.object({
  status: z.literal("success"),
  digest: PioneerDashboardSchema,
  stalenessMinutes: z.number().int().nonnegative().describe("Minutes since last sync")
});
var PioneerDashboardEmptySchema = z.object({
  status: z.literal("empty"),
  message: z.string().default("No digest synced yet")
});
var PioneerDashboardErrorSchema = z.object({
  status: z.literal("error"),
  code: z.enum([
    "UNAUTHORIZED",
    "NOT_FOUND",
    "INTERNAL_ERROR"
  ]),
  message: z.string()
});
z.discriminatedUnion("status", [
  PioneerDashboardSuccessSchema,
  PioneerDashboardEmptySchema,
  PioneerDashboardErrorSchema
]);
({
  sessionMetrics: {
    lastActivityTime: (/* @__PURE__ */ new Date()).toISOString()
  }});
var AIToolSchema = z.enum([
  "cursor",
  "copilot",
  "claude",
  "windsurf",
  "codeium",
  "tabnine",
  "cody",
  "continue",
  "aider"
]);
z.object({
  detected: z.boolean(),
  confidence: z.number().min(0).max(1),
  tool: AIToolSchema.nullable(),
  patterns: z.array(z.string()),
  evidence: z.array(z.string()).optional()
});
z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum([
    "user",
    "pro",
    "team",
    "admin"
  ]),
  workspaceId: z.string().optional()
});
var RiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical"
]);
z.number().min(0).max(10);
var SessionStateSchema = z.enum([
  "active",
  "ended",
  "idle",
  "paused"
]);
z.object({
  sessionId: z.string(),
  state: SessionStateSchema,
  workspaceId: z.string(),
  startedAt: z.date(),
  recommendations: z.array(z.string()),
  riskLevel: RiskLevelSchema
});
z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connected"),
    pid: z.number().int().optional()
  }),
  z.object({
    type: z.literal("disconnected"),
    reason: z.string().optional()
  }),
  z.object({
    type: z.literal("error"),
    code: z.string().optional(),
    message: z.string()
  }),
  // JSON-RPC traffic (responses + notifications) arrives on the same stream.
  z.object({
    type: z.literal("message"),
    payload: JsonRpcMessageSchema
  })
]);
z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string().url(),
  verification_uri_complete: z.string().url().optional(),
  expires_in: z.number().int().positive(),
  interval: z.number().int().positive().default(5)
});
z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  // Tiered-license fields: present on some backends, absent on others. Explicit
  // so a missing tier is `undefined`, not a crash on property access.
  license_tier: z.enum([
    "pro",
    "team",
    "trial"
  ]).optional(),
  seats: z.number().int().optional()
});

export { FEATURE_FLAGS, FeatureManager, LogLevel, NoOpInstrumentationProvider, PIONEER_EVENTS, SENSITIVE_PATTERNS, TIER_UPGRADE_SAGA, WorkspaceRegistrationSchema, createLogger, extractErrorCode, getEffectiveTier, getTierFeatures, getTierLimit, isFeatureAvailableAtTier, shouldMergeAttribution, validateTelemetryEvent };
//# sourceMappingURL=chunk-OOVZVXTB.js.map
//# sourceMappingURL=chunk-OOVZVXTB.js.map