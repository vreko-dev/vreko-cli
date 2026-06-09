#!/usr/bin/env node
import { createLogger, LogLevel } from './chunk-OOVZVXTB.js';
import { __export, __name } from './chunk-EWOJGXRX.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations, sql, and, eq } from 'drizzle-orm';
import { pgEnum, pgTable, timestamp, jsonb, text, integer, uniqueIndex, uuid, boolean, index, json, varchar, bigint, unique, real, inet, check, decimal, customType, numeric } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// ../../packages/platform/dist/db/schema/postgres.js
var postgres_exports = {};
__export(postgres_exports, {
  TOPUP_PACKS: () => TOPUP_PACKS,
  account: () => account,
  accountRelations: () => accountRelations,
  agentSuggestions: () => agentSuggestions,
  aiChat: () => aiChat,
  aiChatRelations: () => aiChatRelations,
  apiKeys: () => apiKeys,
  apiKeysRelations: () => apiKeysRelations,
  apiUsage: () => apiUsage,
  apiUsageRelations: () => apiUsageRelations,
  clientTokens: () => clientTokens,
  clientTokensRelations: () => clientTokensRelations,
  creditJobTypeEnum: () => creditJobTypeEnum,
  creditTopups: () => creditTopups,
  creditTopupsRelations: () => creditTopupsRelations,
  creditTransactionStatusEnum: () => creditTransactionStatusEnum,
  creditTransactionTypeEnum: () => creditTransactionTypeEnum,
  creditsLedger: () => creditsLedger,
  creditsLedgerRelations: () => creditsLedgerRelations,
  deviceTrials: () => deviceTrials,
  emailCategoryEnum: () => emailCategoryEnum,
  emailDeliveries: () => emailDeliveries,
  emailPreferences: () => emailPreferences,
  emailStatusEnum: () => emailStatusEnum,
  getTopupPackDetails: () => getTopupPackDetails,
  invitation: () => invitation,
  invitationRelations: () => invitationRelations,
  isValidPackSize: () => isValidPackSize,
  jwks: () => jwks,
  member: () => member,
  newsletterSubscribers: () => newsletterSubscribers,
  newsletterSubscribersRelations: () => newsletterSubscribersRelations,
  organization: () => organization,
  organizationRelations: () => organizationRelations,
  passkey: () => passkey,
  passkeyRelations: () => passkeyRelations,
  planTypeEnum: () => planTypeEnum,
  purchase: () => purchase,
  purchaseRelations: () => purchaseRelations,
  purchaseTypeEnum: () => purchaseTypeEnum,
  rateLimit: () => rateLimit,
  schema: () => schema,
  session: () => session,
  sessionRelations: () => sessionRelations,
  snapshotFiles: () => snapshotFiles,
  snapshotFilesRelations: () => snapshotFilesRelations,
  snapshots: () => snapshots,
  snapshotsRelations: () => snapshotsRelations,
  subscriptionStatusEnum: () => subscriptionStatusEnum,
  subscriptions: () => subscriptions,
  subscriptionsRelations: () => subscriptionsRelations,
  topupStatusEnum: () => topupStatusEnum,
  trialStatusEnum: () => trialStatusEnum,
  trials: () => trials,
  trialsRelations: () => trialsRelations,
  twoFactor: () => twoFactor,
  twoFactorRelations: () => twoFactorRelations,
  usageLimits: () => usageLimits,
  usageLimitsRelations: () => usageLimitsRelations,
  user: () => user,
  userRelations: () => userRelations,
  verification: () => verification,
  waitlist: () => waitlist,
  waitlistAuditLogs: () => waitlistAuditLogs,
  waitlistAuditLogsRelations: () => waitlistAuditLogsRelations,
  waitlistReferrals: () => waitlistReferrals,
  waitlistReferralsRelations: () => waitlistReferralsRelations,
  waitlistRelations: () => waitlistRelations,
  waitlistStatusEnum: () => waitlistStatusEnum,
  waitlistTasks: () => waitlistTasks,
  waitlistTasksRelations: () => waitlistTasksRelations
});
var topupStatusEnum = pgEnum("topup_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "canceled"
]);
var TOPUP_PACKS = {
  50: {
    priceCents: 500,
    perCredit: 0.1,
    savings: 0
  },
  100: {
    priceCents: 900,
    perCredit: 0.09,
    savings: 10
  },
  250: {
    priceCents: 2e3,
    perCredit: 0.08,
    savings: 20
  }
};
var creditTopups = pgTable("credit_topups", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade"
  }),
  // Pack details
  packSize: integer("pack_size").notNull(),
  priceCents: integer("price_cents").notNull(),
  // Stripe integration
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripeCustomerId: text("stripe_customer_id"),
  // Status tracking
  status: topupStatusEnum("status").notNull().default("pending"),
  // Ledger reference (credits added via ledger)
  ledgerTransactionId: text("ledger_transaction_id"),
  // Additional metadata
  metadata: jsonb("metadata").default({}),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  refundedAt: timestamp("refunded_at")
}, (table) => ({
  // Indexes
  userIdIdx: uniqueIndex("idx_credit_topups_user_id").on(table.userId),
  orgIdIdx: uniqueIndex("idx_credit_topups_org_id").on(table.organizationId),
  statusIdx: uniqueIndex("idx_credit_topups_status").on(table.status),
  stripePaymentIdx: uniqueIndex("idx_credit_topups_stripe_payment").on(table.stripePaymentIntentId),
  stripeCheckoutIdx: uniqueIndex("idx_credit_topups_stripe_checkout").on(table.stripeCheckoutSessionId)
}));
var creditTopupsRelations = relations(creditTopups, ({ one }) => ({
  user: one(user, {
    fields: [
      creditTopups.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      creditTopups.organizationId
    ],
    references: [
      organization.id
    ]
  })
}));
function getTopupPackDetails(packSize) {
  return TOPUP_PACKS[packSize];
}
__name(getTopupPackDetails, "getTopupPackDetails");
function isValidPackSize(size) {
  return size in TOPUP_PACKS;
}
__name(isValidPackSize, "isValidPackSize");
var creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "monthly_allowance",
  "top_up",
  "job_consumption",
  "refund",
  "admin_adjustment"
]);
var creditJobTypeEnum = pgEnum("credit_job_type", [
  "deep_risk_sweep",
  "full_codebase_scan",
  "memory_sync",
  "synthesis",
  "layer3_personalization",
  "ai_refactor_plan",
  "fleet_analysis",
  "vitals_history"
]);
var creditTransactionStatusEnum = pgEnum("credit_transaction_status", [
  "pending",
  "completed",
  "failed",
  "reversed"
]);
var creditsLedger = pgTable("credits_ledger", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade"
  }),
  // Credit transaction details
  credits: integer("credits").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  // Transaction metadata
  transactionType: creditTransactionTypeEnum("transaction_type").notNull(),
  status: creditTransactionStatusEnum("status").notNull().default("completed"),
  // Job-specific fields (for job_consumption type)
  jobType: creditJobTypeEnum("job_type"),
  jobId: text("job_id"),
  estimatedCredits: integer("estimated_credits"),
  // Cost tracking (for internal analysis, per spec Phase 1)
  estimatedCostCents: integer("estimated_cost_cents"),
  actualCostCents: integer("actual_cost_cents"),
  tokensUsed: integer("tokens_used"),
  graphNodes: integer("graph_nodes"),
  fileCount: integer("file_count"),
  // Stripe integration (for top-ups)
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  // Top-up pack reference
  topupId: text("topup_id"),
  // Billing period tracking
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  // Additional metadata
  metadata: jsonb("metadata").default({}),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  finalizedAt: timestamp("finalized_at")
}, (table) => ({
  // Indexes for common queries
  userIdIdx: uniqueIndex("idx_credits_ledger_user_id").on(table.userId),
  orgIdIdx: uniqueIndex("idx_credits_ledger_org_id").on(table.organizationId),
  transactionTypeIdx: uniqueIndex("idx_credits_ledger_transaction_type").on(table.transactionType),
  createdAtIdx: uniqueIndex("idx_credits_ledger_created_at").on(table.createdAt),
  billingPeriodIdx: uniqueIndex("idx_credits_ledger_billing_period").on(table.userId, table.billingPeriodStart),
  stripePaymentIdx: uniqueIndex("idx_credits_ledger_stripe_payment").on(table.stripePaymentIntentId)
}));
var creditsLedgerRelations = relations(creditsLedger, ({ one }) => ({
  user: one(user, {
    fields: [
      creditsLedger.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      creditsLedger.organizationId
    ],
    references: [
      organization.id
    ]
  })
}));
var deviceTrials = pgTable("device_trials", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Device Identity (from VSCode machineId)
  deviceFingerprint: text("device_fingerprint").notNull().unique(),
  // API Key for this device trial
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Usage Tracking
  snapshotsUsed: integer("snapshots_used").notNull().default(0),
  apiCallsUsed: integer("api_calls_used").notNull().default(0),
  // Limits (increase on conversion)
  snapshotLimit: integer("snapshot_limit").notNull().default(50),
  apiCallLimit: integer("api_call_limit").notNull().default(1e4),
  // User Conversion (null until email signup)
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  convertedAt: timestamp("converted_at"),
  // Abuse Prevention
  installCount: integer("install_count").notNull().default(1),
  blockedUntil: timestamp("blocked_until"),
  // Timestamps
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  // Index for fast fingerprint lookups
  deviceFingerprintIdx: uniqueIndex("device_trials_fingerprint_idx").on(table.deviceFingerprint),
  // Index for finding all devices for a user
  userIdx: uniqueIndex("device_trials_user_idx").on(table.userId),
  // Index for checking blocked devices
  blockedUntilIdx: uniqueIndex("device_trials_blocked_idx").on(table.blockedUntil)
}));
var deviceTrialsRelations = relations(deviceTrials, ({ one }) => ({
  user: one(user, {
    fields: [
      deviceTrials.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      deviceTrials.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Idempotency key for duplicate prevention
  idempotencyKey: text("idempotency_key").unique(),
  // Snapshot metadata (always stored)
  name: text("name"),
  description: text("description"),
  trigger: text("trigger").notNull(),
  // File metadata (no actual content by default)
  fileCount: integer("file_count").notNull().default(0),
  totalSizeBytes: integer("total_size_bytes").notNull().default(0),
  fileHashes: jsonb("file_hashes").$type().default([]),
  // Git context (metadata only)
  gitBranch: text("git_branch"),
  gitCommit: text("git_commit"),
  gitDirty: boolean("git_dirty").default(false),
  // Risk analysis metadata
  riskScore: integer("risk_score"),
  riskFactors: jsonb("risk_factors").$type().default([]),
  // Project context
  projectPath: text("project_path"),
  workspaceId: text("workspace_id"),
  // Cloud backup (only if user opted in)
  cloudBackupEnabled: boolean("cloud_backup_enabled").default(false),
  cloudBackupUrl: text("cloud_backup_url"),
  // Encryption fields for server-side KMS encryption
  // MVP Note: Server-side KMS encryption with Row Level Security (RLS) to isolate rows
  // Post-MVP: Will add client-side E2EE with user-controlled keys
  encryptionKeyId: text("encryption_key_id"),
  encryptedDataKey: text("encrypted_data_key"),
  encryptionAlgorithm: text("encryption_algorithm").default("AES-256-GCM"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  // Metadata for additional context
  metadata: jsonb("metadata").$type().default({})
}, (table) => ({
  // FK indexes for query performance (3-10x improvement on JOINs)
  userIdIdx: index("snapshots_user_id_idx").on(table.userId),
  apiKeyIdIdx: index("snapshots_api_key_id_idx").on(table.apiKeyId),
  // Composite index for common query pattern: user's recent snapshots
  userCreatedAtIdx: index("snapshots_user_created_at_idx").on(table.userId, table.createdAt)
}));
var snapshotFiles = pgTable("snapshot_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotId: uuid("snapshot_id").notNull().references(() => snapshots.id, {
    onDelete: "cascade"
  }),
  // File metadata
  filePath: text("file_path").notNull(),
  fileHash: text("file_hash").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  // Change detection
  changeType: text("change_type"),
  linesChanged: integer("lines_changed"),
  // Risk flags
  containsSecrets: boolean("contains_secrets").default(false),
  riskLevel: text("risk_level"),
  // Cloud backup (only if snapshot has cloudBackupEnabled)
  cloudBackupUrl: text("cloud_backup_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  // FK index for query performance on snapshot file lookups
  snapshotIdIdx: index("snapshot_files_snapshot_id_idx").on(table.snapshotId),
  // Composite index for finding files by path within a snapshot
  snapshotFilePathIdx: index("snapshot_files_snapshot_path_idx").on(table.snapshotId, table.filePath)
}));
var snapshotsRelations = relations(snapshots, ({ one, many }) => ({
  user: one(user, {
    fields: [
      snapshots.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      snapshots.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  }),
  files: many(snapshotFiles)
}));
var snapshotFilesRelations = relations(snapshotFiles, ({ one }) => ({
  snapshot: one(snapshots, {
    fields: [
      snapshotFiles.snapshotId
    ],
    references: [
      snapshots.id
    ]
  })
}));
var trialStatusEnum = pgEnum("trial_status", [
  "active",
  "expired",
  "converted",
  "canceled"
]);
var trials = pgTable("trials", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  status: trialStatusEnum("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
  convertedAt: timestamp("converted_at"),
  canceledAt: timestamp("canceled_at"),
  features: json("features").$type().default([
    "cloud_backup",
    "api_access",
    "advanced_analytics",
    "priority_support"
  ]),
  autoExtended: boolean("auto_extended").notNull().default(false),
  extensionReason: text("extension_reason"),
  metadata: json("metadata").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  index("trials_user_id_idx").on(table.userId),
  index("trials_status_idx").on(table.status),
  index("trials_ends_at_idx").on(table.endsAt)
]);
var trialsRelations = relations(trials, ({ one }) => ({
  user: one(user, {
    fields: [
      trials.userId
    ],
    references: [
      user.id
    ]
  })
}));
var waitlistStatusEnum = pgEnum("waitlist_status", [
  "pending",
  "invited",
  "accepted",
  "rejected",
  "hold"
]);
var waitlist = pgTable("waitlist", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  email: text("email").notNull().unique(),
  githubUsername: text("github_username"),
  editor: text("editor"),
  language: text("language"),
  teamSize: text("team_size"),
  queuePosition: integer("queue_position").notNull(),
  status: waitlistStatusEnum("status").notNull().default("pending"),
  referralCode: text("referral_code").notNull().unique(),
  // Solo or team intent, captured from application form
  intent: text("intent"),
  // HubSpot integration
  hubspotContactId: text("hubspot_contact_id"),
  hubspotSyncedAt: timestamp("hubspot_synced_at"),
  // Email tracking
  emailSent: timestamp("email_sent"),
  emailSentAt: timestamp("email_sent_at"),
  // Invitation tracking
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  // Metadata
  metadata: json("metadata").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  uniqueIndex("waitlist_email_idx").on(table.email),
  uniqueIndex("waitlist_referral_code_idx").on(table.referralCode),
  index("waitlist_status_idx").on(table.status),
  index("waitlist_queue_position_idx").on(table.queuePosition)
]);
var waitlistReferrals = pgTable("waitlist_referrals", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  referrerId: text("referrer_id").notNull().references(() => waitlist.id, {
    onDelete: "cascade"
  }),
  referredEmail: text("referred_email").notNull(),
  referredId: text("referred_id").references(() => waitlist.id, {
    onDelete: "set null"
  }),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  index("waitlist_referrals_referrer_idx").on(table.referrerId),
  index("waitlist_referrals_referred_idx").on(table.referredId)
]);
var waitlistTasks = pgTable("waitlist_tasks", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  waitlistId: text("waitlist_id").notNull().references(() => waitlist.id, {
    onDelete: "cascade"
  }),
  taskType: text("task_type").notNull(),
  completed: timestamp("completed"),
  pointsEarned: integer("points_earned").notNull(),
  metadata: json("metadata").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  index("waitlist_tasks_waitlist_idx").on(table.waitlistId),
  index("waitlist_tasks_type_idx").on(table.taskType)
]);
var waitlistRelations = relations(waitlist, ({ many }) => ({
  referrals: many(waitlistReferrals, {
    relationName: "referrer"
  }),
  referredBy: many(waitlistReferrals, {
    relationName: "referred"
  }),
  tasks: many(waitlistTasks),
  auditLogs: many(waitlistAuditLogs)
}));
var waitlistReferralsRelations = relations(waitlistReferrals, ({ one }) => ({
  referrer: one(waitlist, {
    fields: [
      waitlistReferrals.referrerId
    ],
    references: [
      waitlist.id
    ],
    relationName: "referrer"
  }),
  referred: one(waitlist, {
    fields: [
      waitlistReferrals.referredId
    ],
    references: [
      waitlist.id
    ],
    relationName: "referred"
  })
}));
var waitlistTasksRelations = relations(waitlistTasks, ({ one }) => ({
  waitlistEntry: one(waitlist, {
    fields: [
      waitlistTasks.waitlistId
    ],
    references: [
      waitlist.id
    ]
  })
}));
var waitlistAuditLogs = pgTable("waitlist_audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  waitlistId: text("waitlist_id").notNull().references(() => waitlist.id, {
    onDelete: "cascade"
  }),
  action: text("action").notNull(),
  userId: text("user_id"),
  metadata: json("metadata").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  index("waitlist_audit_logs_waitlist_idx").on(table.waitlistId),
  index("waitlist_audit_logs_action_idx").on(table.action),
  index("waitlist_audit_logs_created_at_idx").on(table.createdAt)
]);
var waitlistAuditLogsRelations = relations(waitlistAuditLogs, ({ one }) => ({
  waitlistEntry: one(waitlist, {
    fields: [
      waitlistAuditLogs.waitlistId
    ],
    references: [
      waitlist.id
    ]
  })
}));

// ../../packages/platform/dist/db/schema/postgres.js
var purchaseTypeEnum = pgEnum("PurchaseType", [
  "SUBSCRIPTION",
  "ONE_TIME"
]);
var subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "paused"
]);
var planTypeEnum = pgEnum("plan_type", [
  "free",
  "pro",
  "team",
  "enterprise"
]);
var user = pgTable("user", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  username: text("username").unique(),
  displayUsername: text("displayUsername").unique(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  paymentsCustomerId: text("paymentsCustomerId"),
  locale: text("locale"),
  totalSnapshots: integer("totalSnapshots").default(0).notNull(),
  totalRecoveries: integer("totalRecoveries").default(0).notNull(),
  subscriptionTier: planTypeEnum("subscription_tier").default("free"),
  tierExpiresAt: timestamp("tier_expires_at", {
    withTimezone: true
  }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false),
  deviceFingerprint: text("deviceFingerprint"),
  // Abuse Defense Phase 1 fields
  normalizedEmail: varchar("normalized_email", {
    length: 255
  }),
  concurrentDeviceCount: integer("concurrent_device_count").default(0).notNull(),
  maxObservedDevices: integer("max_observed_devices").default(0).notNull(),
  // Pioneer Program
  pioneer: boolean("pioneer").default(false),
  pioneerCohort: integer("pioneer_cohort"),
  pioneerActivatedAt: timestamp("pioneer_activated_at", {
    withTimezone: true
  })
});
var session = pgTable("session", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  impersonatedBy: text("impersonatedBy"),
  activeOrganizationId: text("activeOrganizationId"),
  token: text("token").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
}, (table) => [
  uniqueIndex("session_token_idx").on(table.token)
]);
var account = pgTable("account", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: timestamp("expiresAt"),
  password: text("password"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});
