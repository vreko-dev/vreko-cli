#!/usr/bin/env node
import { LearningApiSchema } from './chunk-VNFWNWEY.js';
import { __name } from './chunk-EWOJGXRX.js';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import * as os from 'os';
import { homedir } from 'os';
import * as path from 'path';
import { join } from 'path';
import * as net from 'net';
import { z } from 'zod';
import pRetry from 'p-retry';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var DaemonHealthState = z.enum([
  "healthy",
  "degraded",
  "unhealthy",
  "unknown"
]);
var SubsystemName = z.enum([
  "ipc",
  "mcp",
  "supervisor",
  "fileWatcher",
  "sessions",
  "sync"
]);
var SubsystemStatus = z.object({
  /** Current health state of this subsystem */
  state: DaemonHealthState,
  /** Human-readable reason for current state (omitted when healthy) */
  reason: z.string().optional(),
  /** ISO8601 timestamp of last state transition */
  lastTransition: z.string().datetime().nullable()
});
var DaemonHealthReport = z.object({
  /** Aggregate health state (worst of all subsystems, with hysteresis) */
  state: DaemonHealthState,
  /** Daemon uptime in milliseconds */
  uptime: z.number().nonnegative(),
  /** Per-subsystem health breakdown */
  subsystems: z.record(SubsystemName, SubsystemStatus),
  /** ISO8601 timestamp of last aggregate state transition */
  lastTransition: z.string().datetime().nullable(),
  /** Human-readable reason for degraded/unhealthy state */
  degradedReason: z.string().optional(),
  /** ISO8601 timestamp of this report */
  timestamp: z.string().datetime()
});
z.object({
  /** Previous aggregate state */
  previousState: DaemonHealthState,
  /** New aggregate state */
  currentState: DaemonHealthState,
  /** Human-readable reason for the transition */
  reason: z.string(),
  /** Unix timestamp (ms) when the transition occurred */
  timestamp: z.number().nonnegative(),
  /** Full health report at time of transition */
  report: DaemonHealthReport
});
DaemonHealthReport.extend({
  // Daemon resource state
  memoryMb: z.number().nonnegative(),
  memoryLimitMb: z.number().positive(),
  ipcQueueDepth: z.number().nonnegative(),
  activeRequests: z.number().nonnegative(),
  // Lifecycle state
  lastCleanShutdown: z.boolean(),
  supervisorMode: z.enum([
    "launchd",
    "systemd",
    "extension",
    "none"
  ]),
  // Component breakdown
  components: z.object({
    ipcServer: z.enum([
      "ok",
      "degraded"
    ]),
    fileWatcher: z.enum([
      "ok",
      "degraded",
      "unavailable"
    ]),
    syncService: z.enum([
      "ok",
      "degraded",
      "disabled"
    ]),
    intelligenceService: z.enum([
      "ok",
      "degraded"
    ])
  })
});
z.object({
  status: z.literal("ok")
});
var AITool = z.enum([
  "cursor",
  "claude-code",
  "copilot",
  "windsurf",
  "cline",
  "universal"
]);
var FileAccessRule = z.object({
  pattern: z.string(),
  permission: z.enum([
    "allow",
    "deny",
    "caution"
  ]),
  source: z.string()
});
z.object({
  // Identity
  tool: AITool,
  filePath: z.string(),
  fileName: z.string(),
  lastModifiedAt: z.number(),
  rawContent: z.string(),
  // Extracted intelligence
  protectedFiles: z.array(z.string()),
  focusedDomains: z.array(z.string()),
  explicitInstructions: z.array(z.string()),
  toolPermissions: z.array(z.string()),
  workflowConstraints: z.array(z.string()),
  fileAccessRules: z.array(FileAccessRule),
  behaviorRules: z.array(z.string()),
  // Computed
  vrekoInstructionsPresent: z.boolean(),
  vrekoSectionHash: z.string().nullable()
});
z.object({
  id: z.string(),
  conflictType: z.enum([
    "file-access",
    "workflow",
    "behavior",
    "scope-overlap",
    "coverage-gap"
  ]),
  tools: z.array(AITool),
  files: z.array(z.string()),
  description: z.string(),
  severity: z.enum([
    "info",
    "warn",
    "error"
  ]),
  recommendation: z.string(),
  detectedAt: z.number()
});
z.object({
  fileName: z.string().optional(),
  pattern: z.string().optional(),
  tool: AITool,
  priority: z.number().default(0)
});
z.object({
  filePath: z.string(),
  tool: AITool,
  exists: z.boolean(),
  lastModified: z.number().nullable()
});
var SessionContextResult = z.object({
  /** Fragile files within scope of current task */
  fragileFilesInScope: z.array(z.object({
    path: z.string(),
    fragility: z.number(),
    reason: z.string().optional()
  })),
  /** Co-change patterns within scope */
  coChangePatternsInScope: z.array(z.object({
    source: z.string(),
    target: z.string(),
    confidence: z.number()
  })),
  /** Warning about concurrent sessions */
  concurrentSessionWarning: z.object({
    sessionId: z.string(),
    workspacePath: z.string(),
    touchedFiles: z.array(z.string())
  }).nullable()
});
z.object({
  /** Session ID (primary identifier) */
  id: z.string(),
  /** Task ID (alias for extension compatibility) */
  taskId: z.string().optional(),
  /** Workspace path */
  workspacePath: z.string(),
  /** Session start timestamp (ISO string) */
  startedAt: z.string(),
  /** Current session state */
  state: z.enum([
    "active",
    "ended"
  ]),
  /** Session metadata */
  metadata: z.object({
    task: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    aiToolsDetected: z.array(z.string()).optional(),
    highestRiskLevel: z.enum([
      "low",
      "medium",
      "high"
    ]).optional()
  }),
  /** Files touched in this session */
  touchedFiles: z.array(z.string()).optional(),
  /** Baseline context enrichment */
  context: SessionContextResult.nullable(),
  /** Learnings loaded for this session (from enrichment) */
  learnings: z.array(z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    trigger: z.string(),
    action: z.string(),
    relevanceScore: z.number().optional()
  })).optional()
});
z.object({
  /** Whether the session was ended successfully */
  success: z.boolean(),
  /** Session ID that was ended */
  sessionId: z.string().optional(),
  /** Coherence score (0-1) */
  coherenceScore: z.number().min(0).max(1).optional(),
  /** Session duration in milliseconds */
  duration: z.number().optional(),
  /** Number of files modified */
  filesModified: z.number().optional(),
  /** Number of learnings captured */
  learningsCaptured: z.number().optional(),
  /** Number of snapshots created */
  snapshotsCreated: z.number().optional()
});
var SessionSummarySchema = z.object({
  sessionId: z.string(),
  workspace: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  duration: z.number(),
  filesModified: z.number(),
  snapshotsCreated: z.number(),
  restoresTriggered: z.number(),
  aiEditsDetected: z.number(),
  protectionLevel: z.enum([
    "standard",
    "heightened",
    "maximum"
  ])
});
var SessionPatternSchema = z.object({
  type: z.enum([
    "co-change",
    "fragile-file",
    "temporal",
    "behavioral"
  ]),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  filesInvolved: z.array(z.string()),
  promotedToHot: z.boolean()
});
var SessionLearningsSchema = z.object({
  patterns: z.array(SessionPatternSchema),
  totalNew: z.number(),
  totalPromoted: z.number(),
  totalPruned: z.number()
});
var PitfallWarningSchema = z.object({
  trigger: z.string(),
  risk: z.string(),
  outcome: z.enum([
    "heeded",
    "dismissed",
    "auto-resolved"
  ]),
  filesInvolved: z.array(z.string()),
  timestamp: z.number()
});
var PitfallsAvoidedSchema = z.object({
  warnings: z.array(PitfallWarningSchema),
  estimatedTimeSaved: z.number()
});
var IntelligenceMetricsSchema = z.object({
  tokenSavingsEstimate: z.number(),
  coherenceScore: z.number().min(0).max(100),
  contextReusageRate: z.number().min(0).max(1),
  intelligenceEventsTotal: z.number()
});
var TimelineEventSchema = z.object({
  timestamp: z.number(),
  type: z.enum([
    "session-start",
    "session-end",
    "snapshot-created",
    "snapshot-restored",
    "learning-added",
    "learning-promoted",
    "warning-fired",
    "ai-edit-detected",
    "protection-changed",
    "fragile-detected",
    "risk-spike"
  ]),
  summary: z.string(),
  detail: z.string().optional(),
  filesInvolved: z.array(z.string()).optional(),
  severity: z.enum([
    "info",
    "warning",
    "critical"
  ]).optional()
});
var CeremonyPayloadSchema = z.object({
  summary: SessionSummarySchema,
  learnings: SessionLearningsSchema,
  pitfalls: PitfallsAvoidedSchema,
  metrics: IntelligenceMetricsSchema,
  timeline: z.array(TimelineEventSchema)
}).superRefine((payload, ctx) => {
  const sessionStart = payload.summary.startedAt;
  const sessionEnd = payload.summary.endedAt ?? Date.now();
  for (const event of payload.timeline) {
    if (event.timestamp < sessionStart) {
      ctx.addIssue({
        code: "custom",
        message: `Timeline event ${event.type} has timestamp before session start`,
        path: [
          "timeline"
        ]
      });
    }
    if (event.timestamp > sessionEnd) {
      ctx.addIssue({
        code: "custom",
        message: `Timeline event ${event.type} has timestamp after session end`,
        path: [
          "timeline"
        ]
      });
    }
  }
  const patternCount = payload.learnings.patterns.length;
  const totalLearnings = payload.learnings.totalNew + payload.learnings.totalPromoted;
  if (patternCount > 0 && totalLearnings === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Learnings has patterns but totalNew + totalPromoted is 0",
      path: [
        "learnings"
      ]
    });
  }
  if (payload.metrics.coherenceScore > 100) {
    ctx.addIssue({
      code: "custom",
      message: "coherenceScore must be between 0-100",
      path: [
        "metrics",
        "coherenceScore"
      ]
    });
  }
  if (payload.summary.filesModified > 10 && payload.metrics.intelligenceEventsTotal < 5) {
    ctx.addIssue({
      code: "custom",
      message: "High file modification count with low intelligence events - possible under-instrumentation",
      path: [
        "metrics"
      ]
    });
  }
});
var CoherenceScoreSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("numeric"),
    value: z.number().min(0).max(1)
  }),
  z.object({
    type: z.literal("categorical"),
    level: z.enum([
      "high",
      "medium",
      "low",
      "scattered"
    ]),
    /** Optional numeric approximation for analytics */
    approximateValue: z.number().min(0).max(1).optional()
  })
]);
z.object({
  /** Session ID */
  sessionId: z.string(),
  /** Files modified during session */
  filesModified: z.number(),
  /** Snapshots created during session */
  snapshotsCreated: z.number(),
  /** Learnings captured during session */
  learningsCaptured: z.number(),
  /** Pitfalls avoided (proactive warnings heeded) */
  pitfallsAvoided: z.number().optional(),
  /** Estimated token savings */
  tokensSaved: z.number().optional(),
  /** Coherence score - discriminated union for type-safe handling */
  coherenceScore: CoherenceScoreSchema.optional(),
  /** Key insights from the session */
  insights: z.array(z.string()).optional(),
  /** Items to carry forward to next session */
  carryForward: z.array(z.string()).optional(),
  /** Commit message suggestion */
  commitMessage: z.string().optional(),
  /** Full ceremony payload (March 18 spec) */
  ceremony: CeremonyPayloadSchema.optional(),
  /** Top learnings from ceremony */
  topLearnings: z.array(z.object({
    content: z.string(),
    captureMethod: z.string(),
    confidence: z.number()
  })).optional(),
  /** Duration in ms */
  duration: z.number().optional()
});
z.object({
  /** Whether there's an active session */
  active: z.boolean(),
  /** Current session ID if active */
  id: z.string().optional(),
  /** Task ID if active */
  taskId: z.string().optional(),
  /** Task description */
  task: z.string().optional(),
  /** Session start timestamp */
  startedAt: z.string().optional(),
  /** Files modified count */
  filesModified: z.number().optional(),
  /** Snapshot count */
  snapshotCount: z.number().optional()
});
z.object({
  /** Whether the learning was added successfully */
  success: z.boolean(),
  /** Learning ID */
  id: z.string(),
  /** Tier assigned (hot, warm, cold) */
  tier: z.enum([
    "hot",
    "warm",
    "cold"
  ]),
  /** Whether this is a new learning vs update */
  isNew: z.boolean().optional()
});
var LearningSearchEntry = z.object({
  /** Learning ID */
  id: z.string(),
  /** Learning type */
  type: z.string().optional(),
  /** Trigger condition */
  trigger: z.string(),
  /** Action to take */
  action: z.string(),
  /** Relevance score (0-1) */
  relevanceScore: z.number().min(0).max(1).optional(),
  /** Source of the learning */
  source: z.string().optional(),
  /** Tier of the learning */
  tier: z.enum([
    "hot",
    "warm",
    "cold"
  ]).optional()
});
z.object({
  /** Search results */
  results: z.array(LearningSearchEntry),
  /** Total matching learnings */
  total: z.number().optional(),
  /** Query that was searched */
  query: z.string().optional()
});
var FragileFileEntry = z.object({
  /** File path */
  path: z.string(),
  /** Fragility score (0-1) */
  fragility: z.number().min(0).max(1),
  /** Reason for fragility */
  reason: z.string().optional()
});
var CoChangeEntry = z.object({
  /** Source file */
  source: z.string(),
  /** Target file (changes when source changes) */
  target: z.string(),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1)
});
z.object({
  /** Elevated, deduplicated learnings (LearningApi format) */
  learnings: z.array(LearningApiSchema),
  /** Fragile files in scope */
  fragileFiles: z.array(FragileFileEntry).optional(),
  /** Co-change patterns */
  coChanges: z.array(CoChangeEntry).optional(),
  /** Files that were queried */
  files: z.array(z.string()),
  /** Compiled wire format context (for LLM consumption) */
  compiled: z.string(),
  /** Token estimate for compiled context */
  compiledTokens: z.number(),
  /** Estimated tokens saved vs natural language */
  tokensSaved: z.number(),
  /** Metadata about what's included */
  metadata: z.object({
    /** Number of learnings included */
    learningCount: z.number().optional(),
    /** Number of fragile files included */
    fragileFileCount: z.number().optional(),
    /** Number of co-change patterns included */
    coChangePatternCount: z.number().optional(),
    /** Estimated token count */
    tokenCount: z.number().optional(),
    /** Whether context was loaded from cache */
    fromCache: z.boolean().optional()
  }).optional()
});
z.object({
  /** Composite risk score */
  score: z.number(),
  /** Action recommendation */
  action: z.enum([
    "PROCEED",
    "PROCEED_WITH_SNAPSHOT",
    "WARN",
    "BLOCK"
  ]),
  /** Risk level classification */
  level: z.enum([
    "L",
    "M",
    "H"
  ]),
  /** Contributing factors from all pillars */
  factors: z.array(z.object({
    source: z.string(),
    score: z.number(),
    description: z.string()
  })),
  /** Git risk pillar data */
  gitRisk: z.object({
    multiplier: z.number(),
    uncommittedChanges: z.boolean().optional(),
    detachedHead: z.boolean().optional(),
    onMainBranch: z.boolean().optional()
  }).optional(),
  /** Fatigue pillar data */
  fatigue: z.object({
    level: z.enum([
      "rested",
      "normal",
      "elevated",
      "fatigued"
    ]),
    riskBoost: z.number()
  }).optional(),
  /** Rollback warning from pillar 2 */
  rollbackWarning: z.object({
    confidence: z.number(),
    message: z.string(),
    riskBoost: z.number()
  }).optional(),
  /** Poisoning detection from pillar 5 */
  poisoning: z.object({
    detected: z.boolean(),
    files: z.array(z.string()).optional(),
    riskBoost: z.number().optional()
  }).optional(),
  /** Per-file risk breakdown */
  fileRisks: z.record(z.string(), z.object({
    fragility: z.number(),
    rollbackCount: z.number().optional(),
    reason: z.string().optional()
  })).optional(),
  /** Co-change alerts */
  coChanges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    confidence: z.number()
  })).optional()
});
z.string().describe("LLM hint for vreko_pulse  -  deterministic advisory prose, \u2264400 word-tokens");
z.object({
  /** Array of fragile file entries in contract shape */
  files: z.array(FragileFileEntry),
  /** Total count of files returned */
  total: z.number().int().nonnegative()
});
z.object({
  items: z.array(z.object({
    fileA: z.string(),
    fileB: z.string(),
    frequency: z.number(),
    occurrences: z.number(),
    relationship: z.string(),
    reason: z.string(),
    lastObserved: z.string()
  })),
  total: z.number().int().nonnegative()
});
z.object({
  learningsCount: z.number().int().nonnegative(),
  patternsCount: z.number().int().nonnegative(),
  fragileFilesCount: z.number().int().nonnegative(),
  coChangePatternsCount: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  linesAnalyzed: z.number().int().nonnegative(),
  totalSnapshots: z.number().int().nonnegative(),
  totalRestores: z.number().int().nonnegative(),
  snapshotsToday: z.number().int().nonnegative(),
  snapshotsThisWeek: z.number().int().nonnegative(),
  linesAnalyzedToday: z.number().int().nonnegative(),
  restoresThisWeek: z.number().int().nonnegative(),
  patternsThisWeek: z.number().int().nonnegative(),
  healthScore: z.number(),
  healthTrajectory: z.string(),
  risksPrevented: z.number().int().nonnegative(),
  risksPreventedContext: z.string().optional(),
  accuracy: z.number(),
  coherencePercent: z.number().int(),
  preventedToRecoveredRatio: z.number()
});
z.object({
  warnings: z.array(z.object({
    code: z.string(),
    level: z.enum([
      "info",
      "warning",
      "error"
    ]),
    message: z.string(),
    file: z.string().optional(),
    suggestion: z.string().optional()
  })),
  total: z.number().int().nonnegative()
});
z.object({
  score: z.number().int().min(0).max(100),
  status: z.enum([
    "healthy",
    "warning",
    "critical"
  ]),
  accuracy: z.number(),
  metrics: z.object({
    vitals: z.object({
      trajectory: z.string(),
      pressure: z.number(),
      pulse: z.string()
    }).nullable(),
    session: z.object({
      duration: z.number(),
      totalToolCalls: z.number().int(),
      filesTouched: z.number().int()
    }).nullable()
  })
});
z.object({
  candidates: z.array(z.object({
    file: z.string(),
    window: z.string(),
    confidence: z.number(),
    surfaceable: z.boolean(),
    wording: z.string(),
    coChangePartners: z.array(z.string()),
    kind: z.string()
  })),
  total: z.number().int().nonnegative()
});
z.union([
  z.object({
    captured: z.literal(true),
    domain: z.string(),
    type: z.string(),
    outcome: z.string().optional(),
    risksPreventedContext: z.string().optional()
  }),
  z.object({
    captured: z.literal(false),
    error: z.string()
  })
]);
z.object({
  recorded: z.boolean(),
  patternId: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  revertedWithin5Min: z.boolean().optional(),
  accuracyImpact: z.string().optional()
});
z.object({
  patterns: z.array(z.unknown()),
  total: z.number().int().nonnegative()
});
z.object({
  success: z.boolean()
});
z.object({
  sessions: z.array(z.unknown()),
  hasMore: z.boolean()
});
z.unknown();
z.object({
  sessions: z.array(z.unknown()),
  hasMore: z.boolean().optional(),
  nextCursor: z.string().optional()
});
z.unknown();
z.object({
  updated: z.boolean()
});
z.unknown();
z.unknown();
z.unknown();
z.unknown();
z.unknown();
z.object({
  success: z.boolean(),
  snapshotId: z.string().optional()
});
z.unknown();
z.object({
  deletedCount: z.number().int().nonnegative().optional(),
  success: z.boolean().optional()
}).passthrough();
z.object({
  protected: z.boolean().optional(),
  success: z.boolean().optional()
}).passthrough();
z.object({
  protected: z.boolean().optional(),
  success: z.boolean().optional()
}).passthrough();
z.object({
  renamed: z.boolean().optional(),
  success: z.boolean().optional()
}).passthrough();
z.object({
  success: z.literal(true),
  message: z.string()
});
z.object({
  enabled: z.boolean(),
  writableFiles: z.array(z.unknown()),
  lastWrite: z.null(),
  lastHash: z.null(),
  workspacePath: z.string()
});
z.object({
  ok: z.literal(true),
  workspacePath: z.string(),
  action: z.string()
});
z.object({
  /** Absolute path to the file on disk. */
  path: z.string(),
  /** Serialized artifact content (markdown/text). */
  content: z.string(),
  /** SHA-256 of `content`  -  used for skip-if-unchanged checks. */
  hash: z.string(),
  /** Milliseconds since epoch when the artifact was generated. */
  generatedAt: z.number(),
  /**
   * Who owns this file. `vreko` = daemon may overwrite; `user` = hands off.
   * DocsEmitter only writes files it owns; any path a user has taken over
   * (tracked via a separate manifest in future phases) must be skipped.
   */
  owner: z.enum([
    "vreko",
    "user"
  ])
});
z.object({
  daemon: z.object({
    memoryLimitMb: z.number().positive().default(512),
    idleTimeoutMinutes: z.number().positive().default(15),
    maxWorkspaces: z.number().positive().default(50),
    maxClients: z.number().positive().int().default(10),
    drainWindowMs: z.number().positive().default(15e3),
    logLevel: z.enum([
      "debug",
      "info",
      "warn",
      "error"
    ]).default("info"),
    crashLoopThreshold: z.number().positive().int().default(3),
    updateBehavior: z.enum([
      "auto",
      "prompt",
      "never"
    ]).default("auto")
  }).default({}),
  supervisor: z.object({
    mode: z.enum([
      "auto",
      "extension",
      "os"
    ]).default("auto")
  }).default({})
});
var IssueSchema = z.object({
  id: z.string(),
  severity: z.enum([
    "warning",
    "error"
  ]),
  description: z.string(),
  fix: z.string().optional()
});
var StartStatusOutput = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    serviceRunning: z.boolean(),
    bootProfile: z.string(),
    tui: z.boolean()
  }),
  z.object({
    ok: z.literal(false),
    error: z.string()
  })
]);
var WorkspaceStatusOutput = z.object({
  initialized: z.boolean(),
  loggedIn: z.boolean(),
  user: z.object({
    email: z.string(),
    tier: z.enum([
      "free",
      "pro"
    ])
  }).optional(),
  workspace: z.object({
    id: z.string().optional(),
    tier: z.string().optional(),
    syncEnabled: z.boolean().optional()
  }).optional(),
  vitals: z.object({
    framework: z.string().optional(),
    packageManager: z.string().optional(),
    typescript: z.boolean().optional(),
    typescriptStrict: z.boolean().optional()
  }).optional(),
  session: z.object({
    id: z.string(),
    task: z.string().optional(),
    startedAt: z.string(),
    snapshotCount: z.number()
  }).optional(),
  protection: z.object({
    count: z.number(),
    patterns: z.array(z.string())
  }),
  violations: z.object({
    total: z.number(),
    recent: z.number()
  }),
  snapshots: z.object({
    count: z.number(),
    totalSize: z.string()
  }),
  intelligence: z.object({
    overallRisk: z.string(),
    confidence: z.number(),
    topDriver: z.string(),
    snapshotFrequency: z.string()
  }).optional(),
  topologyWarning: z.object({
    fileCap: z.number(),
    reachedAt: z.string(),
    workspacePath: z.string()
  }).optional(),
  issues: z.array(IssueSchema)
});
var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
var JsonRpcClientError = class extends Error {
  static {
    __name(this, "JsonRpcClientError");
  }
  static {
    __name2(this, "JsonRpcClientError");
  }
  code;
  data;
  constructor(message, code, data) {
    super(message);
    this.name = "JsonRpcClientError";
    this.code = code;
    this.data = data;
  }
};
var ConnectionTimeoutError = class extends Error {
  static {
    __name(this, "ConnectionTimeoutError");
  }
  static {
    __name2(this, "ConnectionTimeoutError");
  }
  constructor(message = "Connection timeout") {
    super(message);
    this.name = "ConnectionTimeoutError";
  }
};
var RequestTimeoutError = class extends Error {
  static {
    __name(this, "RequestTimeoutError");
  }
  static {
    __name2(this, "RequestTimeoutError");
  }
  requestId;
  constructor(message = "Request timeout", requestId) {
    super(message), this.requestId = requestId;
    this.name = "RequestTimeoutError";
  }
};
function getDefaultSocketPath() {
  const platform2 = os.platform();
  if (platform2 === "win32") {
    return "\\\\.\\pipe\\vreko-service";
  }
  const homeDir = os.homedir();
  const vrekoPath = path.join(homeDir, ".vreko", "service.sock");
  if (existsSync(vrekoPath)) {
    return vrekoPath;
  }
  return path.join(homeDir, ".vreko", "service.sock");
}
__name(getDefaultSocketPath, "getDefaultSocketPath");
__name2(getDefaultSocketPath, "getDefaultSocketPath");
var IpcConnection = class {
  static {
    __name(this, "IpcConnection");
  }
  static {
    __name2(this, "IpcConnection");
  }
  socket = null;
  buffer = "";
  listeners = {};
  socketPath;
  timeout;
  constructor(options = {}) {
    this.socketPath = options.socketPath ?? getDefaultSocketPath();
    this.timeout = options.timeout ?? 5e3;
  }
  /**
  * Connect to the IPC socket
  *
  * Fixed race conditions:
  * - Uses settled flag to prevent timeout firing after successful connect
  * - Destroys socket on error to prevent orphaned handles
  * - Cleanup function ensures timeout is always cleared
  */
  async connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({
        path: this.socketPath
      });
      let timeoutId = null;
      let settled = false;
      const cleanup = /* @__PURE__ */ __name2(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }, "cleanup");
      if (this.timeout > 0) {
        timeoutId = setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          socket.destroy();
          reject(new ConnectionTimeoutError(`Connection timeout after ${this.timeout}ms`));
        }, this.timeout);
        timeoutId.unref();
      }
      socket.once("connect", () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        this.socket = socket;
        this.setupSocketHandlers();
        resolve();
      });
      socket.once("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        socket.destroy();
        reject(error);
      });
    });
  }
  /**
  * Set up socket event handlers
  *
  * IMPORTANT: Removes old listeners before adding new ones to prevent
  * memory leak on reconnect. Without this, each reconnect would add
  * duplicate handlers that never get garbage collected.
  */
  setupSocketHandlers() {
    if (!this.socket) {
      return;
    }
    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("close");
    this.socket.removeAllListeners("error");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      this.processBuffer();
    });
    this.socket.on("close", (hadError) => {
      const error = hadError ? new Error("Socket closed with error") : void 0;
      this.emit("close", error);
      this.socket = null;
      this.buffer = "";
    });
    this.socket.on("error", (error) => {
      this.emit("error", error);
      this.buffer = "";
    });
  }
  /**
  * Process incoming data buffer (newline-delimited JSON)
  */
  processBuffer() {
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.trim().length === 0) {
        continue;
      }
      try {
        const message = JSON.parse(line);
        this.emit("message", message);
      } catch (error) {
        this.emit("error", new Error(`Failed to parse JSON-RPC message: ${error.message}`));
      }
    }
  }
  /**
  * Send a JSON-RPC request
  *
  * TOCTOU Fix: Captures socket reference at start to prevent race condition
  * where socket becomes null between the check and the write.
  */
  async send(request) {
    const socket = this.socket;
    if (!socket || socket.destroyed) {
      throw new Error("Socket not connected");
    }
    return new Promise((resolve, reject) => {
      const data = `${JSON.stringify(request)}
`;
      socket.write(data, "utf8", (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  /**
  * Close the connection
  *
  * Proper cleanup:
  * - Removes all listeners to prevent memory leaks
  * - Calls end() for graceful close
  * - Calls destroy() to ensure immediate cleanup
  * - Resets buffer to prevent stale data on reconnect
  */
  close() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
    }
    this.buffer = "";
  }
  /**
  * Check if connected
  */
  isConnected() {
    return this.socket !== null && !this.socket.destroyed;
  }
  /**
  * Register event listener
  */
  on(event, handler) {
    this.listeners[event] = handler;
  }
  /**
  * Remove event listener
  */
  off(event) {
    delete this.listeners[event];
  }
  /**
  * Emit event
  */
  emit(event, ...args) {
    const handler = this.listeners[event];
    if (handler) {
      handler(...args);
    }
  }
};
var ReconnectManager = class {
  static {
    __name(this, "ReconnectManager");
  }
  static {
    __name2(this, "ReconnectManager");
  }
  isReconnecting = false;
  abortController = null;
  options;
  constructor(options = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 5,
      initialDelay: options.initialDelay ?? 1e3,
      maxDelay: options.maxDelay ?? 3e4,
      backoffMultiplier: options.backoffMultiplier ?? 2
    };
  }
  /**
  * Start reconnection process
  */
  async start(connectFn, onAttempt, onFailed) {
    if (this.isReconnecting) {
      return;
    }
    this.isReconnecting = true;
    this.abortController = new AbortController();
    const pRetryOptions = {
      retries: this.options.maxAttempts,
      factor: this.options.backoffMultiplier,
      minTimeout: this.options.initialDelay,
      maxTimeout: this.options.maxDelay,
      randomize: false,
      signal: this.abortController.signal,
      onFailedAttempt: /* @__PURE__ */ __name2((error) => {
        if (onAttempt) {
          onAttempt(error.attemptNumber, this.options.maxAttempts);
        }
      }, "onFailedAttempt")
    };
    try {
      await pRetry(connectFn, pRetryOptions);
      this.reset();
    } catch (error) {
      this.reset();
      if (onFailed) {
        onFailed();
      }
      throw error;
    }
  }
  /**
  * Stop reconnection process
  */
  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.reset();
  }
  /**
  * Reset reconnection state
  */
  reset() {
    this.isReconnecting = false;
  }
  /**
  * Check if currently reconnecting
  */
  isActive() {
    return this.isReconnecting;
  }
  /**
  * Get current attempt number (not tracked in p-retry wrapper)
  * @deprecated p-retry handles attempt tracking internally
  */
  getCurrentAttempt() {
    return this.isReconnecting ? 1 : 0;
  }
};
function createContextMethods(call) {
  return {
    get: /* @__PURE__ */ __name2((params) => call("context/get", params), "get"),
    validate: /* @__PURE__ */ __name2((params) => call("context/validate", params), "validate"),
    checkPatterns: /* @__PURE__ */ __name2((params) => call("context/check-patterns", params), "checkPatterns")
  };
}
__name(createContextMethods, "createContextMethods");
__name2(createContextMethods, "createContextMethods");
function createDaemonMethods(call) {
  return {
    ping: /* @__PURE__ */ __name2(() => call("daemon/ping"), "ping"),
    status: /* @__PURE__ */ __name2(() => call("daemon/status"), "status"),
    shutdown: /* @__PURE__ */ __name2(() => call("daemon/shutdown"), "shutdown"),
    reload: /* @__PURE__ */ __name2(() => call("daemon/reload"), "reload")
  };
}
__name(createDaemonMethods, "createDaemonMethods");
__name2(createDaemonMethods, "createDaemonMethods");
function createDetectionMethods(call) {
  return {
    check: /* @__PURE__ */ __name2((params) => call("detection/check", params), "check")
  };
}
__name(createDetectionMethods, "createDetectionMethods");
__name2(createDetectionMethods, "createDetectionMethods");
function createHealthMethods(call) {
  return {
    check: /* @__PURE__ */ __name2((params) => call("health/check", params), "check"),
    ping: /* @__PURE__ */ __name2(() => call("health/ping"), "ping")
  };
}
__name(createHealthMethods, "createHealthMethods");
__name2(createHealthMethods, "createHealthMethods");
function createIntelligenceMethods(call) {
  return {
    capture: /* @__PURE__ */ __name2((params) => call("intelligence/capture", params), "capture"),
    outcome: /* @__PURE__ */ __name2((params) => call("intelligence/outcome", params), "outcome"),
    snapshot: /* @__PURE__ */ __name2((params) => call("intelligence/snapshot", params), "snapshot")
  };
}
__name(createIntelligenceMethods, "createIntelligenceMethods");
__name2(createIntelligenceMethods, "createIntelligenceMethods");
function createLearningMethods(call) {
  return {
    add: /* @__PURE__ */ __name2((params) => call("learning/add", params), "add"),
    search: /* @__PURE__ */ __name2((params) => call("learning/search", params), "search"),
    list: /* @__PURE__ */ __name2((params) => call("learning/list", params), "list"),
    prune: /* @__PURE__ */ __name2((params) => call("learning/prune", params), "prune"),
    evaluate: /* @__PURE__ */ __name2((params) => call("learning/evaluate", params), "evaluate"),
    updateSession: /* @__PURE__ */ __name2((params) => call("learning/update-session", params), "updateSession"),
    gc: /* @__PURE__ */ __name2((params) => call("learning/gc", params), "gc"),
    seed: /* @__PURE__ */ __name2((params) => call("learning/seed", params), "seed"),
    consolidate: /* @__PURE__ */ __name2((params) => call("learning/consolidate", params), "consolidate")
  };
}
__name(createLearningMethods, "createLearningMethods");
__name2(createLearningMethods, "createLearningMethods");
function createMCPMethods(call) {
  return {
    snapshotCreated: /* @__PURE__ */ __name2((params) => call("mcp/snapshot-created", params), "snapshotCreated"),
    fileModified: /* @__PURE__ */ __name2((params) => call("mcp/file-modified", params), "fileModified")
  };
}
__name(createMCPMethods, "createMCPMethods");
__name2(createMCPMethods, "createMCPMethods");
function createMomentumMethods(call) {
  return {
    refresh: /* @__PURE__ */ __name2((params) => call("momentum/refresh", params), "refresh"),
    score: /* @__PURE__ */ __name2((params) => call("momentum/score", params), "score"),
    sync: /* @__PURE__ */ __name2((params) => call("momentum/sync", params), "sync"),
    status: /* @__PURE__ */ __name2((params) => call("momentum/status", params), "status")
  };
}
__name(createMomentumMethods, "createMomentumMethods");
__name2(createMomentumMethods, "createMomentumMethods");
function createProtectionMethods(call) {
  return {
    evaluate: /* @__PURE__ */ __name2((params) => call("protection/evaluate", params), "evaluate"),
    levels: /* @__PURE__ */ __name2((params) => call("protection/levels", params), "levels"),
    set: /* @__PURE__ */ __name2((params) => call("protection/set", params), "set"),
    listDaemon: /* @__PURE__ */ __name2((params) => call("protection/list-daemon", params), "listDaemon")
  };
}
__name(createProtectionMethods, "createProtectionMethods");
__name2(createProtectionMethods, "createProtectionMethods");
function createSessionMethods(call) {
  return {
    current: /* @__PURE__ */ __name2((params) => call("session/current", params), "current"),
    start: /* @__PURE__ */ __name2((params) => call("session/start", params), "start"),
    end: /* @__PURE__ */ __name2((params) => call("session/end", params), "end"),
    list: /* @__PURE__ */ __name2((params) => call("session/list", params), "list"),
    vitals: /* @__PURE__ */ __name2((params) => call("session/vitals", params), "vitals")
  };
}
__name(createSessionMethods, "createSessionMethods");
__name2(createSessionMethods, "createSessionMethods");
function createSnapshotMethods(call) {
  return {
    create: /* @__PURE__ */ __name2((params) => call("snapshot/create", params), "create"),
    get: /* @__PURE__ */ __name2((params) => call("snapshot/get", params), "get"),
    list: /* @__PURE__ */ __name2((params) => call("snapshot/list", params), "list"),
    restore: /* @__PURE__ */ __name2((params) => call("snapshot/restore", params), "restore"),
    diff: /* @__PURE__ */ __name2((params) => call("snapshot/diff", params), "diff"),
    delete: /* @__PURE__ */ __name2((params) => call("snapshot/delete", params), "delete")
  };
}
__name(createSnapshotMethods, "createSnapshotMethods");
__name2(createSnapshotMethods, "createSnapshotMethods");
function createSupervisorMethods(call) {
  return {
    register: /* @__PURE__ */ __name2((params) => call("supervisor/register", params), "register"),
    heartbeat: /* @__PURE__ */ __name2((params) => call("supervisor/heartbeat", params), "heartbeat"),
    systemHealth: /* @__PURE__ */ __name2((params) => call("system/health", params), "systemHealth")
  };
}
__name(createSupervisorMethods, "createSupervisorMethods");
__name2(createSupervisorMethods, "createSupervisorMethods");
function createSyncMethods(call) {
  return {
    status: /* @__PURE__ */ __name2((params) => call("sync/status-daemon", params), "status"),
    force: /* @__PURE__ */ __name2((params) => call("sync/force", params), "force"),
    stop: /* @__PURE__ */ __name2((params) => call("sync/stop", params), "stop"),
    start: /* @__PURE__ */ __name2((params) => call("sync/start", params), "start"),
    queue: /* @__PURE__ */ __name2((params) => call("sync/queue", params), "queue")
  };
}
__name(createSyncMethods, "createSyncMethods");
__name2(createSyncMethods, "createSyncMethods");
function createValidationMethods(call) {
  return {
    quick: /* @__PURE__ */ __name2((params) => call("validate/quick", params), "quick"),
    comprehensive: /* @__PURE__ */ __name2((params) => call("validate/comprehensive", params), "comprehensive")
  };
}
__name(createValidationMethods, "createValidationMethods");
__name2(createValidationMethods, "createValidationMethods");
function createViolationMethods(call) {
  return {
    report: /* @__PURE__ */ __name2((params) => call("violation/report", params), "report"),
    list: /* @__PURE__ */ __name2((params) => call("violation/list", params), "list")
  };
}
__name(createViolationMethods, "createViolationMethods");
__name2(createViolationMethods, "createViolationMethods");
function createWatchMethods(call) {
  return {
    subscribe: /* @__PURE__ */ __name2((params) => call("watch/subscribe", params), "subscribe"),
    unsubscribe: /* @__PURE__ */ __name2((params) => call("watch/unsubscribe", params), "unsubscribe"),
    fileChanged: /* @__PURE__ */ __name2((params) => call("watch/file-changed", params), "fileChanged")
  };
}
__name(createWatchMethods, "createWatchMethods");
__name2(createWatchMethods, "createWatchMethods");
function createWorkspaceMethods(call) {
  return {
    analyze: /* @__PURE__ */ __name2((params) => call("workspace/analyze", params), "analyze"),
    status: /* @__PURE__ */ __name2((params) => call("workspace/status", params), "status")
  };
}
__name(createWorkspaceMethods, "createWorkspaceMethods");
__name2(createWorkspaceMethods, "createWorkspaceMethods");
var VrekoLocalClient = class {
  static {
    __name(this, "VrekoLocalClient");
  }
  static {
    __name2(this, "VrekoLocalClient");
  }
  connection;
  reconnectManager;
  state = "disconnected";
  nextId = 1;
  pending = /* @__PURE__ */ new Map();
  eventHandlers = {};
  options;
  /** Stored params from the last initialize() call  -  replayed after auto-reconnect */
  initializeParams = null;
  // Method namespaces - original
  health;
  session;
  snapshot;
  protection;
  detection;
  // Method namespaces - new domains
  learning;
  context;
  validation;
  violation;
  sync;
  intelligence;
  momentum;
  watch;
  mcp;
  supervisor;
  daemon;
  workspace;
  constructor(options = {}) {
    this.options = {
      socketPath: options.socketPath ?? getDefaultSocketPath(),
      timeout: options.timeout ?? 3e4,
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1e3,
      maxReconnectDelay: options.maxReconnectDelay ?? 3e4
    };
    this.connection = new IpcConnection({
      socketPath: this.options.socketPath,
      timeout: 5e3
    });
    this.reconnectManager = new ReconnectManager({
      maxAttempts: this.options.maxReconnectAttempts,
      initialDelay: this.options.reconnectDelay,
      maxDelay: this.options.maxReconnectDelay
    });
    const callFn = this.call.bind(this);
    this.health = createHealthMethods(callFn);
    this.session = createSessionMethods(callFn);
    this.snapshot = createSnapshotMethods(callFn);
    this.protection = createProtectionMethods(callFn);
    this.detection = createDetectionMethods(callFn);
    this.learning = createLearningMethods(callFn);
    this.context = createContextMethods(callFn);
    this.validation = createValidationMethods(callFn);
    this.violation = createViolationMethods(callFn);
    this.sync = createSyncMethods(callFn);
    this.intelligence = createIntelligenceMethods(callFn);
    this.momentum = createMomentumMethods(callFn);
    this.watch = createWatchMethods(callFn);
    this.mcp = createMCPMethods(callFn);
    this.supervisor = createSupervisorMethods(callFn);
    this.daemon = createDaemonMethods(callFn);
    this.workspace = createWorkspaceMethods(callFn);
    this.setupConnectionHandlers();
  }
  /**
  * Set up IPC connection event handlers
  */
  setupConnectionHandlers() {
    this.connection.on("message", (message) => {
      if ("method" in message && !("id" in message)) {
        const notification = message;
        this.emit("notification", notification.method, notification.params);
        return;
      }
      const response = message;
      if (response.id === null) {
        this.emit("error", new Error("Received error response with null id"));
        return;
      }
      const pending = this.pending.get(response.id);
      if (!pending) {
        this.emit("error", new Error(`Received response for unknown request ID: ${response.id}`));
        return;
      }
      clearTimeout(pending.timeout);
      this.pending.delete(response.id);
      if ("error" in response) {
        const error = new JsonRpcClientError(response.error.message, response.error.code, response.error.data);
        pending.reject(error);
        return;
      }
      pending.resolve(response.result);
    });
    this.connection.on("close", (error) => {
      if (this.state !== "closed") {
        this.setState("disconnected");
      }
      this.emit("disconnected", error);
      for (const [, pending] of this.pending.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Connection closed"));
      }
      this.pending.clear();
      if (this.options.autoReconnect && this.state !== "closed" && !this.reconnectManager.isActive()) {
        this.attemptReconnect();
      }
    });
    this.connection.on("error", (error) => {
      this.emit("error", error);
    });
  }
  /**
  * Attempt to reconnect
  */
  async attemptReconnect() {
    this.setState("reconnecting");
    try {
      await this.reconnectManager.start(async () => {
        await this.connection.connect();
        if (this.initializeParams) {
          await this.initialize(this.initializeParams);
        }
        this.setState("connected");
        this.emit("connected");
      }, (attempt, maxAttempts) => {
        this.emit("reconnecting", attempt, maxAttempts);
      }, () => {
        this.emit("reconnectFailed");
      });
    } catch (error) {
      this.setState("disconnected");
      this.emit("error", error);
    }
  }
  /**
  * Connect to the local service
  */
  async connect() {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }
    this.setState("connecting");
    try {
      await this.connection.connect();
      this.setState("connected");
      this.emit("connected");
    } catch (error) {
      this.setState("disconnected");
      throw error;
    }
  }
  /**
  * Close the connection
  */
  close() {
    this.reconnectManager.stop();
    this.connection.close();
    this.setState("closed");
    for (const [, pending] of this.pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Client closed"));
    }
    this.pending.clear();
  }
  /**
  * Make a JSON-RPC method call
  */
  async call(method, params) {
    if (!this.connection.isConnected()) {
      throw new Error("Not connected to service");
    }
    const id = this.nextId++;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new RequestTimeoutError(`Request timeout after ${this.options.timeout}ms`, id));
      }, this.options.timeout).unref();
      this.pending.set(id, {
        resolve,
        reject,
        timeout
      });
      this.connection.send(request).catch((error) => {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      });
    });
  }
  /**
  * Initialize the client connection
  *
  * Must be called before any other method calls.
  * Params are stored and automatically replayed after auto-reconnect.
  */
  async initialize(params) {
    this.initializeParams = params;
    return this.call("initialize", params);
  }
  /**
  * Get current connection state
  */
  getState() {
    return this.state;
  }
  /**
  * Check if connected
  */
  isConnected() {
    return this.state === "connected";
  }
  /**
  * Register event listener
  */
  on(event, handler) {
    this.eventHandlers[event] = handler;
  }
  /**
  * Remove event listener
  */
  off(event) {
    delete this.eventHandlers[event];
  }
  /**
  * Set connection state and emit event
  */
  setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.emit("stateChange", state);
    }
  }
  /**
  * Emit event to registered handlers
  */
  emit(event, ...args) {
    const handler = this.eventHandlers[event];
    if (handler) {
      handler(...args);
    }
  }
};

