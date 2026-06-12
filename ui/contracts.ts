/**
 * TUI View Data Contracts
 *
 * Zod schemas that define the data shape each Ink view receives.
 * These are the VIEW side  -  derived from daemon response schemas but shaped for rendering.
 *
 * DO NOT duplicate types already in @vreko/contracts  -  import from there directly.
 * Import daemon response types:
 *   import { SessionVitalsResult } from '@vreko/contracts/local-service/schemas';
 *
 * @module ui/contracts
 */

import { z } from "zod";

// =============================================================================
// STATUS VIEW
// =============================================================================

/** Status view data shape  -  assembled from multiple RPC calls */
export const StatusViewData = z.object({
	intelligence: z.object({
		codebaseHealth: z.number().min(0).max(100),
		knowledgeChunks: z.number().int().nonnegative(),
		learnedPatterns: z.number().int().nonnegative(),
		fragileFiles: z.number().int().nonnegative(),
		cochangeRelationships: z.number().int().nonnegative(),
	}),
	session: z
		.object({
			task: z.string(),
			duration: z.number().nonnegative(),
			active: z.boolean(),
		})
		.nullable(),
	protection: z.object({
		active: z.boolean(),
		filesWatched: z.number().int().nonnegative(),
	}),
	aiActivity: z.record(
		z.string(),
		z.object({
			contextServed: z.number().int().nonnegative(),
			warningsServed: z.number().int().nonnegative(),
			lastActivity: z.number().nullable(),
		}),
	),
	recentEvents: z.array(
		z.object({
			timestamp: z.number(),
			type: z.enum(["fragile", "cochange", "learning", "risk", "pattern", "save", "warning", "mcp"]),
			message: z.string(),
			detail: z.string().optional(),
		}),
	),
	daemon: z.object({
		connected: z.boolean(),
		uptime: z.number().nonnegative().optional(),
		version: z.string().optional(),
	}),
});
export type StatusViewData = z.infer<typeof StatusViewData>;

// =============================================================================
// WATCH VIEW
// =============================================================================

/** Watch view event shape  -  one entry per file-save or daemon notification */
export const WatchEvent = z.object({
	timestamp: z.number(),
	filePath: z.string(),
	riskScore: z.number().min(0).max(1).optional(),
	riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
	aiDetected: z.boolean().default(false),
	aiTool: z.string().optional(),
	aiConfidence: z.number().min(0).max(100).optional(),
	cochangeAlert: z.string().optional(),
	learningCaptured: z.string().optional(),
	restorePointCreated: z.boolean().default(false),
});
export type WatchEvent = z.infer<typeof WatchEvent>;

// =============================================================================
// PULSE VIEW
// =============================================================================

/** Pulse view event shape  -  one entry per MCP interaction */
export const PulseEvent = z.object({
	timestamp: z.number(),
	agentName: z.string(),
	action: z.enum(["context-request", "learning-recorded", "pulse-checked", "heartbeat"]),
	filePath: z.string().optional(),
	served: z
		.object({
			learnings: z.number().int().nonnegative().optional(),
			cochangePatterns: z.number().int().nonnegative().optional(),
			riskScore: z.number().min(0).max(1).optional(),
			warnings: z.number().int().nonnegative().optional(),
		})
		.optional(),
	agentNowKnows: z.string().optional(),
});
export type PulseEvent = z.infer<typeof PulseEvent>;

// =============================================================================
// WIZARD GAUGE
// =============================================================================

/** Wizard gauge stage  -  tracks background analysis progress */
export const GaugeStage = z.object({
	name: z.string(),
	weight: z.number().min(0).max(100),
	status: z.enum(["pending", "active", "complete", "failed"]),
	metric: z.string().optional(),
	displayText: z.string(),
});
export type GaugeStage = z.infer<typeof GaugeStage>;

// =============================================================================
// RPC → VIEW DATA SOURCE MAP
// =============================================================================

/** Documents which daemon RPC methods feed each view  -  for reference only */
export const VIEW_DATA_SOURCES = {
	status: [
		"intelligence/summary", // codebaseHealth, knowledgeChunks, learnedPatterns
		"intelligence/fragile-files", // fragileFiles count
		"intelligence/co-changes", // cochangeRelationships count
		"session/status", // active session info
		"intelligence/warnings", // recentEvents
		"daemon/ping", // daemon connected, uptime, version
		"supervisor/heartbeat", // aiActivity per-agent
	],
	watch: [
		"watch/subscribe", // file change events
		"protection/evaluate", // risk score per save
		"intelligence/co-changes", // co-change alerts
		"learning/list", // learning captures
	],
	pulse: [
		"supervisor/heartbeat", // connected agents
		// DaemonEventType notifications:
		// 'mcp.file-modified', 'mcp.snapshot-created',
		// 'learning.recorded', 'intelligence.pattern-detected'
	],
	wizard: [
		"workspace/analyze", // background analysis
		"workspace/seed-knowledge", // knowledge seeding
		"protection/evaluate", // critical file identification
		"daemon/ping", // daemon health
	],
} as const;