var verification = pgTable("verification", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt")
});
var passkey = pgTable("passkey", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  name: text("name"),
  publicKey: text("publicKey").notNull(),
  userId: text("userId").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  credentialID: text("credentialID").notNull(),
  counter: integer("counter").notNull(),
  deviceType: text("deviceType").notNull(),
  backedUp: boolean("backedUp").notNull(),
  transports: text("transports"),
  createdAt: timestamp("createdAt")
});
var twoFactor = pgTable("twoFactor", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backupCodes").notNull(),
  userId: text("userId").notNull().references(() => user.id, {
    onDelete: "cascade"
  })
});
var rateLimit = pgTable("rateLimit", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  key: text("key").notNull(),
  count: integer("count").notNull().default(0),
  lastRequest: bigint("lastRequest", {
    mode: "number"
  }).notNull()
});
var jwks = pgTable("jwks", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow()
});
var organization = pgTable("organization", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  logo: text("logo"),
  createdAt: timestamp("createdAt").notNull(),
  metadata: text("metadata"),
  paymentsCustomerId: text("paymentsCustomerId")
}, (table) => [
  uniqueIndex("organization_slug_idx").on(table.slug)
]);
var member = pgTable("member", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  organizationId: text("organizationId").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  userId: text("userId").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  role: text("role").notNull(),
  createdAt: timestamp("createdAt").notNull()
}, (table) => [
  uniqueIndex("member_user_org_idx").on(table.userId, table.organizationId)
]);
var invitation = pgTable("invitation", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  organizationId: text("organizationId").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  inviterId: text("inviterId").notNull().references(() => user.id, {
    onDelete: "cascade"
  })
});
var purchase = pgTable("purchase", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  organizationId: text("organizationId").references(() => organization.id, {
    onDelete: "cascade"
  }),
  userId: text("userId").references(() => user.id, {
    onDelete: "cascade"
  }),
  type: purchaseTypeEnum("type").notNull(),
  customerId: text("customerId").notNull(),
  subscriptionId: text("subscriptionId").unique(),
  productId: text("productId").notNull(),
  status: text("status"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
});
var aiChat = pgTable("aiChat", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  organizationId: text("organizationId").references(() => organization.id, {
    onDelete: "cascade"
  }),
  userId: text("userId").references(() => user.id, {
    onDelete: "cascade"
  }),
  title: text("title"),
  messages: json("messages").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
});
var apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade"
  }),
  name: text("name").notNull().default("Default Key"),
  key: text("key").unique().notNull(),
  start: text("start").notNull(),
  prefix: text("prefix").notNull().default("sk_live_"),
  keyPreview: text("key_preview").notNull(),
  permissions: json("permissions").$type().default({}),
  // Better Auth required fields
  enabled: boolean("enabled").default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").default(false),
  rateLimitTimeWindow: integer("rate_limit_time_window"),
  rateLimitMax: integer("rate_limit_max"),
  remaining: integer("remaining"),
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at"),
  metadata: json("metadata").$type(),
  // Vreko specific fields
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    userIdx: index("api_keys_user_idx").on(table.userId),
    orgIdx: index("api_keys_org_idx").on(table.organizationId),
    keyIdx: uniqueIndex("api_keys_key_idx").on(table.key),
    startIdx: index("api_keys_start_idx").on(table.start)
  };
});
var clientTokens = pgTable("client_tokens", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  name: text("name").notNull(),
  token: text("token").unique().notNull(),
  tokenPreview: text("token_preview").notNull(),
  permissions: json("permissions").$type().default({}),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userIdx: index("client_tokens_user_idx").on(table.userId),
    tokenIdx: uniqueIndex("client_tokens_token_idx").on(table.token)
  };
});
var apiUsage = pgTable("api_usage", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code"),
  metadata: json("metadata").$type(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
}, (table) => {
  return {
    keyIdx: index("api_usage_key_idx").on(table.apiKeyId),
    timestampIdx: index("api_usage_timestamp_idx").on(table.timestamp)
  };
});
var subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade"
  }),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  plan: planTypeEnum("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialEnd: timestamp("trial_end"),
  seats: integer("seats").default(1),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    userIdx: uniqueIndex("subscriptions_user_idx").on(table.userId),
    orgIdx: uniqueIndex("subscriptions_org_idx").on(table.organizationId),
    stripeIdx: uniqueIndex("subscriptions_stripe_idx").on(table.stripeSubscriptionId)
  };
});
var usageLimits = pgTable("usage_limits", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  subscriptionId: text("subscription_id").references(() => subscriptions.id, {
    onDelete: "cascade"
  }),
  month: timestamp("month").notNull(),
  snapshotsUsed: integer("snapshots_used").default(0),
  snapshotsLimit: integer("snapshots_limit"),
  cloudStorageUsedMb: integer("cloud_storage_used_mb").default(0),
  cloudStorageLimitMb: integer("cloud_storage_limit_mb"),
  apiCallsUsed: integer("api_calls_used").default(0),
  apiCallsLimit: integer("api_calls_limit"),
  // Credit system fields (pricing_spec_v3.md)
  creditsUsed: integer("credits_used").default(0),
  creditsLimit: integer("credits_limit"),
  creditsByJobType: json("credits_by_job_type").default({})
}, (table) => {
  return {
    subscriptionMonthUnique: uniqueIndex("usage_limits_subscription_month_unique").on(table.subscriptionId, table.month)
  };
});
var userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
  invitations: many(invitation),
  purchases: many(purchase),
  memberships: many(member),
  aiChats: many(aiChat),
  twoFactors: many(twoFactor),
  apiKeys: many(apiKeys),
  subscriptions: many(subscriptions)
}));
var organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  purchases: many(purchase),
  aiChats: many(aiChat),
  apiKeys: many(apiKeys),
  subscriptions: many(subscriptions)
}));
var sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [
      session.userId
    ],
    references: [
      user.id
    ]
  })
}));
var accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [
      account.userId
    ],
    references: [
      user.id
    ]
  })
}));
var passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [
      passkey.userId
    ],
    references: [
      user.id
    ]
  })
}));
var invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [
      invitation.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  inviter: one(user, {
    fields: [
      invitation.inviterId
    ],
    references: [
      user.id
    ]
  })
}));
var purchaseRelations = relations(purchase, ({ one }) => ({
  organization: one(organization, {
    fields: [
      purchase.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  user: one(user, {
    fields: [
      purchase.userId
    ],
    references: [
      user.id
    ]
  })
}));
var aiChatRelations = relations(aiChat, ({ one }) => ({
  organization: one(organization, {
    fields: [
      aiChat.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  user: one(user, {
    fields: [
      aiChat.userId
    ],
    references: [
      user.id
    ]
  })
}));
var twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [
      twoFactor.userId
    ],
    references: [
      user.id
    ]
  })
}));
var apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(user, {
    fields: [
      apiKeys.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      apiKeys.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  usage: many(apiUsage)
}));
var clientTokensRelations = relations(clientTokens, ({ one }) => ({
  user: one(user, {
    fields: [
      clientTokens.userId
    ],
    references: [
      user.id
    ]
  })
}));
var apiUsageRelations = relations(apiUsage, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [
      apiUsage.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(user, {
    fields: [
      subscriptions.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      subscriptions.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  limits: many(usageLimits)
}));
var usageLimitsRelations = relations(usageLimits, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [
      usageLimits.subscriptionId
    ],
    references: [
      subscriptions.id
    ]
  })
}));
var newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  email: text("email").notNull().unique(),
  source: text("source").default("website"),
  hubspotContactId: text("hubspot_contact_id"),
  hubspotSyncedAt: timestamp("hubspot_synced_at"),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  metadata: json("metadata").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  uniqueIndex("newsletter_email_idx").on(table.email)
]);
var newsletterSubscribersRelations = relations(newsletterSubscribers, () => ({}));
var schema = {
  user,
  session,
  account,
  verification,
  passkey,
  twoFactor,
  rateLimit,
  jwks,
  organization,
  member,
  invitation,
  purchase,
  aiChat,
  apiKeys,
  clientTokens,
  apiUsage,
  subscriptions,
  usageLimits,
  newsletterSubscribers,
  waitlist,
  waitlistReferrals,
  waitlistTasks,
  // Credit system (pricing_spec_v3.md)
  creditsLedger,
  creditTopups
};
var agentSuggestions = pgTable("agent_suggestions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id"),
  requestId: text("request_id").notNull(),
  suggestionId: text("suggestion_id").notNull(),
  suggestionText: text("suggestion_text").notNull(),
  suggestionType: text("suggestion_type"),
  filePath: text("file_path"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  characterStart: integer("character_start"),
  characterEnd: integer("character_end"),
  accepted: boolean("accepted").default(false),
  dismissed: boolean("dismissed").default(false),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userCreatedAtIndex: index("agent_suggestions_user_created_at_idx").on(table.userId, table.createdAt),
    apiKeyCreatedAtIndex: index("agent_suggestions_api_key_created_at_idx").on(table.apiKeyId, table.createdAt)
  };
});
var emailCategoryEnum = pgEnum("email_category", [
  "authentication",
  "onboarding",
  "product",
  "billing",
  "marketing"
]);
var emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed"
]);
var emailDeliveries = pgTable("email_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  templateId: text("template_id").notNull(),
  category: emailCategoryEnum("category").notNull(),
  provider: text("provider").notNull(),
  // Delivery details
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: emailStatusEnum("status").notNull().default("pending"),
  // Provider-specific IDs
  resendEmailId: text("resend_email_id"),
  hubspotEngagementId: text("hubspot_engagement_id"),
  // Timestamps
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  failedAt: timestamp("failed_at"),
  // Error tracking
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  // Context
  metadata: json("metadata").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  index("email_deliveries_user_id_idx").on(table.userId),
  index("email_deliveries_status_idx").on(table.status),
  index("email_deliveries_sent_at_idx").on(table.sentAt),
  index("email_deliveries_category_idx").on(table.category),
  index("email_deliveries_template_id_idx").on(table.templateId)
]);
var emailPreferences = pgTable("email_preferences", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Global opt-out
  unsubscribedAll: boolean("unsubscribed_all").notNull().default(false),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeSource: text("unsubscribe_source"),
  // Category-specific preferences
  enabledCategories: json("enabled_categories").$type().default([
    "authentication",
    "billing"
  ]),
  // Digest preferences
  digestFrequency: text("digest_frequency").notNull().default("weekly"),
  digestDay: integer("digest_day"),
  digestTime: text("digest_time").notNull().default("09:00"),
  // HubSpot sync
  hubspotContactId: text("hubspot_contact_id"),
  lastSyncedToHubspot: timestamp("last_synced_to_hubspot"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  index("email_preferences_user_id_idx").on(table.userId),
  index("email_preferences_hubspot_contact_id_idx").on(table.hubspotContactId)
]);

