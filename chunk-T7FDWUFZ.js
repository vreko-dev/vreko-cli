#!/usr/bin/env node
import { isRedisAvailable, getCache, setCache, deleteCache } from './chunk-WD5F2AL4.js';
import { logger } from './chunk-GOYL3F4T.js';
import { snapshots, snapshotFiles, agentSuggestions, quarantineEvents, postAcceptOutcomes, policyEvaluations, loops, feedback, telemetryEvents, telemetryIdempotencyKeys, combinedSchema, user, aiChat, organization, member, invitation, purchase, session, account, verification, passkey, db, userAttributions, subscriptions, trials, pioneers, pioneerRedemptions, usageLimits, creditsLedger, mcpObservations, mcpToolInvocations, extensionSyncState, sagas, apiKeys, TIER_STALENESS_THRESHOLD_MS, WORKSPACE_LINK_TTL_MS, patterns, closeDatabaseConnection, checkDatabaseConnection } from './chunk-S4JUGQ6K.js';
import { shouldMergeAttribution, WorkspaceRegistrationSchema, createLogger, LogLevel, getEffectiveTier, isFeatureAvailableAtTier, getTierFeatures, getTierLimit, TIER_UPGRADE_SAGA } from './chunk-U5TVNIXX.js';
import { __name } from './chunk-EWOJGXRX.js';
import { eq, desc, and, gte, lte, sum, gt, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import slugify from '@sindresorhus/slugify';
import { nanoid } from 'nanoid';
import * as crypto2 from 'crypto';
import { randomBytes } from 'crypto';
import { pgTable, timestamp, boolean, text, varchar, index, jsonb } from 'drizzle-orm/pg-core';
import { createSelectSchema, createUpdateSchema, createInsertSchema } from 'drizzle-zod';
import 'fs';
import 'fs/promises';
import 'os';
import 'path';
import { PostHog } from 'posthog-node';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var SnapshotStoreDb = class {
  static {
    __name(this, "SnapshotStoreDb");
  }
  db;
  constructor(db2) {
    this.db = db2;
  }
  /**
   * Create a new snapshot
   */
  async createSnapshot(snapshot) {
    const id = crypto.randomUUID();
    const now = /* @__PURE__ */ new Date();
    await this.db.insert(snapshots).values({
      id,
      userId: snapshot.userId,
      apiKeyId: snapshot.apiKeyId,
      name: snapshot.name,
      description: snapshot.description,
      trigger: snapshot.triggerType,
      fileCount: snapshot.fileCount,
      totalSizeBytes: snapshot.totalSizeBytes,
      riskScore: snapshot.riskScore,
      createdAt: now,
      expiresAt: snapshot.expiresAt,
      workspaceId: snapshot.workspaceId
    });
    return id;
  }
  /**
   * Add files to a snapshot
   */
  async addFilesToSnapshot(snapshotId, files) {
    const values = files.map((file) => ({
      id: crypto.randomUUID(),
      snapshotId,
      filePath: file.filePath,
      fileHash: file.fileHash,
      fileSizeBytes: file.fileSizeBytes,
      changeType: file.changeType,
      linesChanged: file.linesChanged,
      containsSecrets: file.containsSecrets,
      riskLevel: file.riskLevel,
      cloudBackupUrl: file.cloudBackupUrl,
      createdAt: /* @__PURE__ */ new Date()
    }));
    if (values.length > 0) {
      await this.db.insert(snapshotFiles).values(values);
    }
  }
  /**
   * List snapshots for a user
   */
  async listSnapshots(userId, limit = 50) {
    const result = await this.db.select().from(snapshots).where(eq(snapshots.userId, userId)).orderBy(desc(snapshots.createdAt)).limit(limit);
    return result.map((row) => ({
      id: row.id,
      userId: row.userId,
      apiKeyId: row.apiKeyId,
      workspaceId: row.workspaceId || void 0,
      name: row.name || void 0,
      description: row.description || void 0,
      triggerType: row.trigger,
      fileCount: row.fileCount,
      totalSizeBytes: row.totalSizeBytes,
      riskScore: row.riskScore || void 0,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt || void 0
    }));
  }
  /**
   * Fetch a snapshot by ID
   */
  async fetchSnapshot(id) {
    const result = await this.db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      userId: row.userId,
      apiKeyId: row.apiKeyId,
      workspaceId: row.workspaceId || void 0,
      name: row.name || void 0,
      description: row.description || void 0,
      triggerType: row.trigger,
      fileCount: row.fileCount,
      totalSizeBytes: row.totalSizeBytes,
      riskScore: row.riskScore || void 0,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt || void 0
    };
  }
  /**
   * Fetch files for a snapshot
   */
  async fetchSnapshotFiles(snapshotId) {
    const result = await this.db.select().from(snapshotFiles).where(eq(snapshotFiles.snapshotId, snapshotId));
    return result.map((row) => ({
      id: row.id,
      snapshotId: row.snapshotId,
      filePath: row.filePath,
      fileHash: row.fileHash,
      fileSizeBytes: row.fileSizeBytes,
      changeType: row.changeType || void 0,
      linesChanged: row.linesChanged || void 0,
      containsSecrets: row.containsSecrets || void 0,
      riskLevel: row.riskLevel || void 0,
      cloudBackupUrl: row.cloudBackupUrl || void 0,
      createdAt: row.createdAt
    }));
  }
};
function redactString(value) {
  return value.replace(/./g, "*");
}
__name(redactString, "redactString");
function redactObject(obj) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }
  const record = obj;
  const redacted = Array.isArray(obj) ? [] : {};
  const target = redacted;
  for (const key in record) {
    if (typeof record[key] === "string") {
      target[key] = redactString(record[key]);
    } else if (typeof record[key] === "object") {
      target[key] = redactObject(record[key]);
    } else {
      target[key] = record[key];
    }
  }
  return target;
}
__name(redactObject, "redactObject");
var SLOW_MS = 200;
function asTyped(value) {
  return value;
}
__name(asTyped, "asTyped");
function quarantinePayload(event, error) {
  return {
    id: crypto.randomUUID(),
    userId: event.userId,
    apiKeyId: event.apiKeyId,
    originalEvent: event,
    errorReason: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : void 0,
    attemptedAt: /* @__PURE__ */ new Date(),
    createdAt: /* @__PURE__ */ new Date()
  };
}
__name(quarantinePayload, "quarantinePayload");
function agentSuggestionInsert(event) {
  const redacted = asTyped(applyRedaction(event));
  return {
    userId: redacted.userId,
    apiKeyId: redacted.apiKeyId,
    sessionId: redacted.sessionId,
    requestId: redacted.requestId,
    suggestionId: redacted.suggestionId,
    suggestionText: redacted.suggestionText,
    suggestionType: redacted.suggestionType,
    filePath: redacted.filePath,
    lineStart: redacted.lineStart,
    lineEnd: redacted.lineEnd,
    characterStart: redacted.characterStart,
    characterEnd: redacted.characterEnd,
    accepted: redacted.accepted,
    dismissed: redacted.dismissed,
    timestamp: redacted.timestamp,
    createdAt: /* @__PURE__ */ new Date()
  };
}
__name(agentSuggestionInsert, "agentSuggestionInsert");
function postAcceptOutcomeInsert(event) {
  const redacted = asTyped(applyRedaction(event));
  return {
    userId: redacted.userId,
    apiKeyId: redacted.apiKeyId,
    suggestionId: redacted.suggestionId,
    editsMade: redacted.editsMade,
    timeToEditMs: redacted.timeToEditMs,
    timeToSubmitMs: redacted.timeToSubmitMs,
    userFeedback: redacted.userFeedback,
    timestamp: redacted.timestamp,
    createdAt: /* @__PURE__ */ new Date()
  };
}
__name(postAcceptOutcomeInsert, "postAcceptOutcomeInsert");
function policyEvaluationInsert(event) {
  const redacted = asTyped(applyRedaction(event));
  return {
    userId: redacted.userId,
    apiKeyId: redacted.apiKeyId,
    sessionId: redacted.sessionId,
    requestId: redacted.requestId,
    policyName: redacted.policyName,
    policyVersion: redacted.policyVersion,
    evaluationResult: redacted.evaluationResult,
    violations: redacted.violations,
    remediationSteps: redacted.remediationSteps,
    timestamp: redacted.timestamp,
    createdAt: /* @__PURE__ */ new Date()
  };
}
__name(policyEvaluationInsert, "policyEvaluationInsert");
function loopInsert(event) {
  const redacted = asTyped(applyRedaction(event));
  return {
    userId: redacted.userId,
    apiKeyId: redacted.apiKeyId,
    sessionId: redacted.sessionId,
    requestId: redacted.requestId,
    loopType: redacted.loopType,
    iterationCount: redacted.iterationCount,
    durationMs: redacted.durationMs,
    success: redacted.success,
    errorMessage: redacted.errorMessage,
    timestamp: redacted.timestamp,
    createdAt: /* @__PURE__ */ new Date()
  };
}
__name(loopInsert, "loopInsert");
function feedbackInsert(event) {
  const redacted = asTyped(applyRedaction(event));
  return {
    userId: redacted.userId,
    apiKeyId: redacted.apiKeyId,
    sessionId: redacted.sessionId,
    requestId: redacted.requestId,
    feedbackType: redacted.feedbackType,
    feedbackText: redacted.feedbackText,
    rating: redacted.rating,
    metadata: redacted.metadata,
    timestamp: redacted.timestamp,
    createdAt: /* @__PURE__ */ new Date()
  };
}
__name(feedbackInsert, "feedbackInsert");
function applyRedaction(event) {
  const redacted = {
    ...event
  };
  for (const key of [
    "suggestionText",
    "filePath",
    "userFeedback",
    "errorMessage",
    "feedbackText"
  ]) {
    if (key in redacted && redacted[key]) {
      redacted[key] = redactString(String(redacted[key]));
    }
  }
  if ("violations" in redacted && redacted.violations) {
    redacted.violations = redactObject(redacted.violations);
  }
  if ("remediationSteps" in redacted && redacted.remediationSteps) {
    redacted.remediationSteps = redactObject(redacted.remediationSteps);
  }
  return redacted;
}
__name(applyRedaction, "applyRedaction");
function logSlowQuery(operationName, durationMs) {
  if (durationMs > SLOW_MS) {
    console.warn(`Slow query detected in ${operationName}: ${durationMs}ms`);
  }
}
__name(logSlowQuery, "logSlowQuery");
var TelemetrySinkDb = class {
  static {
    __name(this, "TelemetrySinkDb");
  }
  db;
  constructor(db2) {
    this.db = db2;
  }
  /**
   * Insert agent suggestion event with idempotency check
   */
  async insertAgentSuggestion(event) {
    const startTime = Date.now();
    try {
      const existing = await this.db.select().from(agentSuggestions).where(eq(agentSuggestions.requestId, event.requestId)).limit(1);
      if (existing.length > 0) {
        return;
      }
      await this.db.insert(agentSuggestions).values(agentSuggestionInsert(event));
      const duration = Date.now() - startTime;
      logSlowQuery("insertAgentSuggestion", duration);
    } catch (error) {
      await this.db.insert(quarantineEvents).values(quarantinePayload(event, error));
    }
  }
  /**
   * Insert post-accept outcome event with idempotency check
   */
  async insertPostAcceptOutcome(event) {
    const startTime = Date.now();
    try {
      const existing = await this.db.select().from(postAcceptOutcomes).where(eq(postAcceptOutcomes.suggestionId, event.suggestionId)).limit(1);
      if (existing.length > 0) {
        return;
      }
      await this.db.insert(postAcceptOutcomes).values(postAcceptOutcomeInsert(event));
      const duration = Date.now() - startTime;
      logSlowQuery("insertPostAcceptOutcome", duration);
    } catch (error) {
      await this.db.insert(quarantineEvents).values(quarantinePayload(event, error));
    }
  }
  /**
   * Insert policy evaluation event with idempotency check
   */
  async insertPolicyEvaluation(event) {
    const startTime = Date.now();
    try {
      const existing = await this.db.select().from(policyEvaluations).where(eq(policyEvaluations.requestId, event.requestId)).limit(1);
      if (existing.length > 0) {
        return;
      }
      await this.db.insert(policyEvaluations).values(policyEvaluationInsert(event));
      const duration = Date.now() - startTime;
      logSlowQuery("insertPolicyEvaluation", duration);
    } catch (error) {
      await this.db.insert(quarantineEvents).values(quarantinePayload(event, error));
    }
  }
  /**
   * Insert loop event with idempotency check
   */
  async insertLoop(event) {
    const startTime = Date.now();
    try {
      const existing = await this.db.select().from(loops).where(eq(loops.requestId, event.requestId)).limit(1);
      if (existing.length > 0) {
        return;
      }
      await this.db.insert(loops).values(loopInsert(event));
      const duration = Date.now() - startTime;
      logSlowQuery("insertLoop", duration);
    } catch (error) {
      await this.db.insert(quarantineEvents).values(quarantinePayload(event, error));
    }
  }
  /**
   * Insert feedback event with idempotency check
   */
  async insertFeedback(event) {
    const startTime = Date.now();
    try {
      const existing = await this.db.select().from(feedback).where(eq(feedback.requestId, event.requestId)).limit(1);
      if (existing.length > 0) {
        return;
      }
      await this.db.insert(feedback).values(feedbackInsert(event));
      const duration = Date.now() - startTime;
      logSlowQuery("insertFeedback", duration);
    } catch (error) {
      await this.db.insert(quarantineEvents).values(quarantinePayload(event, error));
    }
  }
  /**
   * Batch insert agent suggestions
   */
  async batchInsertAgentSuggestions(events) {
    const startTime = Date.now();
    if (events.length === 0) {
      return;
    }
    try {
      const values = events.map((event) => agentSuggestionInsert(event));
      await this.db.insert(agentSuggestions).values(values);
      const duration = Date.now() - startTime;
      logSlowQuery(`batchInsertAgentSuggestions(${events.length} items)`, duration);
    } catch (error) {
      for (const event of events) {
        await this.db.insert(quarantineEvents).values({
          id: crypto.randomUUID(),
          userId: event.userId,
          apiKeyId: event.apiKeyId,
          originalEvent: event,
          errorReason: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : void 0,
          attemptedAt: /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date()
        });
      }
    }
  }
  /**
   * Batch insert policy evaluations
   */
  async batchInsertPolicyEvaluations(events) {
    const startTime = Date.now();
    if (events.length === 0) {
      return;
    }
    try {
      const values = events.map((event) => policyEvaluationInsert(event));
      await this.db.insert(policyEvaluations).values(values);
      const duration = Date.now() - startTime;
      logSlowQuery(`batchInsertPolicyEvaluations(${events.length} items)`, duration);
    } catch (error) {
      for (const event of events) {
        await this.db.insert(quarantineEvents).values({
          id: crypto.randomUUID(),
          userId: event.userId,
          apiKeyId: event.apiKeyId,
          originalEvent: event,
          errorReason: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : void 0,
          attemptedAt: /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date()
        });
      }
    }
  }
};
var TelemetrySinkDbAdapter = class {
  static {
    __name(this, "TelemetrySinkDbAdapter");
  }
  db;
  constructor(db2) {
    this.db = db2;
  }
  /**
   * Store telemetry events with idempotency check
   */
  async storeEvents(events) {
    if (events.length === 0) {
      return;
    }
    const values = events.map((event) => ({
      id: event.id,
      userId: this.extractUserId(event),
      apiKeyId: this.extractApiKeyId(event),
      eventType: event.eventType,
      eventCategory: this.categorizeEvent(event),
      properties: this.redactProperties(event.payload),
      sessionId: event.context?.sessionId,
      platform: event.context?.client,
      timestamp: new Date(event.timestamp),
      createdAt: /* @__PURE__ */ new Date()
    }));
    await this.db.insert(telemetryEvents).values(values);
  }
  /**
   * Retrieve telemetry events with optional filtering
   */
  async getEvents(filter) {
    const results = await this.db.select().from(telemetryEvents);
    let events = results.map((row) => this.toTelemetryEvent(row));
    if (filter?.eventType) {
      events = events.filter((e) => e.eventType === filter.eventType);
    }
    if (filter?.sessionId) {
      events = events.filter((e) => e.context?.sessionId === filter.sessionId);
    }
    if (filter?.startTime !== void 0) {
      events = events.filter((e) => e.timestamp >= filter.startTime);
    }
    if (filter?.endTime !== void 0) {
      events = events.filter((e) => e.timestamp <= filter.endTime);
    }
    return events;
  }
  /**
   * Check if a request ID has been processed (idempotency)
   */
  async hasRequestId(requestId) {
    const result = await this.db.select().from(telemetryIdempotencyKeys).where(eq(telemetryIdempotencyKeys.idempotencyKey, requestId)).limit(1);
    return result.length > 0;
  }
  /**
   * Record a request ID as processed (idempotency)
   * Caches response data for duplicate request handling (2026 best practice)
   */
  async recordRequestId(requestId, responseData = {}) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await this.db.insert(telemetryIdempotencyKeys).values({
      idempotencyKey: requestId,
      responseData,
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt
    });
  }
  /**
   * Extract user ID from event context or payload
   */
  extractUserId(event) {
    return event.payload.userId || event.payload.user_id || null;
  }
  /**
   * Extract API key ID from event context or payload
   */
  extractApiKeyId(event) {
    return event.payload.apiKeyId || event.payload.api_key_id || null;
  }
  /**
   * Categorize event based on eventType
   * Maps to eventCategory enum in schema
   */
  categorizeEvent(event) {
    const type = event.eventType.toLowerCase();
    if (type.includes("error")) {
      return "error";
    }
    if (type.includes("feature") || type.includes("usage")) {
      return "feature_usage";
    }
    if (type.includes("lifecycle") || type.includes("session")) {
      return "lifecycle";
    }
    if (type.includes("engagement") || type.includes("interaction")) {
      return "engagement";
    }
    return "system";
  }
  /**
   * Redact sensitive properties before storage (GDPR compliance 2026)
   * Prevents PII leakage through telemetry data
   */
  redactProperties(properties) {
    const sensitiveFields = [
      "email",
      "password",
      "token",
      "apiKey",
      "api_key",
      "secret",
      "accessToken",
      "access_token",
      "refreshToken",
      "refresh_token",
      "creditCard",
      "credit_card",
      "ssn",
      "socialSecurity"
    ];
    const redacted = {
      ...properties
    };
    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = "[REDACTED]";
      }
    }
    return redacted;
  }
  /**
   * Transform database row to TelemetryEvent contract type
   */
  toTelemetryEvent(row) {
    return {
      id: row.id,
      eventType: row.eventType,
      payload: row.properties || {},
      timestamp: row.timestamp.getTime(),
      context: row.sessionId || row.requestId ? {
        sessionId: row.sessionId || "",
        requestId: row.requestId || `synthetic-${row.id}`,
        workspaceId: row.workspaceId || void 0,
        client: row.platform || "unknown"
      } : void 0
    };
  }
};