// src/service-adapter/local-service-adapter.ts
function getServicePidPath() {
  return join(homedir(), ".vreko", "service.pid");
}
__name(getServicePidPath, "getServicePidPath");
function getServiceSocketPath() {
  return process.env.VREKO_DAEMON_SOCKET ?? getDefaultSocketPath();
}
__name(getServiceSocketPath, "getServiceSocketPath");
function getReadyMarkerPath() {
  return join(homedir(), ".vreko", ".ready");
}
__name(getReadyMarkerPath, "getReadyMarkerPath");
function cleanupStaleArtifacts() {
  const pidPath = getServicePidPath();
  const socketPath = getServiceSocketPath();
  const readyPath = getReadyMarkerPath();
  const cleaned = [];
  try {
    if (existsSync(pidPath)) {
      unlinkSync(pidPath);
      cleaned.push("PID file");
    }
  } catch {
  }
  try {
    if (existsSync(socketPath)) {
      unlinkSync(socketPath);
      cleaned.push("socket");
    }
  } catch {
  }
  try {
    if (existsSync(readyPath)) {
      unlinkSync(readyPath);
      cleaned.push("ready marker");
    }
  } catch {
  }
  if (cleaned.length > 0) {
    process.stderr.write(`[vreko] Cleaned up stale daemon artifacts: ${cleaned.join(", ")}
`);
  }
}
__name(cleanupStaleArtifacts, "cleanupStaleArtifacts");
function isServiceRunning() {
  const pidPath = getServicePidPath();
  if (!existsSync(pidPath)) {
    return false;
  }
  try {
    const pid = Number.parseInt(readFileSync(pidPath, "utf-8").trim(), 10);
    if (Number.isNaN(pid)) {
      cleanupStaleArtifacts();
      return false;
    }
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") {
      cleanupStaleArtifacts();
    }
    return false;
  }
}
__name(isServiceRunning, "isServiceRunning");
async function isServiceHealthy() {
  const pidPath = getServicePidPath();
  if (!existsSync(pidPath)) {
    return false;
  }
  try {
    const pid = Number.parseInt(readFileSync(pidPath, "utf-8").trim(), 10);
    if (Number.isNaN(pid)) {
      cleanupStaleArtifacts();
      return false;
    }
    try {
      process.kill(pid, 0);
    } catch (error) {
      const code = error.code;
      if (code === "ESRCH") {
        cleanupStaleArtifacts();
        return false;
      }
    }
    const client = new VrekoLocalClient({
      socketPath: getServiceSocketPath(),
      timeout: 5e3,
      autoReconnect: false
    });
    try {
      await client.connect();
      await client.initialize({
        protocolVersion: "1.0.0",
        clientInfo: {
          name: "vreko-cli",
          version: "1.0.0"
        },
        capabilities: {
          notifications: false
        }
      });
      await client.health.ping();
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "ECONNREFUSED" || code === "ENOENT") {
        process.stderr.write("[vreko] Daemon process exists but socket not accepting connections (likely hung)\n");
      }
      return false;
    } finally {
      client.close();
    }
  } catch {
    return false;
  }
}
__name(isServiceHealthy, "isServiceHealthy");
function readServicePid() {
  const pidPath = getServicePidPath();
  try {
    const content = readFileSync(pidPath, "utf-8").trim();
    const pid = Number.parseInt(content, 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}
__name(readServicePid, "readServicePid");
function createServiceClient() {
  return new VrekoLocalClient({
    timeout: 3e4,
    autoReconnect: false
  });
}
__name(createServiceClient, "createServiceClient");
async function connectServiceClient(client) {
  await client.connect();
  await client.initialize({
    protocolVersion: "1.0.0",
    clientInfo: {
      name: "vreko-cli",
      version: "1.0.0"
    },
    capabilities: {
      notifications: false
    }
  });
}
__name(connectServiceClient, "connectServiceClient");
async function pruneLearningsViaDaemon(workspaceRoot, client) {
  try {
    const result = await client.learning.prune({
      workspace: workspaceRoot
    });
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(pruneLearningsViaDaemon, "pruneLearningsViaDaemon");
async function gcLearningsViaDaemon(workspaceRoot, client, options) {
  try {
    const result = await client.call("learning/gc", {
      workspace: workspaceRoot,
      operation: options?.operation ?? "all",
      dryRun: options?.dryRun ?? true
    });
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(gcLearningsViaDaemon, "gcLearningsViaDaemon");
async function listLearningsViaDaemon(workspaceRoot, client, limit) {
  try {
    const result = await client.learning.list({
      workspace: workspaceRoot,
      limit: limit ?? 50
    });
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(listLearningsViaDaemon, "listLearningsViaDaemon");
async function searchLearningsViaDaemon(workspaceRoot, client, keywords, limit) {
  try {
    const result = await client.learning.search({
      workspace: workspaceRoot,
      keywords,
      limit: limit ?? 10
    });
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(searchLearningsViaDaemon, "searchLearningsViaDaemon");
async function createSessionViaDaemon(client, params) {
  try {
    const session = await client.session.start({
      workspacePath: params?.workspacePath,
      metadata: params?.metadata
    });
    return {
      success: true,
      result: {
        id: session.id,
        name: session.name,
        workspacePath: session.workspacePath,
        metadata: session.metadata,
        createdAt: session.startedAt,
        lastActivityAt: session.lastActivityAt
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(createSessionViaDaemon, "createSessionViaDaemon");
async function endSessionViaDaemon(client, sessionId, workspacePath) {
  try {
    await client.call("session/end-daemon", {
      sessionId,
      workspacePath
    });
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
__name(endSessionViaDaemon, "endSessionViaDaemon");
async function getSessionStatusViaDaemon(client, sessionId, workspacePath) {
  try {
    const result = await client.call("session/status", {
      sessionId,
      workspacePath
    });
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(getSessionStatusViaDaemon, "getSessionStatusViaDaemon");
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1e3);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
__name(formatDuration, "formatDuration");
function formatBytes(bytes) {
  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)}${units[unitIndex]}`;
}
__name(formatBytes, "formatBytes");
function getLogPath() {
  return join(homedir(), ".vreko", "daemon", "daemon.log");
}
__name(getLogPath, "getLogPath");
var DAEMON_GENERATION = 2;
function getDaemonVersion() {
  return {
    generation: DAEMON_GENERATION,
    version: "2.0.0"
  };
}
__name(getDaemonVersion, "getDaemonVersion");

export { DAEMON_GENERATION, JsonRpcClientError, StartStatusOutput, VrekoLocalClient, WorkspaceStatusOutput, connectServiceClient, createServiceClient, createSessionViaDaemon, endSessionViaDaemon, formatBytes, formatDuration, gcLearningsViaDaemon, getDaemonVersion, getDefaultSocketPath, getLogPath, getServicePidPath, getServiceSocketPath, getSessionStatusViaDaemon, isServiceHealthy, isServiceRunning, listLearningsViaDaemon, pruneLearningsViaDaemon, readServicePid, searchLearningsViaDaemon };
//# sourceMappingURL=chunk-6NHWBL7P.js.map
//# sourceMappingURL=chunk-6NHWBL7P.js.map