// ../../packages/platform/dist/db/schema/vreko/index.js
var vreko_exports = {};
__export(vreko_exports, {
  TIER_STALENESS_THRESHOLD_MS: () => TIER_STALENESS_THRESHOLD_MS,
  TOPUP_PACKS: () => TOPUP_PACKS,
  WORKSPACE_LINK_TTL_MS: () => WORKSPACE_LINK_TTL_MS,
  activationCodeRedemptions: () => activationCodeRedemptions,
  activationCodeRedemptionsRelations: () => activationCodeRedemptionsRelations,
  activationCodeTypeEnum: () => activationCodeTypeEnum,
  activationCodes: () => activationCodes,
  activationCodesRelations: () => activationCodesRelations,
  actorTypeEnum: () => actorTypeEnum,
  adminActionEnum: () => adminActionEnum,
  adminAuditLog: () => adminAuditLog,
  adminAuditLogRelations: () => adminAuditLogRelations,
  adminEmailSends: () => adminEmailSends,
  adminTargetTypeEnum: () => adminTargetTypeEnum,
  adminTierChanges: () => adminTierChanges,
  aiChanges: () => aiChanges,
  aiChangesRelations: () => aiChangesRelations,
  analysisEvents: () => analysisEvents,
  analysisEventsRelations: () => analysisEventsRelations,
  apiKeyMetadata: () => apiKeyMetadata,
  apiKeyMetadataRelations: () => apiKeyMetadataRelations,
  apiKeyUsage: () => apiKeyUsage,
  apiKeys: () => apiKeys2,
  apiUsageLogs: () => apiUsageLogs,
  apiUsageLogs202510: () => apiUsageLogs202510,
  apiUsageLogs202511: () => apiUsageLogs202511,
  apiUsageLogsRelations: () => apiUsageLogsRelations,
  authMethodEnum: () => authMethodEnum,
  burnInviteCode: () => burnInviteCode,
  bypassEvents: () => bypassEvents,
  bypassEventsRelations: () => bypassEventsRelations,
  capabilityAudit: () => capabilityAudit,
  capabilityAuditRelations: () => capabilityAuditRelations,
  ciOutcomes: () => ciOutcomes,
  codeContexts: () => codeContexts,
  codeContextsRelations: () => codeContextsRelations,
  codebaseBindings: () => codebaseBindings,
  codebaseBindingsRelations: () => codebaseBindingsRelations,
  conditionalAccessPolicies: () => conditionalAccessPolicies,
  conditionalAccessPoliciesRelations: () => conditionalAccessPoliciesRelations,
  conflictLog: () => conflictLog,
  conflictLogRelations: () => conflictLogRelations,
  conflictStrategyEnum: () => conflictStrategyEnum,
  creditJobTypeEnum: () => creditJobTypeEnum,
  creditTopups: () => creditTopups,
  creditTopupsRelations: () => creditTopupsRelations,
  creditTransactionStatusEnum: () => creditTransactionStatusEnum,
  creditTransactionTypeEnum: () => creditTransactionTypeEnum,
  creditsLedger: () => creditsLedger,
  creditsLedgerRelations: () => creditsLedgerRelations,
  deviceAuthCodes: () => deviceAuthCodes,
  deviceBindings: () => deviceBindings,
  deviceBindingsRelations: () => deviceBindingsRelations,
  deviceCode: () => deviceCode,
  deviceTrials: () => deviceTrials,
  deviceTrialsRelations: () => deviceTrialsRelations,
  deviceTypeEnum: () => deviceTypeEnum,
  engagementActions: () => engagementActions,
  engagementActionsRelations: () => engagementActionsRelations,
  engagementScores: () => engagementScores,
  engagementScoresRelations: () => engagementScoresRelations,
  enterpriseAuditLog: () => enterpriseAuditLog,
  enterpriseAuditLogRelations: () => enterpriseAuditLogRelations,
  errorLogs: () => errorLogs,
  errorLogs202510: () => errorLogs202510,
  errorLogsRelations: () => errorLogsRelations,
  extensionSessions: () => extensionSessions,
  extensionSessionsRelations: () => extensionSessionsRelations,
  extensionSyncState: () => extensionSyncState,
  extensionSyncStateRelations: () => extensionSyncStateRelations,
  featureCategoryEnum: () => featureCategoryEnum,
  featureUsage: () => featureUsage,
  featureUsage202510: () => featureUsage202510,
  featureUsageRelations: () => featureUsageRelations,
  feedback: () => feedback,
  fileActionEnum: () => fileActionEnum,
  fileChangeCountsSql: () => fileChangeCountsSql,
  fileSnapshotSessions: () => fileSnapshotSessions,
  fileSnapshotSessionsRelations: () => fileSnapshotSessionsRelations,
  fingerprints: () => fingerprints,
  fingerprintsRelations: () => fingerprintsRelations,
  getTopupPackDetails: () => getTopupPackDetails,
  githubInstallations: () => githubInstallations,
  githubInstallationsRelations: () => githubInstallationsRelations,
  githubPrAnalyses: () => githubPrAnalyses,
  githubPrAnalysesRelations: () => githubPrAnalysesRelations,
  intelligencePatterns: () => intelligencePatterns,
  intelligencePatternsRelations: () => intelligencePatternsRelations,
  inviteCodes: () => inviteCodes,
  invocationStatusEnum: () => invocationStatusEnum,
  invocationTypeEnum: () => invocationTypeEnum,
  isValidPackSize: () => isValidPackSize,
  leads: () => leads,
  learningCategoryEnum: () => learningCategoryEnum,
  learningConfidenceEnum: () => learningConfidenceEnum,
  learningCountSql: () => learningCountSql,
  learnings: () => learnings,
  learningsRelations: () => learningsRelations,
  lifecycleStageEnum: () => lifecycleStageEnum,
  loops: () => loops,
  mcpActivityEvents: () => mcpActivityEvents,
  mcpActivityEventsRelations: () => mcpActivityEventsRelations,
  mcpAggregatedLearnings: () => mcpAggregatedLearnings,
  mcpAggregatedLearningsRelations: () => mcpAggregatedLearningsRelations,
  mcpObservations: () => mcpObservations,
  mcpObservationsRelations: () => mcpObservationsRelations,
  mcpSessions: () => mcpSessions,
  mcpSessionsRelations: () => mcpSessionsRelations,
  mcpToolInvocations: () => mcpToolInvocations,
  mcpToolInvocationsRelations: () => mcpToolInvocationsRelations,
  migrationSourceEnum: () => migrationSourceEnum,
  nurtureTrack: () => nurtureTrack,
  observationSeverityEnum: () => observationSeverityEnum,
  observationSourceEnum: () => observationSourceEnum,
  observationTypeEnum: () => observationTypeEnum,
  orgDailyMetrics: () => orgDailyMetrics,
  outcomeLabels: () => outcomeLabels,
  outcomeLabelsRelations: () => outcomeLabelsRelations,
  patterns: () => patterns,
  patternsRelations: () => patternsRelations,
  pendingApiKeys: () => pendingApiKeys,
  pioneerCodeStatusEnum: () => pioneerCodeStatusEnum,
  pioneerCodes: () => pioneerCodes,
  pioneerRedemptions: () => pioneerRedemptions,
  pioneers: () => pioneers,
  planTypeEnum: () => planTypeEnum2,
  policyEvaluations: () => policyEvaluations,
  postAcceptOutcomes: () => postAcceptOutcomes,
  predictions: () => predictions,
  predictionsRelations: () => predictionsRelations,
  pulseCountSql: () => pulseCountSql,
  quarantineEvents: () => quarantineEvents,
  rateLimitViolations: () => rateLimitViolations,
  rateLimitViolationsRelations: () => rateLimitViolationsRelations,
  repoMemberships: () => repoMemberships,
  repoMembershipsRelations: () => repoMembershipsRelations,
  repoPersonalities: () => repoPersonalities,
  repoPersonalitiesRelations: () => repoPersonalitiesRelations,
  repositories: () => repositories,
  repositoriesRelations: () => repositoriesRelations,
  responseCache: () => responseCache,
  responseCacheRelations: () => responseCacheRelations,
  retentionConfig: () => retentionConfig,
  riskAssessments: () => riskAssessments,
  riskAssessmentsRelations: () => riskAssessmentsRelations,
  riskDecisionEnum: () => riskDecisionEnum,
  rollbackEvents: () => rollbackEvents,
  rollbackEventsRelations: () => rollbackEventsRelations,
  ruleViolations: () => ruleViolations,
  ruleViolationsRelations: () => ruleViolationsRelations,
  sagaStatusEnum: () => sagaStatusEnum,
  sagaStepStatusEnum: () => sagaStepStatusEnum,
  sagas: () => sagas,
  scheduledEmails: () => scheduledEmails,
  securityEvents: () => securityEvents,
  securityEventsRelations: () => securityEventsRelations,
  sessionContext: () => sessionContext,
  sessionContextRelations: () => sessionContextRelations,
  sessionCountSql: () => sessionCountSql,
  sessionIngestLog: () => sessionIngestLog,
  sessionIngestLogRelations: () => sessionIngestLogRelations,
  sessionIngests: () => sessionIngests,
  sessionIngestsRelations: () => sessionIngestsRelations,
  sessionReflections: () => sessionReflections,
  sessionReflectionsRelations: () => sessionReflectionsRelations,
  sessionSeverityEnum: () => sessionSeverityEnum,
  severityLevelEnum: () => severityLevelEnum,
  snapshotFiles: () => snapshotFiles,
  snapshotFilesRelations: () => snapshotFilesRelations,
  snapshots: () => snapshots,
  snapshotsRelations: () => snapshotsRelations,
  ssoAttributeMappings: () => ssoAttributeMappings,
  ssoAttributeMappingsRelations: () => ssoAttributeMappingsRelations,
  ssoConfiguration: () => ssoConfiguration,
  ssoConfigurationRelations: () => ssoConfigurationRelations,
  ssoProtocolEnum: () => ssoProtocolEnum,
  ssoProviderEnum: () => ssoProviderEnum,
  ssoProviderStatusEnum: () => ssoProviderStatusEnum,
  ssoSession: () => ssoSession,
  ssoSessionRelations: () => ssoSessionRelations,
  subscriptionStatusEnum: () => subscriptionStatusEnum2,
  subscriptions: () => subscriptions2,
  subscriptionsRelations: () => subscriptionsRelations2,
  superAdminRoleEnum: () => superAdminRoleEnum,
  superAdmins: () => superAdmins,
  superAdminsRelations: () => superAdminsRelations,
  suppressionPatterns: () => suppressionPatterns,
  suppressionPatternsRelations: () => suppressionPatternsRelations,
  taskEventTypeEnum: () => taskEventTypeEnum,
  taskEvents: () => taskEvents,
  taskEventsRelations: () => taskEventsRelations,
  taskFiles: () => taskFiles,
  taskFilesRelations: () => taskFilesRelations,
  taskLearnings: () => taskLearnings,
  taskLearningsRelations: () => taskLearningsRelations,
  taskOutcomeEnum: () => taskOutcomeEnum,
  taskSessions: () => taskSessions,
  taskSessionsRelations: () => taskSessionsRelations,
  taskStatusEnum: () => taskStatusEnum,
  tasks: () => tasks,
  tasksRelations: () => tasksRelations,
  teamMembers: () => teamMembers,
  teamMembersRelations: () => teamMembersRelations,
  teamRoleEnum: () => teamRoleEnum,
  teams: () => teams,
  teamsRelations: () => teamsRelations,
  telemetryDailyStats: () => telemetryDailyStats,
  telemetryEvents: () => telemetryEvents,
  telemetryIdempotencyKeys: () => telemetryIdempotencyKeys,
  telemetryOutbox: () => telemetryOutbox,
  tokenBuckets: () => tokenBuckets,
  tokenBucketsRelations: () => tokenBucketsRelations,
  topupStatusEnum: () => topupStatusEnum,
  transformTypeEnum: () => transformTypeEnum,
  trialStatusEnum: () => trialStatusEnum,
  trials: () => trials,
  trialsRelations: () => trialsRelations,
  trustScores: () => trustScores,
  trustScoresRelations: () => trustScoresRelations,
  trustedDevices: () => trustedDevices,
  trustedDevicesRelations: () => trustedDevicesRelations,
  usageStatsDaily: () => usageStatsDaily,
  usageStatsDailyRelations: () => usageStatsDailyRelations,
  userAnalyticsIdentities: () => userAnalyticsIdentities,
  userAttributions: () => userAttributions,
  userAttributionsRelations: () => userAttributionsRelations,
  userContributionPreferences: () => userContributionPreferences,
  userContributionPreferencesRelations: () => userContributionPreferencesRelations,
  userDailyMetrics: () => userDailyMetrics,
  userDetectionCapabilities: () => userDetectionCapabilities,
  userDetectionCapabilitiesRelations: () => userDetectionCapabilitiesRelations,
  userLifecycleState: () => userLifecycleState,
  userProductMetrics: () => userProductMetrics,
  userProfiles: () => userProfiles,
  userProfilesRelations: () => userProfilesRelations,
  userSafetyProfiles: () => userSafetyProfiles,
  userSafetyProfilesRelations: () => userSafetyProfilesRelations,
  userSessionContext: () => userSessionContext,
  userSessionContextRelations: () => userSessionContextRelations,
  userSyncPreferences: () => userSyncPreferences,
  userSyncPreferencesRelations: () => userSyncPreferencesRelations,
  violations: () => violations,
  violationsRelations: () => violationsRelations,
  vrekoSchema: () => vrekoSchema,
  waitlist: () => waitlist,
  waitlistAuditLogs: () => waitlistAuditLogs,
  waitlistAuditLogsRelations: () => waitlistAuditLogsRelations,
  waitlistReferrals: () => waitlistReferrals,
  waitlistReferralsRelations: () => waitlistReferralsRelations,
  waitlistRelations: () => waitlistRelations,
  waitlistStatusEnum: () => waitlistStatusEnum,
  waitlistTasks: () => waitlistTasks,
  waitlistTasksRelations: () => waitlistTasksRelations,
  webhookEvents: () => webhookEvents,
  webhookEventsRelations: () => webhookEventsRelations,
  workspaceLinks: () => workspaceLinks,
  workspaceSettings: () => workspaceSettings,
  workspaceSettingsRelations: () => workspaceSettingsRelations
});
var planTypeEnum2 = pgEnum("plan_type", [
  "free",
  "pro",
  "team",
  "enterprise"
]);
var subscriptionStatusEnum2 = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "paused",
  "suspended",
  "churned"
]);
var subscriptions2 = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade"
  }),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  plan: planTypeEnum2("plan").notNull().default("free"),
  status: subscriptionStatusEnum2("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialEnd: timestamp("trial_end"),
  seats: integer("seats").default(1),
  metadata: json("metadata"),
  // Credit system fields (pricing_spec_v3.md)
  monthlyCreditsAllowance: integer("monthly_credits_allowance").default(25),
  currentCreditBalance: integer("current_credit_balance").default(0),
  topupCreditBalance: integer("topup_credit_balance").default(0),
  creditOverage: integer("credit_overage").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var subscriptionsRelations2 = relations(subscriptions2, ({ one, many }) => ({
  user: one(user, {
    fields: [
      subscriptions2.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      subscriptions2.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  limits: many(usageLimits)
}));

// ../../packages/platform/dist/db/schema/vreko/admin.js
var activationCodeTypeEnum = pgEnum("activation_code_type", [
  "TRIAL",
  "ENTERPRISE",
  "PIONEER",
  "LIFETIME",
  "PROMOTIONAL"
]);
var adminActionEnum = pgEnum("admin_action", [
  "CODE_CREATED",
  "CODE_REVOKED",
  "CODE_BATCH_CREATED",
  "SUBSCRIPTION_OVERRIDE",
  "USER_IMPERSONATED",
  "ORG_CREATED",
  "TIER_CHANGED",
  "USER_SUSPENDED",
  "USER_UNSUSPENDED",
  "TRIAL_EXTENDED",
  "ADMIN_ADDED",
  "ADMIN_REMOVED"
]);
var adminTargetTypeEnum = pgEnum("admin_target_type", [
  "USER",
  "ORGANIZATION",
  "SUBSCRIPTION",
  "CODE",
  "ADMIN"
]);
var superAdminRoleEnum = pgEnum("super_admin_role", [
  "OWNER",
  "ADMIN",
  "SUPPORT",
  "READONLY"
]);
var activationCodes = pgTable("activation_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Code identifier (SB-TYPE-RANDOM format)
  code: varchar("code", {
    length: 32
  }).unique().notNull(),
  // Code configuration
  type: activationCodeTypeEnum("type").notNull(),
  tier: varchar("tier", {
    length: 50
  }),
  durationDays: integer("duration_days"),
  maxRedemptions: integer("max_redemptions").default(1).notNull(),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  // Campaign tracking
  campaign: varchar("campaign", {
    length: 100
  }),
  notes: text("notes"),
  // Validity period
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }),
  validFrom: timestamp("valid_from", {
    withTimezone: true
  }).defaultNow().notNull(),
  // Creation metadata
  createdById: text("created_by_id").notNull().references(() => user.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  // Revocation (soft delete)
  revokedAt: timestamp("revoked_at", {
    withTimezone: true
  }),
  revokedById: text("revoked_by_id").references(() => user.id, {
    onDelete: "set null"
  }),
  revokedReason: text("revoked_reason")
}, (table) => [
  // Unique constraint on code
  index("activation_codes_code_idx").on(table.code),
  // Query by creator
  index("activation_codes_created_by_idx").on(table.createdById, table.createdAt),
  // Active codes by type (for dashboard stats)
  index("activation_codes_active_type_idx").on(table.type).where(sql`revoked_at IS NULL`),
  // Campaign tracking
  index("activation_codes_campaign_idx").on(table.campaign)
]);
var activationCodeRedemptions = pgTable("activation_code_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Code reference
  codeId: uuid("code_id").notNull().references(() => activationCodes.id, {
    onDelete: "cascade"
  }),
  // User who redeemed
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // What was granted
  tierGranted: varchar("tier_granted", {
    length: 50
  }).notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }),
  // Redemption metadata
  redeemedAt: timestamp("redeemed_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  ipAddress: varchar("ip_address", {
    length: 45
  }),
  userAgent: text("user_agent"),
  // Linked subscription (if created)
  subscriptionId: text("subscription_id").references(() => subscriptions2.id, {
    onDelete: "set null"
  })
}, (table) => [
  // Prevent double redemption by same user
  unique("activation_code_redemptions_unique").on(table.codeId, table.userId),
  // Query redemptions by user
  index("activation_code_redemptions_user_idx").on(table.userId, table.redeemedAt),
  // Query redemptions by code
  index("activation_code_redemptions_code_idx").on(table.codeId)
]);
var adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Who performed the action
  adminId: text("admin_id").notNull().references(() => user.id, {
    onDelete: "set null"
  }),
  // What action was performed
  action: adminActionEnum("action").notNull(),
  // Target of the action
  targetType: adminTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id"),
  // Action-specific details
  metadata: jsonb("metadata").$type(),
  // Request context
  ipAddress: varchar("ip_address", {
    length: 45
  }),
  userAgent: text("user_agent"),
  // Timestamp
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => [
  // Query by admin
  index("admin_audit_log_admin_idx").on(table.adminId, table.createdAt),
  // Query by target
  index("admin_audit_log_target_idx").on(table.targetType, table.targetId),
  // Query by action type
  index("admin_audit_log_action_idx").on(table.action, table.createdAt),
  // Time-based queries
  index("admin_audit_log_created_at_idx").on(table.createdAt)
]);
var superAdmins = pgTable("super_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  // User reference (one-to-one)
  userId: text("user_id").unique().notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Role level
  role: superAdminRoleEnum("role").notNull().default("READONLY"),
  // Granular permissions (JSON object)
  // e.g., { "codes.create": true, "users.suspend": false }
  permissions: jsonb("permissions").$type(),
  // Who added this admin
  addedById: text("added_by_id").references(() => user.id, {
    onDelete: "set null"
  }),
  // Timestamps
  addedAt: timestamp("added_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  lastAccessAt: timestamp("last_access_at", {
    withTimezone: true
  })
}, (table) => [
  // Fast lookup by user
  index("super_admins_user_idx").on(table.userId),
  // Query by role
  index("super_admins_role_idx").on(table.role)
]);
var activationCodesRelations = relations(activationCodes, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [
      activationCodes.createdById
    ],
    references: [
      user.id
    ],
    relationName: "codeCreator"
  }),
  revokedBy: one(user, {
    fields: [
      activationCodes.revokedById
    ],
    references: [
      user.id
    ],
    relationName: "codeRevoker"
  }),
  redemptions: many(activationCodeRedemptions)
}));
var activationCodeRedemptionsRelations = relations(activationCodeRedemptions, ({ one }) => ({
  code: one(activationCodes, {
    fields: [
      activationCodeRedemptions.codeId
    ],
    references: [
      activationCodes.id
    ]
  }),
  user: one(user, {
    fields: [
      activationCodeRedemptions.userId
    ],
    references: [
      user.id
    ]
  }),
  subscription: one(subscriptions2, {
    fields: [
      activationCodeRedemptions.subscriptionId
    ],
    references: [
      subscriptions2.id
    ]
  })
}));
var adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  admin: one(user, {
    fields: [
      adminAuditLog.adminId
    ],
    references: [
      user.id
    ]
  })
}));
var superAdminsRelations = relations(superAdmins, ({ one }) => ({
  user: one(user, {
    fields: [
      superAdmins.userId
    ],
    references: [
      user.id
    ]
  }),
  addedBy: one(user, {
    fields: [
      superAdmins.addedById
    ],
    references: [
      user.id
    ],
    relationName: "adminAdder"
  })
}));
var adminEmailSends = pgTable("admin_email_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: text("admin_user_id").notNull().references(() => user.id, {
    onDelete: "set null"
  }),
  recipientEmail: text("recipient_email").notNull(),
  recipientUserId: text("recipient_user_id").references(() => user.id, {
    onDelete: "set null"
  }),
  template: text("template").notNull(),
  subject: text("subject").notNull(),
  bodyPreview: text("body_preview"),
  resendId: text("resend_id"),
  sentAt: timestamp("sent_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => [
  index("admin_email_sends_admin_idx").on(table.adminUserId, table.sentAt),
  index("admin_email_sends_recipient_idx").on(table.recipientUserId)
]);
var adminTierChanges = pgTable("admin_tier_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: text("admin_user_id").notNull().references(() => user.id, {
    onDelete: "set null"
  }),
  targetUserId: text("target_user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  previousTier: text("previous_tier").notNull(),
  newTier: text("new_tier").notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => [
  index("admin_tier_changes_target_idx").on(table.targetUserId, table.createdAt)
]);
var aiChanges = pgTable("ai_changes", {
  // Primary key  -  server-generated UUID
  id: uuid("id").primaryKey().defaultRandom(),
  // Idempotency key  -  daemon-generated snapshot ID (text, NOT uuid)
  // Format: "snapshot-<timestamp>-<nanoid>"; unique constraint required for onConflictDoUpdate
  snapshotId: text("snapshot_id").notNull(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceFingerprint: text("workspace_fingerprint").notNull(),
  // Session context  -  may be null if snapshot happens outside a session
  sessionId: text("session_id"),
  // AI attribution (from SnapshotManifest)
  aiTool: text("ai_tool").$type(),
  aiConfidence: real("ai_confidence"),
  // Content identity  -  SHA-256 hash of all file diffs in the snapshot (VR-SPEC-B-1/B-3)
  diffHash: text("diff_hash"),
  // File count in this snapshot
  fileCount: integer("file_count").notNull().default(0),
  // Risk score at time of change (0.0–10.0)
  riskScore: real("risk_score"),
  // Snapshot role in the change lifecycle
  snapshotType: text("snapshot_type").$type(),
  // Outcome tracking
  outcome: text("outcome").$type(),
  // Revert linkage  -  populated when outcome = "reverted"
  revertedAt: timestamp("reverted_at", {
    withTimezone: true
  }),
  revertSnapshotId: text("revert_snapshot_id"),
  // Timestamps
  syncedAt: timestamp("synced_at", {
    withTimezone: true
  }).defaultNow(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Unique constraint on snapshot_id  -  idempotency key for onConflictDoUpdate
  snapshotIdUnique: unique("ai_changes_snapshot_id_unique").on(table.snapshotId),
  userIdIdx: index("ai_changes_user_id_idx").on(table.userId),
  workspaceIdx: index("ai_changes_workspace_idx").on(table.workspaceFingerprint),
  sessionIdx: index("ai_changes_session_idx").on(table.sessionId),
  snapshotIdIdx: index("ai_changes_snapshot_id_idx").on(table.snapshotId),
  createdAtIdx: index("ai_changes_created_at_idx").on(table.createdAt)
}));
var aiChangesRelations = relations(aiChanges, ({ one }) => ({
  user: one(user, {
    fields: [
      aiChanges.userId
    ],
    references: [
      user.id
    ]
  })
}));
var analysisEvents = pgTable("analysis_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Analysis metadata
  sessionId: text("session_id"),
  requestId: text("request_id").notNull(),
  // Code context
  filePath: text("file_path"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  characterStart: integer("character_start"),
  characterEnd: integer("character_end"),
  // Risk analysis results
  riskScore: integer("risk_score"),
  riskLevel: text("risk_level"),
  riskFactors: jsonb("risk_factors").$type().default([]),
  // Detection details
  detectedPatterns: jsonb("detected_patterns").$type().default([]),
  // Performance metrics
  analysisTimeMs: integer("analysis_time_ms"),
  fileSizeBytes: integer("file_size_bytes"),
  // Client context
  clientType: text("client_type"),
  clientVersion: text("client_version"),
  ideVersion: text("ide_version"),
  // Git context
  gitBranch: text("git_branch"),
  gitCommit: text("git_commit"),
  // Project context
  projectId: text("project_id"),
  workspaceId: text("workspace_id"),
  // Timestamps
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var analysisEventsRelations = relations(analysisEvents, ({ one }) => ({
  user: one(user, {
    fields: [
      analysisEvents.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      analysisEvents.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var apiKeyMetadata = pgTable("api_key_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  apiKeyId: text("api_key_id").notNull().unique().references(() => apiKeys.id),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Key details
  name: text("name").notNull(),
  environment: text("environment").default("production"),
  // Permissions/scopes
  scopes: jsonb("scopes").default(JSON.stringify([
    "code:analyze",
    "code:refactor",
    "code:search"
  ])),
  // Usage limits per key (optional override)
  rateLimitPerMinute: integer("rate_limit_per_minute"),
  rateLimitPerHour: integer("rate_limit_per_hour"),
  dailyRequestLimit: integer("daily_request_limit"),
  // Tracking
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: inet("last_used_ip"),
  lastUsedClient: text("last_used_client"),
  totalRequests: integer("total_requests").default(0),
  // Security
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  signingSecret: text("signing_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var apiKeyMetadataRelations = relations(apiKeyMetadata, ({ one }) => ({
  user: one(user, {
    fields: [
      apiKeyMetadata.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      apiKeyMetadata.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var apiKeyUsage = pgTable("api_key_usage", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  apiKeyId: text("api_key_id").notNull(),
  endpoint: text("endpoint").notNull(),
  requestCount: integer("request_count").default(1).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var apiKeys2 = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
  userId: text("user_id").notNull(),
  name: text("name"),
  key: text("key").notNull(),
  keyPreview: text("key_preview").notNull(),
  permissions: text("permissions").array().default([]).notNull(),
  orgId: text("org_id"),
  createdBy: text("created_by"),
  revoked: boolean("revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at")
});
var bypassEvents = pgTable("bypass_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Bypass details
  reason: text("reason"),
  forced: boolean("forced").notNull().default(false),
  // Context
  filePath: text("file_path"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  characterStart: integer("character_start"),
  characterEnd: integer("character_end"),
  // Risk at time of bypass
  riskScore: integer("risk_score"),
  riskLevel: text("risk_level"),
  // Violation details
  ruleId: text("rule_id"),
  ruleName: text("rule_name"),
  violationDescription: text("violation_description"),
  // Metadata
  metadata: jsonb("metadata").$type().default({}),
  // Context
  clientType: text("client_type"),
  clientVersion: text("client_version"),
  ideVersion: text("ide_version"),
  // Git context
  gitBranch: text("git_branch"),
  gitCommit: text("git_commit"),
  // Project context
  projectId: text("project_id"),
  workspaceId: text("workspace_id"),
  // Timestamps
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var bypassEventsRelations = relations(bypassEvents, ({ one }) => ({
  user: one(user, {
    fields: [
      bypassEvents.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      bypassEvents.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var capabilityAudit = pgTable("capability_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  // ===================
  // OWNERSHIP
  // ===================
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // ===================
  // WHAT CHANGED
  // ===================
  /** Type of capability change */
  capabilityType: text("capability_type").$type().notNull(),
  /** Detailed change payload (type depends on capabilityType) */
  change: jsonb("change").$type(),
  /** Human-readable reason for the change */
  reason: text("reason"),
  // ===================
  // PERFORMANCE IMPACT
  // ===================
  /** Performance metrics before the change */
  performanceBefore: jsonb("performance_before").$type(),
  /** Performance metrics after the change */
  performanceAfter: jsonb("performance_after").$type(),
  // ===================
  // CONTEXT
  // ===================
  /** MCP session ID where change originated */
  sessionId: uuid("session_id"),
  /** Workspace ID (hashed) where change originated */
  workspaceId: text("workspace_id"),
  /** Client type that triggered the change */
  clientType: text("client_type"),
  // ===================
  // IDEMPOTENCY
  // ===================
  /** Unique key to prevent duplicate audit entries on retry */
  idempotencyKey: text("idempotency_key").unique(),
  // ===================
  // TIMESTAMPS
  // ===================
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var capabilityAuditRelations = relations(capabilityAudit, ({ one }) => ({
  user: one(user, {
    fields: [
      capabilityAudit.userId
    ],
    references: [
      user.id
    ]
  })
}));
var ciOutcomes = pgTable("ci_outcomes", {
  // Primary key  -  server-generated UUID
  id: uuid("id").primaryKey().defaultRandom(),
  // FK to ai_changes.id (UUID PK)  -  CASCADE on parent delete
  aiChangeId: uuid("ai_change_id").notNull().references(() => aiChanges.id, {
    onDelete: "cascade"
  }),
  // CI pipeline metadata
  pipeline: text("pipeline").$type().notNull(),
  status: text("status").$type().notNull(),
  // Test counts
  testsPassed: integer("tests_passed"),
  testsFailed: integer("tests_failed"),
  // Coverage change (can be negative, e.g. -2.3 = lost 2.3% coverage)
  coverageDelta: real("coverage_delta"),
  // Pipeline duration
  durationMs: integer("duration_ms"),
  // Link to the CI run for drilldown
  runUrl: text("run_url"),
  // Timestamps
  occurredAt: timestamp("occurred_at", {
    withTimezone: true
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  aiChangeIdIdx: index("ci_outcomes_ai_change_id_idx").on(table.aiChangeId),
  statusIdx: index("ci_outcomes_status_idx").on(table.status),
  occurredAtIdx: index("ci_outcomes_occurred_at_idx").on(table.occurredAt)
}));
var codeContexts = pgTable("code_contexts", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Context identification (hashed for privacy)
  workspaceHash: text("workspace_hash").notNull(),
  filePathHash: text("file_path_hash").notNull(),
  // File metadata only (never store actual code)
  fileExtension: text("file_extension").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  lineCount: integer("line_count"),
  language: text("language"),
  // Analysis results cache (can be reused)
  lastAnalysis: jsonb("last_analysis"),
  lastAnalysisAt: timestamp("last_analysis_at"),
  lastRefactor: jsonb("last_refactor"),
  lastRefactorAt: timestamp("last_refactor_at"),
  // Usage tracking
  analysisCount: integer("analysis_count").default(0),
  refactorCount: integer("refactor_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userIdWorkspaceHashIndex: uniqueIndex("idx_code_contexts_user_workspace").on(table.userId, table.workspaceHash),
  lastAccessedAtIndex: uniqueIndex("idx_code_contexts_last_accessed").on(table.lastAccessedAt),
  userWorkspacePathUnique: uniqueIndex("idx_code_contexts_user_workspace_path_unique").on(table.userId, table.workspaceHash, table.filePathHash)
}));
var codeContextsRelations = relations(codeContexts, ({ one }) => ({
  user: one(user, {
    fields: [
      codeContexts.userId
    ],
    references: [
      user.id
    ]
  })
}));
var codebaseBindings = pgTable("codebase_bindings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Canonical codebase identity from daemon */
  codebaseHash: varchar("codebase_hash", {
    length: 64
  }).notNull(),
  /** Initial commit hash  -  nullable (shallow clones, new repos) */
  repoSignature: varchar("repo_signature", {
    length: 64
  }),
  /** Account this codebase is bound to */
  accountId: varchar("account_id", {
    length: 255
  }).notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  /** Device this binding was created from */
  machineIdHash: varchar("machine_id_hash", {
    length: 64
  }).notNull(),
  /** User's tier at time of binding */
  tier: varchar("tier", {
    length: 20
  }).notNull().default("free"),
  /** Which signals contributed to the fingerprint */
  signalSources: varchar("signal_sources", {
    length: 255
  }),
  firstSeen: timestamp("first_seen", {
    withTimezone: true
  }).defaultNow().notNull(),
  lastSeen: timestamp("last_seen", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("uq_codebase_account").on(table.codebaseHash, table.accountId),
  /** Index for account lookups */
  index("codebase_bindings_account_id_idx").on(table.accountId),
  /** Index for codebase hash lookups */
  index("codebase_bindings_hash_idx").on(table.codebaseHash)
]);
var codebaseBindingsRelations = relations(codebaseBindings, ({ one }) => ({
  account: one(user, {
    fields: [
      codebaseBindings.accountId
    ],
    references: [
      user.id
    ]
  })
}));
var conflictLog = pgTable("conflict_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Type of conflict: "device" | "codebase" */
  type: varchar("type", {
    length: 20
  }).notNull(),
  /** Device hash involved in conflict */
  machineIdHash: varchar("machine_id_hash", {
    length: 64
  }),
  /** Codebase hash involved in conflict */
  codebaseHash: varchar("codebase_hash", {
    length: 64
  }),
  /** Account that previously owned the device/codebase */
  existingAccountId: varchar("existing_account_id", {
    length: 255
  }).notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  /** Account attempting to bind */
  newAccountId: varchar("new_account_id", {
    length: 255
  }).notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  /** Enrichment: IP, user agent, etc. added async */
  metadata: jsonb("metadata").$type(),
  /** When the conflict was detected */
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  /** null = unresolved, "legitimate" | "abuse" | "dismissed" */
  resolution: varchar("resolution", {
    length: 20
  }),
  resolvedAt: timestamp("resolved_at", {
    withTimezone: true
  })
}, (table) => [
  /** Index for type-based queries */
  index("conflict_log_type_idx").on(table.type),
  /** Index for existing account lookups */
  index("conflict_log_existing_account_idx").on(table.existingAccountId),
  /** Index for new account lookups */
  index("conflict_log_new_account_idx").on(table.newAccountId),
  /** Index for time-based queries */
  index("conflict_log_created_at_idx").on(table.createdAt)
]);
var conflictLogRelations = relations(conflictLog, ({ one }) => ({
  existingAccount: one(user, {
    fields: [
      conflictLog.existingAccountId
    ],
    references: [
      user.id
    ]
  }),
  newAccount: one(user, {
    fields: [
      conflictLog.newAccountId
    ],
    references: [
      user.id
    ]
  })
}));
var deviceAuthCodes = pgTable("device_auth_codes", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  // Device code credentials
  deviceCode: text("device_code").notNull().unique(),
  userCode: text("user_code").notNull(),
  // Client identifier
  clientId: text("client_id").notNull(),
  // Verification URI
  verificationUri: text("verification_uri").notNull(),
  // User who approved (null until approved)
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  // Status
  approved: text("approved").notNull().default("false"),
  approvedAt: timestamp("approved_at"),
  // Expiration
  expiresAt: timestamp("expires_at").notNull(),
  // API Key issued after approval
  issuedApiKeyId: text("issued_api_key_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  deviceCodeIdx: index("device_auth_codes_device_code_idx").on(table.deviceCode),
  userCodeIdx: index("device_auth_codes_user_code_idx").on(table.userCode),
  userIdIdx: index("device_auth_codes_user_id_idx").on(table.userId),
  expiresAtIdx: index("device_auth_codes_expires_at_idx").on(table.expiresAt),
  approvedIdx: index("device_auth_codes_approved_idx").on(table.approved)
}));
var deviceBindings = pgTable("device_bindings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** SHA-256 hash (32 hex chars) from daemon device fingerprint */
  machineIdHash: varchar("machine_id_hash", {
    length: 64
  }).notNull(),
  /** Account this device is bound to */
  accountId: varchar("account_id", {
    length: 255
  }).notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  /** VS Code machineId (Phase 2  -  nullable for now) */
  vscodeMachineId: varchar("vscode_machine_id", {
    length: 64
  }),
  /** Platform signature (coarser, for fleet analytics) */
  platformSignature: varchar("platform_signature", {
    length: 64
  }),
  /** Whether platform serial was available during fingerprinting */
  serialAvailable: boolean("serial_available").default(true),
  /** Server-side ground truth  -  survives ~/.vreko/ deletion */
  firstSeen: timestamp("first_seen", {
    withTimezone: true
  }).defaultNow().notNull(),
  /** Updated on every bind call */
  lastSeen: timestamp("last_seen", {
    withTimezone: true
  }).defaultNow().notNull(),
  /** Abuse trust score: starts at 100, degrades on suspicious signals */
  trustScore: integer("trust_score").default(100).notNull()
}, (table) => [
  /** One device can only be bound to one account */
  uniqueIndex("uq_device_account").on(table.machineIdHash, table.accountId),
  /** Index for account lookups */
  index("device_bindings_account_id_idx").on(table.accountId),
  /** Index for device hash lookups */
  index("device_bindings_machine_id_idx").on(table.machineIdHash)
]);
var deviceBindingsRelations = relations(deviceBindings, ({ one }) => ({
  account: one(user, {
    fields: [
      deviceBindings.accountId
    ],
    references: [
      user.id
    ]
  })
}));
var deviceCode = pgTable("device_code", {
  id: text("id").primaryKey(),
  deviceCode: text("device_code").notNull(),
  userCode: text("user_code").notNull(),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull(),
  lastPolledAt: timestamp("last_polled_at"),
  pollingInterval: integer("polling_interval"),
  clientId: text("client_id"),
  scope: text("scope"),
  // Reason for denial  -  null unless status is "denied"
  deniedReason: text("denied_reason")
}, (table) => ({
  deviceCodeIdx: index("device_code_device_code_idx").on(table.deviceCode),
  userCodeIdx: index("device_code_user_code_idx").on(table.userCode),
  userIdIdx: index("device_code_user_id_idx").on(table.userId)
}));
var engagementScores = pgTable("engagement_scores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // User
  userId: text("user_id").unique().notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Score components
  totalEngagementScore: integer("total_engagement_score").default(0).notNull(),
  usageScore: integer("usage_score").default(0).notNull(),
  feedbackQualityScore: integer("feedback_quality_score").default(0).notNull(),
  communityScore: integer("community_score").default(0).notNull(),
  referralScore: integer("referral_score").default(0).notNull(),
  // Beta tier
  betaTier: text("beta_tier").default("none").notNull(),
  tierUnlockedAt: timestamp("tier_unlocked_at"),
  // Qualifying actions (for transparency)
  qualifyingActions: jsonb("qualifying_actions").$type().default([]),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull()
}, (table) => [
  // Unique: one score per user
  index("engagement_scores_user_idx").on(table.userId),
  // Query by tier
  index("engagement_scores_tier_idx").on(table.betaTier),
  // Leaderboard query
  index("engagement_scores_total_idx").on(table.totalEngagementScore)
]);
var engagementActions = pgTable("engagement_actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // User
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Action details
  actionType: text("action_type").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  // Progress tracking
  tierProgressBefore: integer("tier_progress_before").notNull(),
  tierProgressAfter: integer("tier_progress_after").notNull(),
  engagementScoreDelta: integer("engagement_score_delta").notNull(),
  // Action metadata
  metadata: jsonb("metadata").$type().default({}),
  // Timestamp
  performedAt: timestamp("performed_at").defaultNow().notNull()
}, (table) => [
  // Query by user
  index("engagement_actions_user_idx").on(table.userId),
  // Query by action type (for analytics)
  index("engagement_actions_type_idx").on(table.actionType),
  // Query recent actions
  index("engagement_actions_time_idx").on(table.performedAt)
]);
var engagementScoresRelations = relations(engagementScores, ({ one, many }) => ({
  user: one(user, {
    fields: [
      engagementScores.userId
    ],
    references: [
      user.id
    ]
  }),
  actions: many(engagementActions)
}));
var engagementActionsRelations = relations(engagementActions, ({ one }) => ({
  user: one(user, {
    fields: [
      engagementActions.userId
    ],
    references: [
      user.id
    ]
  }),
  score: one(engagementScores, {
    fields: [
      engagementActions.userId
    ],
    references: [
      engagementScores.userId
    ]
  })
}));
var ssoProviderEnum = pgEnum("sso_provider", [
  "okta",
  "azure_ad",
  "google_workspace",
  "onelogin",
  "ping_identity",
  "custom_saml",
  "custom_oidc"
]);
var ssoProtocolEnum = pgEnum("sso_protocol", [
  "saml2",
  "oidc"
]);
var ssoProviderStatusEnum = pgEnum("sso_provider_status", [
  "active",
  "inactive",
  "testing"
]);
var ssoConfiguration = pgTable("sso_configuration", {
  configId: uuid("config_id").primaryKey().defaultRandom(),
  // Organization reference
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  // Provider info
  provider: ssoProviderEnum("provider").notNull(),
  protocol: ssoProtocolEnum("protocol").notNull(),
  // Status flags
  isEnabled: boolean("is_enabled").default(false).notNull(),
  enforceSso: boolean("enforce_sso").default(false).notNull(),
  // SAML configuration
  samlConfig: jsonb("saml_config").$type(),
  // OIDC configuration
  oidcConfig: jsonb("oidc_config").$type(),
  // Domain restrictions
  allowedDomains: text("allowed_domains").array(),
  // Auto-provisioning settings
  autoProvisioning: jsonb("auto_provisioning").$type().default({
    enabled: false,
    defaultRole: "member",
    syncGroups: false
  }),
  // Timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  lastAuthAt: timestamp("last_auth_at", {
    withTimezone: true
  })
}, (table) => [
  // Query by organization
  index("sso_config_org_idx").on(table.organizationId),
  // Query enabled configs
  index("sso_config_enabled_idx").on(table.isEnabled).where(sql`is_enabled = true`),
  // Unique config per org
  unique("sso_config_unique_org").on(table.organizationId)
]);
var ssoSession = pgTable("sso_session", {
  sessionId: uuid("session_id").primaryKey().defaultRandom(),
  // User reference
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // SSO config reference
  ssoConfigId: uuid("sso_config_id").notNull().references(() => ssoConfiguration.configId, {
    onDelete: "cascade"
  }),
  // IdP session info (for single logout)
  idpSessionId: text("idp_session_id"),
  // Session timing
  authenticatedAt: timestamp("authenticated_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  // Client info
  ipAddress: varchar("ip_address", {
    length: 45
  }),
  userAgent: text("user_agent")
}, (table) => [
  // Query by user
  index("sso_session_user_idx").on(table.userId),
  // Query by config
  index("sso_session_config_idx").on(table.ssoConfigId),
  // Cleanup expired sessions
  index("sso_session_expires_idx").on(table.expiresAt),
  // Lookup by IdP session ID
  index("sso_session_idp_idx").on(table.idpSessionId).where(sql`idp_session_id IS NOT NULL`)
]);
var transformTypeEnum = pgEnum("transform_type", [
  "DIRECT",
  "REGEX",
  "LOOKUP",
  "CUSTOM"
]);
var riskDecisionEnum = pgEnum("risk_decision", [
  "ALLOW",
  "CHALLENGE_MFA",
  "CHALLENGE_EMAIL",
  "BLOCK"
]);
var authMethodEnum = pgEnum("auth_method", [
  "PASSWORD",
  "SSO_SAML",
  "SSO_OIDC",
  "API_KEY",
  "OAUTH",
  "MAGIC_LINK",
  "PASSKEY"
]);
var actorTypeEnum = pgEnum("actor_type", [
  "USER",
  "SYSTEM",
  "API"
]);
var ssoAttributeMappings = pgTable("sso_attribute_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Reference to SSO configuration (from 0016 migration)
  // Note: We use text since sso_configuration uses uuid but we reference by config_id
  configId: uuid("config_id").notNull(),
  // Mapping definition
  sourceAttribute: varchar("source_attribute", {
    length: 100
  }).notNull(),
  targetField: varchar("target_field", {
    length: 100
  }).notNull(),
  // Transform configuration
  transformType: transformTypeEnum("transform_type").notNull().default("DIRECT"),
  transformConfig: jsonb("transform_config").$type(),
  // Validation
  isRequired: boolean("is_required").default(false).notNull(),
  defaultValue: text("default_value"),
  // Timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => [
  // Query mappings by config
  index("sso_attribute_mappings_config_idx").on(table.configId),
  // Unique mapping per source/target pair per config
  unique("sso_attribute_mappings_unique").on(table.configId, table.sourceAttribute, table.targetField)
]);
var riskAssessments = pgTable("risk_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // User context
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  sessionId: varchar("session_id", {
    length: 100
  }),
  // Risk calculation
  score: integer("score").notNull(),
  factors: jsonb("factors").notNull().$type(),
  decision: riskDecisionEnum("decision").notNull(),
  // Challenge tracking
  challengeCompleted: boolean("challenge_completed"),
  // Request context
  ipAddress: varchar("ip_address", {
    length: 45
  }),
  userAgent: text("user_agent"),
  geoLocation: jsonb("geo_location").$type(),
  // Timestamp
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => [
  // Query by user
  index("risk_assessments_user_idx").on(table.userId, table.createdAt),
  // Query by decision for analytics
  index("risk_assessments_decision_idx").on(table.decision, table.createdAt),
  // Query by score range for analytics
  index("risk_assessments_score_idx").on(table.score)
]);
var trustedDevices = pgTable("trusted_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  // User owner
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Device identification
  deviceFingerprint: varchar("device_fingerprint", {
    length: 64
  }).notNull(),
  deviceName: varchar("device_name", {
    length: 100
  }),
  // Usage tracking
  lastUsedAt: timestamp("last_used_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  // Origin context
  ipAddress: varchar("ip_address", {
    length: 45
  })
}, (table) => [
  // Unique device per user
  unique("trusted_devices_unique").on(table.userId, table.deviceFingerprint),
  // Query by user
  index("trusted_devices_user_idx").on(table.userId),
  // Cleanup expired devices
  index("trusted_devices_expires_idx").on(table.expiresAt)
]);
var userSessionContext = pgTable("user_session_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Session identity
  sessionId: varchar("session_id", {
    length: 100
  }).unique().notNull(),
  // User reference
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Authentication details
  authMethod: authMethodEnum("auth_method").notNull(),
  ssoConfigId: uuid("sso_config_id"),
  riskAssessmentId: uuid("risk_assessment_id").references(() => riskAssessments.id, {
    onDelete: "set null"
  }),
  // MFA status
  mfaCompleted: boolean("mfa_completed").default(false).notNull(),
  mfaMethod: varchar("mfa_method", {
    length: 50
  }),
  // Request context
  ipAddress: varchar("ip_address", {
    length: 45
  }),
  userAgent: text("user_agent"),
  geoLocation: jsonb("geo_location").$type(),
  // Lifecycle timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  terminatedAt: timestamp("terminated_at", {
    withTimezone: true
  }),
  terminationReason: varchar("termination_reason", {
    length: 100
  })
}, (table) => [
  // Query by user
  index("user_session_context_user_idx").on(table.userId, table.createdAt),
  // Active sessions
  index("user_session_context_active_idx").on(table.userId).where(sql`terminated_at IS NULL`),
  // Query by auth method for analytics
  index("user_session_context_method_idx").on(table.authMethod)
]);
var conditionalAccessPolicies = pgTable("conditional_access_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Organization scope
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  // Policy definition
  name: varchar("name", {
    length: 100
  }).notNull(),
  description: text("description"),
  priority: integer("priority").default(0).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  // Conditions - when this policy applies
  conditions: jsonb("conditions").notNull().$type(),
  // Actions - what to do when conditions match
  actions: jsonb("actions").notNull().$type(),
  // Metadata
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null"
  })
}, (table) => [
  // Query policies by org
  index("conditional_access_policies_org_idx").on(table.organizationId),
  // Active policies by priority
  index("conditional_access_policies_active_idx").on(table.organizationId, table.priority).where(sql`is_enabled = true`)
]);
var enterpriseAuditLog = pgTable("enterprise_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Organization scope
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  // Actor (who performed the action)
  actorId: text("actor_id").references(() => user.id, {
    onDelete: "set null"
  }),
  actorType: actorTypeEnum("actor_type").notNull(),
  // Action details
  action: varchar("action", {
    length: 100
  }).notNull(),
  resourceType: varchar("resource_type", {
    length: 100
  }),
  resourceId: text("resource_id"),
  // Additional context
  metadata: jsonb("metadata").$type(),
  // Request context
  ipAddress: varchar("ip_address", {
    length: 45
  }),
  userAgent: text("user_agent"),
  // Timestamp
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => [
  // Query by org and time (primary query pattern)
  index("enterprise_audit_log_org_time_idx").on(table.organizationId, table.createdAt),
  // Query by actor
  index("enterprise_audit_log_actor_idx").on(table.actorId),
  // Query by action type
  index("enterprise_audit_log_action_idx").on(table.action, table.createdAt),
  // Query by resource
  index("enterprise_audit_log_resource_idx").on(table.resourceType, table.resourceId)
]);
var ssoConfigurationRelations = relations(ssoConfiguration, ({ one, many }) => ({
  organization: one(organization, {
    fields: [
      ssoConfiguration.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  attributeMappings: many(ssoAttributeMappings),
  sessions: many(ssoSession)
}));
var ssoSessionRelations = relations(ssoSession, ({ one }) => ({
  user: one(user, {
    fields: [
      ssoSession.userId
    ],
    references: [
      user.id
    ]
  }),
  config: one(ssoConfiguration, {
    fields: [
      ssoSession.ssoConfigId
    ],
    references: [
      ssoConfiguration.configId
    ]
  })
}));
var ssoAttributeMappingsRelations = relations(ssoAttributeMappings, ({ one }) => ({
  config: one(ssoConfiguration, {
    fields: [
      ssoAttributeMappings.configId
    ],
    references: [
      ssoConfiguration.configId
    ]
  })
}));
var riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  user: one(user, {
    fields: [
      riskAssessments.userId
    ],
    references: [
      user.id
    ]
  })
}));
var trustedDevicesRelations = relations(trustedDevices, ({ one }) => ({
  user: one(user, {
    fields: [
      trustedDevices.userId
    ],
    references: [
      user.id
    ]
  })
}));
var userSessionContextRelations = relations(userSessionContext, ({ one }) => ({
  user: one(user, {
    fields: [
      userSessionContext.userId
    ],
    references: [
      user.id
    ]
  }),
  riskAssessment: one(riskAssessments, {
    fields: [
      userSessionContext.riskAssessmentId
    ],
    references: [
      riskAssessments.id
    ]
  })
}));
var conditionalAccessPoliciesRelations = relations(conditionalAccessPolicies, ({ one }) => ({
  organization: one(organization, {
    fields: [
      conditionalAccessPolicies.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  createdBy: one(user, {
    fields: [
      conditionalAccessPolicies.createdById
    ],
    references: [
      user.id
    ]
  })
}));
var enterpriseAuditLogRelations = relations(enterpriseAuditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [
      enterpriseAuditLog.organizationId
    ],
    references: [
      organization.id
    ]
  }),
  actor: one(user, {
    fields: [
      enterpriseAuditLog.actorId
    ],
    references: [
      user.id
    ]
  })
}));
var severityLevelEnum = pgEnum("severity_level", [
  "debug",
  "info",
  "warning",
  "error",
  "critical"
]);
var errorLogs = pgTable("error_logs", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  // Error identification
  errorId: text("error_id").notNull().$defaultFn(() => nanoid()),
  errorCode: text("error_code"),
  errorType: text("error_type"),
  // Context
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id"),
  requestId: text("request_id"),
  // Error details
  severity: severityLevelEnum("severity").notNull().default("error"),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  // Request context
  endpoint: text("endpoint"),
  method: text("method"),
  requestBody: jsonb("request_body"),
  // Environment
  serviceName: text("service_name").default("api"),
  environment: text("environment").default("production"),
  version: text("version"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var errorLogs202510 = pgTable("error_logs_2025_10", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  // Error identification
  errorId: text("error_id").notNull().$defaultFn(() => nanoid()),
  errorCode: text("error_code"),
  errorType: text("error_type"),
  // Context
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id"),
  requestId: text("request_id"),
  // Error details
  severity: severityLevelEnum("severity").notNull().default("error"),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  // Request context
  endpoint: text("endpoint"),
  method: text("method"),
  requestBody: jsonb("request_body"),
  // Environment
  serviceName: text("service_name").default("api"),
  environment: text("environment").default("production"),
  version: text("version"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(user, {
    fields: [
      errorLogs.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      errorLogs.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var sessionSeverityEnum = pgEnum("session_severity", [
  "low",
  "medium",
  "high",
  "critical"
]);
var extensionSessions = pgTable("extension_sessions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Session timing
  sessionStart: timestamp("session_start").defaultNow().notNull(),
  sessionEnd: timestamp("session_end"),
  // Extension context (privacy-safe)
  extensionVersion: text("extension_version").notNull(),
  vscodeVersion: text("vscode_version").notNull(),
  platform: text("platform").notNull(),
  // Activity metrics
  requestsCount: integer("requests_count").default(0).notNull(),
  // Workspace info (hashed for privacy)
  workspaceHash: text("workspace_hash"),
  // Denormalized session summary fields for performance
  highestSeverity: sessionSeverityEnum("highest_severity"),
  aiPresent: boolean("ai_present").default(false),
  issuesByType: json("issues_by_type").$type().default({}),
  bytesSaved: integer("bytes_saved").default(0),
  // AI detection results (v1 schema)
  aiAssistLevel: text("ai_assist_level").notNull().default("unknown"),
  aiConfidenceScore: real("ai_confidence_score").default(0).notNull(),
  aiProvider: text("ai_provider").notNull().default("none"),
  aiMetadata: json("ai_metadata").$type(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var extensionSessionsRelations = relations(extensionSessions, ({ one }) => ({
  user: one(user, {
    fields: [
      extensionSessions.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      extensionSessions.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var featureCategoryEnum = pgEnum("feature_category", [
  "code_analysis",
  "code_refactor",
  "code_search",
  "git_operations",
  "ai_assistance",
  "debugging",
  "testing",
  "documentation"
]);
var featureUsage = pgTable("feature_usage", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id").references(() => extensionSessions.id),
  // Feature identification
  featureName: text("feature_name").notNull(),
  featureCategory: featureCategoryEnum("feature_category").notNull(),
  // Trigger method
  triggerMethod: text("trigger_method"),
  // Context
  fileType: text("file_type"),
  projectType: text("project_type"),
  projectSize: text("project_size"),
  // Metrics
  durationMs: integer("duration_ms"),
  success: boolean("success").default(true),
  // Impact (when applicable)
  linesChanged: integer("lines_changed"),
  filesAffected: integer("files_affected"),
  // Client
  clientVersion: text("client_version"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var featureUsage202510 = pgTable("feature_usage_2025_10", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id").references(() => extensionSessions.id),
  // Feature identification
  featureName: text("feature_name").notNull(),
  featureCategory: featureCategoryEnum("feature_category").notNull(),
  // Trigger method
  triggerMethod: text("trigger_method"),
  // Context
  fileType: text("file_type"),
  projectType: text("project_type"),
  projectSize: text("project_size"),
  // Metrics
  durationMs: integer("duration_ms"),
  success: boolean("success").default(true),
  // Impact (when applicable)
  linesChanged: integer("lines_changed"),
  filesAffected: integer("files_affected"),
  // Client
  clientVersion: text("client_version"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var featureUsageRelations = relations(featureUsage, ({ one }) => ({
  user: one(user, {
    fields: [
      featureUsage.userId
    ],
    references: [
      user.id
    ]
  }),
  session: one(extensionSessions, {
    fields: [
      featureUsage.sessionId
    ],
    references: [
      extensionSessions.id
    ]
  })
}));
var feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys2.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id"),
  requestId: text("request_id"),
  feedbackType: text("feedback_type").notNull(),
  feedbackText: text("feedback_text"),
  rating: integer("rating"),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userCreatedAtIndex: index("feedback_user_created_at_idx").on(table.userId, table.createdAt),
    apiKeyCreatedAtIndex: index("feedback_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
    feedbackTypeCheck: check("feedback_feedback_type_check", sql`feedback_type IN ('positive', 'negative', 'neutral', 'bug_report')`)
  };
});
var fileSnapshotSessions = pgTable("file_snapshot_sessions", {
  // Primary key - matches local daemon-generated ID
  id: text("id").primaryKey(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Workspace fingerprint: sha256(gitRemote + userId)
  // - Privacy: raw path never stored
  // - Stability: same workspace across machines maps to same fingerprint
  // - User isolation: different users' copies of same repo produce different fingerprints
  workspaceFingerprint: text("workspace_fingerprint").notNull(),
  // Timing
  startedAt: timestamp("started_at", {
    withTimezone: true
  }).notNull(),
  endedAt: timestamp("ended_at", {
    withTimezone: true
  }),
  // Core session data
  reason: text("reason").notNull(),
  snapshotIds: jsonb("snapshot_ids").$type().default([]),
  // ML Flywheel fields (typed columns, NOT in metadata blob)
  // These feed the risk model training pipeline
  // AIToolBehaviorSignal - which AI tools were active
  aiToolsActive: jsonb("ai_tools_active").$type().default([]),
  // Cross-session conflict data
  concurrentSessionCount: integer("concurrent_session_count").default(0),
  fileConflictsDetected: integer("file_conflicts_detected").default(0),
  // Key model feedback signal - peak risk during session
  peakRiskScore: integer("peak_risk_score"),
  // Core quality metric - how many rollbacks happened
  rollbacksPerformed: integer("rollbacks_performed").default(0),
  // Session outcome classification
  outcome: text("outcome").$type(),
  // Health delta - can be negative (degradation)
  healthDelta: integer("health_delta"),
  // Clustering signals - enable cohort analysis
  primaryStack: jsonb("primary_stack").$type().default([]),
  workspaceScale: text("workspace_scale").$type(),
  // Session quality metrics
  coherenceScore: text("coherence_score").$type(),
  fileCount: integer("file_count").default(0),
  // Sync metadata
  syncedAt: timestamp("synced_at", {
    withTimezone: true
  }).defaultNow(),
  // Extension data only (NOT for known flywheel fields)
  // Use sparingly - prefer typed columns for queryable data
  metadata: jsonb("metadata").$type().default({})
}, (table) => ({
  // User lookup index
  userIdIdx: index("file_snapshot_sessions_user_id_idx").on(table.userId),
  // Workspace lookup index
  workspaceIdx: index("file_snapshot_sessions_workspace_idx").on(table.workspaceFingerprint),
  // Time-based queries for dashboard
  startedAtIdx: index("file_snapshot_sessions_started_at_idx").on(table.startedAt),
  // Composite for common query: user's recent sessions
  userStartedIdx: index("file_snapshot_sessions_user_started_idx").on(table.userId, table.startedAt)
}));
var fileSnapshotSessionsRelations = relations(fileSnapshotSessions, ({ one }) => ({
  user: one(user, {
    fields: [
      fileSnapshotSessions.userId
    ],
    references: [
      user.id
    ]
  })
}));
var fingerprints = pgTable("fingerprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership - scoped to user for tenant isolation
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Workspace reference - logical workspace within user scope
  workspaceId: uuid("workspace_id").notNull(),
  workspaceKey: text("workspace_key").notNull(),
  // Policy at time of fingerprint (immutable record)
  policy: jsonb("policy").$type().notNull(),
  // Scan metadata
  scan: jsonb("scan").$type().notNull(),
  // Computed hashes
  driftFull: text("drift_full").notNull(),
  driftTruncated: text("drift_truncated").notNull(),
  similarity64: text("similarity_64"),
  similarityAlg: text("similarity_alg"),
  // Facts storage level
  factsStored: text("facts_stored").notNull().default("summary"),
  // Timestamps
  receivedAt: timestamp("received_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  // Index for workspace lookups (most common query pattern)
  index("fingerprints_workspace_id_idx").on(table.workspaceId),
  // Index for user-scoped queries
  index("fingerprints_user_id_idx").on(table.userId),
  // Composite index for latest fingerprint lookup
  index("fingerprints_workspace_received_idx").on(table.workspaceId, table.receivedAt)
]);
var fingerprintsRelations = relations(fingerprints, ({ one }) => ({
  user: one(user, {
    fields: [
      fingerprints.userId
    ],
    references: [
      user.id
    ]
  })
}));
var userSyncPreferences = pgTable("user_sync_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  personalSyncEnabled: boolean("personal_sync_enabled").notNull().default(false),
  choiceMadeAt: timestamp("choice_made_at", {
    withTimezone: true
  }),
  lastSyncedFromDevice: timestamp("last_synced_from_device", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("user_sync_preferences_user_idx").on(table.userId)
}));
var userSyncPreferencesRelations = relations(userSyncPreferences, ({ one }) => ({
  user: one(user, {
    fields: [
      userSyncPreferences.userId
    ],
    references: [
      user.id
    ]
  })
}));
var userContributionPreferences = pgTable("user_contribution_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  sharedLearningEnabled: boolean("shared_learning_enabled").notNull().default(false),
  choiceMadeAt: timestamp("choice_made_at", {
    withTimezone: true
  }),
  promptVersion: text("prompt_version").notNull().default("1.0"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("user_contribution_preferences_user_idx").on(table.userId)
}));
var userContributionPreferencesRelations = relations(userContributionPreferences, ({ one }) => ({
  user: one(user, {
    fields: [
      userContributionPreferences.userId
    ],
    references: [
      user.id
    ]
  })
}));
var sessionIngests = pgTable("session_ingests", {
  // Internal DB key
  id: uuid("id").primaryKey().defaultRandom(),
  // Stable client identifier
  externalSessionId: text("external_session_id").notNull().unique(),
  // Stamped server-side from auth context  -  never from client payload
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  tier: text("tier").notNull(),
  activeOrgId: text("active_org_id").references(() => organization.id, {
    onDelete: "set null"
  }),
  // Effective scopes at ingest time (derived, stored for audit)
  scopePersonal: boolean("scope_personal").notNull().default(false),
  scopeGlobal: boolean("scope_global").notNull().default(false),
  scopeOrgMode: text("scope_org_mode").$type().notNull().default("none"),
  // Consent snapshot from ceremony
  consentPersonalSync: boolean("consent_personal_sync").notNull(),
  consentSharedLearning: boolean("consent_shared_learning").notNull(),
  consentedAt: timestamp("consented_at", {
    withTimezone: true
  }).notNull(),
  consentPromptVersion: text("consent_prompt_version").notNull(),
  // Session summary (metadata only)
  startedAt: timestamp("started_at", {
    withTimezone: true
  }).notNull(),
  endedAt: timestamp("ended_at", {
    withTimezone: true
  }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  filesTouchedCount: integer("files_touched_count").notNull().default(0),
  serviceBoundariesCrossed: integer("service_boundaries_crossed").notNull().default(0),
  peakRiskScore: real("peak_risk_score").notNull().default(0),
  riskEventCount: integer("risk_event_count").notNull().default(0),
  rollbackEventCount: integer("rollback_event_count").notNull().default(0),
  aiAttributedRatio: real("ai_attributed_ratio").notNull().default(0),
  aiToolsActive: text("ai_tools_active").array().notNull().default([]),
  // Full payload stored for worker access (no blobs in queues)
  payload: jsonb("payload").notNull(),
  // Outcome (populated by outcome labeling job)
  outcome: text("outcome").$type().default("pending"),
  outcomeLabeledAt: timestamp("outcome_labeled_at", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => ({
  // User lookup for dashboard
  userIdx: index("session_ingests_user_idx").on(table.userId, table.createdAt),
  // Organization lookup for team dashboards
  orgIdx: index("session_ingests_org_idx").on(table.activeOrgId, table.createdAt),
  // Outcome lookup for pending labeling jobs
  outcomeIdx: index("session_ingests_outcome_idx").on(table.outcome),
  // External session ID lookup
  externalIdIdx: index("session_ingests_external_id_idx").on(table.externalSessionId)
}));
var sessionIngestsRelations = relations(sessionIngests, ({ one, many }) => ({
  user: one(user, {
    fields: [
      sessionIngests.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      sessionIngests.activeOrgId
    ],
    references: [
      organization.id
    ]
  }),
  reflections: many(sessionReflections),
  outcomeLabels: many(outcomeLabels)
}));
var sessionReflections = pgTable("session_reflections", {
  id: uuid("id").primaryKey().defaultRandom(),
  // FK to canonical record by internal ID
  sessionIngestId: uuid("session_ingest_id").notNull().references(() => sessionIngests.id, {
    onDelete: "cascade"
  }),
  // Denormalized for query convenience  -  always consistent with session_ingests
  externalSessionId: text("external_session_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  activeOrgId: text("active_org_id").references(() => organization.id, {
    onDelete: "set null"
  }),
  scopeGlobal: boolean("scope_global").notNull(),
  qualifiedAt: timestamp("qualified_at", {
    withTimezone: true
  }).notNull(),
  enqueuedAt: timestamp("enqueued_at", {
    withTimezone: true
  }).notNull(),
  completedAt: timestamp("completed_at", {
    withTimezone: true
  }),
  source: text("source").$type(),
  modelUsed: text("model_used"),
  creditsConsumed: real("credits_consumed"),
  reflection: jsonb("reflection"),
  failed: boolean("failed").notNull().default(false),
  failureReason: text("failure_reason"),
  failureCount: integer("failure_count").notNull().default(0)
}, (table) => ({
  sessionIdx: index("session_reflections_session_idx").on(table.sessionIngestId),
  userIdx: index("session_reflections_user_idx").on(table.userId, table.completedAt),
  externalIdIdx: index("session_reflections_external_id_idx").on(table.externalSessionId)
}));
var sessionReflectionsRelations = relations(sessionReflections, ({ one }) => ({
  sessionIngest: one(sessionIngests, {
    fields: [
      sessionReflections.sessionIngestId
    ],
    references: [
      sessionIngests.id
    ]
  }),
  user: one(user, {
    fields: [
      sessionReflections.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      sessionReflections.activeOrgId
    ],
    references: [
      organization.id
    ]
  })
}));
var outcomeLabels = pgTable("outcome_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionIngestId: uuid("session_ingest_id").notNull().references(() => sessionIngests.id, {
    onDelete: "cascade"
  }),
  externalSessionId: text("external_session_id").notNull(),
  // No user_id by design  -  this is the anonymized training layer
  labelType: text("label_type").$type().notNull(),
  confidence: real("confidence").notNull(),
  observationWindowDays: integer("observation_window_days").notNull().default(7),
  labeledAt: timestamp("labeled_at", {
    withTimezone: true
  }).notNull(),
  observedAt: timestamp("observed_at", {
    withTimezone: true
  }),
  signalData: jsonb("signal_data")
}, (table) => ({
  sessionIdx: index("outcome_labels_session_idx").on(table.sessionIngestId),
  labelTypeIdx: index("outcome_labels_label_type_idx").on(table.labelType),
  externalIdIdx: index("outcome_labels_external_id_idx").on(table.externalSessionId)
}));
var outcomeLabelsRelations = relations(outcomeLabels, ({ one }) => ({
  sessionIngest: one(sessionIngests, {
    fields: [
      outcomeLabels.sessionIngestId
    ],
    references: [
      sessionIngests.id
    ]
  })
}));
var sessionIngestLog = pgTable("session_ingest_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  externalSessionId: text("external_session_id"),
  scopesApplied: text("scopes_applied").array().notNull(),
  activeOrgId: text("active_org_id").references(() => organization.id, {
    onDelete: "set null"
  }),
  clientType: text("client_type").$type().notNull().default("unknown"),
  requestPath: text("request_path"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("session_ingest_log_user_idx").on(table.userId, table.createdAt),
  orgIdx: index("session_ingest_log_org_idx").on(table.activeOrgId, table.createdAt)
}));
var sessionIngestLogRelations = relations(sessionIngestLog, ({ one }) => ({
  user: one(user, {
    fields: [
      sessionIngestLog.userId
    ],
    references: [
      user.id
    ]
  }),
  organization: one(organization, {
    fields: [
      sessionIngestLog.activeOrgId
    ],
    references: [
      organization.id
    ]
  })
}));
var githubInstallations = pgTable("github_installations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Vreko user who installed the app
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // GitHub installation details
  githubInstallationId: text("github_installation_id").unique().notNull(),
  githubAccountId: text("github_account_id").notNull(),
  githubAccountType: text("github_account_type").notNull(),
  githubAccountLogin: text("github_account_login").notNull(),
  // Permissions granted
  permissions: jsonb("permissions").$type().default({}),
  repositorySelection: text("repository_selection").notNull(),
  selectedRepositoryIds: jsonb("selected_repository_ids").$type().default([]),
  // Webhook configuration
  webhookId: text("webhook_id"),
  webhookSecret: text("webhook_secret"),
  webhookActive: boolean("webhook_active").default(true),
  // Status
  suspended: boolean("suspended").default(false),
  suspendedAt: timestamp("suspended_at"),
  // Timestamps
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  // Unique GitHub installation per app
  uniqueIndex("github_installations_github_id_idx").on(table.githubInstallationId),
  // Query by Vreko user
  index("github_installations_user_idx").on(table.userId),
  // Query active installations
  index("github_installations_active_idx").on(table.suspended)
]);
var githubPrAnalyses = pgTable("github_pr_analyses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Link to installation
  installationId: text("installation_id").notNull().references(() => githubInstallations.id, {
    onDelete: "cascade"
  }),
  // PR identification (hashed for privacy)
  repoId: text("repo_id").notNull(),
  prNumber: integer("pr_number").notNull(),
  // Analysis results
  riskScore: integer("risk_score").notNull(),
  aiContributionPercentage: decimal("ai_contribution_percentage", {
    precision: 5,
    scale: 2
  }),
  estimatedAiTool: text("estimated_ai_tool"),
  // Metrics
  filesChanged: integer("files_changed").notNull(),
  linesAdded: integer("lines_added").notNull(),
  linesRemoved: integer("lines_removed").notNull(),
  // Patterns detected
  patternsDetected: jsonb("patterns_detected").$type().default([]),
  // Check status
  checkStatus: text("check_status").notNull(),
  checkConclusion: text("check_conclusion"),
  checkDetailsUrl: text("check_details_url"),
  // Ground truth (if commit has Co-authored-by)
  hasCoAuthorTag: boolean("has_co_author_tag").default(false),
  coAuthorTools: jsonb("co_author_tools").$type().default([]),
  fedToCalibration: boolean("fed_to_calibration").default(false),
  // Timestamps
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull()
}, (table) => [
  // Unique: one analysis per PR
  uniqueIndex("github_pr_analyses_repo_pr_idx").on(table.repoId, table.prNumber),
  // Query by installation
  index("github_pr_analyses_installation_idx").on(table.installationId),
  // Query ground truth data
  index("github_pr_analyses_ground_truth_idx").on(table.hasCoAuthorTag, table.fedToCalibration)
]);
var githubInstallationsRelations = relations(githubInstallations, ({ one, many }) => ({
  user: one(user, {
    fields: [
      githubInstallations.userId
    ],
    references: [
      user.id
    ]
  }),
  prAnalyses: many(githubPrAnalyses)
}));
var githubPrAnalysesRelations = relations(githubPrAnalyses, ({ one }) => ({
  installation: one(githubInstallations, {
    fields: [
      githubPrAnalyses.installationId
    ],
    references: [
      githubInstallations.id
    ]
  })
}));
var inviteCodes = pgTable("invite_codes", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  code: text("code").notNull().unique(),
  // Creator (null = system-generated)
  createdBy: text("created_by"),
  // How many times this code can be redeemed
  maxUses: integer("max_uses").notNull().default(1),
  // Running count  -  incremented atomically on each redemption
  currentUses: integer("current_uses").notNull().default(0),
  // Optional human-readable cohort label (e.g. "beta-march-2026")
  label: text("label"),
  // Numeric cohort identifier for the accept flow (default cohort 1)
  cohort: integer("cohort").notNull().default(1),
  // Optional hard expiry
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  // Soft-delete: set to revoke a code without losing audit history
  revokedAt: timestamp("revoked_at", {
    withTimezone: true
  }),
  // Optional pre-authorized email  -  pioneer email-first access flow
  invitedEmail: text("invited_email")
});
var pendingApiKeys = pgTable("pending_api_keys", {
  userId: text("user_id").primaryKey(),
  rawKey: text("raw_key").notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  // Discriminator for multi-purpose use (e.g. 'api_key' | 'pioneer_magic_claim')
  purpose: text("purpose").notNull().default("api_key")
});
async function burnInviteCode(db2, codeId) {
  const rows = await db2.update(inviteCodes).set({
    currentUses: sql`${inviteCodes.currentUses} + 1`,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(and(eq(inviteCodes.id, codeId), sql`${inviteCodes.currentUses} < ${inviteCodes.maxUses}`)).returning();
  return rows[0] ?? null;
}
__name(burnInviteCode, "burnInviteCode");
var leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  email: text("email").notNull().unique(),
  intent: text("intent"),
  referralCode: text("referral_code"),
  source: text("source").notNull().default("homepage"),
  queuePosition: integer("queue_position"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var loops = pgTable("loops", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys2.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id"),
  requestId: text("request_id").notNull(),
  loopType: text("loop_type").notNull(),
  iterationCount: integer("iteration_count").default(0),
  durationMs: integer("duration_ms"),
  success: boolean("success").default(false),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userCreatedAtIndex: index("loops_user_created_at_idx").on(table.userId, table.createdAt),
    apiKeyCreatedAtIndex: index("loops_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
    loopTypeCheck: check("loops_loop_type_check", sql`loop_type IN ('retry', 'recovery', 'optimization', 'validation')`)
  };
});
var observationTypeEnum = pgEnum("observation_type", [
  "risk",
  "pattern",
  "suggestion",
  "warning",
  "progress"
]);
var observationSeverityEnum = pgEnum("observation_severity", [
  "low",
  "medium",
  "high",
  "critical"
]);
var observationSourceEnum = pgEnum("observation_source", [
  "extension",
  "mcp-server",
  "dashboard",
  "api"
]);
var invocationTypeEnum = pgEnum("invocation_type", [
  "inline-edit",
  "chat",
  "command",
  "suggestion"
]);
var invocationStatusEnum = pgEnum("invocation_status", [
  "pending",
  "success",
  "error",
  "timeout"
]);
var deviceTypeEnum = pgEnum("device_type", [
  "vscode",
  "cursor",
  "windsurf",
  "cli"
]);
var conflictStrategyEnum = pgEnum("conflict_resolution_strategy", [
  "server-wins",
  "client-wins",
  "merge"
]);
var mcpObservations = pgTable("mcp_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  // Observation content
  type: observationTypeEnum("type").notNull(),
  severity: observationSeverityEnum("severity"),
  message: text("message").notNull(),
  context: jsonb("context").default({}),
  filePath: text("file_path"),
  lineNumber: integer("line_number"),
  // Source tracking
  source: observationSourceEnum("source").default("extension"),
  toolName: text("tool_name"),
  // Processing status
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at", {
    withTimezone: true
  }),
  // Idempotency
  idempotencyKey: text("idempotency_key").unique(),
  // CRDT sync metadata
  syncVersion: integer("sync_version").default(0),
  deviceId: text("device_id"),
  // Timestamps
  observedAt: timestamp("observed_at", {
    withTimezone: true
  }).defaultNow(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Performance indexes
  workspaceIdx: index("idx_mcp_observations_workspace").on(table.workspaceId, table.createdAt),
  userIdx: index("idx_mcp_observations_user").on(table.userId, table.createdAt),
  typeIdx: index("idx_mcp_observations_type").on(table.type, table.createdAt).where(sql`${table.processed} = false`),
  idempotencyIdx: index("idx_mcp_observations_idempotency").on(table.idempotencyKey).where(sql`${table.idempotencyKey} IS NOT NULL`),
  syncIdx: index("idx_mcp_observations_sync").on(table.deviceId, table.syncVersion),
  contextIdx: index("idx_mcp_observations_context").using("gin", table.context)
}));
var mcpObservationsRelations = relations(mcpObservations, ({ one }) => ({
  user: one(user, {
    fields: [
      mcpObservations.userId
    ],
    references: [
      user.id
    ]
  })
}));
var mcpToolInvocations = pgTable("mcp_tool_invocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  // Invocation details
  toolName: text("tool_name").notNull(),
  toolVersion: text("tool_version"),
  invocationType: invocationTypeEnum("invocation_type"),
  // Request/Response tracking
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  status: invocationStatusEnum("status"),
  errorMessage: text("error_message"),
  // Performance metrics
  startedAt: timestamp("started_at", {
    withTimezone: true
  }).defaultNow(),
  completedAt: timestamp("completed_at", {
    withTimezone: true
  }),
  durationMs: integer("duration_ms"),
  // Token usage
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  // Idempotency
  idempotencyKey: text("idempotency_key").unique(),
  // Source tracking
  source: text("source").default("extension"),
  sessionId: text("session_id"),
  // Timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Performance indexes
  workspaceIdx: index("idx_mcp_invocations_workspace").on(table.workspaceId, table.createdAt),
  userIdx: index("idx_mcp_invocations_user").on(table.userId, table.createdAt),
  toolIdx: index("idx_mcp_invocations_tool").on(table.toolName, table.createdAt),
  statusIdx: index("idx_mcp_invocations_status").on(table.status, table.createdAt).where(sql`${table.status} = 'pending'`),
  sessionIdx: index("idx_mcp_invocations_session").on(table.sessionId, table.createdAt),
  billingIdx: index("idx_mcp_invocations_billing").on(table.userId, table.createdAt).where(sql`${table.status} = 'success'`)
}));
var mcpToolInvocationsRelations = relations(mcpToolInvocations, ({ one }) => ({
  user: one(user, {
    fields: [
      mcpToolInvocations.userId
    ],
    references: [
      user.id
    ]
  })
}));
var extensionSyncState = pgTable("extension_sync_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: text("workspace_id").notNull(),
  deviceId: text("device_id").notNull(),
  // Sync metadata
  lastSyncAt: timestamp("last_sync_at", {
    withTimezone: true
  }),
  syncVersion: integer("sync_version").default(0),
  // Device info
  deviceType: deviceTypeEnum("device_type"),
  deviceName: text("device_name"),
  // Sync window
  syncWindowStart: timestamp("sync_window_start", {
    withTimezone: true
  }),
  syncWindowEnd: timestamp("sync_window_end", {
    withTimezone: true
  }),
  // Pending changes
  pendingChangesCount: integer("pending_changes_count").default(0),
  pendingChanges: jsonb("pending_changes").default([]),
  // Conflict resolution
  lastConflictAt: timestamp("last_conflict_at", {
    withTimezone: true
  }),
  conflictResolutionStrategy: conflictStrategyEnum("conflict_resolution_strategy").default("server-wins"),
  // Health check
  lastHeartbeatAt: timestamp("last_heartbeat_at", {
    withTimezone: true
  }),
  isOnline: boolean("is_online").default(true),
  // Timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Unique constraint: one sync state per user/workspace/device
  uniqueUserWorkspaceDevice: unique().on(table.userId, table.workspaceId, table.deviceId),
  // Performance indexes
  userIdx: index("idx_sync_state_user").on(table.userId, table.lastSyncAt),
  workspaceIdx: index("idx_sync_state_workspace").on(table.workspaceId, table.lastSyncAt),
  pendingIdx: index("idx_sync_state_pending").on(table.userId, table.pendingChangesCount).where(sql`${table.pendingChangesCount} > 0`),
  heartbeatIdx: index("idx_sync_state_heartbeat").on(table.lastHeartbeatAt).where(sql`${table.isOnline} = true`)
}));
var extensionSyncStateRelations = relations(extensionSyncState, ({ one }) => ({
  user: one(user, {
    fields: [
      extensionSyncState.userId
    ],
    references: [
      user.id
    ]
  })
}));
var mcpAggregatedLearnings = pgTable("mcp_aggregated_learnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Pattern identification (no code content)
  patternKey: text("pattern_key").notNull(),
  patternType: text("pattern_type").notNull(),
  // Cross-workspace aggregation
  workspaceCount: integer("workspace_count").default(1).notNull(),
  workspaceIds: jsonb("workspace_ids").default(JSON.stringify([])).notNull(),
  totalOccurrences: integer("total_occurrences").default(1).notNull(),
  confidence: real("confidence").default(0.5).notNull(),
  // Last seen metadata
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var mcpAggregatedLearningsRelations = relations(mcpAggregatedLearnings, ({ one }) => ({
  user: one(user, {
    fields: [
      mcpAggregatedLearnings.userId
    ],
    references: [
      user.id
    ]
  })
}));
var mcpActivityEvents = pgTable("mcp_activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Event metadata (no code content)
  eventType: text("event_type").notNull(),
  // Aggregate data only
  fileCount: integer("file_count"),
  totalBytes: integer("total_bytes"),
  riskLevel: text("risk_level"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var mcpActivityEventsRelations = relations(mcpActivityEvents, ({ one }) => ({
  user: one(user, {
    fields: [
      mcpActivityEvents.userId
    ],
    references: [
      user.id
    ]
  })
}));
var mcpSessions = pgTable("mcp_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: text("workspace_id").notNull(),
  // Session metadata
  taskDescription: text("task_description"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  // Aggregate metrics (no code content)
  snapshotCount: integer("snapshot_count").default(0),
  riskAnalysisCount: integer("risk_analysis_count").default(0),
  learningsRecorded: integer("learnings_recorded").default(0),
  // Framework/stack detection (metadata only)
  detectedStack: jsonb("detected_stack").default(JSON.stringify({})),
  // Example: { frameworks: ["nextjs"], languages: ["typescript"], packageManager: "pnpm" }
  // Idempotency key for flush operations (prevents duplicate writes on retry)
  flushIdempotencyKey: text("flush_idempotency_key").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var mcpSessionsRelations = relations(mcpSessions, ({ one }) => ({
  user: one(user, {
    fields: [
      mcpSessions.userId
    ],
    references: [
      user.id
    ]
  })
}));
var nurtureTrack = pgTable("nurture_track", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Nurture campaign tracking
  trackName: text("track_name").notNull(),
  trackVersion: text("track_version").notNull().default("1"),
  // Step in nurture sequence
  currentStep: integer("current_step").notNull().default(0),
  totalSteps: integer("total_steps").notNull(),
  // Email details for current step
  lastEmailSentId: text("last_email_sent_id"),
  lastEmailSentAt: timestamp("last_email_sent_at"),
  lastEmailOpenedAt: timestamp("last_email_opened_at"),
  lastEmailClickedAt: timestamp("last_email_clicked_at"),
  // Engagement tracking
  emailsSent: integer("emails_sent").notNull().default(0),
  emailsOpened: integer("emails_opened").notNull().default(0),
  emailsClicked: integer("emails_clicked").notNull().default(0),
  unsubscribed: text("unsubscribed").notNull().default("false"),
  // Pause/resume tracking
  paused: text("paused").notNull().default("false"),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  // Completion status
  completedAt: timestamp("completed_at"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("nurture_track_user_id_idx").on(table.userId),
  trackNameIdx: index("nurture_track_track_name_idx").on(table.trackName),
  pausedIdx: index("nurture_track_paused_idx").on(table.paused),
  completedIdx: index("nurture_track_completed_at_idx").on(table.completedAt)
}));
var orgDailyMetrics = pgTable("org_daily_metrics", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  date: timestamp("date").notNull(),
  // Incident metrics
  incidentsDetected: integer("incidents_detected").notNull().default(0),
  incidentsPrevented: integer("incidents_prevented").notNull().default(0),
  timeToRestoreMs: integer("time_to_restore_ms"),
  // Snapshot metrics
  snapshotsCreated: integer("snapshots_created").notNull().default(0),
  snapshotsRestored: integer("snapshots_restored").notNull().default(0),
  bytesSaved: integer("bytes_saved").notNull().default(0),
  // Risk metrics
  highSeverityRisks: integer("high_severity_risks").notNull().default(0),
  mediumSeverityRisks: integer("medium_severity_risks").notNull().default(0),
  lowSeverityRisks: integer("low_severity_risks").notNull().default(0),
  // API usage metrics
  apiCalls: integer("api_calls").notNull().default(0),
  apiErrors: integer("api_errors").notNull().default(0),
  // Feature adoption metrics
  featuresUsed: jsonb("features_used").default(JSON.stringify({})),
  // Performance metrics
  avgResponseTimeMs: integer("avg_response_time_ms"),
  p95ResponseTimeMs: integer("p95_response_time_ms"),
  // Client metrics
  activeUsers: integer("active_users").notNull().default(0),
  clientVersions: jsonb("client_versions").default(JSON.stringify({})),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  orgDateUnique: uniqueIndex("org_daily_metrics_org_date_unique").on(table.organizationId, table.date),
  dateIndex: uniqueIndex("org_daily_metrics_date_idx").on(table.date)
}));
var vector256 = customType({
  dataType() {
    return "vector(256)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return value.replace(/[[\]]/g, "").split(",").map((v) => Number.parseFloat(v));
  }
});
var patterns = pgTable("patterns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Optional ownership (null = global pattern)
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  // Pattern identification
  patternSignature: text("pattern_signature").unique().notNull(),
  // Vector embedding for similarity search (256 dimensions)
  // P0-1: Cast to vector(256) via migration 0011_enable_pgvector.sql
  embedding: vector256("embedding"),
  // Classification
  patternType: text("pattern_type").notNull(),
  toolAffinity: text("tool_affinity").array(),
  fileTypes: text("file_types").array(),
  // Success metrics
  occurrenceCount: integer("occurrence_count").default(1).notNull(),
  successRate: decimal("success_rate", {
    precision: 4,
    scale: 3
  }),
  // Timestamps
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  // Global vs local
  isGlobal: boolean("is_global").default(false).notNull()
}, (table) => [
  // Unique pattern signature
  uniqueIndex("patterns_signature_idx").on(table.patternSignature),
  // Query by user
  index("patterns_user_idx").on(table.userId),
  // Query by type
  index("patterns_type_idx").on(table.patternType),
  // Query global patterns
  index("patterns_global_idx").on(table.isGlobal)
]);
var patternsRelations = relations(patterns, ({ one }) => ({
  user: one(user, {
    fields: [
      patterns.userId
    ],
    references: [
      user.id
    ]
  })
}));
var pioneerCodeStatusEnum = pgEnum("pioneer_code_status", [
  "active",
  "exhausted",
  "deactivated",
  "expired",
  "revoked"
]);
var pioneers = pgTable("pioneers", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull(),
  githubId: text("github_id").notNull().unique(),
  contactEmail: text("contact_email"),
  // Tier and points removed per CANON.md (April decision)
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  referralCode: text("referral_code").notNull().unique(),
  githubStarred: boolean("github_starred").notNull().default(false),
  // Leaderboard visibility removed per CANON.md
  referredBy: text("referred_by"),
  lastSyncedAt: timestamp("last_synced_at"),
  // Survey fields (Spec 2 Phase 5)
  surveyCompletedAt: timestamp("survey_completed_at"),
  experienceLevel: text("experience_level"),
  codebaseSize: text("codebase_size"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (t) => []);
var pioneerCodes = pgTable("pioneer_codes", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  code: text("code").notNull().unique(),
  createdBy: text("created_by"),
  maxRedemptions: integer("max_redemptions").notNull().default(1),
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  status: pioneerCodeStatusEnum("status").notNull().default("active"),
  cohort: integer("cohort").notNull().default(1),
  label: text("label"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (t) => [
  index("pioneer_codes_status_idx").on(t.status),
  index("pioneer_codes_cohort_idx").on(t.cohort)
]);
var pioneerRedemptions = pgTable("pioneer_redemptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  codeId: text("code_id").notNull(),
  userId: text("user_id").notNull().unique(),
  pioneerId: text("pioneer_id"),
  primaryIde: text("primary_ide").notNull(),
  aiTools: jsonb("ai_tools").notNull().default([]),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  hubspotSyncedAt: timestamp("hubspot_synced_at"),
  posthogSyncedAt: timestamp("posthog_synced_at"),
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (t) => [
  index("pioneer_redemptions_code_id_idx").on(t.codeId),
  index("pioneer_redemptions_pioneer_id_idx").on(t.pioneerId)
]);
var policyEvaluations = pgTable("policy_evaluations", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys2.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id"),
  requestId: text("request_id").notNull(),
  policyName: text("policy_name").notNull(),
  policyVersion: text("policy_version"),
  evaluationResult: text("evaluation_result"),
  violations: jsonb("violations").default([]),
  remediationSteps: jsonb("remediation_steps").default([]),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userCreatedAtIndex: index("policy_evaluations_user_created_at_idx").on(table.userId, table.createdAt),
    apiKeyCreatedAtIndex: index("policy_evaluations_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
    evaluationResultCheck: check("policy_evaluations_evaluation_result_check", sql`evaluation_result IN ('passed', 'failed', 'warning', 'error')`)
  };
});
var postAcceptOutcomes = pgTable("post_accept_outcomes", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys2.id, {
    onDelete: "cascade"
  }),
  suggestionId: text("suggestion_id").notNull(),
  editsMade: jsonb("edits_made").default([]),
  timeToEditMs: integer("time_to_edit_ms"),
  timeToSubmitMs: integer("time_to_submit_ms"),
  userFeedback: text("user_feedback"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userCreatedAtIndex: index("post_accept_outcomes_user_created_at_idx").on(table.userId, table.createdAt),
    apiKeyCreatedAtIndex: index("post_accept_outcomes_api_key_created_at_idx").on(table.apiKeyId, table.createdAt)
  };
});
var predictions = pgTable("predictions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Session context
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  sessionId: text("session_id").notNull(),
  // Prediction details
  predictionType: text("prediction_type").notNull(),
  predictedValue: decimal("predicted_value", {
    precision: 5,
    scale: 4
  }).notNull(),
  confidence: decimal("confidence", {
    precision: 4,
    scale: 3
  }).notNull(),
  // Model metadata
  modelVersion: text("model_version").notNull(),
  source: text("source").notNull(),
  latencyMs: integer("latency_ms"),
  // Features used (for explainability)
  featuresUsed: jsonb("features_used").$type().default([]),
  contextHash: text("context_hash"),
  // Outcome tracking
  actualOutcome: boolean("actual_outcome"),
  wasCorrect: boolean("was_correct"),
  outcomeRecordedAt: timestamp("outcome_recorded_at"),
  feedbackSource: text("feedback_source"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  // Query by user
  index("predictions_user_idx").on(table.userId),
  // Query by session
  index("predictions_session_idx").on(table.sessionId),
  // Query by model version (for A/B testing)
  index("predictions_model_idx").on(table.modelVersion),
  // Query accuracy (for monitoring)
  index("predictions_accuracy_idx").on(table.wasCorrect)
]);
var predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(user, {
    fields: [
      predictions.userId
    ],
    references: [
      user.id
    ]
  })
}));
var quarantineEvents = pgTable("quarantine_events", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("user_id"),
  apiKeyId: text("api_key_id").references(() => apiKeys2.id, {
    onDelete: "cascade"
  }),
  originalEvent: jsonb("original_event").notNull(),
  errorReason: text("error_reason").notNull(),
  errorStack: text("error_stack"),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Retry logic columns (for replayQuarantined implementation)
  retryCount: integer("retry_count").default(0).notNull(),
  lastAttemptedAt: timestamp("last_attempted_at")
}, (table) => {
  return {
    attemptedAtIndex: index("quarantine_events_attempted_at_idx").on(table.attemptedAt),
    userCreatedAtIndex: index("quarantine_events_user_created_at_idx").on(table.userId, table.createdAt),
    apiKeyCreatedAtIndex: index("quarantine_events_api_key_created_at_idx").on(table.apiKeyId, table.createdAt)
  };
});
var rateLimitViolations = pgTable("rate_limit_violations", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").notNull(),
  // Violation details
  limitType: text("limit_type").notNull(),
  limitValue: integer("limit_value").notNull(),
  currentValue: integer("current_value").notNull(),
  // Context
  endpoint: text("endpoint"),
  plan: planTypeEnum("plan"),
  // Response
  retryAfterSeconds: integer("retry_after_seconds"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var rateLimitViolationsRelations = relations(rateLimitViolations, ({ one }) => ({
  user: one(user, {
    fields: [
      rateLimitViolations.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      rateLimitViolations.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var tokenBuckets = pgTable("token_buckets", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Bucket state
  tokens: numeric("tokens").notNull(),
  capacity: integer("capacity").notNull(),
  refillRate: numeric("refill_rate").notNull(),
  lastRefill: timestamp("last_refill").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userIdIndex: uniqueIndex("idx_token_buckets_user").on(table.userId)
}));
var tokenBucketsRelations = relations(tokenBuckets, ({ one }) => ({
  user: one(user, {
    fields: [
      tokenBuckets.userId
    ],
    references: [
      user.id
    ]
  })
}));
var repoPersonalities = pgTable("repo_personalities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Repository identification (hashed for privacy)
  repoId: text("repo_id").notNull(),
  repoName: text("repo_name"),
  // Risk profile
  riskProfile: text("risk_profile").notNull(),
  aiTolerance: decimal("ai_tolerance", {
    precision: 4,
    scale: 3
  }).default("0.5"),
  volatility: decimal("volatility", {
    precision: 4,
    scale: 3
  }).default("0.5"),
  // Historical metrics
  incidentCount: integer("incident_count").default(0),
  totalCommits: integer("total_commits").default(0),
  aiContributionPercentage: decimal("ai_contribution_percentage", {
    precision: 5,
    scale: 2
  }),
  // Language and framework context
  primaryLanguage: text("primary_language"),
  frameworks: jsonb("frameworks").$type().default([]),
  // Timestamps
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull()
}, (table) => [
  // Unique: one personality per user/repo
  uniqueIndex("repo_personalities_user_repo_idx").on(table.userId, table.repoId),
  // Query by user
  index("repo_personalities_user_idx").on(table.userId),
  // Query by profile type
  index("repo_personalities_profile_idx").on(table.riskProfile)
]);
var repoPersonalitiesRelations = relations(repoPersonalities, ({ one }) => ({
  user: one(user, {
    fields: [
      repoPersonalities.userId
    ],
    references: [
      user.id
    ]
  })
}));
var responseCache = pgTable("response_cache", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  // Cache key (hash of normalized request)
  cacheKey: text("cache_key").notNull().unique(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  // Cached response
  response: jsonb("response").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  // Cache management
  expiresAt: timestamp("expires_at").notNull(),
  hitCount: integer("hit_count").default(0),
  lastHitAt: timestamp("last_hit_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdIndex: index("idx_response_cache_user").on(table.userId),
  cacheKeyIndex: uniqueIndex("idx_response_cache_key").on(table.cacheKey),
  expiryIndex: index("idx_response_cache_expiry").on(table.expiresAt)
}));
var responseCacheRelations = relations(responseCache, ({ one }) => ({
  user: one(user, {
    fields: [
      responseCache.userId
    ],
    references: [
      user.id
    ]
  })
}));
var retentionConfig = pgTable("retention_config", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  tableName: text("table_name").notNull(),
  retentionDays: integer("retention_days").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var rollbackEvents = pgTable("rollback_events", {
  // Primary key - server-generated UUID
  id: uuid("id").primaryKey().defaultRandom(),
  // Workspace fingerprint: sha256(gitRemote + userId)
  workspaceFingerprint: text("workspace_fingerprint").notNull(),
  // Session context - references the local daemon session ID
  sessionId: text("session_id").notNull(),
  // Snapshot that was rolled back to
  snapshotId: text("snapshot_id").notNull(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Risk model training signals
  // The risk score at the time the snapshot was taken (0-100)
  riskScoreAtSnapshot: integer("risk_score_at_snapshot").notNull(),
  // Ground truth: did the rollback happen? If true, the risk score was correct.
  // This is the key label for model training.
  riskScoreWasCorrect: boolean("risk_score_was_correct"),
  // Time from snapshot creation to rollback (seconds)
  // Shorter time = more urgent/accurate risk detection
  timeToRollback: integer("time_to_rollback"),
  // AI context - which AI tool was active during the risky edit
  aiTool: text("ai_tool"),
  // AI's confidence at the time (if available)
  aiConfidence: real("ai_confidence"),
  // File categorization for pattern analysis
  fileCategory: text("file_category").$type(),
  // Blast radius - how many files were affected
  blastRadiusBucket: text("blast_radius_bucket").$type(),
  // Was this a known high-risk file pattern?
  wasFragileFile: boolean("was_fragile_file").default(false),
  // Timestamps
  occurredAt: timestamp("occurred_at", {
    withTimezone: true
  }).notNull(),
  syncedAt: timestamp("synced_at", {
    withTimezone: true
  }).defaultNow()
}, (table) => ({
  // User lookup index
  userIdIdx: index("rollback_events_user_id_idx").on(table.userId),
  // Workspace lookup index
  workspaceIdx: index("rollback_events_workspace_idx").on(table.workspaceFingerprint),
  // Session lookup index
  sessionIdx: index("rollback_events_session_idx").on(table.sessionId),
  // Time-based queries for training data selection
  occurredAtIdx: index("rollback_events_occurred_at_idx").on(table.occurredAt),
  // Composite for training queries: user's rollbacks over time
  userOccurredIdx: index("rollback_events_user_occurred_idx").on(table.userId, table.occurredAt),
  // Risk score analysis queries
  riskScoreIdx: index("rollback_events_risk_score_idx").on(table.riskScoreAtSnapshot)
}));
var rollbackEventsRelations = relations(rollbackEvents, ({ one }) => ({
  user: one(user, {
    fields: [
      rollbackEvents.userId
    ],
    references: [
      user.id
    ]
  })
}));
var ruleViolations = pgTable("rule_violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Violation details
  ruleId: text("rule_id").notNull(),
  ruleName: text("rule_name").notNull(),
  ruleCategory: text("rule_category"),
  // Detection context
  filePath: text("file_path"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  characterStart: integer("character_start"),
  characterEnd: integer("character_end"),
  // Violation severity
  severity: text("severity").notNull(),
  confidence: integer("confidence"),
  // Match details
  matchText: text("match_text"),
  pattern: text("pattern"),
  description: text("description"),
  // Remediation
  remediation: text("remediation"),
  remediationLink: text("remediation_link"),
  // Metadata
  metadata: jsonb("metadata").$type().default({}),
  // Context
  clientType: text("client_type"),
  clientVersion: text("client_version"),
  ideVersion: text("ide_version"),
  // Git context
  gitBranch: text("git_branch"),
  gitCommit: text("git_commit"),
  // Project context
  projectId: text("project_id"),
  workspaceId: text("workspace_id"),
  // Timestamps
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var ruleViolationsRelations = relations(ruleViolations, ({ one }) => ({
  user: one(user, {
    fields: [
      ruleViolations.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      ruleViolations.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var sagaStatusEnum = pgEnum("saga_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "compensating",
  "compensated"
]);
var sagaStepStatusEnum = pgEnum("saga_step_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "compensated",
  "skipped"
]);
var sagas = pgTable("sagas", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  sagaId: text("saga_id").notNull().unique(),
  sagaType: text("saga_type").notNull(),
  status: sagaStatusEnum("status").notNull().default("pending"),
  context: json("context").$type().notNull(),
  steps: json("steps").$type().notNull(),
  error: text("error"),
  retryCount: text("retry_count").notNull().default("0"),
  maxRetries: text("max_retries").notNull().default("3"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  index("sagas_saga_id_idx").on(table.sagaId),
  index("sagas_saga_type_idx").on(table.sagaType),
  index("sagas_status_idx").on(table.status),
  index("sagas_started_at_idx").on(table.startedAt),
  index("sagas_created_at_idx").on(table.createdAt)
]);
var scheduledEmails = pgTable("scheduled_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  scheduledAt: timestamp("scheduled_at", {
    withTimezone: true
  }).notNull(),
  firedAt: timestamp("fired_at", {
    withTimezone: true
  }),
  cancelledAt: timestamp("cancelled_at", {
    withTimezone: true
  }),
  payload: jsonb("payload")
}, (t) => [
  unique("scheduled_emails_user_event_unique").on(t.userId, t.eventType),
  index("scheduled_emails_due_idx").on(t.scheduledAt).where(sql`${t.firedAt} IS NULL AND ${t.cancelledAt} IS NULL`)
]);
var securityEvents = pgTable("security_events", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id"),
  // Event details
  eventType: text("event_type").notNull(),
  severity: severityLevelEnum("severity").notNull().default("warning"),
  // Context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  endpoint: text("endpoint"),
  // Detection
  detectionMethod: text("detection_method"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(user, {
    fields: [
      securityEvents.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      securityEvents.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var suppressionPatterns = pgTable("suppression_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Pattern details
  pattern: text("pattern").notNull(),
  patternType: text("pattern_type").notNull(),
  description: text("description"),
  // Usage metrics
  useCount: integer("use_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  // Effectiveness
  suppressedViolations: integer("suppressed_violations").notNull().default(0),
  falsePositives: integer("false_positives").notNull().default(0),
  // Metadata
  metadata: jsonb("metadata").$type().default({}),
  // Settings
  isActive: boolean("is_active").notNull().default(true),
  isGlobal: boolean("is_global").notNull().default(false),
  // Context
  clientType: text("client_type"),
  projectId: text("project_id"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var suppressionPatternsRelations = relations(suppressionPatterns, ({ one }) => ({
  user: one(user, {
    fields: [
      suppressionPatterns.userId
    ],
    references: [
      user.id
    ]
  })
}));
var teamRoleEnum = pgEnum("team_role", [
  "owner",
  "admin",
  "member",
  "billing"
]);
var teams = pgTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  avatarUrl: text("avatar_url"),
  ownerId: text("owner_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  subscriptionId: text("subscription_id").references(() => subscriptions.id),
  settings: jsonb("settings").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  ownerIdIndex: uniqueIndex("idx_teams_owner").on(table.ownerId),
  slugIndex: uniqueIndex("idx_teams_slug").on(table.slug)
}));
var teamsRelations = relations(teams, ({ one }) => ({
  owner: one(user, {
    fields: [
      teams.ownerId
    ],
    references: [
      user.id
    ]
  }),
  subscription: one(subscriptions, {
    fields: [
      teams.subscriptionId
    ],
    references: [
      subscriptions.id
    ]
  })
}));
var teamMembers = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  teamId: text("team_id").notNull().references(() => teams.id, {
    onDelete: "cascade"
  }),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  role: teamRoleEnum("role").notNull().default("member"),
  invitedBy: text("invited_by").references(() => user.id),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  teamIdIndex: uniqueIndex("idx_team_members_team").on(table.teamId),
  userIdIndex: uniqueIndex("idx_team_members_user").on(table.userId),
  teamUserUnique: uniqueIndex("team_members_team_id_user_id_unique").on(table.teamId, table.userId)
}));
var teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [
      teamMembers.teamId
    ],
    references: [
      teams.id
    ]
  }),
  user: one(user, {
    fields: [
      teamMembers.userId
    ],
    references: [
      user.id
    ]
  }),
  invitedByUser: one(user, {
    fields: [
      teamMembers.invitedBy
    ],
    references: [
      user.id
    ]
  })
}));
var telemetryEvents = pgTable("telemetry_events", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  apiKeyId: text("api_key_id").references(() => apiKeys.id, {
    onDelete: "cascade"
  }),
  // Event identification
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category"),
  // Event data
  properties: json("properties").$type().default({}),
  // Platform context
  platform: text("platform"),
  clientVersion: text("client_version"),
  ideVersion: text("ide_version"),
  // Device context (for anonymous users)
  deviceFingerprint: text("device_fingerprint"),
  // Session context
  sessionId: text("session_id"),
  // Metadata
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  // Composite indexes for common dashboard query patterns
  index("telemetry_events_user_timestamp_idx").on(table.userId, table.timestamp),
  index("telemetry_events_api_key_timestamp_idx").on(table.apiKeyId, table.timestamp),
  // Per-event-type queries (global aggregates)
  index("telemetry_events_event_type_idx").on(table.eventType),
  // Time-based queries and retention
  index("telemetry_events_timestamp_idx").on(table.timestamp),
  // CRITICAL: Composite index for (user_id, event_type, timestamp DESC) - common dashboard filter
  index("telemetry_events_user_event_time_idx").on(table.userId, table.eventType, table.timestamp)
]);
var telemetryIdempotencyKeys = pgTable("telemetry_idempotency_keys", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  responseData: json("response_data").$type().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull()
}, (table) => [
  uniqueIndex("telemetry_idempotency_keys_expires_at_idx").on(table.expiresAt)
]);
var telemetryDailyStats = pgTable("telemetry_daily_stats", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  date: timestamp("date").notNull(),
  // Event counts by category
  totalEvents: integer("total_events").notNull().default(0),
  featureUsageEvents: integer("feature_usage_events").notNull().default(0),
  errorEvents: integer("error_events").notNull().default(0),
  lifecycleEvents: integer("lifecycle_events").notNull().default(0),
  engagementEvents: integer("engagement_events").notNull().default(0),
  // Platform usage
  platforms: json("platforms").$type().default({}),
  // Most used features
  topFeatures: json("top_features").$type().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
  uniqueIndex("telemetry_daily_stats_user_date_idx").on(table.userId, table.date)
]);
var telemetryOutbox = pgTable("telemetry_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Event identification
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  // Event data
  payload: jsonb("payload").notNull(),
  posthogPayload: jsonb("posthog_payload").notNull(),
  // Processing status
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at", {
    withTimezone: true
  }),
  processingErrors: jsonb("processing_errors").default([]),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  // Idempotency
  idempotencyKey: text("idempotency_key").notNull(),
  // Timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow()
});
var trustScores = pgTable("trust_scores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Ownership
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Tool identification
  toolId: text("tool_id").notNull(),
  contextKey: text("context_key").notNull(),
  // Trust score state (EWMA with momentum)
  score: decimal("score", {
    precision: 4,
    scale: 3
  }).notNull(),
  momentum: decimal("momentum", {
    precision: 4,
    scale: 3
  }).default("0"),
  volatility: decimal("volatility", {
    precision: 4,
    scale: 3
  }).default("0.5"),
  // Calibration metadata
  sampleCount: integer("sample_count").default(0).notNull(),
  recentWindow: jsonb("recent_window").$type().default([]),
  lastCalibration: timestamp("last_calibration").defaultNow().notNull(),
  modelVersion: text("model_version").notNull(),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  // Unique constraint: one trust score per user/tool/context
  uniqueIndex("trust_scores_user_tool_context_idx").on(table.userId, table.toolId, table.contextKey),
  // Query by user
  index("trust_scores_user_idx").on(table.userId),
  // Query by tool
  index("trust_scores_tool_idx").on(table.toolId)
]);
var trustScoresRelations = relations(trustScores, ({ one }) => ({
  user: one(user, {
    fields: [
      trustScores.userId
    ],
    references: [
      user.id
    ]
  })
}));
var apiUsageLogs = pgTable("api_usage_logs", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  // Request identification
  requestId: text("request_id").notNull().$defaultFn(() => nanoid()),
  apiKeyId: text("api_key_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Request details
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  // Usage metrics
  tokensUsed: integer("tokens_used").default(0),
  requestCount: integer("request_count").default(1),
  // Performance
  responseTimeMs: integer("response_time_ms").notNull(),
  responseStatus: integer("response_status").notNull(),
  // Client info
  clientVersion: text("client_version"),
  clientPlatform: text("client_platform"),
  ideVersion: text("ide_version"),
  // IP/location
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),
  // Error tracking
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var apiUsageLogsRelations = relations(apiUsageLogs, ({ one }) => ({
  user: one(user, {
    fields: [
      apiUsageLogs.userId
    ],
    references: [
      user.id
    ]
  }),
  apiKey: one(apiKeys, {
    fields: [
      apiUsageLogs.apiKeyId
    ],
    references: [
      apiKeys.id
    ]
  })
}));
var apiUsageLogs202510 = pgTable("api_usage_logs_2025_10", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  // Request identification
  requestId: text("request_id").notNull().$defaultFn(() => nanoid()),
  apiKeyId: text("api_key_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Request details
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  // Usage metrics
  tokensUsed: integer("tokens_used").default(0),
  requestCount: integer("request_count").default(1),
  // Performance
  responseTimeMs: integer("response_time_ms").notNull(),
  responseStatus: integer("response_status").notNull(),
  // Client info
  clientVersion: text("client_version"),
  clientPlatform: text("client_platform"),
  ideVersion: text("ide_version"),
  // IP/location
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),
  // Error tracking
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var apiUsageLogs202511 = pgTable("api_usage_logs_2025_11", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  // Request identification
  requestId: text("request_id").notNull().$defaultFn(() => nanoid()),
  apiKeyId: text("api_key_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Request details
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  // Usage metrics
  tokensUsed: integer("tokens_used").default(0),
  requestCount: integer("request_count").default(1),
  // Performance
  responseTimeMs: integer("response_time_ms").notNull(),
  responseStatus: integer("response_status").notNull(),
  // Client info
  clientVersion: text("client_version"),
  clientPlatform: text("client_platform"),
  ideVersion: text("ide_version"),
  // IP/location
  ipAddress: text("ip_address"),
  countryCode: text("country_code"),
  // Error tracking
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow()
});
var usageStatsDaily = pgTable("usage_stats_daily", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  date: timestamp("date").notNull(),
  // Counts
  totalRequests: integer("total_requests").default(0),
  totalTokens: bigint("total_tokens", {
    mode: "number"
  }).default(0),
  successfulRequests: integer("successful_requests").default(0),
  failedRequests: integer("failed_requests").default(0),
  // Performance
  avgResponseTimeMs: integer("avg_response_time_ms"),
  p95ResponseTimeMs: integer("p95_response_time_ms"),
  // Feature usage breakdown
  endpointsUsed: jsonb("endpoints_used").default(JSON.stringify({})),
  // Client info
  clientVersions: jsonb("client_versions").default(JSON.stringify([])),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userIdDateIndex: uniqueIndex("idx_usage_stats_user_date").on(table.userId, table.date),
  dateIndex: uniqueIndex("idx_usage_stats_date").on(table.date),
  userIdDateUnique: uniqueIndex("usage_stats_daily_user_id_date_unique").on(table.userId, table.date)
}));
var usageStatsDailyRelations = relations(usageStatsDaily, ({ one }) => ({
  user: one(user, {
    fields: [
      usageStatsDaily.userId
    ],
    references: [
      user.id
    ]
  })
}));
var userAnalyticsIdentities = pgTable("user_analytics_identities", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // PostHog identifier
  posthogUserId: text("posthog_user_id"),
  posthogDistinctId: text("posthog_distinct_id"),
  // HubSpot identifier
  hubspotContactId: text("hubspot_contact_id"),
  // Resend (email) identifier
  resendContactId: text("resend_contact_id"),
  // Anonymous tracking identifier (before signup)
  anonymousId: text("anonymous_id"),
  // Status and sync tracking
  synced: text("synced").notNull().default("false"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("user_analytics_identities_user_id_idx").on(table.userId),
  posthogUserIdIdx: index("user_analytics_identities_posthog_user_id_idx").on(table.posthogUserId),
  hubspotContactIdIdx: uniqueIndex("user_analytics_identities_hubspot_contact_id_idx").on(table.hubspotContactId),
  anonymousIdIdx: index("user_analytics_identities_anonymous_id_idx").on(table.anonymousId)
}));
var userAttributions = pgTable("user_attributions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  source: text("source").notNull(),
  campaignId: text("campaign_id"),
  fingerprint: text("fingerprint").notNull(),
  conversionData: json("conversion_data").$type(),
  utmParams: json("utm_params").$type(),
  referralCode: text("referral_code"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  index("user_attributions_user_id_idx").on(table.userId),
  index("user_attributions_fingerprint_idx").on(table.fingerprint),
  index("user_attributions_source_idx").on(table.source),
  index("user_attributions_created_at_idx").on(table.createdAt)
]);
var userAttributionsRelations = relations(userAttributions, ({ one }) => ({
  user: one(user, {
    fields: [
      userAttributions.userId
    ],
    references: [
      user.id
    ]
  })
}));
var userDailyMetrics = pgTable("user_daily_metrics", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  date: timestamp("date").notNull(),
  // Daily aggregates
  snapshotsCreated: integer("snapshots_created").notNull().default(0),
  snapshotsRestored: integer("snapshots_restored").notNull().default(0),
  minutesSavedEstimate: integer("minutes_saved_estimate").notNull().default(0),
  aiSessions: integer("ai_sessions").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userDateUnique: uniqueIndex("user_daily_metrics_user_date_unique").on(table.userId, table.date),
  userIdIdx: index("user_daily_metrics_user_id_idx").on(table.userId),
  dateIdx: index("user_daily_metrics_date_idx").on(table.date)
}));
var userDetectionCapabilities = pgTable("user_detection_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  // ===================
  // LEARNED IMPROVEMENTS
  // ===================
  /** Custom risk indicators learned from user behavior (Pro+) */
  customRiskIndicators: jsonb("custom_risk_indicators").$type().default([]),
  /** False positive patterns from user proceed actions (Free+) */
  falsePositivePatterns: jsonb("false_positive_patterns").$type().default([]),
  /** User-specific threshold overrides (Pro+) */
  thresholdOverrides: jsonb("threshold_overrides").$type().default({}),
  // ===================
  // ACCURACY TRACKING
  // ===================
  /** Total detections analyzed for this user */
  totalDetectionsAnalyzed: integer("total_detections_analyzed").default(0),
  /** Overall accuracy score (0.0000-1.0000) */
  accuracyScore: numeric("accuracy_score", {
    precision: 5,
    scale: 4
  }),
  /** Tool-specific accuracy (e.g., { cursor: 0.92, copilot: 0.87 }) (Pro+) */
  toolAccuracy: jsonb("tool_accuracy").$type().default({}),
  // ===================
  // TIER GATING
  // ===================
  /** User's current tier (determines which capabilities are active) */
  tier: text("tier").$type().default("free"),
  // ===================
  // VERSIONING
  // ===================
  /** Optimistic locking version (incremented on each update) */
  version: integer("version").default(1),
  /** Last time capabilities were updated */
  lastUpdated: timestamp("last_updated").defaultNow(),
  /** When this record was created */
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  // Accuracy score must be between 0 and 1
  check("accuracy_score_range", sql`${table.accuracyScore} >= 0 AND ${table.accuracyScore} <= 1`),
  // Tier must be valid
  check("tier_valid", sql`${table.tier} IN ('free', 'pro', 'enterprise')`)
]);
var userDetectionCapabilitiesRelations = relations(userDetectionCapabilities, ({ one }) => ({
  user: one(user, {
    fields: [
      userDetectionCapabilities.userId
    ],
    references: [
      user.id
    ]
  })
}));
var lifecycleStageEnum = pgEnum("lifecycle_stage", [
  "new",
  "engaged",
  "power_user",
  "at_risk",
  "churned"
]);
var userLifecycleState = pgTable("user_lifecycle_state", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Current stage
  stage: lifecycleStageEnum("stage").notNull().default("new"),
  // Stage transition tracking
  stagedAt: timestamp("staged_at").notNull().defaultNow(),
  transitionReason: text("transition_reason"),
  // Engagement metrics for state decisions
  snapshotsSinceStart: text("snapshots_since_start").notNull().default("0"),
  daysSinceLastActivity: text("days_since_last_activity").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("user_lifecycle_state_user_id_idx").on(table.userId),
  stageIdx: index("user_lifecycle_state_stage_idx").on(table.stage),
  updatedAtIdx: index("user_lifecycle_state_updated_at_idx").on(table.updatedAt)
}));
var userProductMetrics = pgTable("user_product_metrics", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Lifetime aggregates
  snapshotsTotal: integer("snapshots_total").notNull().default(0),
  restoresTotal: integer("restores_total").notNull().default(0),
  minutesSavedTotal: integer("minutes_saved_total").notNull().default(0),
  aiSessionsTotal: integer("ai_sessions_total").notNull().default(0),
  // 7-day rolling window
  snapshots7d: integer("snapshots_7d").notNull().default(0),
  restores7d: integer("restores_7d").notNull().default(0),
  minutesSaved7d: integer("minutes_saved_7d").notNull().default(0),
  aiSessions7d: integer("ai_sessions_7d").notNull().default(0),
  // 30-day rolling window
  snapshots30d: integer("snapshots_30d").notNull().default(0),
  restores30d: integer("restores_30d").notNull().default(0),
  // Last activity tracking
  lastSnapshotAt: timestamp("last_snapshot_at"),
  lastRestoreAt: timestamp("last_restore_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: index("user_product_metrics_user_id_idx").on(table.userId),
  lastSnapshotIdx: index("user_product_metrics_last_snapshot_idx").on(table.lastSnapshotAt)
}));
var userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Profile info
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  company: text("company"),
  role: text("role"),
  // Onboarding
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: integer("onboarding_step").default(0),
  primaryLanguage: text("primary_language"),
  useCases: text("use_cases").array(),
  // Referral tracking
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by").references(() => user.id),
  // Metadata
  metadata: jsonb("metadata").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(user, {
    fields: [
      userProfiles.userId
    ],
    references: [
      user.id
    ]
  })
}));
var userSafetyProfiles = pgTable("user_safety_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ownership
  userId: text("user_id").notNull().unique().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Safety metrics
  totalAnalyses: integer("total_analyses").notNull().default(0),
  totalViolations: integer("total_violations").notNull().default(0),
  totalBlocked: integer("total_blocked").notNull().default(0),
  totalBypassed: integer("total_bypassed").notNull().default(0),
  // Risk scores
  averageRiskScore: integer("average_risk_score"),
  highestRiskScore: integer("highest_risk_score"),
  // Violation categories
  securityViolations: integer("security_violations").notNull().default(0),
  privacyViolations: integer("privacy_violations").notNull().default(0),
  complianceViolations: integer("compliance_violations").notNull().default(0),
  // Preferences
  autoBlockHighRisk: boolean("auto_block_high_risk").notNull().default(true),
  notifyOnViolation: boolean("notify_on_violation").notNull().default(true),
  notifyOnBypass: boolean("notify_on_bypass").notNull().default(true),
  // Learning
  suppressionPatternsLearned: integer("suppression_patterns_learned").notNull().default(0),
  bypassPatternsLearned: integer("bypass_patterns_learned").notNull().default(0),
  // Metadata
  metadata: jsonb("metadata").$type().default({}),
  // Timestamps
  lastAnalysisAt: timestamp("last_analysis_at"),
  profileResetAt: timestamp("profile_reset_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var userSafetyProfilesRelations = relations(userSafetyProfiles, ({ one }) => ({
  user: one(user, {
    fields: [
      userSafetyProfiles.userId
    ],
    references: [
      user.id
    ]
  })
}));
var webhookEvents = pgTable("webhook_events", {
  id: bigint("id", {
    mode: "number"
  }).primaryKey(),
  eventId: text("event_id").notNull().$defaultFn(() => nanoid()),
  eventType: text("event_type").notNull(),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  userId: text("user_id").references(() => user.id, {
    onDelete: "cascade"
  }),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  user: one(user, {
    fields: [
      webhookEvents.userId
    ],
    references: [
      user.id
    ]
  })
}));
var WORKSPACE_LINK_TTL_MS = 90 * 24 * 60 * 60 * 1e3;
var TIER_STALENESS_THRESHOLD_MS = 24 * 60 * 60 * 1e3;
var workspaceLinks = pgTable("workspace_links", {
  /**
   * Workspace ID (primary key)
   * Format: ws_[32 hex chars] (128 bits of entropy)
   * Example: ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
   */
  workspaceId: text("workspace_id").primaryKey(),
  /**
   * User ID (references auth user table)
   * CASCADE delete removes workspace links when user is deleted
   */
  userId: text("user_id").notNull(),
  /**
   * Subscription tier for this workspace
   * Resolved from user's subscription at link time
   */
  tier: text("tier").$type().notNull().default("free"),
  /**
   * When this workspace was first linked
   */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /**
   * Last time this workspace made an MCP request
   * Updated on each tier resolution (fire-and-forget)
   * Used for identifying stale workspaces for cleanup
   */
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  /**
   * When the tier was last refreshed from the users/subscriptions table
   * Used to detect stale tiers after user downgrades
   * P0 Security Fix: Prevents privilege escalation via stale cached tier
   */
  tierRefreshedAt: timestamp("tier_refreshed_at").defaultNow().notNull(),
  /**
   * When this workspace link expires
   * Default: 90 days from creation
   * After expiration, link is auto-deleted and user must re-authenticate
   * P0 Security Fix: Prevents indefinite workspace link validity
   */
  expiresAt: timestamp("expires_at").notNull(),
  /**
   * Optional workspace name/path hash for debugging
   * NOT the actual path (privacy protection)
   */
  displayName: text("display_name")
}, (table) => ({
  /**
  * Index for efficient user lookup
  * Used when listing all workspaces for a user
  */
  userIdx: index("idx_workspace_links_user").on(table.userId),
  /**
  * Index for cleanup of stale workspaces
  */
  lastSeenIdx: index("idx_workspace_links_last_seen").on(table.lastSeenAt)
}));
var workspaceSettings = pgTable("workspace_settings", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceHash: text("workspace_hash").notNull(),
  // User preferences per workspace
  settings: jsonb("settings").default(JSON.stringify({
    autoAnalyze: true,
    inlineSuggestions: true,
    maxFileSizeKB: 500
  })),
  // Ignore patterns
  ignoredPatterns: text("ignored_patterns").array().default([
    "node_modules/**",
    "dist/**",
    ".git/**"
  ]),
  // Custom rules
  customRules: jsonb("custom_rules").default(JSON.stringify({})),
  // Language-specific settings
  languageSettings: jsonb("language_settings").default(JSON.stringify({})),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userIdIndex: uniqueIndex("idx_workspace_settings_user").on(table.userId),
  userWorkspaceUnique: uniqueIndex("workspace_settings_user_id_workspace_hash_unique").on(table.userId, table.workspaceHash)
}));
var workspaceSettingsRelations = relations(workspaceSettings, ({ one }) => ({
  user: one(user, {
    fields: [
      workspaceSettings.userId
    ],
    references: [
      user.id
    ]
  })
}));
var learnings = pgTable("learnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: text("workspace_id").notNull(),
  // Learning content
  type: text("type", {
    enum: [
      "pattern",
      "pitfall",
      "efficiency",
      "discovery",
      "workflow"
    ]
  }).notNull(),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  keywords: jsonb("keywords").default([]).notNull(),
  source: text("source", {
    enum: [
      "survey",
      "manual",
      "violation",
      "curated"
    ]
  }),
  tier: text("tier", {
    enum: [
      "hot",
      "warm",
      "cold"
    ]
  }).notNull(),
  domain: text("domain"),
  // Usage tracking
  accessCount: integer("access_count").default(0).notNull(),
  appliedCount: integer("applied_count").default(0).notNull(),
  relevanceScore: real("relevance_score").default(1).notNull(),
  // Archival support (Phase 2.6b)
  archived: boolean("archived").default(false),
  archivedAt: timestamp("archived_at", {
    withTimezone: true
  }),
  // CRDT sync metadata
  syncVersion: integer("sync_version").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at", {
    withTimezone: true
  }),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Performance indexes for dashboard queries (P0-2)
  workspaceTierIdx: index("idx_learnings_workspace_tier").on(table.workspaceId, table.tier).where(sql`${table.archived} = false`),
  userActiveIdx: index("idx_learnings_user_active").on(table.userId, table.archived, table.tier)
}));
var learningsRelations = relations(learnings, ({ one }) => ({
  user: one(user, {
    fields: [
      learnings.userId
    ],
    references: [
      user.id
    ]
  })
}));
var intelligencePatterns = pgTable("intelligence_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: text("workspace_id").notNull(),
  // Pattern content
  name: text("name").notNull(),
  description: text("description").notNull(),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  source: text("source", {
    enum: [
      "violation",
      "manual",
      "curated"
    ]
  }).notNull(),
  confidence: real("confidence").default(0.5).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  // Archival support
  archived: boolean("archived").default(false),
  // CRDT sync metadata
  syncVersion: integer("sync_version").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Performance indexes for pattern queries (P0-2)
  highConfIdx: index("idx_intelligence_patterns_high_conf").on(table.confidence).where(sql`${table.confidence} > 0.8`),
  activeIdx: index("idx_intelligence_patterns_active").on(table.workspaceId, table.createdAt).where(sql`${table.archived} = false`)
}));
var intelligencePatternsRelations = relations(intelligencePatterns, ({ one }) => ({
  user: one(user, {
    fields: [
      intelligencePatterns.userId
    ],
    references: [
      user.id
    ]
  })
}));
var violations = pgTable("violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: text("workspace_id").notNull(),
  // Violation content
  type: text("type").notNull(),
  file: text("file").notNull(),
  description: text("description").notNull(),
  reason: text("reason"),
  prevention: text("prevention").notNull(),
  // Tracking
  count: integer("count").default(1).notNull(),
  firstSeen: timestamp("first_seen", {
    withTimezone: true
  }).defaultNow().notNull(),
  lastSeen: timestamp("last_seen", {
    withTimezone: true
  }).defaultNow().notNull(),
  promotedToPattern: boolean("promoted_to_pattern").default(false),
  // CRDT sync metadata
  syncVersion: integer("sync_version").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  uniqueWorkspaceTypeFile: unique().on(table.workspaceId, table.type, table.file)
}));
var violationsRelations = relations(violations, ({ one }) => ({
  user: one(user, {
    fields: [
      violations.userId
    ],
    references: [
      user.id
    ]
  })
}));
var sessionContext = pgTable("session_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: text("workspace_id").notNull(),
  // Session metadata
  taskDescription: text("task_description"),
  startedAt: timestamp("started_at", {
    withTimezone: true
  }).notNull(),
  lastCheckpoint: timestamp("last_checkpoint", {
    withTimezone: true
  }).defaultNow().notNull(),
  snapshotId: text("snapshot_id"),
  context: jsonb("context").default({}).notNull(),
  // Applied learnings tracking (Phase 2.6a)
  appliedLearnings: jsonb("applied_learnings").default([]).notNull(),
  // CRDT sync metadata
  syncVersion: integer("sync_version").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", {
    withTimezone: true
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).defaultNow().notNull()
}, (table) => ({
  // Performance index for session context lookups (P0-2)
  workspaceIdx: index("idx_session_context_workspace").on(table.workspaceId, table.updatedAt)
}));
var sessionContextRelations = relations(sessionContext, ({ one }) => ({
  user: one(user, {
    fields: [
      sessionContext.userId
    ],
    references: [
      user.id
    ]
  })
}));
var repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  provider: text("provider").notNull().default("github"),
  externalRepoId: text("external_repo_id"),
  fullName: text("full_name").notNull(),
  visibility: text("visibility").default("private"),
  metadata: jsonb("metadata").$type().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  orgNameIdx: index("repositories_org_full_name_idx").on(table.organizationId, table.fullName),
  externalIdx: index("repositories_external_idx").on(table.provider, table.externalRepoId)
}));
var repoMemberships = pgTable("repo_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: text("membership_id").notNull().references(() => member.id, {
    onDelete: "cascade"
  }),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id, {
    onDelete: "cascade"
  }),
  role: text("role").notNull().default("contributor"),
  permissions: jsonb("permissions").$type().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  membershipRepoUnique: uniqueIndex("repo_memberships_membership_repo_unique").on(table.membershipId, table.repositoryId),
  repoIdx: index("repo_memberships_repo_idx").on(table.repositoryId)
}));
var repositoriesRelations = relations(repositories, ({ one }) => ({
  organization: one(organization, {
    fields: [
      repositories.organizationId
    ],
    references: [
      organization.id
    ]
  })
}));
var repoMembershipsRelations = relations(repoMemberships, ({ one }) => ({
  membership: one(member, {
    fields: [
      repoMemberships.membershipId
    ],
    references: [
      member.id
    ]
  }),
  repository: one(repositories, {
    fields: [
      repoMemberships.repositoryId
    ],
    references: [
      repositories.id
    ]
  })
}));
var taskStatusEnum = pgEnum("task_status", [
  "created",
  "active",
  "completed",
  "abandoned",
  "failed",
  "auto-ended",
  "ceremony_blocked"
]);
var taskOutcomeEnum = pgEnum("task_outcome", [
  "completed",
  "abandoned",
  "failed"
]);
var taskEventTypeEnum = pgEnum("task_event_type", [
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
var fileActionEnum = pgEnum("file_action", [
  "added",
  "modified",
  "deleted"
]);
var learningCategoryEnum = pgEnum("learning_category", [
  "pattern",
  "gotcha",
  "decision",
  "convention",
  "discovery"
]);
var learningConfidenceEnum = pgEnum("learning_confidence", [
  "low",
  "medium",
  "high"
]);
var migrationSourceEnum = pgEnum("migration_source", [
  "active_session",
  "completed_session"
]);
var tasks = pgTable("tasks", {
  // Primary key - monotonic integer
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Deterministic kebab-case identifier for matching
  slug: text("slug").notNull().unique(),
  // Human-readable task name provided by LLM
  name: text("name").notNull(),
  // Current status
  status: taskStatusEnum("status").notNull().default("created"),
  // Outcome when task was closed
  outcome: taskOutcomeEnum("outcome"),
  // User who owns this task
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // Workspace identifier (hashed)
  workspaceId: text("workspace_id").notNull(),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  // JSON-serialized ceremony object
  ceremonyJson: text("ceremony_json"),
  // Task lineage - references another task this continues from
  continuesFrom: integer("continues_from"),
  // Migration tracking
  migrationSource: migrationSourceEnum("migration_source"),
  originalSessionId: text("original_session_id")
}, (table) => [
  // Index for slug lookups (deterministic matching)
  index("idx_tasks_slug").on(table.slug),
  // Index for status filtering
  index("idx_tasks_status").on(table.status),
  // Index for user's tasks
  index("idx_tasks_user_id").on(table.userId),
  // Index for workspace's tasks
  index("idx_tasks_workspace_id").on(table.workspaceId),
  // Index for finding active tasks
  index("idx_tasks_active").on(table.status, table.workspaceId),
  // Index for lineage queries
  index("idx_tasks_continues_from").on(table.continuesFrom)
]);
var taskEvents = pgTable("task_events", {
  // Primary key
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Task reference
  taskId: integer("task_id").notNull().references(() => tasks.id, {
    onDelete: "cascade"
  }),
  // Sequence number within task (monotonically increasing)
  seq: integer("seq").notNull(),
  // Event type
  type: taskEventTypeEnum("type").notNull(),
  // JSON-serialized event payload
  payloadJson: text("payload_json"),
  // Timestamp
  timestamp: timestamp("timestamp").notNull().defaultNow()
}, (table) => [
  // Unique constraint on task_id + seq for ordering
  uniqueIndex("idx_task_events_task_seq").on(table.taskId, table.seq),
  // Index for task lookup
  index("idx_task_events_task_id").on(table.taskId),
  // Index for event type filtering
  index("idx_task_events_type").on(table.type)
]);
var taskFiles = pgTable("task_files", {
  // Primary key
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Task reference
  taskId: integer("task_id").notNull().references(() => tasks.id, {
    onDelete: "cascade"
  }),
  // Relative POSIX path from workspace root
  path: text("path").notNull(),
  // Type of file operation
  action: fileActionEnum("action").notNull(),
  // SHA-256 hash before change (null for added files)
  hashBefore: text("hash_before"),
  // SHA-256 hash after change (null for deleted files)
  hashAfter: text("hash_after"),
  // Timestamp
  timestamp: timestamp("timestamp").notNull().defaultNow()
}, (table) => [
  // Index for task lookup
  index("idx_task_files_task_id").on(table.taskId),
  // Index for path lookup within task
  index("idx_task_files_task_path").on(table.taskId, table.path)
]);
var taskLearnings = pgTable("task_learnings", {
  // Primary key
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Task reference
  taskId: integer("task_id").notNull().references(() => tasks.id, {
    onDelete: "cascade"
  }),
  // SHA-256 hash of content for deduplication
  contentHash: text("content_hash").notNull(),
  // The actual learning content
  content: text("content").notNull(),
  // Category classification
  category: learningCategoryEnum("category"),
  // Where this learning came from
  source: text("source"),
  // Confidence level
  confidence: learningConfidenceEnum("confidence").default("medium"),
  // Timestamp
  timestamp: timestamp("timestamp").notNull().defaultNow()
}, (table) => [
  // Unique constraint on task_id + content_hash for deduplication
  uniqueIndex("idx_task_learnings_task_hash").on(table.taskId, table.contentHash),
  // Index for task lookup
  index("idx_task_learnings_task_id").on(table.taskId),
  // Index for category filtering
  index("idx_task_learnings_category").on(table.category)
]);
var taskSessions = pgTable("task_sessions", {
  // Primary key
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Task reference
  taskId: integer("task_id").notNull().references(() => tasks.id, {
    onDelete: "cascade"
  }),
  // Unique session identifier (UUID)
  sessionId: text("session_id").notNull(),
  // Whether this session is the writer (can modify task state)
  isWriter: boolean("is_writer").notNull().default(true),
  // Timestamps
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  disconnectedAt: timestamp("disconnected_at")
}, (table) => [
  // Index for task lookup
  index("idx_task_sessions_task_id").on(table.taskId),
  // Index for session lookup
  index("idx_task_sessions_session_id").on(table.sessionId),
  // Index for finding active sessions
  index("idx_task_sessions_active").on(table.taskId, table.disconnectedAt)
]);
var tasksRelations = relations(tasks, ({ one, many }) => ({
  // User who owns this task
  user: one(user, {
    fields: [
      tasks.userId
    ],
    references: [
      user.id
    ]
  }),
  // Task this continues from (lineage)
  continuedFrom: one(tasks, {
    fields: [
      tasks.continuesFrom
    ],
    references: [
      tasks.id
    ],
    relationName: "task_lineage"
  }),
  // Tasks that continue from this task
  continuedBy: many(tasks, {
    relationName: "task_lineage"
  }),
  // Events for this task
  events: many(taskEvents),
  // File changes for this task
  files: many(taskFiles),
  // Learnings for this task
  learnings: many(taskLearnings),
  // Sessions for this task
  sessions: many(taskSessions)
}));
var taskEventsRelations = relations(taskEvents, ({ one }) => ({
  // Task this event belongs to
  task: one(tasks, {
    fields: [
      taskEvents.taskId
    ],
    references: [
      tasks.id
    ]
  })
}));
var taskFilesRelations = relations(taskFiles, ({ one }) => ({
  // Task this file belongs to
  task: one(tasks, {
    fields: [
      taskFiles.taskId
    ],
    references: [
      tasks.id
    ]
  })
}));
var taskLearningsRelations = relations(taskLearnings, ({ one }) => ({
  // Task this learning belongs to
  task: one(tasks, {
    fields: [
      taskLearnings.taskId
    ],
    references: [
      tasks.id
    ]
  })
}));
var taskSessionsRelations = relations(taskSessions, ({ one }) => ({
  // Task this session belongs to
  task: one(tasks, {
    fields: [
      taskSessions.taskId
    ],
    references: [
      tasks.id
    ]
  })
}));
var fileChangeCountsSql = sql`
	SELECT 
		COUNT(DISTINCT CASE WHEN action = 'modified' THEN path END) as files_modified,
		COUNT(DISTINCT CASE WHEN action = 'added' THEN path END) as files_created,
		COUNT(DISTINCT CASE WHEN action = 'deleted' THEN path END) as files_deleted,
		COUNT(*) as total_file_operations
	FROM task_files
	WHERE task_id = $taskId
`;
var learningCountSql = sql`
	SELECT COUNT(*) as count
	FROM task_learnings
	WHERE task_id = $taskId
`;
var sessionCountSql = sql`
	SELECT COUNT(*) as count
	FROM task_sessions
	WHERE task_id = $taskId
`;
var pulseCountSql = sql`
	SELECT COUNT(*) as count
	FROM task_events
	WHERE task_id = $taskId AND type = 'pulse_recorded'
`;

// ../../packages/platform/dist/db/schema/vreko/index.js
var vrekoSchema = {
  // AI Changes (Phase 19)
  aiChanges,
  ciOutcomes,
  // Super Admin
  activationCodes,
  activationCodeRedemptions,
  adminAuditLog,
  adminEmailSends,
  adminTierChanges,
  superAdmins,
  // Enterprise Auth
  conditionalAccessPolicies,
  enterpriseAuditLog,
  riskAssessments,
  ssoAttributeMappings,
  ssoConfiguration,
  ssoSession,
  trustedDevices,
  userSessionContext,
  // Core tables
  apiKeyMetadata,
  apiKeys: apiKeys2,
  apiKeyUsage,
  analysisEvents,
  bypassEvents,
  codeContexts,
  creditTopups,
  creditsLedger,
  deviceAuthCodes,
  deviceCode,
  deviceTrials,
  errorLogs,
  errorLogs202510,
  extensionSessions,
  featureUsage,
  featureUsage202510,
  feedback,
  leads,
  loops,
  nurtureTrack,
  orgDailyMetrics,
  apiUsageLogs,
  apiUsageLogs202510,
  apiUsageLogs202511,
  usageStatsDaily,
  policyEvaluations,
  postAcceptOutcomes,
  quarantineEvents,
  rateLimitViolations,
  tokenBuckets,
  responseCache,
  retentionConfig,
  ruleViolations,
  sagas,
  securityEvents,
  snapshots,
  snapshotFiles,
  fileSnapshotSessions,
  rollbackEvents,
  fingerprints,
  suppressionPatterns,
  subscriptions: subscriptions2,
  teams,
  teamMembers,
  telemetryDailyStats,
  telemetryEvents,
  telemetryIdempotencyKeys,
  telemetryOutbox,
  trials,
  userAnalyticsIdentities,
  userAttributions,
  userDailyMetrics,
  userLifecycleState,
  userProductMetrics,
  userProfiles,
  userSafetyProfiles,
  waitlist,
  waitlistReferrals,
  waitlistTasks,
  webhookEvents,
  workspaceLinks,
  workspaceSettings,
  // Alpha Invite Code System
  inviteCodes,
  pendingApiKeys,
  // Intelligence Layer
  trustScores,
  patterns,
  predictions,
  repoPersonalities,
  engagementScores,
  engagementActions,
  githubInstallations,
  githubPrAnalyses,
  // MCP Server (Phase 4)
  mcpSessions,
  mcpAggregatedLearnings,
  mcpActivityEvents,
  // MCP Persistent Storage (P0-3)
  mcpObservations,
  mcpToolInvocations,
  extensionSyncState,
  // Capability Learning (Phase 1 - Dec 2025)
  capabilityAudit,
  userDetectionCapabilities,
  // Abuse Defense Phase 1
  deviceBindings,
  codebaseBindings,
  conflictLog,
  // Pioneer Program
  pioneers,
  pioneerCodes,
  pioneerRedemptions,
  // Scheduled Emails (EMAIL-04)
  scheduledEmails
};

// ../../packages/platform/dist/db/client.js
var logger = createLogger({
  name: "database",
  level: LogLevel.INFO
});
var isNeon = process.env.DATABASE_URL?.includes("neon.tech") || process.env.DATABASE_URL?.includes("neon.db");
var databaseUrl = process.env.DATABASE_URL;
if (process.env.DB_DEBUG === "true") {
  logger.info("[db-client] ENV:", {
    DATABASE_URL: `${databaseUrl?.substring(0, 50)}...`,
    DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED
  });
}
var combinedSchema = {
  ...postgres_exports,
  ...vreko_exports
};
if (combinedSchema.apiKeys) {
  combinedSchema.apiKey = combinedSchema.apiKeys;
  combinedSchema.apikey = combinedSchema.apiKeys;
}
var db = null;
var pool = null;
if (databaseUrl) {
  const poolConfig = {
    connectionString: databaseUrl,
    // Connection pool limits (Neon-optimized: keep pool small)
    max: isNeon ? 1 : Number.parseInt(process.env.DB_POOL_MAX || "10", 10),
    min: 0,
    // Timeouts (in milliseconds)
    connectionTimeoutMillis: Number.parseInt(process.env.DB_CONNECTION_TIMEOUT || "20000", 10),
    idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT || "10000", 10),
    allowExitOnIdle: true
  };
  const sslDisabledViaUrl = databaseUrl.includes("sslmode=disable");
  const sslDisabledViaEnv = process.env.DB_SSL_ENABLED === "false";
  if (!sslDisabledViaUrl && !sslDisabledViaEnv) {
    const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED;
    let rejectUnauthorized;
    if (rejectUnauthorizedEnv !== void 0) {
      rejectUnauthorized = rejectUnauthorizedEnv !== "false";
    } else {
      rejectUnauthorized = !isNeon;
    }
    const g = global;
    if (process.env.NODE_ENV !== "production" && !g.__VREKO_DB_SSL_LOGGED__) {
      g.__VREKO_DB_SSL_LOGGED__ = true;
      logger.info("[db-client] SSL Configuration:", {
        isNeon,
        sslDisabledViaUrl,
        sslDisabledViaEnv,
        rejectUnauthorized,
        rejectUnauthorizedEnv
      });
    }
    const ca = process.env.DB_SSL_CA;
    poolConfig.ssl = ca ? {
      rejectUnauthorized,
      ca
    } : {
      rejectUnauthorized
    };
  }
  pool = new Pool(poolConfig);
  pool.on("error", (err) => {
    logger.error("Unexpected error on idle client", err);
    logger.error("Database pool error:", err);
  });
  if (process.env.NODE_ENV !== "production") {
    pool.on("connect", (_client) => {
      logger.debug("New database connection established");
    });
    pool.on("acquire", (_client) => {
      logger.debug("Database client acquired from pool");
    });
    pool.on("remove", (_client) => {
      logger.debug("Database client removed from pool");
    });
  }
  db = drizzle(pool, {
    schema: combinedSchema
  });
} else {
  logger.warn("DATABASE_URL is not set. Database features will be unavailable.");
  db = null;
  pool = null;
}
var checkDatabaseConnection = /* @__PURE__ */ __name(async () => {
  if (!db || !pool) {
    return false;
  }
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    logger.error("Database connection failed:", error instanceof Error ? error : {
      error
    });
    return false;
  }
}, "checkDatabaseConnection");
var closeDatabaseConnection = /* @__PURE__ */ __name(async () => {
  if (pool) {
    await pool.end();
  }
}, "closeDatabaseConnection");

