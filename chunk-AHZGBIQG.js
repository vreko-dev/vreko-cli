#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { z } from 'zod';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([
    z.string(),
    z.number()
  ]),
  method: z.string(),
  params: z.unknown().optional()
});
var JsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional()
});
var JsonRpcSuccessResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([
    z.string(),
    z.number()
  ]).optional(),
  result: z.unknown()
});
var JsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([
    z.string(),
    z.number()
  ]).optional(),
  error: JsonRpcErrorSchema
});
var JsonRpcResponseSchema = z.union([
  JsonRpcSuccessResponseSchema,
  JsonRpcErrorResponseSchema
]);
var JsonRpcNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.unknown().optional()
});
var JsonRpcMessageSchema = z.union([
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  JsonRpcNotificationSchema
]);
var ProtocolErrorCode;
(function(ProtocolErrorCode2) {
  ProtocolErrorCode2[ProtocolErrorCode2["ParseError"] = -32700] = "ParseError";
  ProtocolErrorCode2[ProtocolErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ProtocolErrorCode2[ProtocolErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ProtocolErrorCode2[ProtocolErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ProtocolErrorCode2[ProtocolErrorCode2["InternalError"] = -32603] = "InternalError";
  ProtocolErrorCode2[ProtocolErrorCode2["ServerError"] = -32e3] = "ServerError";
  ProtocolErrorCode2[ProtocolErrorCode2["NotInitialized"] = -32001] = "NotInitialized";
  ProtocolErrorCode2[ProtocolErrorCode2["AlreadyInitialized"] = -32002] = "AlreadyInitialized";
  ProtocolErrorCode2[ProtocolErrorCode2["ShuttingDown"] = -32003] = "ShuttingDown";
  ProtocolErrorCode2[ProtocolErrorCode2["NotAuthenticated"] = 1e3] = "NotAuthenticated";
  ProtocolErrorCode2[ProtocolErrorCode2["TierRequired"] = 1001] = "TierRequired";
  ProtocolErrorCode2[ProtocolErrorCode2["ApiUnavailable"] = 1002] = "ApiUnavailable";
  ProtocolErrorCode2[ProtocolErrorCode2["QuotaExceeded"] = 1003] = "QuotaExceeded";
  ProtocolErrorCode2[ProtocolErrorCode2["WorkspaceNotFound"] = 1500] = "WorkspaceNotFound";
  ProtocolErrorCode2[ProtocolErrorCode2["WorkspaceAlreadyExists"] = 1501] = "WorkspaceAlreadyExists";
  ProtocolErrorCode2[ProtocolErrorCode2["SessionNotFound"] = 2e3] = "SessionNotFound";
  ProtocolErrorCode2[ProtocolErrorCode2["SessionEnded"] = 2001] = "SessionEnded";
  ProtocolErrorCode2[ProtocolErrorCode2["SnapshotNotFound"] = 3e3] = "SnapshotNotFound";
  ProtocolErrorCode2[ProtocolErrorCode2["ContentHashMismatch"] = 3001] = "ContentHashMismatch";
  ProtocolErrorCode2[ProtocolErrorCode2["RestoreFailed"] = 3002] = "RestoreFailed";
  ProtocolErrorCode2[ProtocolErrorCode2["FileNotFound"] = 4e3] = "FileNotFound";
  ProtocolErrorCode2[ProtocolErrorCode2["FileAccessDenied"] = 4001] = "FileAccessDenied";
  ProtocolErrorCode2[ProtocolErrorCode2["InvalidPath"] = 4002] = "InvalidPath";
  ProtocolErrorCode2[ProtocolErrorCode2["LearningNotFound"] = 5e3] = "LearningNotFound";
  ProtocolErrorCode2[ProtocolErrorCode2["LearningEvaluationFailed"] = 5001] = "LearningEvaluationFailed";
  ProtocolErrorCode2[ProtocolErrorCode2["SyncUnavailable"] = 6e3] = "SyncUnavailable";
  ProtocolErrorCode2[ProtocolErrorCode2["SyncAuthRequired"] = 6001] = "SyncAuthRequired";
  ProtocolErrorCode2[ProtocolErrorCode2["ValidationTimeout"] = 7e3] = "ValidationTimeout";
  ProtocolErrorCode2[ProtocolErrorCode2["IntelligenceUnavailable"] = 8e3] = "IntelligenceUnavailable";
  ProtocolErrorCode2[ProtocolErrorCode2["PatternNotFound"] = 8001] = "PatternNotFound";
})(ProtocolErrorCode || (ProtocolErrorCode = {}));
({
  [ProtocolErrorCode.ParseError]: "Invalid JSON",
  [ProtocolErrorCode.InvalidRequest]: "Invalid JSON-RPC request",
  [ProtocolErrorCode.MethodNotFound]: "Method does not exist",
  [ProtocolErrorCode.InvalidParams]: "Invalid method parameters",
  [ProtocolErrorCode.InternalError]: "Internal service error",
  [ProtocolErrorCode.ServerError]: "Server error",
  [ProtocolErrorCode.NotInitialized]: "Client must call initialize before other methods",
  [ProtocolErrorCode.AlreadyInitialized]: "Client has already called initialize",
  [ProtocolErrorCode.ShuttingDown]: "Service is shutting down",
  [ProtocolErrorCode.NotAuthenticated]: "Authentication required for this method",
  [ProtocolErrorCode.TierRequired]: "PRO tier required for this method",
  [ProtocolErrorCode.ApiUnavailable]: "Cannot reach api.vreko.dev",
  [ProtocolErrorCode.QuotaExceeded]: "Storage or API quota exceeded",
  [ProtocolErrorCode.SessionNotFound]: "Session does not exist",
  [ProtocolErrorCode.SessionEnded]: "Session has already ended",
  [ProtocolErrorCode.SnapshotNotFound]: "Snapshot does not exist",
  [ProtocolErrorCode.ContentHashMismatch]: "Content integrity check failed",
  [ProtocolErrorCode.RestoreFailed]: "Could not write restored file",
  [ProtocolErrorCode.FileNotFound]: "File does not exist",
  [ProtocolErrorCode.FileAccessDenied]: "Cannot read/write file",
  [ProtocolErrorCode.InvalidPath]: "Path is outside allowed directories",
  [ProtocolErrorCode.WorkspaceNotFound]: "Workspace not found or not initialized",
  [ProtocolErrorCode.WorkspaceAlreadyExists]: "Workspace already exists",
  [ProtocolErrorCode.LearningNotFound]: "Learning not found",
  [ProtocolErrorCode.LearningEvaluationFailed]: "Learning evaluation failed",
  [ProtocolErrorCode.SyncUnavailable]: "Sync worker not available",
  [ProtocolErrorCode.SyncAuthRequired]: "Sync authentication required",
  [ProtocolErrorCode.ValidationTimeout]: "Validation timed out",
  [ProtocolErrorCode.IntelligenceUnavailable]: "Intelligence service not available",
  [ProtocolErrorCode.PatternNotFound]: "Pattern not found"
});
var LearningTypeSchema = z.enum([
  "pattern",
  "pitfall",
  "efficiency",
  "workflow",
  "discovery",
  "architecture",
  "performance",
  "constraint",
  "preference"
]);
var LearningIntentSchema = z.enum([
  "implement",
  "debug",
  "refactor",
  "review"
]);
z.enum([
  "add-flag",
  "set-env",
  "inject-validation",
  "warn",
  "suggest-file"
]);
var WarnSeveritySchema = z.enum([
  "info",
  "warning",
  "error"
]);
var AddFlagPayloadSchema = z.object({
  flag: z.string().min(1).describe("CLI flag to add, e.g. '--validate-expiry'"),
  value: z.union([
    z.string(),
    z.boolean()
  ]).optional().describe("Flag value if applicable"),
  reason: z.string().min(1).describe("Human-readable reason shown in verbose mode")
});
var SetEnvPayloadSchema = z.object({
  key: z.string().min(1).regex(/^[A-Z_][A-Z0-9_]*$/, "Must be valid env var name"),
  value: z.string().describe("Environment variable value"),
  reason: z.string().min(1).describe("Human-readable reason shown in verbose mode")
});
var InjectValidationPayloadSchema = z.object({
  validationType: z.string().min(1).describe("Validation type identifier, e.g. 'jwt-expiry', 'silent-catch'"),
  targetFile: z.string().optional().describe("Optional file to target for validation"),
  reason: z.string().min(1).describe("Human-readable reason shown in verbose mode")
});
var WarnPayloadSchema = z.object({
  message: z.string().min(1).describe("Warning message to display"),
  severity: WarnSeveritySchema.describe("Severity level affects display styling")
});
var SuggestFilePayloadSchema = z.object({
  filePath: z.string().min(1).describe("Suggested file path, may contain {feature} placeholder"),
  reason: z.string().min(1).describe("Human-readable reason for suggestion")
});
var LearningTriggerSchema = z.object({
  commands: z.array(z.string()).optional().describe("Command names that trigger this learning, e.g. ['auth', 'deploy']"),
  intent: z.array(LearningIntentSchema).optional().describe("Intent types that trigger this learning"),
  filePatterns: z.array(z.string()).optional().describe("Glob patterns for file matching, e.g. ['**/*auth*.ts']"),
  flags: z.array(z.string()).optional().describe("CLI flags that trigger this learning, e.g. ['--provider']"),
  description: z.string().min(1).describe("Human-readable description for fuzzy matching")
});
var LearningActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add-flag"),
    payload: AddFlagPayloadSchema
  }),
  z.object({
    type: z.literal("set-env"),
    payload: SetEnvPayloadSchema
  }),
  z.object({
    type: z.literal("inject-validation"),
    payload: InjectValidationPayloadSchema
  }),
  z.object({
    type: z.literal("warn"),
    payload: WarnPayloadSchema
  }),
  z.object({
    type: z.literal("suggest-file"),
    payload: SuggestFilePayloadSchema
  })
]);
var LearningSchema = z.object({
  id: z.string().min(1).describe("Unique identifier for this learning"),
  type: LearningTypeSchema.describe("Categorical classification"),
  trigger: LearningTriggerSchema.describe("Conditions that activate this learning"),
  action: LearningActionSchema.describe("Concrete action to execute"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0.0-1.0), static at creation"),
  created: z.number().int().positive().describe("Creation timestamp (ms since epoch)"),
  lastUsed: z.number().int().positive().optional().describe("Last usage timestamp (ms since epoch)"),
  usageCount: z.number().int().nonnegative().default(0).describe("Number of times this learning was applied"),
  tags: z.array(z.string()).default([]).describe("Searchable tags for categorization"),
  archived: z.boolean().default(false).describe("Whether this learning is archived (excluded from matching)")
});
LearningSchema.omit({
  id: true,
  created: true,
  lastUsed: true,
  usageCount: true,
  archived: true
}).extend({
  tags: z.array(z.string()).optional().default([]),
  archived: z.boolean().optional()
});
z.enum([
  "observe",
  "warn",
  "apply-safe",
  "apply-all",
  "off"
]);
z.object({
  workspaceId: z.string().min(1),
  startedAt: z.number().int().positive(),
  lastCommandAt: z.number().int().positive(),
  appliedLearnings: z.array(z.string()).describe("Learning IDs applied in this session")
});
z.object({
  workspaceId: z.string().min(1),
  commandName: z.string().min(1),
  args: z.record(z.unknown()).optional().describe("Parsed command arguments/flags"),
  filesOrPaths: z.array(z.string()).optional().describe("Files involved in command"),
  intent: LearningIntentSchema.optional().describe("User intent if known")
});
var SelectedLearningSchema = z.object({
  id: z.string(),
  title: z.string().describe("Human-readable title derived from trigger.description"),
  type: LearningTypeSchema,
  score: z.number().min(0).max(1),
  action: LearningActionSchema,
  tags: z.array(z.string())
});
z.object({
  selectedLearnings: z.array(SelectedLearningSchema),
  debug: z.object({
    evaluatedCount: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative(),
    skippedReason: z.string().optional()
  }).optional()
});
var LearningTierSchema = z.enum([
  "hot",
  "warm",
  "cold"
]);
var LearningPrioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low"
]);
var LearningStorageTypeSchema = z.enum([
  "pattern",
  "pitfall",
  "pit",
  "architecture",
  "performance",
  "efficiency",
  "discovery",
  "workflow",
  "constraint",
  "preference",
  "best-practice"
]);
var LearningStorageSchema = z.object({
  id: z.string().min(1).optional(),
  type: LearningStorageTypeSchema,
  trigger: z.union([
    z.string(),
    z.array(z.string())
  ]),
  context: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  action: z.string(),
  related: z.array(z.string()).optional(),
  source: z.string(),
  timestamp: z.union([
    z.string(),
    z.number()
  ]).describe("ISO 8601 string or epoch number from storage"),
  // Tiering metadata (optional)
  tier: LearningTierSchema.optional(),
  domain: z.string().optional(),
  priority: LearningPrioritySchema.optional(),
  keywords: z.array(z.string()).optional(),
  // Usage tracking (optional)
  accessCount: z.number().int().nonnegative().optional(),
  lastAccessed: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  appliedDate: z.string().optional()
});
var ChunkSourceTypeSchema = z.enum([
  "learning",
  "adr",
  "pattern",
  "violation"
]);
var ChunkStatusSchema = z.enum([
  "active",
  "deprecated",
  "superseded"
]);
z.object({
  id: z.string().describe("Unique chunk identifier"),
  source_type: ChunkSourceTypeSchema.describe("Type of source this chunk came from"),
  source_id: z.string().describe("ID of the source record"),
  chunk_text: z.string().describe("The actual content text"),
  context_text: z.string().optional().describe("Optional context surrounding the chunk"),
  authority: z.number().min(0).max(1).describe("Authority score (0-1)"),
  status: ChunkStatusSchema.describe("Current status of the chunk"),
  created_at: z.string().describe("ISO 8601 creation timestamp"),
  updated_at: z.string().describe("ISO 8601 update timestamp"),
  metadata: z.record(z.unknown()).optional().describe("Optional JSON metadata")
});
var OutcomeTypeSchema = z.enum([
  "accepted",
  "ignored",
  "test_pass",
  "test_fail",
  "violation_prevented"
]);
z.object({
  id: z.string(),
  chunk_id: z.string(),
  outcome_type: OutcomeTypeSchema,
  context: z.record(z.unknown()).optional(),
  created_at: z.string()
});
var LearningApiSchema = z.object({
  id: z.string().min(1).describe("Unique identifier"),
  type: LearningTypeSchema.describe("Categorical classification"),
  trigger: z.string().describe("Normalized trigger condition"),
  action: z.string().describe("Action to take (human-readable)"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0.0-1.0)"),
  created: z.number().int().positive().describe("Creation timestamp (ms since epoch)"),
  source: z.string().describe("Where this learning originated"),
  tags: z.array(z.string()).default([]).describe("Searchable tags"),
  usageCount: z.number().int().nonnegative().default(0).describe("Times applied")
});
function normalizeLearningType(type) {
  switch (type) {
    case "pattern":
      return "pattern";
    case "pitfall":
    case "pit":
      return "pitfall";
    case "efficiency":
    case "performance":
      return "efficiency";
    case "workflow":
    case "best-practice":
      return "workflow";
    case "discovery":
      return "discovery";
    case "architecture":
      return "pattern";
    // Architecture patterns map to pattern
    case "constraint":
      return "constraint";
    case "preference":
      return "preference";
    default: {
      return "pattern";
    }
  }
}
__name(normalizeLearningType, "normalizeLearningType");
function elevateLearningToApi(storage, options) {
  const id = storage.id ?? `learning-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const normalizedType = normalizeLearningType(storage.type);
  const trigger = Array.isArray(storage.trigger) ? storage.trigger.join(", ") : storage.trigger;
  let created;
  if (typeof storage.timestamp === "string") {
    const parsed = new Date(storage.timestamp);
    created = Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
  } else {
    created = storage.timestamp;
  }
  const confidence = storage.relevanceScore ?? (options?.relevanceBoost ?? 0.7) * (storage.accessCount ? Math.min(1, storage.accessCount / 10) : 0.5);
  return {
    id,
    type: normalizedType,
    trigger,
    action: storage.action,
    confidence: Math.round(confidence * 1e3) / 1e3,
    created,
    source: storage.source,
    tags: storage.keywords ?? [],
    usageCount: storage.accessCount ?? 0
  };
}
__name(elevateLearningToApi, "elevateLearningToApi");
LearningStorageSchema.transform((storage) => elevateLearningToApi(storage)).pipe(LearningApiSchema);
var FileRecord = z.object({
  path: z.string(),
  category: z.enum([
    "config",
    "source",
    "test",
    "build",
    "docs",
    "other"
  ]),
  domain: z.string(),
  sizeBytes: z.number(),
  lineCount: z.number(),
  extension: z.string()
});
var ChurnRecord = z.object({
  filePath: z.string(),
  changes30d: z.number(),
  changes90d: z.number(),
  lastChangedAt: z.number(),
  uniqueAuthors: z.number()
});
var CoChangeCluster = z.object({
  files: z.array(z.string()),
  coOccurrenceRate: z.number().min(0).max(1),
  sampleSize: z.number()
});
var FragileFileRecord = z.object({
  path: z.string(),
  compositeScore: z.number().min(0).max(100),
  churnScore: z.number(),
  blastRadiusScore: z.number(),
  rollbackScore: z.number(),
  dependentCount: z.number(),
  rank: z.number()
});
var DomainHealthScore = z.object({
  domain: z.string(),
  score: z.number().min(0).max(100),
  fileCount: z.number(),
  avgChurn: z.number(),
  fragileFileCount: z.number(),
  trend: z.enum([
    "improving",
    "stable",
    "degrading",
    "unknown"
  ]),
  trendComputedAt: z.number().nullable()
});
var BaselineNarrative = z.object({
  domainSummaries: z.record(z.string()),
  topRisks: z.array(z.object({
    file: z.string(),
    reason: z.string(),
    severity: z.enum([
      "high",
      "medium"
    ])
  })),
  agentContextTemplate: z.string()
});
var DependencyGraph = z.object({
  nodes: z.array(z.string()),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string()
  })),
  blastRadii: z.record(z.number())
});
var BaselineRecord = z.object({
  workspacePath: z.string(),
  computedAt: z.number(),
  version: z.string(),
  // Tier 1: Structural
  fileInventory: z.array(FileRecord),
  domainMap: z.record(z.array(z.string())),
  totalFiles: z.number(),
  totalLines: z.number(),
  // Tier 2: Historical
  churnRates: z.record(ChurnRecord),
  coChangeClusters: z.array(CoChangeCluster),
  rollbackHotspots: z.array(z.string()),
  // Tier 3: Computed scores
  fragileFiles: z.array(FragileFileRecord),
  domainHealthScores: z.array(DomainHealthScore),
  overallHealthScore: z.number().min(0).max(100),
  // Dependency graph
  dependencyGraph: DependencyGraph,
  // AI config files (imported from ai-config.ts for enhanced types)
  aiConfigFiles: z.array(z.any()),
  aiConfigConflicts: z.array(z.any()),
  // AI synthesis
  narrative: BaselineNarrative.nullable(),
  narrativeComputedAt: z.number().nullable()
});
var BaselineStatus = z.enum([
  "ready",
  "stale",
  "computing",
  "not_computed"
]);
z.object({
  status: BaselineStatus,
  progress: z.number().min(0).max(100),
  stage: z.string().optional(),
  error: z.string().optional()
});
z.object({
  workspace: z.string()
});
z.object({
  workspace: z.string()
});
z.object({
  workspace: z.string()
});
z.object({
  workspace: z.string()
});
z.object({
  workspace: z.string(),
  record: BaselineRecord
});
z.object({
  jobId: z.string()
});
z.object({
  status: z.enum([
    "ready",
    "stale",
    "computing",
    "not_computed"
  ]),
  progress: z.number().int().min(0).max(100),
  stage: z.string().optional(),
  error: z.string().optional()
});
z.void();
var WorkspaceBase = z.object({
  /** Absolute path to workspace root */
  workspace: z.string().min(1)
});

// ../../packages/contracts/dist/local-service/schemas/context.js
WorkspaceBase.extend({
  /** Task description */
  task: z.string().min(1),
  /** Files involved */
  files: z.array(z.string()).optional(),
  /** Keywords for context matching */
  keywords: z.array(z.string()).optional()
});
WorkspaceBase.extend({
  /** Code to check */
  code: z.string(),
  /** File path */
  filePath: z.string().min(1)
});
z.object({
  valid: z.boolean(),
  contextPath: z.string()
});
z.object({
  passed: z.boolean(),
  totalIssues: z.number().int().nonnegative().optional(),
  focusPoints: z.array(z.unknown()).optional(),
  violations: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional()
});
z.object({});
z.object({});
z.object({});
z.object({});
z.object({
  /** Absolute path to workspace root */
  workspace: z.string().min(1),
  /** Component type */
  type: z.enum([
    "mcp-stdio",
    "mcp-http"
  ]),
  /** Process ID of the component */
  pid: z.number().int().positive(),
  /** Restart strategy */
  restartStrategy: z.enum([
    "one-for-one",
    "one-for-all"
  ]).default("one-for-one")
});
z.object({
  /** Process ID of the component */
  pid: z.number().int().positive()
});
z.object({
  /** Include verbose details */
  verbose: z.boolean().optional()
});
z.object({
  pong: z.literal(true),
  uptime: z.number(),
  version: z.string()
});
z.object({
  pid: z.number().int(),
  version: z.string(),
  uptime: z.number(),
  startedAt: z.string(),
  workspaces: z.number().int().nonnegative(),
  connections: z.number().int().nonnegative(),
  memoryUsage: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    rss: z.number()
  }),
  lastActivity: z.number(),
  idleTimeout: z.number(),
  auth: z.object({
    authenticated: z.boolean(),
    user: z.string().optional(),
    tier: z.string().optional()
  }).optional()
});
z.object({
  shutting_down: z.literal(true)
});
z.object({
  reloaded: z.literal(true)
});
z.object({
  registered: z.literal(true),
  pid: z.number().int().positive(),
  type: z.enum([
    "mcp-stdio",
    "mcp-http"
  ])
});
z.object({
  acknowledged: z.boolean(),
  error: z.string().optional()
});
z.object({
  status: z.string(),
  uptime: z.number(),
  workspaces: z.number().int().nonnegative(),
  activeSessions: z.number().int().nonnegative(),
  supervisedComponents: z.number().int().nonnegative(),
  memory: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    rss: z.number()
  }).optional(),
  components: z.array(z.object({
    pid: z.number().int().positive(),
    type: z.string(),
    lastHeartbeat: z.string()
  }).passthrough()).optional()
});
z.object({
  /** File path being checked */
  filePath: z.string().min(1),
  /** Current file content */
  content: z.string(),
  /** Previous content for comparison (optional) */
  previousContent: z.string().optional(),
  /** Additional metadata (optional) */
  metadata: z.object({
    /** Editor information string */
    editorInfo: z.string().optional(),
    /** Timestamp in milliseconds since epoch */
    timestamp: z.number().int().positive().optional()
  }).optional()
});
z.object({
  /** Unified diff string to analyze */
  diff: z.string(),
  /** Context about the change */
  context: z.object({
    /** File path being changed */
    filePath: z.string(),
    /** Programming language (optional) */
    language: z.string().optional(),
    /** Project type (e.g., "web", "mobile", "backend") (optional) */
    projectType: z.string().optional()
  })
});
z.object({
  /** Snapshot IDs to analyze for grouping */
  snapshotIds: z.array(z.string().uuid()).min(1)
});
z.object({
  /** Sync direction */
  direction: z.enum([
    "push",
    "pull",
    "both"
  ]).default("both"),
  /** Specific snapshot IDs to sync (optional, syncs all if omitted) */
  snapshotIds: z.array(z.string().uuid()).optional()
});
z.object({
  /** Workspace root path */
  workspace: z.string().min(1).describe("Workspace root path"),
  /** Force refresh cache */
  force: z.boolean().optional().default(false).describe("Force refresh cache")
});
z.object({
  /** Workspace root path */
  workspace: z.string().min(1).describe("Workspace root path")
});
z.object({});
z.string().regex(/^\d+\.\d+\.\d+$/);
var SnapshotTrigger = z.enum([
  "save",
  "ai_burst",
  "manual",
  "timer",
  "pre_restore",
  "external"
]);
var ProtectionLevel = z.enum([
  "watch",
  "warn",
  "block"
]);
var RiskLevel = z.enum([
  "low",
  "medium",
  "high",
  "critical"
]);
var SessionState = z.enum([
  "active",
  "idle",
  "ended"
]);
z.enum([
  "free",
  "pro",
  "enterprise"
]);
var LearningType = z.enum([
  "pattern",
  "pitfall",
  "efficiency",
  "discovery",
  "workflow",
  "constraint",
  "preference"
]);
var TaskIntent = z.enum([
  "implement",
  "debug",
  "refactor",
  "review",
  "explore"
]);
var MemoryEntryType = z.enum([
  "learning",
  "pattern",
  "violation",
  "context",
  "task",
  "session"
]);
var WarningSeverity = z.enum([
  "info",
  "warning",
  "error"
]);
var CoChangeRelationship = z.enum([
  "import_dependency",
  "test_coverage",
  "config_pair",
  "co_change_historical",
  "type_definition"
]).or(z.string());
var ClientType = z.enum([
  "vscode",
  "mcp-stdio",
  "mcp-remote",
  "cli",
  "api",
  "unknown"
]);

// ../../packages/contracts/dist/local-service/schemas/entities.js
var FileConflict = z.object({
  /** The OTHER session ID involved in the conflict */
  sessionId: z.string(),
  /** Client type of the other session */
  clientType: z.enum([
    "vscode",
    "mcp-stdio",
    "mcp-remote",
    "cli",
    "api",
    "unknown"
  ]),
  /** Overlapping file paths */
  files: z.array(z.string()),
  /** When the conflict was detected */
  detectedAt: z.number(),
  /** Severity level */
  severity: z.enum([
    "info",
    "warn"
  ])
});
z.object({
  /** Unique session identifier (UUID v4) */
  id: z.string().uuid(),
  /** Absolute path to the workspace root */
  workspacePath: z.string(),
  /** ISO 8601 timestamp when session started */
  startedAt: z.string().datetime(),
  /** ISO 8601 timestamp of last activity */
  lastActivityAt: z.string().datetime(),
  /** Current session state */
  state: SessionState,
  /** Session metadata */
  metadata: z.object({
    /** AI tools detected during this session */
    aiToolsDetected: z.array(z.string()),
    /** Highest risk level seen in this session */
    highestRiskLevel: RiskLevel,
    /** Count of snapshots by trigger type */
    triggerCounts: z.record(z.string(), z.number())
  }),
  // === Phase 1 Additions ===
  /** Client ID that owns this session (populated from ClientRegistry) */
  clientId: z.string().optional(),
  /** Client type (vscode, mcp-stdio, mcp-remote, cli, api, unknown) */
  clientType: z.enum([
    "vscode",
    "mcp-stdio",
    "mcp-remote",
    "cli",
    "api",
    "unknown"
  ]).optional(),
  /** Unix ms timestamp when session ended (null if active) */
  endedAt: z.number().nullable().optional(),
  /** Snapshot IDs created during this session */
  snapshotIds: z.array(z.string()).optional(),
  /** Learning IDs captured during this session */
  learningIds: z.array(z.string()).optional(),
  /** Coherence score computed at session end */
  coherenceScore: z.enum([
    "high",
    "medium",
    "low",
    "scattered"
  ]).nullable().optional(),
  /** Maximum risk score observed during session */
  riskPeakScore: z.number().nullable().optional(),
  /** Other active sessions on same workspace */
  concurrentSessionIds: z.array(z.string()).optional(),
  /** Cross-session file overlap detections */
  fileConflicts: z.array(FileConflict).optional(),
  /** Files touched during this session */
  touchedFiles: z.array(z.string()).optional()
});
var Snapshot = z.object({
  /** Unique snapshot identifier (UUID v4) */
  id: z.string().uuid(),
  /** Session that created this snapshot */
  sessionId: z.string().min(1),
  /** Absolute path to the file */
  filePath: z.string(),
  /** Path relative to workspace root */
  relativePath: z.string(),
  /** Content hash (SHA-256, prefixed with "sha256:") */
  contentHash: z.string().startsWith("sha256:"),
  /** What triggered this snapshot */
  trigger: SnapshotTrigger,
  /** ISO 8601 timestamp when snapshot was created */
  createdAt: z.string().datetime(),
  /** Snapshot metadata */
  metadata: z.object({
    /** File size in bytes */
    fileSize: z.number().int().nonnegative(),
    /** Number of lines in the file */
    lineCount: z.number().int().nonnegative(),
    /** Programming language (optional) */
    language: z.string().optional(),
    /** AI tool that was active (if detected) */
    aiToolDetected: z.string().optional(),
    /** Confidence score for AI detection (0-1) */
    aiConfidence: z.number().min(0).max(1).optional(),
    /** Risk level assessment (optional) */
    riskLevel: RiskLevel.optional()
  })
});
z.object({
  /** Determined protection level */
  level: ProtectionLevel,
  /** Whether this was automatically determined */
  automatic: z.boolean(),
  /** Source of the decision */
  source: z.enum([
    "auto",
    "user",
    "config",
    "default"
  ]),
  /** Confidence in the decision (0-1) */
  confidence: z.number().min(0).max(1)
});
z.object({
  /** Factor name/description */
  name: z.string(),
  /** Factor score (0-1, higher = more protection needed) */
  score: z.number().min(0).max(1),
  /** Factor weight in overall decision (0-1) */
  weight: z.number().min(0).max(1),
  /** Additional details (optional) */
  details: z.string().optional()
});
z.object({
  /** Type of detection signal */
  type: z.enum([
    "pattern",
    "timing",
    "volume",
    "style"
  ]),
  /** Human-readable description */
  description: z.string(),
  /** Signal strength (0-1, higher = stronger evidence) */
  strength: z.number().min(0).max(1)
});
z.object({
  /** Risk category */
  category: z.enum([
    "security",
    "stability",
    "data",
    "infrastructure"
  ]),
  /** Human-readable description */
  description: z.string(),
  /** Severity level */
  severity: z.enum([
    "low",
    "medium",
    "high"
  ]),
  /** Location in code (optional) */
  location: z.object({
    /** Starting line number (1-indexed) */
    startLine: z.number().int().positive(),
    /** Ending line number (1-indexed) */
    endLine: z.number().int().positive()
  }).optional()
});
z.object({
  /** Overall risk score: 0-100 */
  score: z.number().int().min(0).max(100),
  /** Risk level classification (reuses existing RiskLevel from local-service) */
  level: RiskLevel,
  /** All identified risk factors */
  factors: z.array(z.object({
    /** Factor name */
    name: z.string(),
    /** Score contribution: -100 to 100 */
    score: z.number().min(-100).max(100),
    /** Human-readable description */
    description: z.string(),
    /** Source system */
    source: z.enum([
      "github",
      "context7",
      "sentry",
      "local",
      "ai_detection"
    ]),
    /** Optional mitigation suggestion */
    suggestion: z.string().optional()
  })),
  /** Recommended action */
  recommendation: z.enum([
    "proceed",
    "warn",
    "block"
  ]),
  /** Confidence in assessment: 0-100 */
  confidence: z.number().int().min(0).max(100),
  /** Human-readable explanation */
  explanation: z.string()
});
z.discriminatedUnion("detected", [
  z.object({
    detected: z.literal(false),
    /** Detection confidence: 0-1 (confidence that no AI was involved) */
    confidence: z.number().min(0).max(1),
    /** Detection signals evaluated */
    signals: z.array(z.object({
      type: z.enum([
        "pattern",
        "timing",
        "volume",
        "style"
      ]),
      description: z.string(),
      strength: z.number().min(0).max(1)
    }))
  }),
  z.object({
    detected: z.literal(true),
    /** Detected AI tool name */
    toolName: z.string(),
    /** Detection confidence: 0-1 */
    confidence: z.number().min(0).max(1),
    /** Detection signals that contributed to the result */
    signals: z.array(z.object({
      type: z.enum([
        "pattern",
        "timing",
        "volume",
        "style"
      ]),
      description: z.string(),
      strength: z.number().min(0).max(1)
    }))
  })
]);
z.object({
  /** Relative file path */
  filePath: z.string(),
  /** Fragility score: 0-1 (1 = very fragile) */
  fragilityScore: z.number().min(0).max(1),
  /** Severity classification */
  severity: z.enum([
    "moderate",
    "high",
    "critical"
  ]),
  /** Why this file is fragile */
  reason: z.string(),
  /** Suggested action */
  suggestion: z.string(),
  /** Number of rollbacks in recent history */
  rollbackCount: z.number().int().nonnegative(),
  /** Number of AI-triggered modifications */
  aiChurnCount: z.number().int().nonnegative(),
  /** Blast radius (number of dependent files) */
  blastRadius: z.number().int().nonnegative().optional(),
  /** Last modified timestamp (ISO 8601) */
  lastModified: z.string().datetime().optional()
});
z.object({
  /** Primary file path */
  fileA: z.string(),
  /** Co-changed file path */
  fileB: z.string(),
  /** Co-occurrence frequency: 0-1 (1 = always changed together) */
  frequency: z.number().min(0).max(1),
  /** Number of times these files were changed together */
  occurrences: z.number().int().positive(),
  /** Relationship type  -  extensible union */
  relationship: CoChangeRelationship,
  /** Human-readable description of why they co-change */
  reason: z.string(),
  /** When this pattern was last observed (ISO 8601) */
  lastObserved: z.string().datetime()
});
z.object({
  /** Relative file path */
  path: z.string().min(1),
  /** Composite fragility score: 0-100 (100 = most fragile) */
  compositeScore: z.number().min(0).max(100),
  /** Weighted churn rate contribution */
  churnScore: z.number().min(0),
  /** Weighted dependency count contribution */
  blastRadiusScore: z.number().min(0),
  /** How often restores involve this file */
  rollbackScore: z.number().min(0),
  /** Files that import this file */
  dependentCount: z.number().int().nonnegative(),
  /** Ranking: 1 = most fragile */
  rank: z.number().int().positive()
});
z.object({
  /** Primary file path */
  fileA: z.string().min(1),
  /** Co-changed file path */
  fileB: z.string().min(1),
  /** Co-occurrence frequency: 0-1 (1 = always changed together) */
  frequency: z.number().min(0).max(1),
  /** Number of times these files were changed together */
  occurrences: z.number().int().positive(),
  /** Relationship type  -  extensible string */
  relationship: z.string().min(1),
  /** Human-readable description of why they co-change */
  reason: z.string().min(1),
  /** When this pattern was last observed (epoch timestamp) */
  lastObserved: z.number().int().positive()
});
var RiskFactorStorageSchema = z.object({
  /** Pillar source */
  source: z.enum([
    "git-risk",
    "rollback-patterns",
    "fatigue",
    "annotations",
    "poisoning",
    "history",
    "structural",
    "co-change"
  ]),
  /** Risk score contribution */
  score: z.number(),
  /** Human-readable description */
  description: z.string().min(1),
  /** Severity level */
  severity: z.enum([
    "info",
    "warning",
    "critical"
  ]),
  /** Additional metadata */
  meta: z.record(z.unknown()).optional()
});
z.object({
  /** Overall risk score (1.0 = neutral, higher = riskier) */
  riskScore: z.number().min(0),
  /** Action recommendation */
  action: z.enum([
    "PROCEED",
    "PROCEED_WITH_SNAPSHOT",
    "WARN",
    "BLOCK"
  ]),
  /** All contributing factors */
  factors: z.array(RiskFactorStorageSchema),
  /** Whether write is allowed */
  allowed: z.boolean(),
  /** Human-readable recommendation */
  recommendation: z.string().min(1),
  /** Alternative actions if blocked */
  alternativeActions: z.array(z.object({
    tool: z.string(),
    description: z.string(),
    params: z.record(z.unknown()).optional()
  })).optional(),
  /** Assessment timestamp (epoch) */
  timestamp: z.number().int().positive(),
  /** Correlation ID for tracing */
  correlationId: z.string().optional()
});
z.object({
  /** Total learnings captured for this workspace */
  learningsCount: z.number().int().nonnegative(),
  /** Total patterns detected */
  patternsCount: z.number().int().nonnegative(),
  /** Number of fragile files identified */
  fragileFilesCount: z.number().int().nonnegative(),
  /** Number of co-change relationships detected */
  coChangePatternsCount: z.number().int().nonnegative(),
  /** Total sessions recorded (cumulative) */
  totalSessions: z.number().int().nonnegative(),
  /** Total lines analyzed (cumulative  -  retained for Pioneer Program) */
  linesAnalyzed: z.number().int().nonnegative(),
  /** Total snapshots created (cumulative) */
  totalSnapshots: z.number().int().nonnegative(),
  /** Total restores performed (cumulative) */
  totalRestores: z.number().int().nonnegative(),
  // ── Time-windowed counters (v2  -  meaningful recency) ──
  /** Snapshots created in the last 24 hours */
  snapshotsToday: z.number().int().nonnegative(),
  /** Snapshots created in the last 7 days */
  snapshotsThisWeek: z.number().int().nonnegative(),
  /** Lines analyzed in the last 24 hours */
  linesAnalyzedToday: z.number().int().nonnegative(),
  /** Restores performed in the last 7 days */
  restoresThisWeek: z.number().int().nonnegative(),
  /** Patterns detected in the last 7 days */
  patternsThisWeek: z.number().int().nonnegative(),
  // ── Health summary ──
  /** Workspace health score: 0-100 */
  healthScore: z.number().int().min(0).max(100),
  /** Health trajectory */
  healthTrajectory: z.enum([
    "improving",
    "stable",
    "declining"
  ])
});
z.object({
  /** Warning code (e.g., 'FRAGILE_FILE', 'LOOP_DETECTED') */
  code: z.string(),
  /** Severity level (ordered: info < warning < error) */
  level: WarningSeverity,
  /** Human-readable message */
  message: z.string(),
  /** Affected file (optional) */
  file: z.string().optional(),
  /** Suggested action */
  suggestion: z.string().optional()
});
z.object({
  /** Coherence score: 0-100 (100 = highly focused session) */
  score: z.number().int().min(0).max(100),
  /** Assessment */
  assessment: z.enum([
    "focused",
    "moderate",
    "scattered",
    "chaotic"
  ]),
  /** Number of distinct file clusters in the session */
  clusterCount: z.number().int().nonnegative(),
  /** Primary focus area (most-edited directory or module) */
  primaryFocus: z.string().nullable(),
  /** Files that seem unrelated to the main session focus */
  outlierFiles: z.array(z.string())
});
var SnapshotAIAttribution = z.discriminatedUnion("detected", [
  z.object({
    detected: z.literal(false)
  }),
  z.object({
    detected: z.literal(true),
    toolName: z.string(),
    confidence: z.number().min(0).max(1)
  })
]);
Snapshot.extend({
  /** Risk assessment at time of creation */
  risk: z.object({
    score: z.number().int().min(0).max(100),
    level: RiskLevel
  }).optional(),
  /** AI tool attribution (absent = not checked, present = checked) */
  aiAttribution: SnapshotAIAttribution.optional(),
  /** Session cluster ID (for grouping in timeline) */
  sessionClusterId: z.string().uuid().nullable(),
  /** Whether this snapshot has been restored */
  wasRestored: z.boolean()
});
z.object({
  /** Workspace root (absolute path) */
  workspace: z.string().min(1),
  /** Workspace-relative file path (I-9) */
  filePath: z.string().min(1)
});
z.object({
  result: z.object({
    /** 1-hop importers (workspace-relative paths) */
    direct: z.array(z.string()),
    /** 2-hop importers, excluding anything in `direct` */
    transitive: z.array(z.string()),
    directCount: z.number().int().nonnegative(),
    transitiveCount: z.number().int().nonnegative(),
    /** Count of affected files living in a different module */
    crossPackageCount: z.number().int().nonnegative(),
    /** Log-scale normalised blast radius score in [0, 1] */
    score: z.number().min(0).max(1)
  }).nullable()
});
var GuardStatus = z.enum([
  "pass",
  "warn",
  "fail"
]);
var GuardFile = z.object({
  /** Absolute or workspace-relative path to the flagged file */
  path: z.string().min(1),
  /** Line number where the issue was found (optional) */
  line: z.number().int().positive().optional(),
  /** Human-readable description of the issue */
  message: z.string().min(1)
});
var GuardResult = z.object({
  /** Guard name (e.g., "console-logs", "test-pollution") */
  guard: z.string().min(1),
  /** Execution status */
  status: GuardStatus,
  /** Files flagged by this guard (empty array if status is "pass") */
  files: z.array(GuardFile).default([]),
  /** Execution duration in milliseconds */
  durationMs: z.number().nonnegative()
});
z.object({
  /** Results from all guards in the run */
  guards: z.array(GuardResult).default([]),
  /** Unix timestamp (ms) when this run completed */
  timestamp: z.number().nonnegative(),
  /** Age of cached results in milliseconds (Date.now() - timestamp) */
  staleMs: z.number().nonnegative(),
  /** Profile used for this run ("fast" or "full") */
  profile: z.enum([
    "fast",
    "full"
  ]),
  /** Whether a background refresh is in progress */
  refreshing: z.boolean()
});
WorkspaceBase.extend({
  /** Guard profile to run (optional, defaults to "fast") */
  profile: z.enum([
    "fast",
    "full"
  ]).optional().default("fast")
});
z.object({
  /** Guards that changed status since last run */
  changed: z.array(GuardResult),
  /** Current state of all guards */
  current: z.array(GuardResult),
  /** Unix timestamp (ms) when the change was detected */
  timestamp: z.number().nonnegative()
});
WorkspaceBase.extend({
  /** Pattern content */
  content: z.string().min(1),
  /** Knowledge domain */
  domain: z.enum([
    "architecture",
    "testing",
    "documentation",
    "performance",
    "security",
    "workflow",
    "tooling"
  ]).optional(),
  /** Pattern type */
  type: z.enum([
    "pattern",
    "anti-pattern",
    "best-practice",
    "constraint",
    "heuristic"
  ]).optional(),
  /** Severity */
  severity: z.enum([
    "info",
    "warning",
    "error"
  ]).optional(),
  /** Related pattern IDs */
  relatedTo: z.array(z.string()).optional(),
  /** Gap Fields: Outcome type for dashboard tracking (prevented/recovered/monitored) */
  outcome: z.enum([
    "prevented",
    "recovered",
    "monitored"
  ]).optional(),
  /** Gap Fields: File categories involved (for risksPreventedContext) */
  fileCategories: z.array(z.string()).optional(),
  /** Gap Fields: Blast radius count for the decision */
  blastRadius: z.number().int().nonnegative().optional(),
  /** Gap Fields: File path for the event */
  filePath: z.string().optional(),
  /** Gap Fields: AI tool detected (cursor/copilot/claude) */
  aiTool: z.enum([
    "cursor",
    "copilot",
    "claude"
  ]).optional(),
  /** Gap Fields: Risk level (high/medium/low) */
  risk: z.enum([
    "high",
    "medium",
    "low"
  ]).optional()
});
WorkspaceBase.extend({
  /** Pattern ID or Decision ID */
  patternId: z.string().min(1),
  /**
   * Outcome type
   * - resolved/regressed/ignored: Original pattern outcomes
   * - prevented/recovered/monitored: Gap Fields dashboard outcomes
   */
  outcome: z.enum([
    "resolved",
    "regressed",
    "ignored",
    "prevented",
    "recovered",
    "monitored"
  ]),
  /** Notes */
  notes: z.string().optional(),
  /** Gap Fields: Whether decision was reverted within 5min (for accuracy calc) */
  revertedWithin5Min: z.boolean().optional(),
  /** Gap Fields: File categories involved */
  fileCategories: z.array(z.string()).optional()
});
WorkspaceBase.extend({
  /** Unique decision ID */
  decisionId: z.string().min(1),
  /** Decision outcome */
  outcome: z.enum([
    "prevented",
    "recovered",
    "monitored",
    "reverted"
  ]),
  /** Whether the decision was reverted within 5 minutes */
  revertedWithin5Min: z.boolean().optional(),
  /** File categories involved in the decision */
  fileCategories: z.array(z.string()).optional(),
  /** Human-readable action taken */
  action: z.string().optional(),
  /** Notes */
  notes: z.string().optional()
});
WorkspaceBase.extend({
  /** Minimum fragility score to include (0-1) */
  minScore: z.number().min(0).max(1).default(0.5),
  /** Maximum results */
  limit: z.number().int().min(1).max(50).default(20)
});
WorkspaceBase.extend({
  /** Minimum co-occurrence frequency to include (0-1) */
  minFrequency: z.number().min(0).max(1).default(0.5),
  /** Filter to patterns involving this file */
  filePath: z.string().optional(),
  /** Maximum results */
  limit: z.number().int().min(1).max(50).default(20)
});
WorkspaceBase.extend({
  /** Filter by minimum severity (uses WARNING_SEVERITY_ORDER for comparison) */
  minLevel: WarningSeverity.default("info"),
  /** Maximum results */
  limit: z.number().int().min(1).max(20).default(10)
});
WorkspaceBase.extend({
  /** Days to look back (default: 7) */
  days: z.number().int().min(1).max(30).default(7)
});
WorkspaceBase.extend({
  /** Weeks to look back (default: 8) */
  weeks: z.number().int().min(1).max(12).default(8)
});
WorkspaceBase.extend({
  /** Filter to specific files (omit to scan all files in window) */
  files: z.array(z.string()).optional(),
  /** Time window to query from the aggregate store */
  window: z.enum([
    "7d",
    "30d",
    "90d",
    "all"
  ]).default("30d"),
  /** Minimum calibrated confidence floor (default: 0.55 = MIN_SURFACE_SCORE) */
  minConfidence: z.number().min(0).max(1).default(0.55),
  /** Maximum candidates to return */
  limit: z.number().int().min(1).max(20).default(10)
});
WorkspaceBase.extend({
  profile: z.any().optional(),
  fragileFiles: z.array(z.any()).optional(),
  coChangePairs: z.array(z.any()).optional(),
  temporalRiskWindows: z.array(z.any()).optional(),
  weightOverrides: z.any().optional(),
  lockedInsights: z.array(z.any()).optional(),
  scanCache: z.any().optional()
});
WorkspaceBase.extend({
  insightId: z.string()
});
WorkspaceBase.extend({
  /** File path (relative to workspace root) */
  path: z.string().min(1),
  /** Lines changed */
  linesChanged: z.number().int().nonnegative().optional(),
  /** AI-attributed change */
  aiAttributed: z.boolean().optional(),
  /** Optional AI tool name if attributed */
  aiTool: z.enum([
    "cursor",
    "copilot",
    "claude",
    "windsurf",
    "burst-pattern"
  ]).optional()
});
z.object({
  workspace: z.string().optional()
});
WorkspaceBase.extend({
  /** Factors or signals to index (optional, passed by MCP adapter).
   * Shape: Array<{ name: string; score: number; source: string; description?: string }>
   */
  factors: z.array(z.object({
    name: z.string(),
    score: z.number(),
    source: z.string(),
    description: z.string().optional()
  })).optional()
});
z.object({
  /** Indexed patterns (currently an empty stub  -  full implementation deferred) */
  patterns: z.array(z.unknown()),
  /** Total pattern count */
  total: z.number().int().nonnegative()
});
z.object({
  /** Whether the outcome was recorded */
  recorded: z.boolean(),
  /** The decision ID */
  decisionId: z.string(),
  /** The outcome type */
  outcome: z.string(),
  /** Whether the decision was reverted within 5 minutes */
  revertedWithin5Min: z.boolean().optional(),
  /** Impact on accuracy metric */
  accuracyImpact: z.enum([
    "reduced",
    "maintained"
  ]),
  /** Optional notes */
  notes: z.string().optional()
});
z.object({
  /** Number of days in the window */
  days: z.number().int(),
  /** Number of risks prevented */
  risksPrevented: z.number().int(),
  /** Human-readable context about what was prevented */
  risksPreventedContext: z.string(),
  /** Daily prevented counts by day of week */
  dailyPrevented: z.array(z.object({
    day: z.string(),
    prevented: z.number().int()
  })),
  /** Timeline events within the window */
  timelineEvents: z.array(z.object({
    hour: z.number().int(),
    type: z.enum([
      "recovery",
      "ai_detected",
      "snapshot"
    ]),
    tool: z.string().optional(),
    file: z.string(),
    risk: z.string(),
    action: z.string(),
    blast: z.number().optional()
  })),
  /** Total decisions in the window */
  totalDecisions: z.number().int()
});
z.object({
  /** Number of weeks in the window */
  weeks: z.number().int(),
  /** Weekly velocity data */
  velocity: z.array(z.object({
    week: z.string(),
    learnings: z.number().int(),
    accuracy: z.number().int()
  })),
  /** Overall accuracy percentage (0-100) */
  overallAccuracy: z.number().int(),
  /** Session coherence percentage (0-100) */
  coherencePercent: z.number().int(),
  /** Ratio string e.g. "3 : 1" */
  preventedToRecoveredRatio: z.string(),
  /** Number of prevented decisions */
  preventedCount: z.number().int(),
  /** Number of recovered decisions */
  recoveredCount: z.number().int(),
  /** Total decisions in the window */
  totalDecisions: z.number().int()
});
var GitRiskFactor = z.object({
  /** Unique identifier for this risk factor */
  id: z.string(),
  /** Human-readable label */
  label: z.string(),
  /** Contribution to risk multiplier (additive) */
  contribution: z.number(),
  /** Severity level */
  severity: z.enum([
    "info",
    "warning",
    "critical"
  ])
});
z.object({
  /** Multiplicative factor applied to base risk score (1.0 = neutral) */
  multiplier: z.number(),
  /** Contributing factors that built up the multiplier */
  factors: z.array(GitRiskFactor),
  /** Whether git context was available */
  hasGitContext: z.boolean(),
  /** Timestamp of evaluation for caching */
  evaluatedAt: z.number()
});
z.object({
  /** Workspace path to evaluate */
  workspace: z.string()
});
z.object({
  /** AI tool that was active when rollback happened */
  tool: z.string(),
  /** File extension involved */
  fileExt: z.string(),
  /** Number of lines in the rolled-back change */
  linesChanged: z.number(),
  /** Programming language */
  language: z.string(),
  /** File category classification */
  fileCategory: z.enum([
    "config",
    "code",
    "test",
    "docs",
    "build",
    "other"
  ]),
  /** Was it a multi-file change? */
  fileCount: z.number(),
  /** Time of day bucket (0-23) for fatigue correlation */
  hourBucket: z.number().int().min(0).max(23),
  /** Session duration at rollback time (minutes) */
  sessionMinutes: z.number(),
  /** Workspace where rollback occurred */
  workspace: z.string(),
  /** Timestamp of rollback */
  timestamp: z.number()
});
z.object({
  /** Confidence that this matches a known failure pattern (0-1) */
  confidence: z.number().min(0).max(1),
  /** Human-readable warning message */
  message: z.string(),
  /** Number of similar rollbacks in the cluster */
  clusterSize: z.number(),
  /** Dominant factors in the cluster */
  dominantFactors: z.array(z.string()),
  /** Risk boost to apply (additive) */
  riskBoost: z.number()
});
z.object({
  /** Workspace where rollback occurred */
  workspace: z.string(),
  /** AI tool that was active */
  tool: z.string(),
  /** File extension */
  fileExt: z.string(),
  /** Lines changed */
  linesChanged: z.number(),
  /** Programming language */
  language: z.string(),
  /** File category */
  fileCategory: z.enum([
    "config",
    "code",
    "test",
    "docs",
    "build",
    "other"
  ]),
  /** File count */
  fileCount: z.number(),
  /** Session duration in minutes */
  sessionMinutes: z.number()
});
z.object({
  /** Workspace to check */
  workspace: z.string(),
  /** AI tool making the change */
  tool: z.string(),
  /** File extension */
  fileExt: z.string(),
  /** Lines being changed */
  linesChanged: z.number(),
  /** Programming language */
  language: z.string(),
  /** File category */
  fileCategory: z.enum([
    "config",
    "code",
    "test",
    "docs",
    "build",
    "other"
  ]),
  /** File count in change */
  fileCount: z.number(),
  /** Current session duration */
  sessionMinutes: z.number()
});
z.object({
  /** Workspace to get stats for */
  workspace: z.string()
});
z.object({
  /** Total rollbacks recorded */
  totalRollbacks: z.number(),
  /** Number of distinct clusters */
  clusters: z.number(),
  /** Size of largest cluster */
  largestCluster: z.number()
});
z.object({
  /** Additive risk boost (0.0 - 0.5) */
  riskBoost: z.number().min(0).max(0.5),
  /** Human-readable fatigue level */
  level: z.enum([
    "rested",
    "normal",
    "elevated",
    "fatigued"
  ]),
  /** Ratio of rapid accepts in the window (0-1) */
  rapidAcceptRatio: z.number().min(0).max(1),
  /** Current accept velocity (accepts per minute) */
  velocityPerMinute: z.number(),
  /** Session duration contributing to assessment */
  sessionMinutes: z.number(),
  /** Contributing factors to the assessment */
  factors: z.array(z.string())
});
z.object({
  /** Workspace to assess */
  workspace: z.string()
});
var AnnotationTag = z.enum([
  "good_state",
  "before_refactor",
  "it_broke_here",
  "uncertain",
  "ai_diverged",
  "manual_recovery",
  "shipped"
]);
z.object({
  /** Snapshot hash (content-addressable ID) */
  snapshotHash: z.string(),
  /** Annotation tag */
  tag: AnnotationTag,
  /** Optional freeform note (max 280 chars) */
  note: z.string().max(280).optional(),
  /** Active AI tool at time of annotation */
  aiTool: z.string().optional(),
  /** Files in the snapshot */
  fileCount: z.number(),
  /** Risk score at time of annotation */
  riskScore: z.number().optional(),
  /** Timestamp */
  timestamp: z.number(),
  /** Workspace */
  workspace: z.string()
});
z.object({
  /** Snapshot hash to annotate */
  snapshotHash: z.string(),
  /** Annotation tag */
  tag: AnnotationTag,
  /** Optional note */
  note: z.string().max(280).optional(),
  /** AI tool active */
  aiTool: z.string().optional(),
  /** File count */
  fileCount: z.number(),
  /** Risk score at time */
  riskScore: z.number().optional(),
  /** Workspace */
  workspace: z.string()
});
z.object({
  /** Whether annotation was recorded */
  recorded: z.boolean(),
  /** Risk signal from the annotation */
  riskSignal: z.object({
    direction: z.enum([
      "increase",
      "decrease",
      "neutral"
    ]),
    magnitude: z.number()
  })
});
z.object({
  /** Workspace to query */
  workspace: z.string(),
  /** Filter by timestamp (ms since epoch) */
  since: z.number().optional(),
  /** Filter by tags */
  tags: z.array(AnnotationTag).optional(),
  /** Limit number of results */
  limit: z.number().optional()
});
z.object({
  /** Workspace to get calibration for */
  workspace: z.string()
});
z.object({
  /** Net risk adjustment from historical annotations */
  netAdjustment: z.number().min(-0.5).max(0.5),
  /** Number of annotations considered */
  annotationCount: z.number(),
  /** Breakdown by tag */
  breakdown: z.record(AnnotationTag, z.number())
});
z.object({
  /** Whether poisoning was detected */
  isPoisoned: z.boolean(),
  /** How many times this pattern has been rejected */
  occurrences: z.number(),
  /** How many distinct sessions it appeared in */
  distinctSessions: z.number(),
  /** Risk boost to apply if poisoned */
  riskBoost: z.number(),
  /** Human-readable warning */
  warning: z.string().optional(),
  /** Structural fingerprint (for debugging) */
  fingerprint: z.string().optional()
});
z.object({
  /** Workspace to check */
  workspace: z.string(),
  /** Unified diff of proposed change */
  diff: z.string()
});
z.object({
  /** Workspace where rejection occurred */
  workspace: z.string(),
  /** Diff that was rejected */
  diff: z.string(),
  /** Session ID */
  sessionId: z.string(),
  /** AI tool involved */
  tool: z.string().optional(),
  /** File extension */
  fileExt: z.string().optional()
});
z.object({
  /** Workspace to get stats for */
  workspace: z.string()
});
z.object({
  /** Number of patterns being tracked */
  trackedPatterns: z.number(),
  /** Number of poisoned patterns (>= threshold) */
  poisonedPatterns: z.number(),
  /** Top tools involved in poisoning */
  topTools: z.array(z.string())
});
var SafeToWriteAction = z.enum([
  "PROCEED",
  "PROCEED_WITH_SNAPSHOT",
  "WARN",
  "BLOCK"
]);
var SafeToWriteFactor = z.object({
  /** Source of the factor (which pillar) */
  source: z.string(),
  /** Score contribution */
  score: z.number(),
  /** Description of the factor */
  description: z.string()
});
var AlternativeAction = z.object({
  /** Tool to use instead */
  tool: z.string(),
  /** Description of what to do */
  description: z.string(),
  /** Optional parameters for the tool */
  params: z.record(z.string(), z.unknown()).optional()
});
z.object({
  /** Whether the write is allowed */
  allowed: z.boolean(),
  /** Action to take */
  action: SafeToWriteAction,
  /** Composite risk score (capped at 2.5) */
  riskScore: z.number(),
  /** Contributing factors from all pillars */
  factors: z.array(SafeToWriteFactor),
  /** Human-readable recommendation */
  recommendation: z.string(),
  /** Snapshot hash if auto-created */
  snapshotHash: z.string().optional(),
  /** Whether the operation can be retried */
  retryable: z.boolean(),
  /** Alternative actions to take instead */
  alternativeActions: z.array(AlternativeAction)
});
z.object({
  /** Workspace path */
  workspace: z.string(),
  /** File path being written */
  filePath: z.string(),
  /** Proposed diff */
  proposedDiff: z.string(),
  /** AI tool making the change */
  tool: z.string().optional(),
  /** Intent of the change */
  intent: z.string().optional()
});
WorkspaceBase.extend({
  /** Single file path (daemon shape) */
  filePath: z.string().optional(),
  /** Array of file paths (MCP shape) */
  files: z.array(z.string()).optional(),
  /** Proposed diff content */
  proposedDiff: z.string().optional(),
  /** AI tool making the request */
  tool: z.string().optional(),
  /** Intent of the change */
  intent: z.string().optional(),
  /** Session ID (daemon shape - top-level) */
  sessionId: z.string().optional(),
  /** Context object (MCP shape - nested) */
  context: z.object({
    task: z.string().optional(),
    sessionId: z.string().optional()
  }).optional()
});
WorkspaceBase.extend({
  /** Learning type */
  type: LearningType,
  /** Trigger condition */
  trigger: z.string().min(1),
  /** Action to take */
  action: z.string().min(1),
  /** Source of the learning */
  source: z.string().optional()
});
WorkspaceBase.extend({
  /** Keywords to search */
  keywords: z.array(z.string()).min(1),
  /** Max results */
  limit: z.number().int().min(1).max(100).optional()
});
WorkspaceBase.extend({
  /** Max results */
  limit: z.number().int().min(1).max(200).optional()
});
WorkspaceBase.extend({
  /** Command being evaluated */
  commandName: z.string().min(1),
  /** Command arguments */
  args: z.record(z.unknown()).optional(),
  /** Files or paths involved */
  filesOrPaths: z.array(z.string()).optional(),
  /** Intent of the command */
  intent: z.enum([
    "implement",
    "debug",
    "refactor",
    "review"
  ]).optional(),
  /** Learning mode */
  mode: z.enum([
    "observe",
    "warn",
    "apply-safe",
    "apply-all",
    "off"
  ]).optional()
});
WorkspaceBase.extend({
  /** Session ID */
  sessionId: z.string().min(1),
  /** Learning IDs to associate */
  learningIds: z.array(z.string())
});
WorkspaceBase.extend({
  /** GC operation */
  operation: z.enum([
    "archive",
    "delete",
    "all"
  ]).optional(),
  /** Dry run (audit only) */
  dryRun: z.boolean().default(true)
});
z.object({
  workspace: z.string().min(1),
  patternKey: z.string().min(1),
  patternType: z.string().min(1),
  confidence: z.number().min(0).max(1)
});
z.object({
  workspace: z.string().min(1),
  maxBatchSize: z.number().int().positive().max(1e3).optional()
});
z.object({
  workspace: z.string().min(1),
  syncedIds: z.array(z.string()),
  failedIds: z.array(z.string())
});
z.object({
  success: z.boolean(),
  learningId: z.string(),
  type: z.string(),
  trigger: z.string(),
  action: z.string(),
  confidence: z.number(),
  captureMethod: z.string()
});
var LearningEntryItem = z.object({
  type: z.string(),
  trigger: z.string(),
  action: z.string(),
  relevanceScore: z.number().optional()
});
z.object({
  learnings: z.array(LearningEntryItem),
  total: z.number().int()
});
z.object({
  learnings: z.array(z.object({
    type: z.string(),
    trigger: z.string(),
    action: z.string()
  })),
  total: z.number().int()
});
z.object({
  pruned: z.number().int(),
  remaining: z.number().int(),
  categories: z.object({
    lowConfidence: z.number().int(),
    stale: z.number().int(),
    duplicates: z.number().int()
  })
});
z.object({
  operation: z.string(),
  dryRun: z.boolean(),
  collected: z.number().int(),
  remaining: z.number().int(),
  categories: z.object({
    malformed: z.number().int(),
    invalidType: z.number().int(),
    emptyContent: z.number().int()
  })
});
z.object({
  applicable: z.array(LearningEntryItem),
  mode: z.string(),
  commandName: z.string()
});
z.object({
  success: z.boolean(),
  sessionId: z.string(),
  updated: z.number().int()
});
z.object({
  seeded: z.boolean(),
  learningsAdded: z.number().int(),
  tiers: z.object({
    hot: z.number().int(),
    warm: z.number().int(),
    cold: z.number().int()
  }),
  alreadySeeded: z.boolean(),
  framework: z.string().nullable()
});
z.object({
  success: z.boolean(),
  originalCount: z.number().int(),
  consolidatedCount: z.number().int(),
  duplicatesFound: z.number().int(),
  reductionPercent: z.number(),
  archivePath: z.string(),
  dryRun: z.boolean()
});
z.object({
  success: z.boolean(),
  newConfidence: z.number().optional(),
  error: z.string().optional()
});
z.object({
  promoted: z.boolean(),
  observationCount: z.number().int(),
  patternId: z.string()
});
var CanonicalVerb = z.enum([
  // File operations
  "WRITE_FILE",
  "EDIT_FILE",
  "DELETE_FILE",
  "READ_FILE",
  // Reasoning
  "PLAN",
  "REVIEW",
  "DECIDE",
  // Verification
  "VERIFY_GATE",
  // Session lifecycle
  "SESSION_START",
  "SESSION_END",
  "SESSION_HEARTBEAT",
  // Snapshot operations
  "SNAPSHOT_CREATE",
  "SNAPSHOT_RESTORE",
  "SNAPSHOT_ROLLBACK",
  // Phase events
  "PHASE_START",
  "PHASE_END",
  // Catchall for extension
  "OTHER"
]);
z.object({
  /** Surface identifier (e.g. "vscode:session-abc123", "cli:run-xyz") */
  surfaceId: z.string(),
  /** Workspace fingerprint: sha256("gitRemote:userId") from sync-client.ts */
  workspaceFingerprint: z.string(),
  /** Per-surface monotonic sequence number for ordering (WAL-06 interleave resolution) */
  seq: z.number().int().min(0),
  /** Epoch milliseconds */
  ts: z.number().int().positive(),
  /** Canonical action verb */
  verb: CanonicalVerb,
  /**
   * Event metadata — NO file content permitted (ARCH-03).
   * Allowed: file paths (relative), hashes, counts, durations, error codes.
   */
  meta: z.record(z.unknown())
});
z.object({
  /** WAL file offset after the appended entry (byte position) */
  offset: z.number().int().min(0),
  /** Acknowledged: true if write was confirmed synchronous (appendFileSync) */
  acked: z.boolean()
});
z.object({
  /** Session ID to recover */
  sessionId: z.string(),
  /** Workspace fingerprint (routing key to the correct WAL file) */
  workspaceFingerprint: z.string()
});
var VerbSummary = z.record(z.number().int().min(0));
var LedgerRecoverResult = z.object({
  /** Session ID that was recovered */
  sessionId: z.string(),
  /** Session start timestamp (epoch ms) */
  sessionStartTs: z.number().int().positive(),
  /** Handle expiry timestamp (epoch ms) — when the in-memory cursor closed */
  expiryTs: z.number().int().positive().nullable(),
  /** Expiry reason */
  expiryReason: z.enum([
    "idle-timeout",
    "daemon-restart",
    "explicit-end",
    "unknown"
  ]),
  /** Timestamp of last heartbeat event in WAL (epoch ms) */
  lastHeartbeatTs: z.number().int().positive().nullable(),
  /** Timestamp of last event in WAL (epoch ms) */
  lastEventTs: z.number().int().positive().nullable(),
  /** Total event count captured before expiry */
  eventCount: z.number().int().min(0),
  /** Per-verb count summary */
  verbSummary: VerbSummary,
  /** Whether a ceremony was computed from the recovered events */
  ceremonyAvailable: z.boolean(),
  /** Ceremony payload (null if insufficient events for ceremony) */
  ceremony: z.record(z.unknown()).nullable()
});
z.object({
  /** Session ID that may be expired */
  sessionId: z.string(),
  /** Surface that is calling end */
  surfaceId: z.string(),
  /** Workspace fingerprint */
  workspaceFingerprint: z.string()
});
z.object({
  /** Whether the session was found active, recovered from WAL, or not found at all */
  disposition: z.enum([
    "active",
    "recovered-from-wal",
    "not-found"
  ]),
  /** Recovery result if disposition is "recovered-from-wal" */
  recovery: LedgerRecoverResult.nullable()
});
WorkspaceBase.extend({
  /** Snapshot ID */
  id: z.string().min(1),
  /** File path */
  filePath: z.string().optional(),
  /** Trigger type */
  trigger: z.enum([
    "manual",
    "auto",
    "ai-detection"
  ]).optional(),
  /** Source surface */
  source: z.enum([
    "mcp",
    "cli",
    "extension"
  ]).optional()
});
z.object({
  acknowledged: z.literal(true)
});
WorkspaceBase.extend({
  /** File path */
  path: z.string().min(1),
  /** Lines changed */
  linesChanged: z.number().int().nonnegative().optional(),
  /** AI-attributed change */
  aiAttributed: z.boolean().optional(),
  /** AI tool that made the change */
  aiTool: z.enum([
    "cursor",
    "copilot",
    "claude",
    "windsurf",
    "burst-pattern"
  ]).optional()
});
WorkspaceBase.extend({
  /** Entry type */
  type: MemoryEntryType,
  /** Entry data */
  data: z.record(z.unknown()),
  /** TTL in days (0 = permanent) */
  ttlDays: z.number().int().min(0).default(0)
});
WorkspaceBase.extend({
  /** Entry IDs to retrieve */
  ids: z.array(z.string().min(1)).min(1)
});
WorkspaceBase.extend({
  /** Filter by type */
  type: MemoryEntryType.optional(),
  /** Keywords to match */
  keywords: z.array(z.string()).optional(),
  /** Minimum relevance score (0-1) */
  minRelevance: z.number().min(0).max(1).default(0.3),
  /** Maximum results */
  limit: z.number().int().min(1).max(100).default(50),
  /** Created after timestamp */
  since: z.number().optional()
});
WorkspaceBase.extend({
  /** Preview only (don't modify) */
  dryRun: z.boolean().default(false)
});
z.object({
  id: z.string(),
  stored: z.boolean()
});
z.object({
  originalEntries: z.number().int().nonnegative(),
  keptEntries: z.number().int().nonnegative(),
  removedEntries: z.number().int().nonnegative(),
  savedBytes: z.number().nonnegative()
});
WorkspaceBase.extend({
  /** Compare against this commit (default HEAD~10) */
  since: z.string().optional(),
  /** Force full re-fit */
  full: z.boolean().optional()
});
WorkspaceBase.extend({
  /** File path to score */
  filePath: z.string().min(1)
});
WorkspaceBase.extend({
  /** Quick mode (git + AST only) */
  quick: z.boolean().optional()
});
z.object({
  refreshed: z.literal(true),
  since: z.string(),
  full: z.boolean(),
  scores: z.record(z.unknown()),
  timestamp: z.number()
});
z.object({
  filePath: z.string(),
  score: z.number().min(0).max(1),
  factors: z.object({
    changeFrequency: z.number(),
    complexity: z.number(),
    recency: z.number()
  }),
  timestamp: z.number()
});
z.object({
  synced: z.literal(true),
  quick: z.boolean(),
  filesAnalyzed: z.number().int().nonnegative(),
  timestamp: z.number()
});
z.object({
  active: z.boolean(),
  lastSync: z.string().nullable(),
  fileCount: z.number().int().nonnegative(),
  averageScore: z.number()
});
z.object({
  /** File path to evaluate */
  filePath: z.string().min(1),
  /** Current file content (optional, reads from disk if omitted) */
  content: z.string().optional(),
  /** Additional context for evaluation (optional) */
  context: z.object({
    /** Number of recent changes to the file */
    recentChanges: z.number().int().nonnegative().optional(),
    /** Milliseconds since last save */
    timeSinceLastSave: z.number().int().nonnegative().optional(),
    /** Whether an AI tool is currently active */
    aiToolActive: z.boolean().optional()
  }).optional()
});
z.object({
  /** File paths to get protection levels for */
  filePaths: z.array(z.string().min(1)).min(1).max(100)
});
z.object({
  /** File path to set protection for */
  filePath: z.string().min(1),
  /** Protection level to set ("auto" to reset to automatic) */
  level: z.enum([
    "watch",
    "warn",
    "block",
    "auto"
  ]),
  /** Scope of the protection rule */
  scope: z.enum([
    "file",
    "directory",
    "pattern"
  ]).default("file"),
  /** Pattern for pattern-based rules (glob syntax) (optional) */
  pattern: z.string().optional()
});
WorkspaceBase.extend({
  /** File path */
  filePath: z.string().min(1)
});
WorkspaceBase.extend({
  /** File path */
  filePath: z.string().min(1),
  /** Protection level */
  level: ProtectionLevel,
  /** Reason for setting level */
  reason: z.string().optional()
});
WorkspaceBase.extend({
  /** Filter by level */
  level: ProtectionLevel.optional(),
  /** Max results */
  limit: z.number().int().min(1).max(500).optional()
});
z.object({
  /** Protection level assigned */
  level: ProtectionLevel,
  /** Whether protection was assigned automatically */
  automatic: z.boolean(),
  /** Source of the protection decision */
  source: z.string(),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** Risk score (0-100) */
  riskScore: z.number().min(0).max(100),
  /** Recommended action */
  recommendation: z.string(),
  /** Contributing risk factors */
  factors: z.array(z.object({
    name: z.string(),
    score: z.number(),
    description: z.string(),
    source: z.string(),
    suggestion: z.string().optional()
  }))
});
z.object({
  /** Map of level name to level descriptor */
  levels: z.record(z.object({
    description: z.string(),
    automatic: z.boolean()
  }))
});
z.object({
  /** Whether the protection level was set successfully */
  success: z.boolean()
});
z.object({
  /** Protection level, if retrievable */
  level: ProtectionLevel.optional()
});
z.object({
  /** Whether the level was set */
  success: z.boolean()
});
z.array(z.object({
  filePath: z.string(),
  level: ProtectionLevel
}));
WorkspaceBase.extend({
  /** Optional: specific component ID to assess */
  targetComponentId: z.string().optional(),
  /** Optional: minimum test coverage threshold (0.0-1.0) */
  minTestCoverage: z.number().min(0).max(1).optional(),
  /** Optional: maximum dependency count threshold */
  maxDependencyCount: z.number().int().positive().optional(),
  /** Optional: minimum confidence threshold (0.0-1.0) */
  minConfidence: z.number().min(0).max(1).optional()
});
WorkspaceBase.extend({
  /** Include all candidates in report (not just recommendations) */
  includeAllCandidates: z.boolean().optional()
});
WorkspaceBase.extend({
  /** Maximum number of recommendations to return */
  limit: z.number().int().positive().optional(),
  /** Minimum priority level to include */
  minPriority: z.enum([
    "critical",
    "high",
    "medium",
    "low"
  ]).optional()
});
WorkspaceBase.extend({
  /** Component ID to analyze */
  componentId: z.string()
});
WorkspaceBase.extend({
  /** Component ID to set gate for */
  componentId: z.string(),
  /** Gate to set */
  gate: z.enum([
    "migrationPlan",
    "rollbackStrategy",
    "ownerAssigned",
    "stakeholderSignoff"
  ]),
  /** Gate status */
  status: z.enum([
    "pass",
    "fail",
    "warn",
    "pending"
  ])
});
WorkspaceBase.extend({
  /** Component ID to get gates for */
  componentId: z.string()
});
WorkspaceBase.extend({
  /** Filter by actions */
  actions: z.array(z.enum([
    "refactor-now",
    "schedule",
    "defer",
    "monitor",
    "reject"
  ])).optional(),
  /** Filter by priorities */
  priorities: z.array(z.enum([
    "critical",
    "high",
    "medium",
    "low"
  ])).optional(),
  /** Minimum confidence threshold */
  minConfidence: z.number().min(0).max(1).optional()
});
var BootProfile = z.enum([
  "VIRGIN",
  "NEW_WORKSPACE",
  "COLD_RETURN",
  "WARM_RETURN",
  "HOT_RECONNECT"
]);
z.object({
  profile: BootProfile,
  workspaceId: z.string().optional(),
  lastSessionAge: z.number().nonnegative().optional(),
  integrityErrors: z.number().nonnegative().optional(),
  cleanShutdown: z.boolean().optional()
});
z.object({
  cleanShutdown: z.literal(true),
  timestamp: z.string().datetime()
});

// ../../packages/contracts/dist/local-service/schemas/session.js
z.object({
  /** Protocol version the client supports */
  protocolVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Client type identifying the connecting surface */
  clientType: ClientType.optional().default("unknown"),
  /** Client version (semantic versioning) */
  clientVersion: z.string().optional().default("0.0.0"),
  /** Client identification (legacy field, kept for backward compatibility) */
  clientInfo: z.object({
    /** Client name (e.g., "vscode-extension", "cli") */
    name: z.string().min(1).max(100),
    /** Client version (semantic versioning) */
    version: z.string()
  }).optional(),
  /** Client capabilities (optional) */
  capabilities: z.object({
    /** Client accepts server-sent notifications */
    notifications: z.boolean().default(true),
    /** Client can handle base64-encoded binary content */
    binaryContent: z.boolean().default(false)
  }).optional()
});
z.object({
  protocolVersion: z.string(),
  serverInfo: z.object({
    name: z.string(),
    version: z.string()
  }),
  capabilities: z.object({
    notifications: z.boolean().optional(),
    binaryContent: z.boolean().optional(),
    health: z.record(z.boolean()).optional()
  }).optional(),
  /** True when the daemon is starting for the first time (VIRGIN boot profile) */
  isFirstRun: z.boolean().default(false),
  /** Boot profile selected for this startup */
  bootProfile: BootProfile.optional()
});
z.object({
  /** Include detailed health information */
  verbose: z.boolean().optional()
});
z.object({
  /** Filter by workspace path (optional) */
  workspacePath: z.string().optional()
});
var SessionWorkspacePathBase = z.object({
  /** Absolute path to workspace root */
  workspacePath: z.string().min(1)
});
var SessionCreateParamsBase = SessionWorkspacePathBase.extend({
  /** Optional task description */
  task: z.string().min(1).optional(),
  /** Files involved in this task */
  files: z.array(z.string()).optional(),
  /** Keywords for context matching */
  keywords: z.array(z.string()).optional(),
  /** Files touched during session creation */
  touchedFiles: z.array(z.string()).optional()
});
SessionCreateParamsBase.extend({
  /** Additional session metadata (optional) */
  metadata: z.object({
    /** Editor name (e.g., "Visual Studio Code") */
    editorName: z.string().optional(),
    /** Editor version */
    editorVersion: z.string().optional()
  }).optional()
});
z.object({
  /** Session to end (defaults to current session if omitted) */
  sessionId: z.string().min(1).optional(),
  /** Reason for ending session */
  reason: z.enum([
    "user",
    "idle",
    "workspace_closed",
    "recovered-abandoned"
  ]).optional()
});
z.object({
  /** Filter by workspace path (optional) */
  workspacePath: z.string().optional(),
  /** Maximum number of sessions to return */
  limit: z.number().int().min(1).max(100).default(20),
  /** Pagination cursor (session ID to start after) */
  before: z.string().min(1).optional(),
  /** Include ended sessions in results */
  includeEnded: z.boolean().default(true)
});
SessionWorkspacePathBase.extend({
  /** Session to end (optional; defaults to current workspace session) */
  sessionId: z.string().min(1).optional(),
  /**
   * Free-text outcome description  -  what was accomplished, what remains, decisions made.
   * Becomes the opening context for the next session briefing.
   * Do NOT constrain to an enum: the MCP tool description promises free-text paragraphs.
   */
  outcome: z.string().min(1).max(2e3).optional(),
  /** Additional notes */
  notes: z.string().optional(),
  /** Create a snapshot on end */
  createSnapshot: z.boolean().optional(),
  /** Learning IDs to accept */
  acceptLearnings: z.array(z.number()).optional()
});
SessionWorkspacePathBase.extend({
  /** Session to inspect (optional; defaults to current workspace session) */
  sessionId: z.string().min(1).optional()
});
SessionWorkspacePathBase.extend({
  /** Session ID to review */
  sessionId: z.string().min(1).optional(),
  /** Files to review */
  files: z.array(z.string()).optional(),
  /** Include commit message suggestion */
  includeCommitMessage: z.boolean().optional(),
  /** Skip pattern checking */
  skipPatterns: z.boolean().optional()
});
SessionWorkspacePathBase.extend({
  /** Session to inspect (optional; defaults to current workspace session) */
  sessionId: z.string().min(1).optional(),
  /** Include diff in results */
  includeDiff: z.boolean().optional(),
  /** Filter to specific files */
  filterFiles: z.array(z.string()).optional(),
  /** Include AI attribution info */
  includeAIAttribution: z.boolean().default(true)
});
z.object({
  /** Filter by workspace path */
  workspacePath: z.string().min(1),
  /** Pagination cursor (session ID) */
  cursor: z.string().optional(),
  /** Max number of sessions to return (default 20) */
  limit: z.number().optional()
});
z.object({
  /** Pulse level based on file count thresholds */
  pulse: z.enum([
    "resting",
    "elevated",
    "racing",
    "critical"
  ]),
  /** Pressure: ratio of unprotected changes (0-100) */
  pressure: z.number().min(0).max(100),
  /** Trajectory based on pressure level */
  trajectory: z.enum([
    "stable",
    "increasing",
    "decreasing"
  ]),
  /** Whether a snapshot is recommended */
  snapshotRecommended: z.boolean(),
  /** Files modified during session */
  filesModified: z.number(),
  /** Snapshots created during session */
  snapshotsCreated: z.number(),
  /** Learnings captured during session */
  learningsCaptured: z.number()
});
SessionWorkspacePathBase.extend({
  /** Session to update (optional; defaults to current workspace session) */
  sessionId: z.string().min(1).optional(),
  /** New task description */
  task: z.string().min(1)
});
z.object({
  /** Absolute path to the workspace root */
  workspacePath: z.string().min(1),
  /** Session to update (optional; defaults to current workspace session) */
  sessionId: z.string().optional(),
  /** The AI tool detected */
  tool: z.enum([
    "cursor",
    "copilot",
    "claude-code",
    "windsurf",
    "continue",
    "other"
  ]),
  /** Tool version string if available */
  toolVersion: z.string().optional(),
  /** ISO 8601 timestamp of detection */
  detectedAt: z.string().datetime().optional()
});
z.object({
  /** Whether the daemon acknowledged and recorded the detection */
  acknowledged: z.boolean(),
  /** The session that was updated (null if no active session) */
  sessionId: z.string().nullable()
});
var TimingSpan = z.object({
  /** Name of the span (e.g., "ipc_receive", "service_dispatch", "decision") */
  name: z.string(),
  /** Start time in milliseconds relative to request start */
  startMs: z.number(),
  /** End time in milliseconds relative to request start */
  endMs: z.number()
});
var SavePathMetrics = z.object({
  /** Unique identifier for this request */
  requestId: z.string(),
  /** Total time from request receive to response send */
  totalMs: z.number(),
  /** Breakdown of time spent in each phase */
  spans: z.array(TimingSpan),
  /** Whether a snapshot was actually created */
  snapshotCreated: z.boolean()
});
var ShouldCreateReason = z.enum([
  "no_previous",
  "hash_changed",
  "time_threshold",
  "size_threshold",
  "no_change",
  "cooldown"
]);

// ../../packages/contracts/dist/local-service/schemas/snapshot.js
z.object({
  /** Absolute path to the file */
  filePath: z.string().min(1),
  /** File content to snapshot */
  content: z.string(),
  /** What triggered this snapshot */
  trigger: SnapshotTrigger,
  /** Additional snapshot metadata (optional) */
  metadata: z.object({
    /** AI tool that was active */
    aiToolDetected: z.string().optional(),
    /** Confidence score for AI detection (0-1) */
    aiConfidence: z.number().min(0).max(1).optional(),
    /** Risk level assessment */
    riskLevel: RiskLevel.optional(),
    /** Custom tags for organization */
    customTags: z.array(z.string()).optional()
  }).optional()
});
z.object({
  /** Absolute path to the file being saved */
  filePath: z.string().min(1),
  /** SHA-256 hash of the file content (optional, for deduplication) */
  contentHash: z.string().optional(),
  /** Last modification timestamp in milliseconds */
  lastModified: z.number().optional(),
  /** File size in bytes */
  byteSize: z.number().optional()
});
z.object({
  /** Whether a snapshot should be created */
  shouldCreate: z.boolean(),
  /** Reason for the decision */
  reason: ShouldCreateReason,
  /** Optional timing metrics for performance analysis */
  metrics: SavePathMetrics.optional()
});
z.object({
  /** Snapshot ID to retrieve */
  snapshotId: z.string().min(1),
  /** Include full content in response (expensive) */
  includeContent: z.boolean().default(false)
});
var SnapshotListParams = z.object({
  /** Filter by session ID (optional) */
  sessionId: z.string().min(1).optional(),
  /** Filter by file path (optional) */
  filePath: z.string().optional(),
  /** Filter by trigger types (optional) */
  trigger: z.array(SnapshotTrigger).optional(),
  /** Filter by created after timestamp (ISO 8601) */
  since: z.string().datetime().optional(),
  /** Filter by created before timestamp (ISO 8601) */
  until: z.string().datetime().optional(),
  /** Maximum number of snapshots to return */
  limit: z.number().int().min(1).max(200).default(50),
  /** Pagination cursor (opaque string) */
  cursor: z.string().optional(),
  /** Sort field */
  orderBy: z.enum([
    "createdAt",
    "filePath"
  ]).default("createdAt"),
  /** Sort direction */
  orderDir: z.enum([
    "asc",
    "desc"
  ]).default("desc")
});
z.object({
  /** Snapshot ID to restore */
  snapshotId: z.string().min(1),
  /** Target path (defaults to original path if omitted) */
  targetPath: z.string().optional(),
  /** Create backup snapshot before restoring */
  createBackup: z.boolean().default(true),
  /** Preview restore without writing (dry run) */
  dryRun: z.boolean().default(false)
});
z.object({
  /** Base snapshot ID for comparison */
  baseSnapshotId: z.string().min(1),
  /** Snapshot to compare against (defaults to current file if omitted) */
  compareSnapshotId: z.string().min(1).optional(),
  /** Number of context lines around changes */
  contextLines: z.number().int().min(0).max(10).default(3),
  /** Diff output format */
  format: z.enum([
    "unified",
    "split"
  ]).default("unified")
});
z.object({
  /** Specific snapshot IDs to delete (optional) */
  snapshotIds: z.array(z.string().min(1)).optional(),
  /** Delete all snapshots older than timestamp (ISO 8601) (optional) */
  olderThan: z.string().datetime().optional(),
  /** Delete all snapshots in session (optional) */
  sessionId: z.string().min(1).optional(),
  /** Preview deletion without removing (dry run) */
  dryRun: z.boolean().default(false)
});
WorkspaceBase.extend({
  /** Files to snapshot (relative paths) */
  files: z.array(z.string().min(1)).min(1),
  /** Reason for snapshot */
  reason: z.string().optional(),
  /** Snapshot trigger */
  trigger: z.enum([
    "manual",
    "mcp",
    "ai_assist",
    "session_end"
  ]).optional()
});
WorkspaceBase.extend({
  /** Delete snapshots older than N days */
  olderThanDays: z.number().int().positive().optional(),
  /** Keep protected snapshots */
  keepProtected: z.boolean().default(true)
});
WorkspaceBase.extend({
  /** Snapshot ID */
  snapshotId: z.string().min(1)
});
WorkspaceBase.extend({
  /** Snapshot ID */
  snapshotId: z.string().min(1),
  /** New name */
  newName: z.string().min(1)
});
SnapshotListParams.extend({
  /** Include risk assessment per snapshot */
  includeRisk: z.boolean().default(true),
  /** Include AI attribution per snapshot */
  includeAttribution: z.boolean().default(true),
  /** Group by session cluster */
  groupBySessions: z.boolean().default(false)
});
WorkspaceBase.extend({
  /** Optional auth token for platform sync */
  authToken: z.string().optional()
});
z.object({
  success: z.boolean(),
  queued: z.boolean()
});
z.object({
  running: z.boolean(),
  lastSync: z.number().nullable(),
  pendingItems: z.number().int().nonnegative(),
  status: z.string(),
  queueDepth: z.number().int().nonnegative()
});
z.object({
  triggered: z.boolean(),
  flushed: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  error: z.string().optional()
});
z.object({
  stopped: z.boolean()
});
z.object({
  started: z.boolean(),
  error: z.string().optional()
});
z.object({
  items: z.array(z.unknown()),
  total: z.number().int().nonnegative()
});
WorkspaceBase.extend({
  /** Task summary/description */
  task: z.string().min(1),
  /** Files involved in the task */
  files: z.array(z.string()).optional(),
  /** Keywords for context matching */
  keywords: z.array(z.string()).optional(),
  /** Task intent classification */
  intent: TaskIntent.optional()
});
WorkspaceBase.extend({
  /** Progress message */
  message: z.string().min(1),
  /** Files modified in this progress */
  filesModified: z.array(z.string()).optional(),
  /** Partial completion percentage */
  completionPercent: z.number().min(0).max(100).optional()
});
WorkspaceBase.extend({
  /**
   * Free-text outcome. Do NOT constrain to enum  -  snap_end promises free-text paragraphs.
   */
  outcome: z.string().min(1).max(2e3),
  /** Outcome notes */
  notes: z.string().optional(),
  /** Learnings captured during task */
  learnings: z.array(z.string()).optional()
});
z.object({
  recorded: z.boolean(),
  taskId: z.string().nullable()
});
z.object({
  ended: z.boolean(),
  taskId: z.string().nullable(),
  durationMs: z.number().nonnegative()
});
WorkspaceBase.extend({
  /** Single file */
  file: z.string().optional(),
  /** Multiple files */
  files: z.array(z.string()).optional(),
  /** Run tests */
  runTests: z.boolean().optional(),
  /** Skip TypeScript check */
  skipTypeScript: z.boolean().optional(),
  /** Skip tests */
  skipTests: z.boolean().optional(),
  /** Skip lint */
  skipLint: z.boolean().optional()
});
WorkspaceBase.extend({
  /** Code to validate */
  code: z.string(),
  /** File path */
  filePath: z.string().min(1)
});
WorkspaceBase.extend({
  /** Violation type */
  type: z.string().min(1),
  /** File where violation occurred */
  file: z.string().min(1),
  /** What happened */
  whatHappened: z.string().min(1),
  /** Why it happened */
  whyItHappened: z.string().min(1),
  /** How to prevent it */
  prevention: z.string().min(1)
});
z.object({
  /** Absolute path to check */
  path: z.string().min(1),
  /** Absolute workspace root to check against */
  workspace: z.string().min(1)
});
var ValidationCheckResult = z.object({
  passed: z.boolean(),
  errors: z.number().int().nonnegative()
});
z.object({
  passed: z.boolean(),
  checks: z.object({
    typescript: ValidationCheckResult,
    lint: ValidationCheckResult,
    tests: ValidationCheckResult
  }),
  fileCount: z.number().int().nonnegative(),
  duration: z.number().nonnegative()
});
z.object({
  passed: z.boolean(),
  confidence: z.number(),
  totalIssues: z.number().int().nonnegative(),
  recommendation: z.string(),
  focusPoints: z.array(z.unknown()),
  layers: z.array(z.unknown())
});
z.discriminatedUnion("reported", [
  z.object({
    reported: z.literal(true),
    type: z.string(),
    file: z.string(),
    status: z.unknown()
  }),
  z.object({
    reported: z.literal(false),
    error: z.string()
  })
]);
z.object({
  violations: z.array(z.unknown()),
  total: z.number().int().nonnegative()
});
WorkspaceBase.extend({
  /** Glob patterns to watch */
  patterns: z.array(z.string()).optional()
});
WorkspaceBase.extend({
  /** File that changed */
  file: z.string().min(1),
  /** Timestamp of change */
  timestamp: z.number().int().positive()
});
z.object({
  subscribed: z.literal(true),
  patterns: z.array(z.string())
});
z.object({
  unsubscribed: z.literal(true)
});
z.object({
  received: z.literal(true),
  file: z.string(),
  timestamp: z.number(),
  ignored: z.literal(true).optional()
});
WorkspaceBase.extend({
  /** Skip baseline computation (faster, less complete) */
  skipBaseline: z.boolean().optional(),
  /** Skip learning seeding */
  skipLearnings: z.boolean().optional(),
  /** Force re-seed learnings even if already seeded */
  forceSeedLearnings: z.boolean().optional()
});
WorkspaceBase.extend({
  /** Optional path to global knowledge DB (defaults to ~/.vreko/knowledge.db) */
  globalDbPath: z.string().optional()
});
WorkspaceBase.extend({
  /** Optional existing user-supplied ID to use as a fallback */
  fallbackUserId: z.string().optional(),
  /** Whether to persist the resolved ID back to .vreko/config.json */
  autoPersist: z.boolean().optional().default(true)
});
WorkspaceBase.extend({
  force: z.boolean().optional()
});
WorkspaceBase.extend({
  /** Target state to transition to */
  targetState: z.string().optional(),
  /** Reason for the transition */
  reason: z.string().optional()
});
z.object({
  seeded: z.number().int().nonnegative(),
  alreadyPresent: z.number().int().nonnegative()
});
z.object({
  workspaceId: z.string(),
  isTeamStable: z.boolean(),
  source: z.enum([
    "config",
    "git",
    "local",
    "user",
    "fallback",
    "path"
  ])
});
z.object({
  initialized: z.boolean()
});
z.object({
  state: z.string()
});
z.object({
  state: z.string(),
  changed: z.boolean()
});
z.object({
  shouldScan: z.boolean()
});

// ../../packages/contracts/dist/local-service/schemas/registry.js
var METHOD_NAME_MAP = {
  "daemon.ping": "daemon/ping",
  "daemon.status": "daemon/status",
  "daemon.shutdown": "daemon/shutdown",
  "daemon.reload": "daemon/reload",
  "session.end": "session/end-daemon",
  "session.status": "session/status",
  "session.review": "session/review",
  "session.listCeremonies": "session/list-ceremonies",
  "session.changes": "session/changes",
  "session.updateTask": "session/update-task",
  "snapshot.create": "snapshot/create",
  "snapshot.list": "snapshot/list",
  "snapshot.restore": "snapshot/restore",
  "snapshot.delete": "snapshot/delete",
  "snapshot.bulkDelete": "snapshot/bulk-delete",
  "snapshot.protect": "snapshot/protect",
  "snapshot.unprotect": "snapshot/unprotect",
  "snapshot.rename": "snapshot/rename",
  "learning.add": "learning/add",
  "learning.queue": "learning/queue",
  "learning.queueSync": "learning/queue-sync",
  "learning.queueSyncComplete": "learning/queue-sync-complete",
  "learning.search": "learning/search",
  "learning.list": "learning/list",
  "learning.prune": "learning/prune",
  "learning.evaluate": "learning/evaluate",
  "learning.updateSession": "learning/update-session",
  "learning.gc": "learning/gc",
  "sync.status": "sync/status-daemon",
  "sync.force": "sync/force",
  "sync.stop": "sync/stop",
  "sync.start": "sync/start",
  "sync.queue": "sync/queue",
  "context.get": "context/get",
  "context.validate": "context/validate",
  "context.check_patterns": "context/check-patterns",
  "validate.quick": "validate/quick",
  "validate.comprehensive": "validate/comprehensive",
  "violation.report": "violation/report",
  "violation.list": "violation/list",
  "protection.getLevel": "protection/get-level",
  "protection.setLevel": "protection/set-level",
  "protection.list": "protection/list-daemon",
  "watch.subscribe": "watch/subscribe",
  "watch.unsubscribe": "watch/unsubscribe",
  "watch.file_changed": "watch/file-changed",
  "snapshot.created": "mcp/snapshot-created",
  "file.modified": "mcp/file-modified",
  "intelligence.capture": "intelligence/capture",
  "intelligence.outcome": "intelligence/outcome",
  "intelligence.fragileFiles": "intelligence/fragile-files",
  "intelligence.recurrenceCandidates": "intelligence/recurrence-candidates",
  "intelligence.coChanges": "intelligence/co-changes",
  "intelligence.summary": "intelligence/summary",
  "intelligence.warnings": "intelligence/warnings",
  "intelligence.health": "intelligence/health",
  "intelligence.decisionOutcome": "intelligence/decision-outcome",
  "intelligence.preventionMetrics": "intelligence/prevention-metrics",
  "intelligence.accuracyMetrics": "intelligence/accuracy-metrics",
  "intelligence.snapshot": "intelligence/snapshot",
  "projectionsRulesFile.status": "projections/rules-file/status",
  "projectionsRulesFile.enable": "projections/rules-file/enable",
  "projectionsRulesFile.disable": "projections/rules-file/disable",
  "projectionsRulesFile.dryRun": "projections/rules-file/dry-run",
  "supervisor.register": "supervisor/register",
  "supervisor.heartbeat": "supervisor/heartbeat",
  "system.health": "system/health",
  "momentum.refresh": "momentum/refresh",
  "momentum.score": "momentum/score",
  "momentum.sync": "momentum/sync",
  "momentum.status": "momentum/status",
  "vitals.health": "vitals/health",
  "vitals.warnings": "vitals/warnings",
  "workspace.analyze": "workspace/analyze",
  "workspace.status": "workspace/status",
  "workspace.seedKnowledge": "workspace/seed-knowledge",
  "workspace.fingerprint": "workspace/fingerprint",
  "workspace.hydrate": "workspace/hydrate",
  "workspace.triggerWorkspaceJsonWrite": "workspace/trigger-workspace-json-write",
  "workspace.writeFromScanProfile": "workspace/write-from-scan-profile",
  "dora.recordSnapshot": "dora/record-snapshot",
  "dora.recordRecovery": "dora/record-recovery",
  "dora.getMetrics": "dora/get-metrics",
  "dora.getTrends": "dora/get-trends",
  "risk.assess": "risk/assess",
  // Phantom methods: dot-notation entries for documentation; no daemon handler exists yet
  "intelligence.getDecision": "intelligence/get-decision",
  "analytics.track": "analytics/track"
};
function normalizeMethodName(method) {
  return METHOD_NAME_MAP[method] ?? method;
}
__name(normalizeMethodName, "normalizeMethodName");
({
  "health/ping": z.object({}),
  // Sync namespace (original local-service style)
  "sync/status": z.object({}),
  // DORA metrics namespace (routed through daemon)
  "dora/record-snapshot": z.object({
    workspace: z.string(),
    event: z.object({
      snapshotId: z.string(),
      timestamp: z.number(),
      timeSinceLastChange: z.number(),
      isRecoveryTriggered: z.boolean(),
      trigger: z.enum([
        "manual",
        "auto",
        "ai-detected",
        "recovery"
      ])
    })
  }),
  "dora/record-recovery": z.object({
    workspace: z.string(),
    event: z.object({
      snapshotId: z.string(),
      requestTime: z.number(),
      completionTime: z.number(),
      success: z.boolean(),
      filesRestored: z.number(),
      failureReason: z.string().optional()
    })
  }),
  "dora/get-metrics": z.object({
    workspace: z.string()
  }),
  "dora/get-trends": z.object({
    workspace: z.string()
  }),
  // CTI: Codebase Topology Intelligence namespace (Phase A)
  "topology/scan": z.object({
    workspace: z.string(),
    force: z.boolean().optional().default(false)
  }),
  "topology/status": z.object({
    workspace: z.string()
  }),
  "topology/query": z.object({
    workspace: z.string(),
    task: z.string().min(1, "task description required for topology query"),
    max_files: z.number().int().positive().optional().default(15),
    include_deviations: z.boolean().optional().default(true),
    include_behavioral: z.boolean().optional().default(true)
  }),
  // Provenance namespace (AI attribution via daemon session data)
  "provenance/query": z.object({
    workspaceRoot: z.string(),
    files: z.array(z.string())
  }),
  // Knowledge namespace (CONTRACT-04: phantom method handler exists at protocol.ts line 1071)
  "knowledge/ingest": z.object({
    workspace: z.string(),
    text: z.string(),
    source: z.string(),
    metadata: z.record(z.unknown()).optional()
  })});

// ../../packages/contracts/dist/protocol/METHOD_REGISTRY.js
z.object({
  filePath: z.string(),
  content: z.string().optional(),
  trigger: z.enum([
    "save",
    "manual",
    "auto"
  ])
});
z.object({
  snapshotId: z.string(),
  filePath: z.string().optional()
});
z.object({
  filePath: z.string().optional(),
  limit: z.number().optional()
});
z.object({
  snapshotId: z.string(),
  permanent: z.boolean().optional()
});
z.object({
  snapshotIds: z.array(z.string())
});
z.object({
  snapshotId: z.string()
});
z.object({
  snapshotId: z.string()
});
z.object({
  snapshotId: z.string(),
  newName: z.string()
});
z.object({
  filePaths: z.array(z.string()),
  includeDependencies: z.boolean().optional()
});
z.object({
  filePaths: z.array(z.string())
});
z.object({
  workspace: z.string()
});
z.object({
  includeMetrics: z.boolean().optional()
});
z.object({
  port: z.number().optional(),
  configPath: z.string().optional()
});
z.object({
  force: z.boolean().optional()
});
z.object({
  clientId: z.string(),
  publicKey: z.string()
});
z.object({
  challengeId: z.string(),
  signature: z.string()
});
z.object({
  workspace: z.string(),
  olderThanDays: z.number().optional()
});
z.object({
  workspace: z.string(),
  operation: z.enum([
    "all",
    "stale",
    "orphaned"
  ]).optional(),
  dryRun: z.boolean().optional()
});
z.object({
  workspace: z.string(),
  limit: z.number().optional(),
  type: z.string().optional()
});
z.object({
  workspace: z.string(),
  keywords: z.array(z.string()),
  limit: z.number().optional()
});
z.object({
  workspace: z.string(),
  learning: z.record(z.unknown())
});
z.object({
  workspace: z.string()
});
z.object({
  workspace: z.string(),
  type: z.string(),
  file: z.string(),
  whatHappened: z.string(),
  whyItHappened: z.string(),
  prevention: z.string()
});
z.object({
  config: z.record(z.unknown()).optional()
});
z.object({
  includeUptime: z.boolean().optional()
});
z.object({});
z.object({
  force: z.boolean().optional()
});
z.object({
  sessionId: z.string(),
  since: z.string().optional()
});
z.object({
  filePaths: z.array(z.string()),
  checks: z.array(z.string()).optional()
});
z.object({
  filePaths: z.array(z.string()),
  checks: z.array(z.string()).optional()
});
z.object({
  filePath: z.string(),
  eventType: z.enum([
    "create",
    "modify",
    "delete"
  ]),
  content: z.string().optional()
});
z.object({
  workspace: z.string(),
  filePaths: z.array(z.string())
});
z.object({
  workspace: z.string(),
  subscriptionId: z.string()
});
z.object({
  workspace: z.string(),
  path: z.string(),
  linesChanged: z.number().optional(),
  aiAttributed: z.boolean().optional(),
  aiTool: z.string().optional()
});
z.object({
  workspace: z.string(),
  path: z.string(),
  linesChanged: z.number().optional(),
  aiAttributed: z.boolean().optional(),
  aiTool: z.string().optional()
});
z.object({
  workspace: z.string()
});
z.object({
  cacheKey: z.string().optional()
});
z.object({
  workspace: z.string(),
  level: z.enum([
    "none",
    "read-only",
    "full"
  ])
});
z.object({});
z.object({
  workspace: z.string()
});
z.object({
  workspacePath: z.string(),
  task: z.string().optional(),
  files: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  touchedFiles: z.array(z.string()).optional()
});
z.object({
  sessionId: z.string().optional(),
  reason: z.enum([
    "user",
    "idle",
    "workspace_closed",
    "recovered-abandoned"
  ]).optional()
});
z.object({
  workspacePath: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  before: z.string().optional(),
  includeEnded: z.boolean().default(true)
});
z.object({
  workspacePath: z.string()
});
z.object({
  workspacePath: z.string(),
  sessionId: z.string().optional(),
  files: z.array(z.string()).optional(),
  includeCommitMessage: z.boolean().optional(),
  skipPatterns: z.boolean().optional()
});
z.object({
  snapshotId: z.string(),
  includeContent: z.boolean().default(false)
});
z.object({
  baseSnapshotId: z.string(),
  compareSnapshotId: z.string().optional(),
  contextLines: z.number().int().min(0).max(10).default(3),
  format: z.enum([
    "unified",
    "split"
  ]).default("unified")
});
z.object({
  filePath: z.string().min(1),
  content: z.string().optional(),
  context: z.object({
    recentChanges: z.number().int().nonnegative().optional(),
    timeSinceLastSave: z.number().int().nonnegative().optional(),
    aiToolActive: z.boolean().optional()
  }).optional()
});
z.object({
  filePath: z.string().min(1),
  content: z.string(),
  previousContent: z.string().optional(),
  metadata: z.object({
    editorInfo: z.string().optional(),
    timestamp: z.number().int().positive().optional()
  }).optional()
});
z.object({
  workspacePath: z.string().optional()
});
z.object({
  sessionId: z.string()
});
z.object({
  sessionId: z.string()
});

export { JsonRpcMessageSchema, LearningApiSchema, LearningType, ProtocolErrorCode, normalizeMethodName };
//# sourceMappingURL=chunk-AHZGBIQG.js.map
//# sourceMappingURL=chunk-AHZGBIQG.js.map