// ../../packages/platform/dist/db/database-service.js
var databaseService = {
  drizzle: db,
  isConnected: /* @__PURE__ */ __name(async () => {
    return await checkDatabaseConnection();
  }, "isConnected"),
  disconnect: /* @__PURE__ */ __name(async () => {
    await closeDatabaseConnection();
  }, "disconnect")
};
var healthCheck = /* @__PURE__ */ __name(async () => {
  const connected = await checkDatabaseConnection();
  return {
    connected,
    timestamp: /* @__PURE__ */ new Date()
  };
}, "healthCheck");
var { userDetectionCapabilities, capabilityAudit } = combinedSchema;
var userIdSchema = z.string().min(1, "User ID required").transform((val) => val.trim()).refine((val) => val.length > 0, "User ID cannot be whitespace");
var countSchema = z.number().int().positive("Count must be a positive integer");
var accuracyScoreSchema = z.number().min(0, "Accuracy score must be between 0.0 and 1.0").max(1, "Accuracy score must be between 0.0 and 1.0");
var capabilityCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 60 * 1e3;
var MAX_CACHE_SIZE = 1e4;
var cacheAccessOrder = [];
var cacheHits = 0;
var cacheMisses = 0;
function getCacheMetrics() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0
  };
}
__name(getCacheMetrics, "getCacheMetrics");
function resetCacheMetrics() {
  cacheHits = 0;
  cacheMisses = 0;
}
__name(resetCacheMetrics, "resetCacheMetrics");
function invalidateCapabilityCache(userId) {
  capabilityCache.delete(userId);
  const index2 = cacheAccessOrder.indexOf(userId);
  if (index2 >= 0) {
    cacheAccessOrder.splice(index2, 1);
  }
}
__name(invalidateCapabilityCache, "invalidateCapabilityCache");
function clearCapabilityCache() {
  capabilityCache.clear();
  cacheAccessOrder.length = 0;
  cacheHits = 0;
  cacheMisses = 0;
}
__name(clearCapabilityCache, "clearCapabilityCache");
function updateCacheWithLRU(userId, data) {
  const existingIndex = cacheAccessOrder.indexOf(userId);
  if (existingIndex >= 0) {
    cacheAccessOrder.splice(existingIndex, 1);
  }
  cacheAccessOrder.push(userId);
  if (cacheAccessOrder.length > MAX_CACHE_SIZE) {
    const evictKey = cacheAccessOrder.shift();
    if (evictKey) {
      capabilityCache.delete(evictKey);
    }
  }
  capabilityCache.set(userId, data);
}
__name(updateCacheWithLRU, "updateCacheWithLRU");
async function getCapabilities(userId, options = {}) {
  const validatedUserId = userIdSchema.parse(userId);
  if (!options.skipCache) {
    const cached = capabilityCache.get(validatedUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      cacheHits++;
      return cached.data;
    }
  }
  cacheMisses++;
  if (!db) {
    throw new Error("Database not available");
  }
  let capabilities = await db.query.userDetectionCapabilities.findFirst({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callback
    where: /* @__PURE__ */ __name((cap, { eq: eq15 }) => eq15(cap.userId, validatedUserId), "where")
  });
  if (!capabilities) {
    const [created] = await db.insert(userDetectionCapabilities).values({
      userId: validatedUserId,
      tier: "free"
    }).onConflictDoUpdate({
      target: userDetectionCapabilities.userId,
      set: {
        lastUpdated: /* @__PURE__ */ new Date()
      }
    }).returning();
    capabilities = created;
  }
  if (!capabilities) {
    throw new Error("Failed to fetch or create capabilities");
  }
  updateCacheWithLRU(validatedUserId, {
    data: capabilities,
    timestamp: Date.now()
  });
  return capabilities;
}
__name(getCapabilities, "getCapabilities");
async function updateCapabilities(userId, updates, expectedVersion) {
  if (!db) {
    throw new Error("Database not available");
  }
  const validatedUserId = userIdSchema.parse(userId);
  const updateValues = {
    lastUpdated: /* @__PURE__ */ new Date(),
    version: sql`${userDetectionCapabilities.version} + 1`
  };
  if (updates.falsePositivePatterns !== void 0) {
    updateValues.falsePositivePatterns = updates.falsePositivePatterns;
  }
  if (updates.customRiskIndicators !== void 0) {
    updateValues.customRiskIndicators = updates.customRiskIndicators;
  }
  if (updates.thresholdOverrides !== void 0) {
    updateValues.thresholdOverrides = updates.thresholdOverrides;
  }
  if (updates.accuracyScore !== void 0) {
    const validatedScore = accuracyScoreSchema.parse(updates.accuracyScore);
    updateValues.accuracyScore = validatedScore.toFixed(4);
  }
  if (updates.toolAccuracy !== void 0) {
    updateValues.toolAccuracy = updates.toolAccuracy;
  }
  if (updates.totalDetectionsAnalyzed !== void 0) {
    updateValues.totalDetectionsAnalyzed = updates.totalDetectionsAnalyzed;
  }
  if (updates.tier !== void 0) {
    updateValues.tier = updates.tier;
  }
  let result;
  if (expectedVersion != null) {
    result = await db.update(userDetectionCapabilities).set(updateValues).where(sql`${userDetectionCapabilities.userId} = ${validatedUserId} AND ${userDetectionCapabilities.version} = ${expectedVersion}`).returning();
  } else {
    result = await db.update(userDetectionCapabilities).set(updateValues).where(eq(userDetectionCapabilities.userId, validatedUserId)).returning();
  }
  invalidateCapabilityCache(validatedUserId);
  return result.length > 0 ? result[0] ?? null : null;
}
__name(updateCapabilities, "updateCapabilities");
async function appendFalsePositivePatterns(userId, patterns2) {
  if (!db || patterns2.length === 0) {
    return null;
  }
  const current = await getCapabilities(userId, {
    skipCache: true
  });
  const existingKeys = new Set(current.falsePositivePatterns?.map((p) => `${p.patternKey}:${p.aiTool}`) ?? []);
  const newPatterns = patterns2.filter((p) => !existingKeys.has(`${p.patternKey}:${p.aiTool}`));
  const mergedPatterns = [
    ...current.falsePositivePatterns ?? [],
    ...newPatterns
  ];
  const version = current.version ?? void 0;
  return await updateCapabilities(userId, {
    falsePositivePatterns: mergedPatterns
  }, version);
}
__name(appendFalsePositivePatterns, "appendFalsePositivePatterns");
async function incrementDetectionsAnalyzed(userId, count) {
  if (!db) {
    return;
  }
  const validatedCount = countSchema.parse(count);
  await db.update(userDetectionCapabilities).set({
    totalDetectionsAnalyzed: sql`${userDetectionCapabilities.totalDetectionsAnalyzed} + ${validatedCount}`,
    lastUpdated: /* @__PURE__ */ new Date()
  }).where(eq(userDetectionCapabilities.userId, userId));
  invalidateCapabilityCache(userId);
}
__name(incrementDetectionsAnalyzed, "incrementDetectionsAnalyzed");
async function handleTierUpgrade(userId, newTier, options = {}) {
  if (!db) {
    throw new Error("Database not available");
  }
  const current = await getCapabilities(userId, {
    skipCache: true
  });
  const oldTier = current.tier ?? "free";
  const version = current.version ?? void 0;
  const updated = await updateCapabilities(userId, {
    tier: newTier
  }, version);
  if (!updated) {
    return;
  }
  await logCapabilityAudit({
    userId,
    capabilityType: "tier_upgraded",
    change: {
      type: "tier_upgraded",
      tier: {
        oldTier,
        newTier
      }
    },
    reason: options.reason ?? "User subscription upgraded",
    sessionId: options.sessionId,
    workspaceId: options.workspaceId
  });
}
__name(handleTierUpgrade, "handleTierUpgrade");
async function handleTierDowngrade(userId, options = {}) {
  if (!db) {
    throw new Error("Database not available");
  }
  const current = await getCapabilities(userId, {
    skipCache: true
  });
  const oldTier = current.tier ?? "free";
  const clearedCapabilities = [];
  if ((current.customRiskIndicators?.length ?? 0) > 0) {
    clearedCapabilities.push("customRiskIndicators");
  }
  if (Object.keys(current.thresholdOverrides ?? {}).length > 0) {
    clearedCapabilities.push("thresholdOverrides");
  }
  if (Object.keys(current.toolAccuracy ?? {}).length > 0) {
    clearedCapabilities.push("toolAccuracy");
  }
  const version = current.version ?? void 0;
  const updated = await updateCapabilities(userId, {
    tier: "free",
    customRiskIndicators: [],
    thresholdOverrides: {},
    toolAccuracy: {}
  }, version);
  if (!updated) {
    return;
  }
  await logCapabilityAudit({
    userId,
    capabilityType: "tier_downgraded",
    change: {
      type: "tier_downgraded",
      tier: {
        oldTier,
        newTier: "free",
        clearedCapabilities
      }
    },
    reason: options.reason ?? "User subscription downgraded",
    sessionId: options.sessionId,
    workspaceId: options.workspaceId
  });
}
__name(handleTierDowngrade, "handleTierDowngrade");
function computeCapabilityAuditIdempotencyKey(params) {
  if (params.idempotencyKey) {
    return params.idempotencyKey;
  }
  const parts = [
    params.userId,
    params.capabilityType,
    params.sessionId ?? "",
    params.workspaceId ?? "",
    params.clientType ?? "",
    params.reason ?? ""
  ];
  if (params.change) {
    parts.push(JSON.stringify(params.change));
  }
  if (params.performanceBefore) {
    parts.push(JSON.stringify(params.performanceBefore));
  }
  if (params.performanceAfter) {
    parts.push(JSON.stringify(params.performanceAfter));
  }
  return parts.join("|");
}
__name(computeCapabilityAuditIdempotencyKey, "computeCapabilityAuditIdempotencyKey");
async function logCapabilityAudit(params) {
  if (!db) {
    return;
  }
  const idempotencyKey = computeCapabilityAuditIdempotencyKey(params);
  const values = {
    userId: params.userId,
    capabilityType: params.capabilityType,
    change: params.change,
    reason: params.reason,
    performanceBefore: params.performanceBefore,
    performanceAfter: params.performanceAfter,
    sessionId: params.sessionId,
    workspaceId: params.workspaceId,
    clientType: params.clientType,
    idempotencyKey
  };
  await db.insert(capabilityAudit).values(values).onConflictDoNothing({
    target: capabilityAudit.idempotencyKey
  });
}
__name(logCapabilityAudit, "logCapabilityAudit");
async function getCapabilityAuditHistory(userId, limit = 50) {
  if (!db) {
    return [];
  }
  return await db.query.capabilityAudit.findMany({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callbacks
    where: /* @__PURE__ */ __name((audit, { eq: eq15 }) => eq15(audit.userId, userId), "where"),
    orderBy: /* @__PURE__ */ __name((audit, { desc: desc4 }) => desc4(audit.createdAt), "orderBy"),
    limit
  });
}
__name(getCapabilityAuditHistory, "getCapabilityAuditHistory");
async function recordFalsePositiveSignal(userId, signal, options = {}) {
  if (!db) {
    return null;
  }
  const current = await getCapabilities(userId, {
    skipCache: true
  });
  const patterns2 = [
    ...current.falsePositivePatterns ?? []
  ];
  const existingIndex = patterns2.findIndex((p) => p.patternKey === signal.patternKey && p.aiTool === signal.aiTool && p.filePattern === signal.filePattern);
  let learned;
  if (existingIndex >= 0) {
    const existingPattern = patterns2[existingIndex];
    if (!existingPattern) {
      throw new Error("Pattern not found at expected index");
    }
    learned = mergeSignalIntoPattern(existingPattern, signal);
    patterns2[existingIndex] = learned;
  } else {
    learned = signalToPattern(signal);
    patterns2.push(learned);
  }
  const version = current.version ?? void 0;
  const updated = await updateCapabilities(userId, {
    falsePositivePatterns: patterns2
  }, version);
  if (!updated) {
    return null;
  }
  await logCapabilityAudit({
    userId,
    capabilityType: "pattern_learned",
    change: {
      type: "pattern_learned",
      patterns: [
        {
          patternKey: learned.patternKey,
          aiTool: learned.aiTool,
          weight: learned.weight,
          decayedWeight: learned.decayedWeight,
          source: signal.type
        }
      ]
    },
    reason: options.reason ?? "False positive feedback recorded",
    performanceBefore: void 0,
    performanceAfter: void 0,
    sessionId: options.sessionId,
    workspaceId: options.workspaceId,
    clientType: options.clientType
  });
  return updated;
}
__name(recordFalsePositiveSignal, "recordFalsePositiveSignal");
async function resetCapabilities(userId, options = {}) {
  if (!db) {
    return null;
  }
  const current = await getCapabilities(userId, {
    skipCache: true
  });
  const version = current.version ?? void 0;
  const updated = await updateCapabilities(userId, {
    falsePositivePatterns: [],
    customRiskIndicators: [],
    thresholdOverrides: {},
    accuracyScore: 0,
    toolAccuracy: {},
    totalDetectionsAnalyzed: 0,
    tier: "free"
  }, version);
  if (!updated) {
    return null;
  }
  await logCapabilityAudit({
    userId,
    capabilityType: "capabilities_reset",
    change: {
      type: "capabilities_reset",
      reason: options.reason ?? "Capabilities reset to baseline"
    },
    reason: options.reason ?? "Capabilities reset to baseline",
    performanceBefore: void 0,
    performanceAfter: void 0,
    sessionId: options.sessionId,
    workspaceId: options.workspaceId,
    clientType: options.clientType
  });
  return updated;
}
__name(resetCapabilities, "resetCapabilities");
var IMPLICIT_WEIGHT = 1;
var EXPLICIT_WEIGHT = 3;
var DECAY_HALF_LIFE_DAYS = 14;
function calculateDecayedWeight(signal) {
  const baseWeight = signal.type === "explicit" ? EXPLICIT_WEIGHT : IMPLICIT_WEIGHT;
  const timestamp3 = signal.timestamp ?? Date.now();
  const ageMs = Date.now() - timestamp3;
  const ageDays = ageMs / (24 * 60 * 60 * 1e3);
  const decayFactor = 0.5 ** (ageDays / DECAY_HALF_LIFE_DAYS);
  return baseWeight * decayFactor;
}
__name(calculateDecayedWeight, "calculateDecayedWeight");
function signalToPattern(signal) {
  const weight = signal.type === "explicit" ? EXPLICIT_WEIGHT : IMPLICIT_WEIGHT;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    patternKey: signal.patternKey,
    aiTool: signal.aiTool,
    filePattern: signal.filePattern,
    proceedCount: 1,
    weight,
    decayedWeight: calculateDecayedWeight(signal),
    firstSeen: now,
    lastSeen: now
  };
}
__name(signalToPattern, "signalToPattern");
function mergeSignalIntoPattern(existing, signal) {
  const newWeight = signal.type === "explicit" ? EXPLICIT_WEIGHT : IMPLICIT_WEIGHT;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    ...existing,
    proceedCount: existing.proceedCount + 1,
    weight: existing.weight + newWeight,
    decayedWeight: calculateDecayedWeight({
      ...signal,
      timestamp: Date.now()
    }),
    lastSeen: now
  };
}
__name(mergeSignalIntoPattern, "mergeSignalIntoPattern");
var { organization: organization2, member: member2 } = combinedSchema;
async function getOrganizations({ limit, offset, query }) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.organization.findMany({
    where: query ? (org, { like }) => like(org.name, `%${query}%`) : void 0,
    limit,
    offset,
    extras: {
      membersCount: sql`(SELECT COUNT(*) FROM ${member2} WHERE ${member2.organizationId} = ${organization2.id})`.as("membersCount")
    }
  });
}
__name(getOrganizations, "getOrganizations");
async function countAllOrganizations() {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.$count(organization2);
}
__name(countAllOrganizations, "countAllOrganizations");
async function getOrganizationById(id) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.organization.findFirst({
    where: /* @__PURE__ */ __name((org, { eq: eq15 }) => eq15(org.id, id), "where"),
    with: {
      members: true,
      invitations: true
    }
  });
}
__name(getOrganizationById, "getOrganizationById");
async function getOrganizationsWithMembers(userId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.organization.findMany({
    with: {
      members: {
        where: /* @__PURE__ */ __name((member3, { eq: eq15 }) => eq15(member3.userId, userId), "where"),
        with: {
          user: true
        }
      }
    }
  });
}
__name(getOrganizationsWithMembers, "getOrganizationsWithMembers");
async function getInvitationById(id) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.invitation.findFirst({
    where: /* @__PURE__ */ __name((invitation2, { eq: eq15 }) => eq15(invitation2.id, id), "where"),
    with: {
      organization: true
    }
  });
}
__name(getInvitationById, "getInvitationById");
async function getOrganizationBySlug(slug) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.organization.findFirst({
    where: /* @__PURE__ */ __name((org, { eq: eq15 }) => eq15(org.slug, slug), "where")
  });
}
__name(getOrganizationBySlug, "getOrganizationBySlug");
async function getOrganizationMembership(organizationId, userId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.member.findFirst({
    where: /* @__PURE__ */ __name((member3, { and: and5, eq: eq15 }) => and5(eq15(member3.organizationId, organizationId), eq15(member3.userId, userId)), "where"),
    with: {
      organization: true
    }
  });
}
__name(getOrganizationMembership, "getOrganizationMembership");
async function getOrganizationWithPurchasesAndMembersCount(organizationId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.organization.findFirst({
    where: /* @__PURE__ */ __name((org, { eq: eq15 }) => eq15(org.id, organizationId), "where"),
    with: {
      purchases: true
    },
    extras: {
      membersCount: sql`(SELECT COUNT(*) FROM ${member2} WHERE ${member2.organizationId} = ${organization2.id})`.as("membersCount")
    }
  });
}
__name(getOrganizationWithPurchasesAndMembersCount, "getOrganizationWithPurchasesAndMembersCount");
async function getPendingInvitationByEmail(email) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.invitation.findFirst({
    where: /* @__PURE__ */ __name((invitation2, { and: and5, eq: eq15 }) => and5(eq15(invitation2.email, email), eq15(invitation2.status, "pending")), "where")
  });
}
__name(getPendingInvitationByEmail, "getPendingInvitationByEmail");
async function updateOrganization(updatedOrganization) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.update(organization2).set(updatedOrganization).where(eq(organization2.id, updatedOrganization.id));
}
__name(updateOrganization, "updateOrganization");
async function generateOrganizationSlug(name) {
  const baseSlug = slugify(name, {
    lowercase: true
  });
  let slug = baseSlug;
  let hasAvailableSlug = false;
  for (let i = 0; i < 3; i++) {
    const existing = await getOrganizationBySlug(slug);
    if (!existing) {
      hasAvailableSlug = true;
      break;
    }
    slug = `${baseSlug}-${nanoid(5)}`;
  }
  if (!hasAvailableSlug) {
    throw new Error("Could not generate unique slug");
  }
  return slug;
}
__name(generateOrganizationSlug, "generateOrganizationSlug");
var PRIVACY_SALT = process.env.PRIVACY_SALT || "default-salt";
function anonymizeUserId(userId) {
  const hash = crypto2.createHash("sha256").update(userId + PRIVACY_SALT).digest("hex");
  return `anon_${hash.slice(0, 16)}`;
}
__name(anonymizeUserId, "anonymizeUserId");
function anonymizeEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) {
    return anonymizeUserId(email);
  }
  const domainHash = crypto2.createHash("sha256").update(domain + PRIVACY_SALT).digest("hex").slice(0, 8);
  const maskedLocal = `${local.charAt(0)}***`;
  return `${maskedLocal}@${domainHash}`;
}
__name(anonymizeEmail, "anonymizeEmail");
function sanitizeForLogging(obj) {
  const sensitiveFields = [
    "password",
    "email",
    "token",
    "apiKey",
    "key",
    "secret",
    "refreshToken",
    "accessToken",
    "salt",
    "hash"
  ];
  const result = {
    ...obj
  };
  for (const field of sensitiveFields) {
    if (field in result) {
      result[field] = "[REDACTED]";
    }
  }
  return result;
}
__name(sanitizeForLogging, "sanitizeForLogging");
async function logAnonymizedEvent(event, data, userId) {
  try {
    const anonymousId = userId ? anonymizeUserId(userId) : void 0;
    const sanitized = sanitizeForLogging({
      ...data,
      userId: void 0,
      email: void 0,
      apiKeyId: void 0,
      token: void 0
    });
    logger.info(`Analytics: ${event}`, {
      event,
      anonymousId,
      ...sanitized,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    logger.error("Failed to log anonymized event", {
      error: error instanceof Error ? error.message : String(error),
      event
    });
  }
}
__name(logAnonymizedEvent, "logAnonymizedEvent");
async function exportUserData(userId) {
  try {
    if (!db) {
      logger.error("Database not initialized");
      return null;
    }
    const userRecord = await db.select().from(user).where(eq(user.id, userId)).then((rows) => rows[0] || null);
    if (!userRecord) {
      logger.warn("User not found for data export", {
        userId
      });
      return null;
    }
    const [userSessions, userAccounts, userApiKeys, userSubscriptions] = await Promise.all([
      db.select().from(session).where(eq(session.userId, userId)),
      db.select().from(account).where(eq(account.userId, userId)),
      db.select().from(apiKeys).where(eq(apiKeys.userId, userId)),
      db.select().from(subscriptions).where(eq(subscriptions.userId, userId))
    ]);
    const sanitizedUser = sanitizeForLogging(userRecord);
    const sanitizedApiKeys = userApiKeys.map((k) => sanitizeForLogging(k));
    return {
      user: sanitizedUser,
      sessions: userSessions,
      accounts: userAccounts,
      apiKeys: sanitizedApiKeys,
      subscriptions: userSubscriptions,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    logger.error("Failed to export user data", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}
__name(exportUserData, "exportUserData");
async function deleteUserData(userId) {
  try {
    if (!db) {
      logger.error("Database not initialized");
      return false;
    }
    logger.warn("Deleting all user data (GDPR Right to Erasure)", {
      userId
    });
    await db.delete(user).where(eq(user.id, userId));
    logger.info("User data deleted successfully", {
      userId
    });
    return true;
  } catch (error) {
    logger.error("Failed to delete user data", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}
__name(deleteUserData, "deleteUserData");
async function deleteUserApiKeys(userId) {
  try {
    if (!db) {
      logger.error("Database not initialized");
      return 0;
    }
    const result = await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
    logger.info("User API keys deleted", {
      userId
    });
    return result.rowCount || 0;
  } catch (error) {
    logger.error("Failed to delete user API keys", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}
__name(deleteUserApiKeys, "deleteUserApiKeys");
async function anonymizeUserData(userId) {
  try {
    if (!db) {
      logger.error("Database not initialized");
      return false;
    }
    logger.info("Anonymizing user data", {
      userId
    });
    await db.update(user).set({
      email: `deleted+${anonymizeUserId(userId)}@vreko.local`,
      name: "Deleted User",
      image: null,
      username: null
    }).where(eq(user.id, userId));
    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
    logger.info("User data anonymized successfully", {
      userId
    });
    return true;
  } catch (error) {
    logger.error("Failed to anonymize user data", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}
__name(anonymizeUserData, "anonymizeUserData");
async function getUserPrivacyPreferences(userId) {
  try {
    if (!db) {
      logger.error("Database not initialized");
      return null;
    }
    const userRecord = await db.select().from(user).where(eq(user.id, userId)).then((rows) => rows[0] || null);
    if (!userRecord) {
      return null;
    }
    return {
      analyticsConsent: true,
      marketingConsent: false,
      sharingConsent: false
    };
  } catch (error) {
    logger.error("Failed to get privacy preferences", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    return null;
  }
}
__name(getUserPrivacyPreferences, "getUserPrivacyPreferences");
function shouldRetainData(createdAt, retentionDays = 90) {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1e3;
  const ageMs = Date.now() - createdAt.getTime();
  return ageMs < retentionMs;
}
__name(shouldRetainData, "shouldRetainData");
async function cleanupExpiredData(retentionDays = 90) {
  try {
    if (!db) {
      logger.error("Database not initialized");
      return;
    }
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1e3);
    await db.delete(session).where(lte(session.expiresAt, cutoffDate));
    logger.info("Data cleanup completed", {
      retentionDays,
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (error) {
    logger.error("Data cleanup failed", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
__name(cleanupExpiredData, "cleanupExpiredData");
var { purchase: purchase2 } = combinedSchema;
async function getPurchasesByOrganizationId(organizationId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return db.query.purchase.findMany({
    where: /* @__PURE__ */ __name((purchase3, { eq: eq15 }) => eq15(purchase3.organizationId, organizationId), "where")
  });
}
__name(getPurchasesByOrganizationId, "getPurchasesByOrganizationId");
async function getPurchasesByUserId(userId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return db.query.purchase.findMany({
    where: /* @__PURE__ */ __name((purchase3, { eq: eq15 }) => eq15(purchase3.userId, userId), "where")
  });
}
__name(getPurchasesByUserId, "getPurchasesByUserId");
async function getPurchaseById(id) {
  if (!db) {
    throw new Error("Database not available");
  }
  return db.query.purchase.findFirst({
    where: /* @__PURE__ */ __name((purchase3, { eq: eq15 }) => eq15(purchase3.id, id), "where")
  });
}
__name(getPurchaseById, "getPurchaseById");
async function getPurchaseBySubscriptionId(subscriptionId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return db.query.purchase.findFirst({
    where: /* @__PURE__ */ __name((purchase3, { eq: eq15 }) => eq15(purchase3.subscriptionId, subscriptionId), "where")
  });
}
__name(getPurchaseBySubscriptionId, "getPurchaseBySubscriptionId");
async function createPurchase(insertedPurchase) {
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(purchase2).values(insertedPurchase).returning({
    id: purchase2.id
  });
  const firstResult = result[0];
  if (!firstResult) {
    throw new Error("Failed to create purchase");
  }
  const { id } = firstResult;
  return getPurchaseById(id);
}
__name(createPurchase, "createPurchase");
async function updatePurchase(updatedPurchase) {
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.update(purchase2).set(updatedPurchase).returning({
    id: purchase2.id
  });
  const firstResult = result[0];
  if (!firstResult) {
    throw new Error("Failed to update purchase");
  }
  const { id } = firstResult;
  return getPurchaseById(id);
}
__name(updatePurchase, "updatePurchase");
async function deletePurchaseBySubscriptionId(subscriptionId) {
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(purchase2).where(eq(purchase2.subscriptionId, subscriptionId));
}
__name(deletePurchaseBySubscriptionId, "deletePurchaseBySubscriptionId");
var { user: user2, account: account2 } = combinedSchema;
var searchUsersSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});
async function getUsers({ limit, offset, query }) {
  if (!db) {
    throw new Error("Database not available");
  }
  const validatedParams = searchUsersSchema.parse({
    query,
    limit,
    offset
  });
  const whereClause = query ? (user3, { like, sql: sql5 }) => like(user3.name, sql5`${"%"}${validatedParams.query}${"%"}`) : void 0;
  return await db.query.user.findMany({
    where: whereClause,
    limit: validatedParams.limit,
    offset: validatedParams.offset
  });
}
__name(getUsers, "getUsers");
async function countAllUsers() {
  if (!db) {
    throw new Error("Database not available");
  }
  return db.$count(user2);
}
__name(countAllUsers, "countAllUsers");
async function getUserById(id) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.user.findFirst({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callback
    where: /* @__PURE__ */ __name((user3, { eq: eq15 }) => eq15(user3.id, id), "where")
  });
}
__name(getUserById, "getUserById");
async function getUserByEmail(email) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.user.findFirst({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callback
    where: /* @__PURE__ */ __name((user3, { eq: eq15 }) => eq15(user3.email, email), "where")
  });
}
__name(getUserByEmail, "getUserByEmail");
async function createUser({ email, name, role, emailVerified, onboardingComplete }) {
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(user2).values({
    email,
    name,
    role,
    emailVerified,
    onboardingComplete,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).returning({
    id: user2.id
  });
  const firstResult = result[0];
  if (!firstResult) {
    throw new Error("Failed to create user");
  }
  const { id } = firstResult;
  const newUser = await getUserById(id);
  return newUser;
}
__name(createUser, "createUser");
async function getAccountById(id) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.account.findFirst({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callback
    where: /* @__PURE__ */ __name((account3, { eq: eq15 }) => eq15(account3.id, id), "where")
  });
}
__name(getAccountById, "getAccountById");
async function createUserAccount({ userId, providerId, accountId, hashedPassword }) {
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(account2).values({
    userId,
    accountId,
    providerId,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date(),
    password: hashedPassword
  }).returning({
    id: account2.id
  });
  const firstResult = result[0];
  if (!firstResult) {
    throw new Error("Failed to create account");
  }
  const { id } = firstResult;
  const newAccount = await getAccountById(id);
  return newAccount;
}
__name(createUserAccount, "createUserAccount");
async function updateUser(updatedUser) {
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(user2).set(updatedUser).where(eq(user2.id, updatedUser.id));
}
__name(updateUser, "updateUser");
var { workspaceLinks } = combinedSchema;
var workspaceIdSchema = z.string().regex(/^([a-f0-9]{12}|ws[g]?_[a-f0-9]{32})$/, "Invalid workspace ID format: must be 12-char hex (unified) or ws_/wsg_ + 32-char hex (legacy)");
var linkWorkspaceSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string().min(1),
  tier: z.enum([
    "free",
    "pro",
    "enterprise"
  ]).optional().default("free"),
  displayName: z.string().max(255).optional(),
  expiresAt: z.date().optional()
});
var updateTierSchema = z.object({
  workspaceId: workspaceIdSchema,
  tier: z.enum([
    "free",
    "pro",
    "enterprise"
  ])
});
async function getWorkspaceLinkById(workspaceId) {
  if (!db) {
    throw new Error("Database not available");
  }
  const validatedId = workspaceIdSchema.parse(workspaceId);
  return await db.query.workspaceLinks.findFirst({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callback
    where: /* @__PURE__ */ __name((link, { eq: eq15 }) => eq15(link.workspaceId, validatedId), "where")
  });
}
__name(getWorkspaceLinkById, "getWorkspaceLinkById");
async function resolveTierByWorkspaceId(workspaceId) {
  if (!db) {
    return {
      found: false,
      tier: "free"
    };
  }
  try {
    const validatedId = workspaceIdSchema.parse(workspaceId);
    const link = await db.query.workspaceLinks.findFirst({
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callback
      where: /* @__PURE__ */ __name((link2, { eq: eq15 }) => eq15(link2.workspaceId, validatedId), "where")
    });
    if (!link) {
      return {
        found: false,
        tier: "free"
      };
    }
    if (link.expiresAt && link.expiresAt < /* @__PURE__ */ new Date()) {
      await db.delete(workspaceLinks).where(eq(workspaceLinks.workspaceId, validatedId));
      process.stdout.write(`[Workspace Links] Deleted expired link: ${validatedId.slice(0, 10)}...`);
      return {
        found: false,
        tier: "free"
      };
    }
    const staleCutoff = new Date(Date.now() - TIER_STALENESS_THRESHOLD_MS);
    const tierRefreshedAt = link.tierRefreshedAt ?? link.createdAt;
    let tierRefreshed = false;
    let currentTier = link.tier;
    if (tierRefreshedAt < staleCutoff) {
      const [subscription] = await db.select({
        plan: subscriptions.plan
      }).from(subscriptions).where(eq(subscriptions.userId, link.userId)).limit(1);
      const freshTier = mapPlanToTier(subscription?.plan);
      await db.update(workspaceLinks).set({
        tier: freshTier,
        tierRefreshedAt: /* @__PURE__ */ new Date(),
        lastSeenAt: /* @__PURE__ */ new Date()
      }).where(eq(workspaceLinks.workspaceId, validatedId));
      currentTier = freshTier;
      tierRefreshed = true;
      process.stdout.write(`[Workspace Links] Refreshed stale tier for ${validatedId.slice(0, 10)}...: ${link.tier} -> ${freshTier}`);
    } else {
      db.update(workspaceLinks).set({
        lastSeenAt: /* @__PURE__ */ new Date()
      }).where(eq(workspaceLinks.workspaceId, validatedId)).catch(() => {
      });
    }
    return {
      found: true,
      tier: currentTier,
      userId: link.userId,
      displayName: link.displayName ?? void 0,
      tierRefreshed
    };
  } catch (_error) {
    return {
      found: false,
      tier: "free"
    };
  }
}
__name(resolveTierByWorkspaceId, "resolveTierByWorkspaceId");
function mapPlanToTier(plan) {
  switch (plan) {
    case "pro":
    case "solo":
      return "pro";
    case "team":
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}
__name(mapPlanToTier, "mapPlanToTier");
async function linkWorkspace(params) {
  if (!db) {
    throw new Error("Database not available");
  }
  const validated = linkWorkspaceSchema.parse(params);
  const expiresAt = validated.expiresAt ?? new Date(Date.now() + WORKSPACE_LINK_TTL_MS);
  const existing = await getWorkspaceLinkById(validated.workspaceId);
  if (existing) {
    await db.update(workspaceLinks).set({
      userId: validated.userId,
      tier: validated.tier,
      displayName: validated.displayName,
      lastSeenAt: /* @__PURE__ */ new Date(),
      tierRefreshedAt: /* @__PURE__ */ new Date(),
      expiresAt
    }).where(eq(workspaceLinks.workspaceId, validated.workspaceId));
    return await getWorkspaceLinkById(validated.workspaceId);
  }
  await db.insert(workspaceLinks).values({
    workspaceId: validated.workspaceId,
    userId: validated.userId,
    tier: validated.tier,
    displayName: validated.displayName,
    tierRefreshedAt: /* @__PURE__ */ new Date(),
    expiresAt
  });
  return await getWorkspaceLinkById(validated.workspaceId);
}
__name(linkWorkspace, "linkWorkspace");
async function updateWorkspaceTier(params) {
  if (!db) {
    throw new Error("Database not available");
  }
  const validated = updateTierSchema.parse(params);
  const result = await db.update(workspaceLinks).set({
    tier: validated.tier,
    lastSeenAt: /* @__PURE__ */ new Date()
  }).where(eq(workspaceLinks.workspaceId, validated.workspaceId)).returning({
    workspaceId: workspaceLinks.workspaceId
  });
  return result.length > 0;
}
__name(updateWorkspaceTier, "updateWorkspaceTier");
async function unlinkWorkspace(workspaceId) {
  if (!db) {
    throw new Error("Database not available");
  }
  const validatedId = workspaceIdSchema.parse(workspaceId);
  const result = await db.delete(workspaceLinks).where(eq(workspaceLinks.workspaceId, validatedId)).returning({
    workspaceId: workspaceLinks.workspaceId
  });
  return result.length > 0;
}
__name(unlinkWorkspace, "unlinkWorkspace");
async function getWorkspaceLinksByUserId(userId) {
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.query.workspaceLinks.findMany({
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder callbacks
    where: /* @__PURE__ */ __name((link, { eq: eq15 }) => eq15(link.userId, userId), "where"),
    orderBy: /* @__PURE__ */ __name((link, { desc: desc4 }) => desc4(link.lastSeenAt), "orderBy")
  });
}
__name(getWorkspaceLinksByUserId, "getWorkspaceLinksByUserId");
async function unlinkAllWorkspacesForUser(userId) {
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.delete(workspaceLinks).where(eq(workspaceLinks.userId, userId)).returning({
    workspaceId: workspaceLinks.workspaceId
  });
  return result.length;
}
__name(unlinkAllWorkspacesForUser, "unlinkAllWorkspacesForUser");
async function searchSimilarPatterns(queryVector, limit = 10, similarityThreshold = 0.75, patternType, isGlobal) {
  if (queryVector.length !== 256) {
    throw new Error(`Expected 256-dimensional vector, got ${queryVector.length}`);
  }
  const vectorLiteral = `[${queryVector.join(",")}]`;
  let query = db.select({
    id: patterns.id,
    patternSignature: patterns.patternSignature,
    patternType: patterns.patternType,
    // Cosine similarity: 1 - distance (higher is more similar)
    similarity: sql`1 - (${patterns.embedding} <=> ${vectorLiteral}::vector)`,
    occurrenceCount: patterns.occurrenceCount,
    successRate: patterns.successRate,
    isGlobal: patterns.isGlobal
  }).from(patterns).where(sql`1 - (${patterns.embedding} <=> ${vectorLiteral}::vector) >= ${similarityThreshold}`);
  if (patternType) {
    query = query.where(sql`${patterns.patternType} = ${patternType}`);
  }
  if (isGlobal !== void 0) {
    query = query.where(sql`${patterns.isGlobal} = ${isGlobal}`);
  }
  const results = await query.orderBy(sql`${patterns.embedding} <=> ${vectorLiteral}::vector`).limit(limit);
  return results;
}
__name(searchSimilarPatterns, "searchSimilarPatterns");
async function findSimilarPatterns(patternId, limit = 5, excludeSelf = true) {
  const referencePattern = await db.select({
    embedding: patterns.embedding
  }).from(patterns).where(sql`${patterns.id} = ${patternId}`).limit(1);
  if (!referencePattern.length || !referencePattern[0].embedding) {
    throw new Error(`Pattern ${patternId} not found or has no embedding`);
  }
  const queryVector = referencePattern[0].embedding;
  const vectorLiteral = `[${queryVector.join(",")}]`;
  let query = db.select({
    id: patterns.id,
    patternSignature: patterns.patternSignature,
    patternType: patterns.patternType,
    similarity: sql`1 - (${patterns.embedding} <=> ${vectorLiteral}::vector)`,
    occurrenceCount: patterns.occurrenceCount,
    successRate: patterns.successRate,
    isGlobal: patterns.isGlobal
  }).from(patterns).where(sql`${patterns.embedding} IS NOT NULL`);
  if (excludeSelf) {
    query = query.where(sql`${patterns.id} != ${patternId}`);
  }
  const results = await query.orderBy(sql`${patterns.embedding} <=> ${vectorLiteral}::vector`).limit(limit);
  return results;
}
__name(findSimilarPatterns, "findSimilarPatterns");
async function insertPatternWithEmbedding(patternSignature, embedding, patternType, userId, toolAffinity, fileTypes) {
  if (embedding.length !== 256) {
    throw new Error(`Expected 256-dimensional vector, got ${embedding.length}`);
  }
  const result = await db.insert(patterns).values({
    patternSignature,
    embedding,
    patternType,
    userId,
    toolAffinity: toolAffinity ?? [],
    fileTypes: fileTypes ?? [],
    isGlobal: !userId
  }).returning({
    id: patterns.id
  });
  return result[0].id;
}
__name(insertPatternWithEmbedding, "insertPatternWithEmbedding");
async function updatePatternEmbedding(patternId, embedding) {
  if (embedding.length !== 256) {
    throw new Error(`Expected 256-dimensional vector, got ${embedding.length}`);
  }
  await db.update(patterns).set({
    embedding
  }).where(sql`${patterns.id} = ${patternId}`);
}
__name(updatePatternEmbedding, "updatePatternEmbedding");
async function isPgvectorEnabled() {
  try {
    const result = await db.execute(sql`
			SELECT 1 FROM pg_extension WHERE extname = 'vector'
		`);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
__name(isPgvectorEnabled, "isPgvectorEnabled");
async function getVectorStats() {
  const [totalResult, embeddingResult, indexResult] = await Promise.all([
    db.select({
      count: sql`count(*)`
    }).from(patterns),
    db.select({
      count: sql`count(*)`
    }).from(patterns).where(sql`${patterns.embedding} IS NOT NULL`),
    db.execute(sql`
			SELECT indexname, indexdef
			FROM pg_indexes
			WHERE tablename = 'patterns'
			AND indexdef LIKE '%hnsw%'
		`)
  ]);
  const indexRow = indexResult.rows[0];
  return {
    totalPatterns: totalResult[0]?.count ?? 0,
    patternsWithEmbeddings: embeddingResult[0]?.count ?? 0,
    indexName: indexRow?.indexname ?? null,
    indexType: indexRow?.indexdef?.includes("hnsw") ? "hnsw" : null
  };
}
__name(getVectorStats, "getVectorStats");
var extensionLinkTokens = pgTable("extension_link_tokens", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  tokenHash: text("token_hash").notNull(),
  userId: varchar("user_id", {
    length: 255
  }).notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: varchar("workspace_id", {
    length: 255
  }),
  client: text("client").notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, (table) => ({
  // Partial index for fast active token lookup (used=false, not expired)
  tokenHashIdx: index("idx_extension_link_tokens_hash").on(table.tokenHash),
  // Index for cleanup jobs
  expiryIdx: index("idx_extension_link_tokens_expiry").on(table.expiresAt)
}));
var extensionSessions = pgTable("extension_sessions", {
  id: varchar("id", {
    length: 255
  }).$defaultFn(() => nanoid()).primaryKey(),
  userId: varchar("user_id", {
    length: 255
  }).notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  workspaceId: varchar("workspace_id", {
    length: 255
  }),
  client: text("client").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", {
    withTimezone: true
  }),
  revokedAt: timestamp("revoked_at", {
    withTimezone: true
  }),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  metadata: jsonb("metadata").$type()
}, (table) => ({
  // Unique index for fast refresh token lookup (only non-revoked)
  refreshHashIdx: index("idx_extension_sessions_refresh_hash").on(table.refreshTokenHash),
  // Index for user session queries (Phase 2 UI)
  userIdx: index("idx_extension_sessions_user").on(table.userId),
  // Index for active sessions
  activeIdx: index("idx_extension_sessions_active").on(table.userId, table.revokedAt)
}));

// ../../packages/platform/dist/db/test-utils.js
var testInTransaction = /* @__PURE__ */ __name((_testName, testFn) => {
  return async () => {
    const module = await import('./client-DYTUFNQX.js');
    const db2 = module.db;
    await testFn(db2);
  };
}, "testInTransaction");
var createTestUser = /* @__PURE__ */ __name(async (_tx, userData) => {
  const mockUser = {
    id: `user_${Date.now()}`,
    email: userData.email,
    emailVerified: userData.emailVerified || false,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  return mockUser;
}, "createTestUser");
var truncateAllTables = /* @__PURE__ */ __name(async () => {
}, "truncateAllTables");
var getTestDb = /* @__PURE__ */ __name(async () => {
  const module = await import('./client-DYTUFNQX.js');
  return module.db;
}, "getTestDb");
var closeTestDb = /* @__PURE__ */ __name(async () => {
  process.stdout.write("closeTestDb called");
}, "closeTestDb");

// ../../packages/platform/dist/db/zod.js
var AiChatSchema = createSelectSchema(aiChat);
var UserSchema = createSelectSchema(user);
var UserUpdateSchema = createUpdateSchema(user, {
  id: z.string()
});
var OrganizationSchema = createSelectSchema(organization);
var OrganizationUpdateSchema = createUpdateSchema(organization, {
  id: z.string()
});
var MemberSchema = createSelectSchema(member);
var InvitationSchema = createSelectSchema(invitation);
var PurchaseSchema = createSelectSchema(purchase);
var PurchaseInsertSchema = createInsertSchema(purchase);
var PurchaseUpdateSchema = createUpdateSchema(purchase, {
  id: z.string()
});
var SessionSchema = createSelectSchema(session);
var AccountSchema = createSelectSchema(account);
var VerificationSchema = createSelectSchema(verification);
var PasskeySchema = createSelectSchema(passkey);
var AttributionServiceImpl = class {
  static {
    __name(this, "AttributionServiceImpl");
  }
  // In-memory storage (stub - will be replaced with database)
  attributions = /* @__PURE__ */ new Map();
  fingerprintIndex = /* @__PURE__ */ new Map();
  /**
   * Transfer attribution from web to platform
   */
  async transferAttribution(request) {
    const { userId, fingerprint, attribution } = request;
    if (!db) {
      return this.transferAttributionInMemory(request);
    }
    try {
      const [existingByFingerprint] = await db.select().from(userAttributions).where(eq(userAttributions.fingerprint, fingerprint)).limit(1);
      if (existingByFingerprint) {
        const shouldMerge = shouldMergeAttribution({
          attributionId: existingByFingerprint.id,
          source: existingByFingerprint.source,
          createdAt: existingByFingerprint.createdAt.toISOString(),
          campaignId: existingByFingerprint.campaignId || void 0
        }, attribution);
        if (shouldMerge) {
          await db.update(userAttributions).set({
            utmParams: {
              ...existingByFingerprint.utmParams,
              ...attribution.utmParams
            },
            conversionData: {
              ...existingByFingerprint.conversionData,
              ...attribution.conversionData
            }
          }).where(eq(userAttributions.id, existingByFingerprint.id));
          process.stdout.write(`[Attribution] Merged attribution for user ${userId} (fingerprint: ${fingerprint})`);
          return {
            success: true,
            attributionId: existingByFingerprint.id,
            action: "merged",
            existingAttribution: {
              attributionId: existingByFingerprint.id,
              source: existingByFingerprint.source,
              createdAt: existingByFingerprint.createdAt.toISOString(),
              campaignId: existingByFingerprint.campaignId || void 0
            },
            message: "Attribution updated with new touch point"
          };
        }
        process.stdout.write(`[Attribution] Ignored duplicate attribution for user ${userId}`);
        return {
          success: true,
          attributionId: existingByFingerprint.id,
          action: "ignored",
          existingAttribution: {
            attributionId: existingByFingerprint.id,
            source: existingByFingerprint.source,
            createdAt: existingByFingerprint.createdAt.toISOString(),
            campaignId: existingByFingerprint.campaignId || void 0
          },
          message: "Attribution already exists for this fingerprint"
        };
      }
      const [existingByUser] = await db.select().from(userAttributions).where(eq(userAttributions.userId, userId)).limit(1);
      if (existingByUser) {
        return {
          success: true,
          attributionId: existingByUser.id,
          action: "ignored",
          existingAttribution: {
            attributionId: existingByUser.id,
            source: existingByUser.source,
            createdAt: existingByUser.createdAt.toISOString(),
            campaignId: existingByUser.campaignId || void 0
          },
          message: "User already has attribution"
        };
      }
      const [newAttribution] = await db.insert(userAttributions).values({
        userId,
        source: attribution.source,
        campaignId: attribution.campaignId,
        fingerprint,
        conversionData: attribution.conversionData,
        utmParams: attribution.utmParams,
        referralCode: attribution.referralCode,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      if (!newAttribution) {
        throw new Error("Failed to create attribution record");
      }
      process.stdout.write(`[Attribution] Created new attribution for user ${userId} - Source: ${attribution.source}`);
      return {
        success: true,
        attributionId: newAttribution.id,
        action: "created",
        message: "Attribution recorded successfully"
      };
    } catch (_error) {
      return this.transferAttributionInMemory(request);
    }
  }
  /**
   * Get attribution for a user
   */
  async getAttribution(userId) {
    if (!db) {
      return this.attributions.get(userId) || null;
    }
    try {
      const [attribution] = await db.select().from(userAttributions).where(eq(userAttributions.userId, userId)).limit(1);
      if (!attribution) {
        return null;
      }
      return {
        id: attribution.id,
        userId: attribution.userId,
        source: attribution.source,
        campaignId: attribution.campaignId || void 0,
        fingerprint: attribution.fingerprint,
        conversionData: attribution.conversionData,
        utmParams: attribution.utmParams,
        createdAt: attribution.createdAt,
        referralCode: attribution.referralCode || void 0,
        convertedAt: attribution.convertedAt || void 0
      };
    } catch (_error) {
      return this.attributions.get(userId) || null;
    }
  }
  /**
   * Mark user as converted (purchased subscription)
   */
  async markConverted(userId) {
    if (!db) {
      const attribution = this.attributions.get(userId);
      if (!attribution) {
        return false;
      }
      attribution.convertedAt = /* @__PURE__ */ new Date();
      process.stdout.write(`[Attribution] Marked user ${userId} as converted - Source: ${attribution.source}`);
      return true;
    }
    try {
      const result = await db.update(userAttributions).set({
        convertedAt: /* @__PURE__ */ new Date()
      }).where(eq(userAttributions.userId, userId)).returning();
      const updated = result[0];
      if (!updated) {
        return false;
      }
      process.stdout.write(`[Attribution] Marked user ${userId} as converted - Source: ${updated.source}`);
      return true;
    } catch (_error) {
      return false;
    }
  }
  /**
   * Get conversion metrics by source
   */
  async getConversionMetrics(dateRange) {
    if (!db) {
      return this.getConversionMetricsInMemory(dateRange);
    }
    try {
      let query = db.select().from(userAttributions);
      if (dateRange) {
        query = query.where(and(gte(userAttributions.createdAt, dateRange.from), lte(userAttributions.createdAt, dateRange.to)));
      }
      const attributions = await query;
      const metricsBySource = /* @__PURE__ */ new Map();
      for (const record of attributions) {
        const metrics = metricsBySource.get(record.source) || {
          total: 0,
          conversions: 0,
          timesToConvert: []
        };
        metrics.total++;
        if (record.convertedAt) {
          metrics.conversions++;
          const daysToConvert = (record.convertedAt.getTime() - record.createdAt.getTime()) / (1e3 * 60 * 60 * 24);
          metrics.timesToConvert.push(daysToConvert);
        }
        metricsBySource.set(record.source, metrics);
      }
      const results = [];
      for (const [source, data] of metricsBySource.entries()) {
        const avgTimeToConvert = data.timesToConvert.length > 0 ? data.timesToConvert.reduce((a, b) => a + b, 0) / data.timesToConvert.length : void 0;
        results.push({
          source,
          totalUsers: data.total,
          conversions: data.conversions,
          conversionRate: data.conversions / data.total,
          avgTimeToConvert
        });
      }
      return results.sort((a, b) => b.totalUsers - a.totalUsers);
    } catch (_error) {
      return this.getConversionMetricsInMemory(dateRange);
    }
  }
  /**
   * Fallback: Transfer attribution in-memory
   */
  transferAttributionInMemory(request) {
    const { userId, fingerprint, attribution } = request;
    const existingUserId = this.fingerprintIndex.get(fingerprint);
    if (existingUserId) {
      const existing = this.attributions.get(existingUserId);
      if (existing) {
        const shouldMerge = shouldMergeAttribution({
          attributionId: existing.id,
          source: existing.source,
          createdAt: existing.createdAt.toISOString(),
          campaignId: existing.campaignId
        }, attribution);
        if (shouldMerge) {
          existing.utmParams = {
            ...existing.utmParams,
            ...attribution.utmParams
          };
          existing.conversionData = {
            ...existing.conversionData,
            ...attribution.conversionData
          };
          return {
            success: true,
            attributionId: existing.id,
            action: "merged",
            existingAttribution: {
              attributionId: existing.id,
              source: existing.source,
              createdAt: existing.createdAt.toISOString(),
              campaignId: existing.campaignId
            },
            message: "Attribution updated with new touch point"
          };
        }
        return {
          success: true,
          attributionId: existing.id,
          action: "ignored",
          existingAttribution: {
            attributionId: existing.id,
            source: existing.source,
            createdAt: existing.createdAt.toISOString(),
            campaignId: existing.campaignId
          },
          message: "Attribution already exists for this fingerprint"
        };
      }
    }
    const attributionId = `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      id: attributionId,
      userId,
      source: attribution.source,
      campaignId: attribution.campaignId,
      fingerprint,
      conversionData: attribution.conversionData,
      utmParams: attribution.utmParams,
      createdAt: /* @__PURE__ */ new Date(),
      referralCode: attribution.referralCode
    };
    this.attributions.set(userId, record);
    this.fingerprintIndex.set(fingerprint, userId);
    return {
      success: true,
      attributionId,
      action: "created",
      message: "Attribution recorded successfully"
    };
  }
  /**
   * Fallback: Get conversion metrics in-memory
   */
  getConversionMetricsInMemory(dateRange) {
    const metricsBySource = /* @__PURE__ */ new Map();
    for (const record of this.attributions.values()) {
      if (dateRange) {
        if (record.createdAt < dateRange.from || record.createdAt > dateRange.to) {
          continue;
        }
      }
      const metrics = metricsBySource.get(record.source) || {
        total: 0,
        conversions: 0,
        timesToConvert: []
      };
      metrics.total++;
      if (record.convertedAt) {
        metrics.conversions++;
        const daysToConvert = (record.convertedAt.getTime() - record.createdAt.getTime()) / (1e3 * 60 * 60 * 24);
        metrics.timesToConvert.push(daysToConvert);
      }
      metricsBySource.set(record.source, metrics);
    }
    const results = [];
    for (const [source, data] of metricsBySource.entries()) {
      const avgTimeToConvert = data.timesToConvert.length > 0 ? data.timesToConvert.reduce((a, b) => a + b, 0) / data.timesToConvert.length : void 0;
      results.push({
        source,
        totalUsers: data.total,
        conversions: data.conversions,
        conversionRate: data.conversions / data.total,
        avgTimeToConvert
      });
    }
    return results.sort((a, b) => b.totalUsers - a.totalUsers);
  }
};

// ../../packages/config/dist/subscription-config.js
var PRO_TRIAL_DAYS = 14;
var TIER_CREDIT_ALLOWANCES = {
  free: 25,
  pro: 200,
  team: 200,
  enterprise: 0
};
var CREDIT_OVERAGE_SOFT_CAP = -100;

// ../../packages/config/dist/config.js
var config = {
  appName: "Vreko",
  tagline: "AI-Native DevOps",
  description: "Protection for your code.",
  organizations: {
    enable: true,
    enableBilling: true,
    enableUsersToCreateOrganizations: true,
    requireOrganization: false,
    hideOrganization: false,
    forbiddenOrganizationSlugs: [
      "admin",
      "root",
      "api",
      "app"
    ]
  },
  users: {
    enableBilling: true,
    enableOnboarding: true
  },
  auth: {
    enableSignup: true,
    enableMagicLink: true,
    enableSocialLogin: true,
    enablePasskeys: false,
    enablePasswordLogin: true,
    enableTwoFactor: false,
    redirectAfterSignIn: "/app",
    redirectAfterLogout: "/",
    sessionCookieMaxAge: 60 * 60 * 24 * 30
  },
  mails: {
    from: "no-reply@vreko.dev"
  },
  storage: {
    bucketNames: {
      avatars: "vreko-avatars",
      checkpoints: "vreko-checkpoints",
      snapshots: "vreko-snapshots"
    }
  },
  ui: {
    enabledThemes: [
      "light",
      "dark"
    ],
    defaultTheme: "dark",
    saas: {
      enabled: true,
      useSidebarLayout: true
    },
    marketing: {
      enabled: true
    }
  },
  contactForm: {
    enabled: true,
    to: "support@vreko.dev",
    subject: "Contact from Vreko"
  },
  payments: {
    plans: {
      free: {
        name: "Free",
        description: "Essential protection for individuals.",
        features: [
          "Unlimited local checkpoints",
          "Basic AI detection",
          "Community support"
        ],
        isFree: true,
        prices: [
          {
            productId: "price_free",
            amount: 0,
            currency: "USD",
            type: "recurring",
            interval: "month"
          }
        ]
      },
      pro: {
        name: "Pro",
        description: "Advanced protection for professional developers.",
        features: [
          "Cloud backup & sync",
          "Advanced AI analysis",
          "Priority support",
          "Unlimited history"
        ],
        recommended: true,
        prices: [
          {
            productId: "price_pro_monthly",
            amount: 2e3,
            currency: "USD",
            type: "recurring",
            interval: "month",
            trialPeriodDays: PRO_TRIAL_DAYS
          },
          {
            productId: "price_pro_yearly",
            amount: 2e4,
            currency: "USD",
            type: "recurring",
            interval: "year",
            trialPeriodDays: PRO_TRIAL_DAYS
          }
        ]
      },
      team: {
        name: "Team",
        description: "Collaborative security for teams.",
        features: [
          "Everything in Pro",
          "Team dashboard",
          "Centralized policy management",
          "Audit logs"
        ],
        prices: [
          {
            productId: "price_team_monthly",
            amount: 4900,
            currency: "USD",
            type: "recurring",
            interval: "month",
            seatBased: true
          }
        ]
      }
    }
  }
};

// ../../packages/config/dist/feature-flags.js
process.env.ENABLE_EXTENSION_AUTH === "true";
process.env.ENABLE_API_KEYS === "true";
process.env.ENABLE_RATE_LIMITING === "true";
process.env.ENABLE_INTELLIGENCE_LAYER === "true";
process.env.ENABLE_TRUST_CALIBRATION === "true";
process.env.ENABLE_PATTERN_LIBRARY === "true";
process.env.ENABLE_PREDICTION_ENGINE === "true";
process.env.ENABLE_GITHUB_INTEGRATION === "true";
process.env.ENABLE_SSO === "true";
process.env.ENABLE_CAPTCHA === "true";
process.env.ENABLE_MULTI_SESSION === "true";
process.env.ENABLE_ENHANCED_2FA === "true";
var ProtectionLevelSchema = z.enum([
  "watch",
  "warn",
  "block"
]);
var ProtectionRuleSchema = z.object({
  pattern: z.string().describe("Glob pattern (e.g., '*.env*', 'package.json')"),
  level: ProtectionLevelSchema,
  reason: z.string().optional().describe("Why this pattern is protected"),
  precedence: z.number().int().min(0).max(1e3).default(0)
});
var EngineConfigSchema = z.object({
  maxDepth: z.number().int().min(0).max(10).default(2).describe("Max dependency tree depth for analysis"),
  burstThreshold: z.number().int().min(1).max(100).default(30).describe("Min simultaneous file changes to trigger burst detection"),
  cooldowns: z.object({
    block: z.number().int().min(0).default(6e4),
    warn: z.number().int().min(0).default(3e4),
    watch: z.number().int().min(0).default(0)
  }).default({
    block: 6e4,
    warn: 3e4,
    watch: 0
  }).describe("Cooldown durations (ms) between alerts per level")
});
var IgnorePatternsSchema = z.array(z.string()).default([]).describe("Glob patterns to exclude from protection (e.g., node_modules, .git)");
var PrivacySettingsSchema = z.object({
  consent: z.boolean().default(false).describe("User has given privacy consent"),
  clipboard: z.boolean().default(false).describe("Allow clipboard monitoring"),
  watcher: z.boolean().default(false).describe("Allow file watcher"),
  gitWrapper: z.boolean().default(false).describe("Allow git wrapper integration"),
  lastReminded: z.string().optional().describe("ISO timestamp of last consent reminder")
}).default({});
var NotificationsSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  quietHours: z.object({
    start: z.string().default("22:00"),
    end: z.string().default("08:00")
  }).default({
    start: "22:00",
    end: "08:00"
  }),
  rateLimit: z.number().int().min(1).default(5).describe("Max notifications per minute")
}).default({});
var SnapshotSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  autoCreate: z.boolean().default(true),
  retentionDays: z.number().int().min(1).default(30)
}).default({});
var AISettingsSchema = z.object({
  enabled: z.boolean().default(true),
  context: z.boolean().default(true).describe("Include code context in AI analysis"),
  copilot: z.boolean().default(true).describe("Integrate with GitHub Copilot")
}).default({});
var GuardianPluginsSchema = z.object({
  secretDetection: z.boolean().default(true),
  mockReplacement: z.boolean().default(true),
  phantomDependency: z.boolean().default(true)
}).default({});
var GuardianThresholdsSchema = z.object({
  warn: z.number().int().min(0).default(6),
  block: z.number().int().min(0).default(8)
}).default({
  warn: 6,
  block: 8
});
var GuardianSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  warnThreshold: z.number().int().min(0).max(100).default(5),
  blockThreshold: z.number().int().min(0).max(100).default(8),
  protectionLevel: ProtectionLevelSchema.default("warn"),
  plugins: GuardianPluginsSchema,
  thresholds: GuardianThresholdsSchema
}).default({});
var AutoDecisionSettingsSchema = z.object({
  riskThreshold: z.number().int().min(0).max(100).default(60).describe("Risk score threshold (0-100) for automatic snapshot creation"),
  notifyThreshold: z.number().int().min(0).max(100).default(40).describe("Risk score threshold (0-100) for user notifications"),
  minFilesForBurst: z.number().int().min(1).default(3).describe("Minimum files changed simultaneously to trigger burst detection"),
  maxSnapshotsPerMinute: z.number().int().min(1).default(4).describe("Maximum snapshots allowed per minute (rate limiting)")
}).default({});
var MCPSettingsSchema = z.object({
  performanceBudgets: z.record(z.number().int().min(0)).default({
    analyze_risk: 200,
    create_snapshot: 500
  }).describe("Performance budgets (ms) for MCP operations"),
  context7: z.object({
    apiKey: z.string().optional(),
    apiUrl: z.string().url().default("https://context7.com/api"),
    cacheTtlSearch: z.number().int().min(0).default(3600),
    cacheTtlDocs: z.number().int().min(0).default(86400)
  }).default({}),
  api: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().default("https://api.vreko.dev")
  }).default({}),
  http: z.object({
    allowedOrigins: z.array(z.string()).default([
      "*"
    ]),
    apiUrl: z.string().url().default("http://api:8080")
  }).default({})
}).default({});
var SettingsSchema = z.object({
  defaultProtectionLevel: ProtectionLevelSchema.default("watch"),
  requireSnapshotMessage: z.boolean().default(true),
  maxSnapshots: z.number().int().min(1).default(100),
  aiDetectionEnabled: z.boolean().default(true),
  autoRestoreOnDetection: z.boolean().default(false),
  privacy: PrivacySettingsSchema,
  notifications: NotificationsSettingsSchema,
  snapshots: SnapshotSettingsSchema,
  ai: AISettingsSchema,
  guardian: GuardianSettingsSchema,
  autoDecision: AutoDecisionSettingsSchema,
  webBaseUrl: z.string().url().default("https://console.vreko.dev"),
  apiBaseUrl: z.string().url().optional(),
  mcp: MCPSettingsSchema
}).default({});
var PolicyOverrideSchema = z.object({
  pattern: z.string(),
  level: ProtectionLevelSchema,
  ttl: z.number().optional().describe("Expiration timestamp (ms since epoch)")
});
var PoliciesSchema = z.object({
  enforceProtectionLevels: z.boolean().default(false),
  allowOverrides: z.boolean().default(true),
  overrides: z.array(PolicyOverrideSchema).default([])
}).default({});
z.object({
  version: z.literal(2).default(2),
  protections: z.array(ProtectionRuleSchema).default([]),
  ignore: IgnorePatternsSchema,
  engine: EngineConfigSchema.default({}),
  settings: SettingsSchema,
  policies: PoliciesSchema,
  mcp: MCPSettingsSchema.optional(),
  // Phase 2: Workspace registry (SB-CTX-001)
  workspaces: z.array(WorkspaceRegistrationSchema).default([])
});

// ../../packages/config/dist/utils/base-url.js
function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3e3}`;
}
__name(getBaseUrl, "getBaseUrl");
createLogger({
  name: "feature-flags",
  level: LogLevel.INFO
});
new PostHog(process.env.POSTHOG_API_KEY || "default_key", {
  host: process.env.POSTHOG_HOST || "https://app.posthog.com"
});
var EntitlementsServiceImpl = class {
  static {
    __name(this, "EntitlementsServiceImpl");
  }
  cache = /* @__PURE__ */ new Map();
  CACHE_TTL_MS = 6e4;
  /**
   * Fetch complete entitlement set for a user
   * Queries database for subscription, trial, and Pioneer status with Redis caching
   */
  async getEntitlements(userId) {
    if (isRedisAvailable()) {
      const cached = await getCache(`entitlements:${userId}`);
      if (cached) {
        return cached;
      }
    }
    const memoryCached = this.cache.get(userId);
    if (memoryCached && Date.now() - memoryCached.timestamp < this.CACHE_TTL_MS) {
      return memoryCached.entitlements;
    }
    if (!db) {
      const entitlements = this.createDefaultEntitlements(userId);
      return entitlements;
    }
    try {
      const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
      const [trial] = await db.select().from(trials).where(and(eq(trials.userId, userId), eq(trials.status, "active"))).limit(1);
      const isPioneerEnabled = process.env.FEATURE_PIONEER_PROGRAM !== "false";
      let pioneerData = null;
      if (isPioneerEnabled) {
        try {
          const [pioneerRow] = await db.select({
            id: pioneers.id,
            githubStarred: pioneers.githubStarred,
            joinedAt: pioneers.joinedAt
          }).from(pioneers).where(eq(pioneers.userId, userId)).limit(1);
          if (pioneerRow) {
            const [redemption] = await db.select({
              id: pioneerRedemptions.id
            }).from(pioneerRedemptions).where(eq(pioneerRedemptions.userId, userId)).limit(1);
            pioneerData = {
              tier: redemption ? "founding_pioneer" : "pioneer",
              totalPoints: 0
            };
          }
        } catch (pioneerError) {
          logger.warn("[entitlements] Pioneer query failed, continuing without pioneer data", {
            userId,
            error: pioneerError instanceof Error ? pioneerError.message : String(pioneerError)
          });
        }
      }
      const tier = getEffectiveTier(subscription?.plan || "free");
      const [usageData] = subscription ? await db.select().from(usageLimits).where(eq(usageLimits.subscriptionId, subscription.id)).orderBy(desc(usageLimits.month)).limit(1) : [
        null
      ];
      const creditBalance = await this.calculateCreditBalance(userId, tier, subscription);
      const entitlements = this.buildEntitlements(userId, tier, trial || null, pioneerData, subscription || null, usageData || null, creditBalance);
      if (isRedisAvailable()) {
        await setCache(`entitlements:${userId}`, entitlements, 60);
      }
      this.cache.set(userId, {
        entitlements,
        timestamp: Date.now()
      });
      return entitlements;
    } catch (_error) {
      return this.createDefaultEntitlements(userId);
    }
  }
  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(userId, feature) {
    const entitlements = await this.getEntitlements(userId);
    if (entitlements.features.includes(feature)) {
      const limit = entitlements.limits.get(feature);
      if (limit && limit.max !== null && limit.current >= limit.max) {
        return {
          granted: false,
          reason: "usage_limit_reached",
          limitInfo: limit
        };
      }
      return {
        granted: true
      };
    }
    if (entitlements.trial?.active && entitlements.trial.features.includes(feature)) {
      return {
        granted: true
      };
    }
    if (entitlements.pioneer?.tier === "founding_pioneer") {
      if (isFeatureAvailableAtTier(feature, "pro")) {
        return {
          granted: true
        };
      }
    }
    const requiredTier = this.getRequiredTierForFeature(feature);
    return {
      granted: false,
      reason: "feature_not_in_plan",
      requiredTier
    };
  }
  /**
   * Get usage limits for a specific feature
   */
  async getFeatureLimits(userId, feature) {
    const entitlements = await this.getEntitlements(userId);
    return entitlements.limits.get(feature) || null;
  }
  /**
   * Check if user meets minimum tier requirement
   */
  async checkTierRequirement(userId, requiredTier) {
    const entitlements = await this.getEntitlements(userId);
    return this.compareTiers(entitlements.tier, requiredTier) >= 0;
  }
  /**
   * Invalidate cached entitlements for a user (both Redis and memory)
   */
  async invalidateCache(userId) {
    this.cache.delete(userId);
    if (isRedisAvailable()) {
      await deleteCache(`entitlements:${userId}`);
    }
  }
  /**
   * Build entitlements from database query results
   */
  buildEntitlements(userId, tier, trial, pioneer, subscription, usageData, creditBalance) {
    const features = getTierFeatures(tier);
    const trialInfo = trial ? {
      active: true,
      endsAt: trial.endsAt,
      features: trial.features || []
    } : null;
    const pioneerInfo = pioneer ? {
      tier: pioneer.tier,
      totalPoints: pioneer.totalPoints,
      pointsToNext: this.calculatePointsToNext(pioneer.tier, pioneer.totalPoints),
      nextTier: this.getNextTier(pioneer.tier),
      discountPercent: this.getTierDiscount(pioneer.tier),
      benefits: this.getTierBenefits(pioneer.tier)
    } : null;
    const limits = /* @__PURE__ */ new Map();
    for (const feature of features) {
      const maxLimit = getTierLimit(tier, feature);
      if (maxLimit !== null) {
        const current = this.getFeatureUsage(feature, usageData);
        limits.set(feature, {
          feature,
          current,
          max: maxLimit,
          period: "monthly"
        });
      }
    }
    const effectiveDate = subscription?.currentPeriodStart || /* @__PURE__ */ new Date();
    const expiresAt = subscription?.currentPeriodEnd || null;
    return {
      userId,
      tier,
      features,
      limits,
      trial: trialInfo,
      pioneer: pioneerInfo,
      credits: creditBalance,
      effectiveDate,
      expiresAt,
      version: 1,
      reason: "subscription"
    };
  }
  /**
   * Create default entitlements for a user (graceful degradation fallback)
   * Used when database is unavailable - returns free tier with no usage data
   */
  createDefaultEntitlements(userId) {
    const tier = "free";
    const features = getTierFeatures(tier);
    const limits = /* @__PURE__ */ new Map();
    for (const feature of features) {
      const maxLimit = getTierLimit(tier, feature);
      if (maxLimit !== null) {
        limits.set(feature, {
          feature,
          current: 0,
          max: maxLimit,
          period: "monthly"
        });
      }
    }
    const defaultCredits = {
      included: TIER_CREDIT_ALLOWANCES.free,
      topups: 0,
      total: TIER_CREDIT_ALLOWANCES.free,
      overage: 0,
      softCapReached: false,
      monthlyAllowance: TIER_CREDIT_ALLOWANCES.free
    };
    return {
      userId,
      tier,
      features,
      limits,
      trial: null,
      pioneer: null,
      credits: defaultCredits,
      effectiveDate: /* @__PURE__ */ new Date(),
      expiresAt: null,
      version: 1,
      reason: "subscription"
    };
  }
  /**
   * Calculate credit balance from the credits ledger (pricing_spec_v3.md)
   * Per spec: Balance = included credits + top-up credits - consumption
   */
  async calculateCreditBalance(userId, tier, subscription) {
    const monthlyAllowance = TIER_CREDIT_ALLOWANCES[tier] || 0;
    const now = /* @__PURE__ */ new Date();
    const billingPeriodStart = subscription?.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = subscription?.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0);
    try {
      const [includedResult] = await db.select({
        total: sum(creditsLedger.credits)
      }).from(creditsLedger).where(and(eq(creditsLedger.userId, userId), eq(creditsLedger.transactionType, "monthly_allowance"), gt(creditsLedger.createdAt, billingPeriodStart), lte(creditsLedger.createdAt, billingPeriodEnd)));
      const [topupResult] = await db.select({
        total: sum(creditsLedger.credits)
      }).from(creditsLedger).where(and(eq(creditsLedger.userId, userId), eq(creditsLedger.transactionType, "top_up")));
      const [consumptionResult] = await db.select({
        total: sum(creditsLedger.credits)
      }).from(creditsLedger).where(and(eq(creditsLedger.userId, userId), eq(creditsLedger.transactionType, "job_consumption")));
      const included = Number(includedResult?.total || 0);
      const topups = Number(topupResult?.total || 0);
      const consumption = Number(consumptionResult?.total || 0);
      const total = included + topups + consumption;
      const overage = total < 0 ? Math.abs(total) : 0;
      const softCapReached = total <= CREDIT_OVERAGE_SOFT_CAP;
      return {
        included: Math.max(0, included + consumption),
        topups,
        total,
        overage,
        softCapReached,
        monthlyAllowance
      };
    } catch (_error) {
      return {
        included: monthlyAllowance,
        topups: 0,
        total: monthlyAllowance,
        overage: 0,
        softCapReached: false,
        monthlyAllowance
      };
    }
  }
  /**
   * Determine required tier for a feature
   */
  getRequiredTierForFeature(feature) {
    const tiers = [
      "free",
      "pro",
      "team",
      "enterprise"
    ];
    for (const tier of tiers) {
      if (isFeatureAvailableAtTier(feature, tier)) {
        return tier;
      }
    }
    return "enterprise";
  }
  /**
   * Calculate points needed to reach next tier
   */
  calculatePointsToNext(currentTier, totalPoints) {
    const PIONEER_TIER_THRESHOLDS = {
      pioneer: 0,
      active_pioneer: 1,
      contributing_pioneer: 2,
      founding_pioneer: 3
    };
    const tierOrder = [
      "pioneer",
      "active_pioneer",
      "contributing_pioneer",
      "founding_pioneer"
    ];
    const currentIndex = tierOrder.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return 0;
    }
    const nextTier = tierOrder[currentIndex + 1];
    if (!nextTier) {
      return 0;
    }
    const threshold = PIONEER_TIER_THRESHOLDS[nextTier];
    return threshold !== void 0 ? threshold - totalPoints : 0;
  }
  /**
   * Get next Pioneer tier
   */
  getNextTier(currentTier) {
    const tierOrder = [
      "pioneer",
      "active_pioneer",
      "contributing_pioneer",
      "founding_pioneer"
    ];
    const currentIndex = tierOrder.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null;
    }
    return tierOrder[currentIndex + 1] ?? null;
  }
  /**
   * Get discount percentage for Pioneer tier
   */
  getTierDiscount(tier) {
    const discounts = {
      pioneer: 0,
      active_pioneer: 50,
      contributing_pioneer: 75,
      founding_pioneer: 100
    };
    return discounts[tier] || 0;
  }
  /**
   * Get benefits for Pioneer tier
   */
  getTierBenefits(tier) {
    const benefits = {
      pioneer: [
        "Pioneer badge",
        "Community access"
      ],
      active_pioneer: [
        "Pioneer badge",
        "Community access",
        "50% discount on Pro plan"
      ],
      contributing_pioneer: [
        "Pioneer badge",
        "Community access",
        "75% discount on Pro plan",
        "Priority support"
      ],
      founding_pioneer: [
        "Pioneer badge",
        "Community access",
        "Lifetime Pro access",
        "Priority support",
        "Founding member recognition"
      ]
    };
    return benefits[tier] || [];
  }
  /**
   * Compare two tiers (returns -1, 0, or 1)
   */
  compareTiers(userTier, requiredTier) {
    const tierOrder = [
      "free",
      "pro",
      "team",
      "enterprise"
    ];
    const userIndex = tierOrder.indexOf(userTier);
    const requiredIndex = tierOrder.indexOf(requiredTier);
    return userIndex - requiredIndex;
  }
  /**
   * Map feature to actual usage from usage_limits table (ENT-001)
   * Maps feature names to database columns for usage tracking
   */
  getFeatureUsage(feature, usageData) {
    if (!usageData) {
      return 0;
    }
    switch (feature) {
      case "cloud_backup":
        return usageData.snapshotsUsed || 0;
      case "api_access":
        return usageData.apiCallsUsed || 0;
      // Features without usage tracking (binary access)
      case "advanced_analytics":
      case "unlimited_workspaces":
      case "cli_full_features":
      case "team_dashboard":
      case "multi_workspace":
      case "sso_authentication":
      case "audit_logs":
      case "priority_support":
      case "custom_retention":
        return 0;
      // No usage tracking for these features
      default:
        return 0;
    }
  }
};
var entitlementsService = new EntitlementsServiceImpl();
function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Check DATABASE_URL environment variable.");
  }
  return db;
}
__name(getDb, "getDb");
var MCPService = class {
  static {
    __name(this, "MCPService");
  }
  /**
   * Record an observation from the MCP bridge
   * Uses idempotency key to prevent duplicates
   */
  async recordObservation(input) {
    const database = getDb();
    if (input.idempotencyKey) {
      const existing = await database.select({
        id: mcpObservations.id
      }).from(mcpObservations).where(eq(mcpObservations.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing.length > 0) {
        return {
          id: existing[0].id,
          created: false
        };
      }
    }
    const data = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      message: input.message,
      context: input.context ?? {},
      filePath: input.filePath,
      lineNumber: input.lineNumber,
      source: input.source ?? "extension",
      toolName: input.toolName,
      idempotencyKey: input.idempotencyKey,
      deviceId: input.deviceId,
      observedAt: input.observedAt ?? /* @__PURE__ */ new Date(),
      processed: false
    };
    const result = await database.insert(mcpObservations).values(data).returning({
      id: mcpObservations.id
    });
    return {
      id: result[0].id,
      created: true
    };
  }
  /**
   * Record a tool invocation
   * Uses idempotency key to prevent duplicates
   */
  async recordInvocation(input) {
    const database = getDb();
    if (input.idempotencyKey) {
      const existing = await database.select({
        id: mcpToolInvocations.id
      }).from(mcpToolInvocations).where(eq(mcpToolInvocations.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing.length > 0) {
        return {
          id: existing[0].id,
          created: false
        };
      }
    }
    const data = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      toolName: input.toolName,
      toolVersion: input.toolVersion,
      invocationType: input.invocationType,
      requestPayload: input.requestPayload,
      responsePayload: input.responsePayload,
      status: input.status ?? "pending",
      errorMessage: input.errorMessage,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      idempotencyKey: input.idempotencyKey,
      source: input.source ?? "extension",
      sessionId: input.sessionId,
      durationMs: input.durationMs
    };
    const result = await database.insert(mcpToolInvocations).values(data).returning({
      id: mcpToolInvocations.id
    });
    return {
      id: result[0].id,
      created: true
    };
  }
  /**
   * Update sync state for a device
   * Creates or updates the sync state record
   */
  async updateSyncState(input) {
    const database = getDb();
    const updateResult = await database.update(extensionSyncState).set({
      lastSyncAt: input.lastSyncAt ?? /* @__PURE__ */ new Date(),
      syncVersion: input.syncVersion ?? sql`${extensionSyncState.syncVersion} + 1`,
      deviceType: input.deviceType,
      deviceName: input.deviceName,
      pendingChangesCount: input.pendingChangesCount ?? 0,
      pendingChanges: input.pendingChanges ?? [],
      isOnline: input.isOnline ?? true,
      lastHeartbeatAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq(extensionSyncState.userId, input.userId), eq(extensionSyncState.workspaceId, input.workspaceId), eq(extensionSyncState.deviceId, input.deviceId))).returning({
      id: extensionSyncState.id
    });
    if (updateResult.length > 0) {
      return {
        id: updateResult[0].id,
        created: false
      };
    }
    const data = {
      userId: input.userId,
      workspaceId: input.workspaceId,
      deviceId: input.deviceId,
      deviceType: input.deviceType,
      deviceName: input.deviceName,
      lastSyncAt: input.lastSyncAt ?? /* @__PURE__ */ new Date(),
      syncVersion: input.syncVersion ?? 1,
      pendingChangesCount: input.pendingChangesCount ?? 0,
      pendingChanges: input.pendingChanges ?? [],
      isOnline: input.isOnline ?? true,
      lastHeartbeatAt: /* @__PURE__ */ new Date()
    };
    const result = await database.insert(extensionSyncState).values(data).returning({
      id: extensionSyncState.id
    });
    return {
      id: result[0].id,
      created: true
    };
  }
  /**
   * Query observations with filters
   */
  async queryObservations(input) {
    const database = getDb();
    const conditions = [
      eq(mcpObservations.workspaceId, input.workspaceId)
    ];
    if (input.userId) {
      conditions.push(eq(mcpObservations.userId, input.userId));
    }
    if (input.processed !== void 0) {
      conditions.push(eq(mcpObservations.processed, input.processed));
    }
    if (input.after) {
      conditions.push(gte(mcpObservations.createdAt, input.after));
    }
    const results = await database.select().from(mcpObservations).where(and(...conditions)).orderBy(sql`${mcpObservations.createdAt} DESC`).limit(input.limit ?? 100);
    return results;
  }
  /**
   * Mark observations as processed
   */
  async markObservationsProcessed(observationIds) {
    if (observationIds.length === 0) {
      return 0;
    }
    const database = getDb();
    const result = await database.update(mcpObservations).set({
      processed: true,
      processedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(sql`${mcpObservations.id} IN (${observationIds.join(",")})`);
    return result.rowCount ?? 0;
  }
};
var instance = null;
function getMCPService() {
  if (!instance) {
    instance = new MCPService();
  }
  return instance;
}
__name(getMCPService, "getMCPService");
var SagaOrchestratorImpl = class {
  static {
    __name(this, "SagaOrchestratorImpl");
  }
  persistence;
  definitions = /* @__PURE__ */ new Map();
  runningInstances = /* @__PURE__ */ new Map();
  constructor(persistence) {
    this.persistence = persistence;
  }
  /**
   * Register a saga definition
   */
  registerSaga(definition) {
    this.definitions.set(definition.sagaType, definition);
    process.stdout.write(`[SagaOrchestrator] Registered saga type: ${definition.sagaType}`);
  }
  /**
   * Start a new saga instance
   */
  async start(sagaType, initialContext) {
    const definition = this.definitions.get(sagaType);
    if (!definition) {
      throw new Error(`Saga type not registered: ${sagaType}`);
    }
    const sagaId = this.generateSagaId();
    const instance2 = {
      sagaId,
      sagaType,
      status: "pending",
      context: initialContext,
      steps: definition.steps.map((step) => ({
        stepId: step.stepId,
        stepName: step.stepName,
        status: "pending",
        input: {},
        output: null,
        error: null,
        startedAt: null,
        completedAt: null,
        compensatedAt: null
      })),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: null,
      failedAt: null,
      error: null,
      retryCount: 0,
      maxRetries: definition.maxRetries || 3
    };
    await this.persistence.save(instance2);
    this.runningInstances.set(sagaId, instance2);
    this.executeAsync(sagaId, definition);
    return instance2;
  }
  /**
   * Resume a saga from persisted state
   */
  async resume(sagaId) {
    const instance2 = await this.persistence.load(sagaId);
    if (!instance2) {
      throw new Error(`Saga not found: ${sagaId}`);
    }
    const definition = this.definitions.get(instance2.sagaType);
    if (!definition) {
      throw new Error(`Saga type not registered: ${instance2.sagaType}`);
    }
    this.runningInstances.set(sagaId, instance2);
    this.executeAsync(sagaId, definition);
    return instance2;
  }
  /**
   * Get saga status
   */
  async getStatus(sagaId) {
    const running = this.runningInstances.get(sagaId);
    if (running) {
      return running;
    }
    return this.persistence.load(sagaId);
  }
  /**
   * List all sagas
   */
  async listSagas(filter) {
    return this.persistence.listAll(filter);
  }
  /**
   * Execute saga steps asynchronously
   */
  async executeAsync(sagaId, definition) {
    const instance2 = this.runningInstances.get(sagaId);
    if (!instance2) {
      return;
    }
    try {
      instance2.status = "running";
      await this.persistence.update(sagaId, {
        status: "running"
      });
      for (let i = 0; i < definition.steps.length; i++) {
        const stepDef = definition.steps[i];
        const stepExec = instance2.steps[i];
        if (!stepDef || !stepExec) {
          throw new Error(`Step definition or execution not found at index ${i}`);
        }
        if (stepExec.status === "completed") {
          continue;
        }
        const success = await this.executeStep(instance2, stepDef, stepExec);
        if (!success) {
          await this.compensate(instance2, definition, i);
          return;
        }
        if (definition.persistenceInterval) {
          await this.persistence.update(sagaId, {
            steps: instance2.steps
          });
        }
      }
      instance2.status = "completed";
      instance2.completedAt = /* @__PURE__ */ new Date();
      await this.persistence.update(sagaId, {
        status: "completed",
        completedAt: instance2.completedAt
      });
      process.stdout.write(`[SagaOrchestrator] Saga completed: ${sagaId}`);
    } catch (error) {
      instance2.status = "failed";
      instance2.failedAt = /* @__PURE__ */ new Date();
      instance2.error = error instanceof Error ? error.message : String(error);
      await this.persistence.update(sagaId, {
        status: "failed",
        failedAt: instance2.failedAt,
        error: instance2.error
      });
    } finally {
      this.runningInstances.delete(sagaId);
    }
  }
  /**
   * Execute a single saga step
   */
  async executeStep(instance2, stepDef, stepExec) {
    stepExec.status = "running";
    stepExec.startedAt = /* @__PURE__ */ new Date();
    try {
      const timeoutMs = stepDef.timeout || 3e4;
      const result = await this.executeWithTimeout(stepDef.execute(stepExec.input, instance2.context), timeoutMs);
      stepExec.output = result;
      stepExec.status = "completed";
      stepExec.completedAt = /* @__PURE__ */ new Date();
      process.stdout.write(`[SagaOrchestrator] Step completed: ${stepDef.stepId}`);
      return true;
    } catch (error) {
      stepExec.error = error instanceof Error ? error.message : String(error);
      stepExec.status = "failed";
      if (stepDef.retryable && instance2.retryCount < instance2.maxRetries) {
        instance2.retryCount++;
        process.stdout.write(`[SagaOrchestrator] Retrying step ${stepDef.stepId} (${instance2.retryCount}/${instance2.maxRetries})`);
        stepExec.status = "pending";
        stepExec.error = null;
        const delayMs = Math.min(1e3 * 2 ** instance2.retryCount, 3e4);
        await this.sleep(delayMs);
        return this.executeStep(instance2, stepDef, stepExec);
      }
      return false;
    }
  }
  /**
   * Compensate (rollback) completed steps
   */
  async compensate(instance2, definition, failedStepIndex) {
    instance2.status = "compensating";
    await this.persistence.update(instance2.sagaId, {
      status: "compensating"
    });
    process.stdout.write(`[SagaOrchestrator] Starting compensation for saga: ${instance2.sagaId}`);
    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const stepDef = definition.steps[i];
      const stepExec = instance2.steps[i];
      if (!stepDef || !stepExec) {
        continue;
      }
      if (stepExec.status !== "completed") {
        continue;
      }
      if (!stepDef.compensate) {
        process.stdout.write(`[SagaOrchestrator] No compensation for step: ${stepDef.stepId}`);
        continue;
      }
      try {
        await stepDef.compensate(stepExec.input, stepExec.output, instance2.context);
        stepExec.status = "compensated";
        stepExec.compensatedAt = /* @__PURE__ */ new Date();
        process.stdout.write(`[SagaOrchestrator] Compensated step: ${stepDef.stepId}`);
      } catch (_error) {
      }
    }
    instance2.status = "compensated";
    instance2.failedAt = /* @__PURE__ */ new Date();
    await this.persistence.update(instance2.sagaId, {
      status: "compensated",
      failedAt: instance2.failedAt,
      steps: instance2.steps
    });
    process.stdout.write(`[SagaOrchestrator] Compensation completed for saga: ${instance2.sagaId}`);
  }
  // Helper methods
  generateSagaId() {
    return `saga_${randomBytes(16).toString("hex")}`;
  }
  async executeWithTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error("Step execution timeout")), timeoutMs))
    ]);
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var SagaPersistenceImpl = class {
  static {
    __name(this, "SagaPersistenceImpl");
  }
  // In-memory fallback storage
  inMemoryStore = /* @__PURE__ */ new Map();
  /**
   * Save a new saga instance to database
   */
  async save(saga) {
    if (!db) {
      this.inMemoryStore.set(saga.sagaId, saga);
      process.stdout.write(`[SagaPersistence] Saved saga ${saga.sagaId} to in-memory store (DB unavailable)`);
      return;
    }
    try {
      await db.insert(sagas).values({
        sagaId: saga.sagaId,
        sagaType: saga.sagaType,
        status: saga.status,
        context: saga.context,
        steps: saga.steps.map((step) => ({
          stepId: step.stepId,
          stepName: step.stepName,
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt?.toISOString() || null,
          completedAt: step.completedAt?.toISOString() || null,
          compensatedAt: step.compensatedAt?.toISOString() || null
        })),
        error: saga.error,
        retryCount: String(saga.retryCount),
        maxRetries: String(saga.maxRetries),
        startedAt: saga.startedAt,
        completedAt: saga.completedAt,
        failedAt: saga.failedAt
      });
      process.stdout.write(`[SagaPersistence] Saved saga ${saga.sagaId} to database`);
    } catch (_error) {
      this.inMemoryStore.set(saga.sagaId, saga);
    }
  }
  /**
   * Load a saga instance from database
   */
  async load(sagaId) {
    if (!db) {
      const saga = this.inMemoryStore.get(sagaId);
      if (saga) {
        process.stdout.write(`[SagaPersistence] Loaded saga ${sagaId} from in-memory store (DB unavailable)`);
      }
      return saga || null;
    }
    try {
      const [row] = await db.select().from(sagas).where(eq(sagas.sagaId, sagaId)).limit(1);
      if (!row) {
        return this.inMemoryStore.get(sagaId) || null;
      }
      const instance2 = {
        sagaId: row.sagaId,
        sagaType: row.sagaType,
        status: row.status,
        context: row.context,
        steps: row.steps.map((step) => ({
          stepId: step.stepId,
          stepName: step.stepName,
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt ? new Date(step.startedAt) : null,
          completedAt: step.completedAt ? new Date(step.completedAt) : null,
          compensatedAt: step.compensatedAt ? new Date(step.compensatedAt) : null
        })),
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        failedAt: row.failedAt,
        error: row.error,
        retryCount: Number.parseInt(row.retryCount, 10),
        maxRetries: Number.parseInt(row.maxRetries, 10)
      };
      process.stdout.write(`[SagaPersistence] Loaded saga ${sagaId} from database`);
      return instance2;
    } catch (_error) {
      return this.inMemoryStore.get(sagaId) || null;
    }
  }
  /**
   * Update saga instance fields
   */
  async update(sagaId, updates) {
    if (!db) {
      const existing = this.inMemoryStore.get(sagaId);
      if (existing) {
        this.inMemoryStore.set(sagaId, {
          ...existing,
          ...updates
        });
        process.stdout.write(`[SagaPersistence] Updated saga ${sagaId} in in-memory store (DB unavailable)`);
      }
      return;
    }
    try {
      const updateData = {};
      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.error !== void 0) {
        updateData.error = updates.error;
      }
      if (updates.completedAt !== void 0) {
        updateData.completedAt = updates.completedAt;
      }
      if (updates.failedAt !== void 0) {
        updateData.failedAt = updates.failedAt;
      }
      if (updates.retryCount !== void 0) {
        updateData.retryCount = String(updates.retryCount);
      }
      if (updates.context) {
        updateData.context = updates.context;
      }
      if (updates.steps) {
        updateData.steps = updates.steps.map((step) => ({
          stepId: step.stepId,
          stepName: step.stepName,
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt?.toISOString() || null,
          completedAt: step.completedAt?.toISOString() || null,
          compensatedAt: step.compensatedAt?.toISOString() || null
        }));
      }
      updateData.updatedAt = /* @__PURE__ */ new Date();
      await db.update(sagas).set(updateData).where(eq(sagas.sagaId, sagaId));
      process.stdout.write(`[SagaPersistence] Updated saga ${sagaId} in database`);
    } catch (_error) {
      const existing = this.inMemoryStore.get(sagaId);
      if (existing) {
        this.inMemoryStore.set(sagaId, {
          ...existing,
          ...updates
        });
      }
    }
  }
  /**
   * List all sagas with optional filtering
   */
  async listAll(filter) {
    if (!db) {
      let results = Array.from(this.inMemoryStore.values());
      if (filter?.sagaType) {
        results = results.filter((s) => s.sagaType === filter.sagaType);
      }
      if (filter?.status) {
        results = results.filter((s) => filter.status?.includes(s.status));
      }
      if (filter?.startedAfter) {
        const startedAfter = filter.startedAfter;
        results = results.filter((s) => s.startedAt >= startedAfter);
      }
      if (filter?.startedBefore) {
        const startedBefore = filter.startedBefore;
        results = results.filter((s) => s.startedAt <= startedBefore);
      }
      if (filter?.limit) {
        results = results.slice(0, filter.limit);
      }
      process.stdout.write(`[SagaPersistence] Listed ${results.length} sagas from in-memory store (DB unavailable)`);
      return results;
    }
    try {
      const conditions = [];
      if (filter?.sagaType) {
        conditions.push(eq(sagas.sagaType, filter.sagaType));
      }
      if (filter?.status && filter.status.length > 0) {
        conditions.push(inArray(sagas.status, filter.status));
      }
      if (filter?.startedAfter) {
        conditions.push(gte(sagas.startedAt, filter.startedAfter));
      }
      if (filter?.startedBefore) {
        conditions.push(lte(sagas.startedAt, filter.startedBefore));
      }
      let query = db.select().from(sagas);
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      query = query.orderBy(desc(sagas.startedAt));
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      const rows = await query;
      const instances = rows.map((row) => ({
        sagaId: row.sagaId,
        sagaType: row.sagaType,
        status: row.status,
        context: row.context,
        steps: row.steps.map((step) => ({
          stepId: step.stepId,
          stepName: step.stepName,
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt ? new Date(step.startedAt) : null,
          completedAt: step.completedAt ? new Date(step.completedAt) : null,
          compensatedAt: step.compensatedAt ? new Date(step.compensatedAt) : null
        })),
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        failedAt: row.failedAt,
        error: row.error,
        retryCount: Number.parseInt(row.retryCount, 10),
        maxRetries: Number.parseInt(row.maxRetries, 10)
      }));
      process.stdout.write(`[SagaPersistence] Listed ${instances.length} sagas from database`);
      return instances;
    } catch (_error) {
      return Array.from(this.inMemoryStore.values());
    }
  }
  /**
   * Delete a saga instance from storage
   */
  async delete(sagaId) {
    if (!db) {
      this.inMemoryStore.delete(sagaId);
      logger.debug(`[SagaPersistence] Deleted saga ${sagaId} from in-memory store (DB unavailable)`);
      return;
    }
    try {
      await db.delete(sagas).where(eq(sagas.sagaId, sagaId));
      this.inMemoryStore.delete(sagaId);
      logger.debug(`[SagaPersistence] Deleted saga ${sagaId} from database`);
    } catch (_error) {
      this.inMemoryStore.delete(sagaId);
    }
  }
};
var sagaPersistence = new SagaPersistenceImpl();
async function updateSubscriptionStep(input, context) {
  const priceIdMap = {
    pro: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    team: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
  };
  const newPriceId = priceIdMap[input.toTier];
  if (!newPriceId) {
    throw new Error(`No price ID configured for tier: ${input.toTier}`);
  }
  if (!input.subscriptionId) {
    throw new Error("Subscription ID is required for tier upgrade");
  }
  const stripeClient = context.stripeClient;
  if (!stripeClient) {
    throw new Error("Stripe client not available in context");
  }
  const currentSubscription = await stripeClient.subscriptions.retrieve(input.subscriptionId);
  const currentPriceId = currentSubscription.items.data[0]?.price?.id;
  context.previousPriceId = currentPriceId;
  await stripeClient.subscriptions.update(input.subscriptionId, {
    items: [
      {
        id: currentSubscription.items.data[0].id,
        price: newPriceId
      }
    ],
    proration_behavior: "create_prorations"
  });
  const effectiveDate = /* @__PURE__ */ new Date();
  const prorationAmount = null;
  process.stdout.write(`[TierUpgradeSaga] Updated subscription ${input.subscriptionId} to ${input.toTier} tier (price: ${newPriceId})`);
  return {
    subscriptionId: input.subscriptionId,
    priceId: newPriceId,
    effectiveDate,
    prorationAmount
  };
}
__name(updateSubscriptionStep, "updateSubscriptionStep");
async function compensateUpdateSubscription(_input, output, context) {
  if (!output?.subscriptionId || !context.previousPriceId) {
    return;
  }
  try {
    const stripeClient = context.stripeClient;
    if (!stripeClient) {
      return;
    }
    const currentSubscription = await stripeClient.subscriptions.retrieve(output.subscriptionId);
    await stripeClient.subscriptions.update(output.subscriptionId, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: context.previousPriceId
        }
      ],
      proration_behavior: "none"
    });
    process.stdout.write(`[TierUpgradeSaga] Compensated: Reverted subscription ${output.subscriptionId} to price ${context.previousPriceId}`);
  } catch {
  }
}
__name(compensateUpdateSubscription, "compensateUpdateSubscription");
async function updateUserTierStep(input, context) {
  if (!db) {
    throw new Error("Database not available");
  }
  const currentEntitlements = await entitlementsService.getEntitlements(input.userId);
  const previousTier = currentEntitlements.tier;
  context.previousTier = previousTier;
  await db.update(user).set({
    subscriptionTier: input.toTier
  }).where(eq(user.id, input.userId));
  await db.update(subscriptions).set({
    plan: input.toTier
  }).where(eq(subscriptions.userId, input.userId));
  process.stdout.write(`[TierUpgradeSaga] Updated user ${input.userId} tier from ${previousTier} to ${input.toTier}`);
  return {
    previousTier,
    updatedAt: /* @__PURE__ */ new Date()
  };
}
__name(updateUserTierStep, "updateUserTierStep");
async function compensateUpdateUserTier(input, output, context) {
  if (!output?.previousTier || !db) {
    return;
  }
  try {
    const previousTier = context.previousTier;
    await db.update(user).set({
      subscriptionTier: previousTier
    }).where(eq(user.id, input.userId));
    await db.update(subscriptions).set({
      plan: previousTier
    }).where(eq(subscriptions.userId, input.userId));
    process.stdout.write(`[TierUpgradeSaga] Compensated: Reverted user ${input.userId} tier to ${previousTier}`);
  } catch {
  }
}
__name(compensateUpdateUserTier, "compensateUpdateUserTier");
async function updateUpgradeEntitlementsStep(input, _context) {
  const currentEntitlements = await entitlementsService.getEntitlements(input.userId);
  const previousVersion = 1;
  await entitlementsService.invalidateCache(input.userId);
  const newEntitlements = await entitlementsService.getEntitlements(input.userId);
  const addedFeatures = newEntitlements.features.filter((f) => !currentEntitlements.features.includes(f));
  process.stdout.write(`[TierUpgradeSaga] Updated entitlements for user ${input.userId}: +${addedFeatures.length} features`);
  return {
    entitlements: newEntitlements,
    previousVersion,
    addedFeatures
  };
}
__name(updateUpgradeEntitlementsStep, "updateUpgradeEntitlementsStep");
async function compensateUpdateUpgradeEntitlements(input, _output, _context) {
  try {
    await entitlementsService.invalidateCache(input.userId);
    process.stdout.write(`[TierUpgradeSaga] Compensated: Invalidated entitlements for user ${input.userId}`);
  } catch {
  }
}
__name(compensateUpdateUpgradeEntitlements, "compensateUpdateUpgradeEntitlements");
async function sendUpgradeConfirmationStep(input, context) {
  const emailService = context.emailService;
  if (!emailService) {
    const skippedJobId = `skipped_${nanoid()}`;
    return {
      emailJobId: skippedJobId,
      scheduledAt: /* @__PURE__ */ new Date()
    };
  }
  const emailJobData = {
    id: nanoid(),
    userId: input.userId,
    recipientEmail: input.userEmail,
    template: "tier_upgraded",
    templateVersion: 1,
    variant: null,
    templateData: {
      fromTier: input.fromTier,
      toTier: input.toTier,
      newFeatures: input.newFeatures,
      effectiveDate: input.effectiveDate.toISOString()
    },
    sendAt: /* @__PURE__ */ new Date(),
    priority: "medium"
  };
  const emailJobId = await emailService.queueEmail(emailJobData);
  const scheduledAt = /* @__PURE__ */ new Date();
  process.stdout.write(`[TierUpgradeSaga] Scheduled upgrade confirmation email ${emailJobId} for user ${input.userId}`);
  return {
    emailJobId,
    scheduledAt
  };
}
__name(sendUpgradeConfirmationStep, "sendUpgradeConfirmationStep");
async function compensateSendUpgradeConfirmation(_input, output, context) {
  if (!output?.emailJobId) {
    return;
  }
  if (output.emailJobId.startsWith("skipped_")) {
    process.stdout.write("[TierUpgradeSaga] Compensated: Email was skipped, no cancellation needed");
    return;
  }
  const emailService = context.emailService;
  if (!emailService) {
    return;
  }
  try {
    await emailService.cancelJob(output.emailJobId);
    process.stdout.write(`[TierUpgradeSaga] Compensated: Cancelled email job ${output.emailJobId}`);
  } catch {
  }
}
__name(compensateSendUpgradeConfirmation, "compensateSendUpgradeConfirmation");
async function emitTierUpgradedStep(input, context) {
  const eventBus = context.eventBus;
  const eventId = `event_${nanoid()}`;
  const timestamp3 = /* @__PURE__ */ new Date();
  const sagaId = context.sagaId ?? `saga_${nanoid()}`;
  if (eventBus) {
    eventBus.emit("tier:upgraded", {
      userId: input.userId,
      fromTier: input.fromTier,
      toTier: input.toTier,
      subscriptionId: input.subscriptionId,
      effectiveDate: input.effectiveDate,
      sagaId
    });
    process.stdout.write(`[TierUpgradeSaga] Emitted tier_upgraded event ${eventId}: ${input.fromTier} \u2192 ${input.toTier}`);
  }
  return {
    eventId,
    timestamp: timestamp3
  };
}
__name(emitTierUpgradedStep, "emitTierUpgradedStep");
function getTierUpgradeSaga() {
  return {
    ...TIER_UPGRADE_SAGA,
    steps: [
      {
        stepId: "update_subscription",
        stepName: "Update Subscription in Payment Provider",
        execute: updateSubscriptionStep,
        compensate: compensateUpdateSubscription,
        retryable: true,
        timeout: 3e4
      },
      {
        stepId: "update_user_tier",
        stepName: "Update User Tier in Database",
        execute: updateUserTierStep,
        compensate: compensateUpdateUserTier,
        retryable: true,
        timeout: 5e3
      },
      {
        stepId: "update_entitlements",
        stepName: "Update Entitlements with New Tier Features",
        execute: updateUpgradeEntitlementsStep,
        compensate: compensateUpdateUpgradeEntitlements,
        retryable: true,
        timeout: 5e3
      },
      {
        stepId: "send_confirmation",
        stepName: "Send Upgrade Confirmation Email",
        execute: sendUpgradeConfirmationStep,
        compensate: compensateSendUpgradeConfirmation,
        retryable: true,
        timeout: 1e4
      },
      {
        stepId: "emit_event",
        stepName: "Emit Tier Upgraded Event",
        execute: emitTierUpgradedStep,
        // No compensation needed for events (idempotent)
        retryable: false,
        timeout: 3e3
      }
    ]
  };
}
__name(getTierUpgradeSaga, "getTierUpgradeSaga");
function createTierUpgradeSagaWithDeps(deps) {
  const sagaDef = getTierUpgradeSaga();
  const originalSteps = sagaDef.steps;
  return {
    ...sagaDef,
    steps: originalSteps.map((step) => {
      const enhanceContext = /* @__PURE__ */ __name((context) => ({
        ...context,
        emailService: deps.emailService,
        eventBus: deps.eventBus
      }), "enhanceContext");
      return {
        ...step,
        execute: /* @__PURE__ */ __name(async (input, context) => {
          return step.execute(input, enhanceContext(context));
        }, "execute"),
        // Also wrap compensate to ensure dependencies are available during rollback
        compensate: step.compensate ? async (input, output, context) => {
          return step.compensate?.(input, output, enhanceContext(context));
        } : void 0
      };
    })
  };
}
__name(createTierUpgradeSagaWithDeps, "createTierUpgradeSagaWithDeps");

export { AccountSchema, AiChatSchema, AttributionServiceImpl, EntitlementsServiceImpl, InvitationSchema, MCPService, MemberSchema, OrganizationSchema, OrganizationUpdateSchema, PasskeySchema, PurchaseInsertSchema, PurchaseSchema, PurchaseUpdateSchema, SagaOrchestratorImpl, SessionSchema, SnapshotStoreDb, TelemetrySinkDb, TelemetrySinkDbAdapter, UserSchema, UserUpdateSchema, VerificationSchema, anonymizeEmail, anonymizeUserData, anonymizeUserId, appendFalsePositivePatterns, calculateDecayedWeight, cleanupExpiredData, clearCapabilityCache, closeTestDb, config, countAllOrganizations, countAllUsers, createPurchase, createTestUser, createTierUpgradeSagaWithDeps, createUser, createUserAccount, databaseService, deletePurchaseBySubscriptionId, deleteUserApiKeys, deleteUserData, exportUserData, extensionLinkTokens, extensionSessions, findSimilarPatterns, generateOrganizationSlug, getAccountById, getBaseUrl, getCacheMetrics, getCapabilities, getCapabilityAuditHistory, getInvitationById, getMCPService, getOrganizationById, getOrganizationBySlug, getOrganizationMembership, getOrganizationWithPurchasesAndMembersCount, getOrganizations, getOrganizationsWithMembers, getPendingInvitationByEmail, getPurchaseById, getPurchaseBySubscriptionId, getPurchasesByOrganizationId, getPurchasesByUserId, getTestDb, getUserByEmail, getUserById, getUserPrivacyPreferences, getUsers, getVectorStats, getWorkspaceLinkById, getWorkspaceLinksByUserId, handleTierDowngrade, handleTierUpgrade, healthCheck, incrementDetectionsAnalyzed, insertPatternWithEmbedding, invalidateCapabilityCache, isPgvectorEnabled, linkWorkspace, logAnonymizedEvent, logCapabilityAudit, mergeSignalIntoPattern, recordFalsePositiveSignal, resetCacheMetrics, resetCapabilities, resolveTierByWorkspaceId, sagaPersistence, sanitizeForLogging, searchSimilarPatterns, shouldRetainData, signalToPattern, testInTransaction, truncateAllTables, unlinkAllWorkspacesForUser, unlinkWorkspace, updateCapabilities, updateOrganization, updatePatternEmbedding, updatePurchase, updateUser, updateWorkspaceTier };
//# sourceMappingURL=chunk-T7FDWUFZ.js.map
//# sourceMappingURL=chunk-T7FDWUFZ.js.map