export { TIER_STALENESS_THRESHOLD_MS, TOPUP_PACKS, WORKSPACE_LINK_TTL_MS, account, activationCodeRedemptions, activationCodes, adminAuditLog, adminEmailSends, adminTierChanges, agentSuggestions, aiChanges, aiChangesRelations, aiChat, analysisEvents, apiKeyMetadata, apiKeyUsage, apiKeys, apiUsage, apiUsageLogs, burnInviteCode, checkDatabaseConnection, clientTokens, closeDatabaseConnection, combinedSchema, creditJobTypeEnum, creditTopups, creditTransactionStatusEnum, creditTransactionTypeEnum, creditsLedger, db, deviceTrials, emailDeliveries, emailPreferences, extensionSessions, extensionSyncState, featureUsage, feedback, fileSnapshotSessions, fingerprints, getTopupPackDetails, invitation, inviteCodes, isValidPackSize, leads, loops, mcpActivityEvents, mcpAggregatedLearnings, mcpObservations, mcpSessions, mcpToolInvocations, member, newsletterSubscribers, orgDailyMetrics, organization, passkey, patterns, pendingApiKeys, pioneerCodeStatusEnum, pioneerCodes, pioneerRedemptions, pioneers, policyEvaluations, pool, postAcceptOutcomes, postgres_exports, purchase, quarantineEvents, rateLimitViolations, responseCache, retentionConfig, rollbackEvents, ruleViolations, sagas, scheduledEmails, securityEvents, session, snapshotFiles, snapshots, subscriptions, superAdmins, telemetryDailyStats, telemetryEvents, telemetryIdempotencyKeys, telemetryOutbox, topupStatusEnum, trials, usageLimits, user, userAttributions, userProductMetrics, userSafetyProfiles, verification, vrekoSchema, waitlist, waitlistAuditLogs, waitlistReferrals, waitlistTasks };
//# sourceMappingURL=chunk-HPXAICWM.js.map
//# sourceMappingURL=chunk-HPXAICWM.js.map