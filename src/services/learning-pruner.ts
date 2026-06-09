/**
 * Automated Learning Pruner
 *
 * Core engine for automated learning and violation lifecycle management.
 * Features:
 * - File existence validation for violations
 * - Age-based + usage-based confidence scoring
 * - Pattern detection (validates if code patterns still exist)
 * - Deduplication (merges similar learnings)
 * - Archive mechanism (safe removal with rollback capability)
 *
 * @module services/learning-pruner
 *
 * DEPRECATED (Day 5): Direct @vreko/intelligence imports replaced with daemon IPC.
 * Learning operations now route through the daemon.
 */

import { join } from "node:path";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import {
	connectServiceClient,
	createServiceClient,
	gcLearningsViaDaemon,
	listLearningsViaDaemon,
	pruneLearningsViaDaemon,
} from "../service-adapter/local-service-adapter.js";

// =============================================================================
// TYPES
// =============================================================================

export interface PrunerConfig {
	/** Workspace root directory */
	workspaceRoot: string;
	/** Enable dry-run mode (no actual changes) */
	dryRun?: boolean;
	/** Maximum age in days before archiving stale learnings */
	maxAgeDays?: number;
	/** Minimum usage count to keep high-value learnings */
	minUsageCount?: number;
	/** Archive directory (relative to workspace) */
	archiveDir?: string;
}

export interface PruneResult {
	/** Total violations checked */
	totalChecked: number;
	/** Violations marked for archival */
	staleCount: number;
	/** Violations archived (0 if dryRun) */
	archivedCount: number;
	/** File paths of archived violations */
	archivedFiles: string[];
	/** Dry run mode? */
	dryRun: boolean;
}

export interface ScoreUpdateResult {
	/** Total learnings scored */
	totalScored: number;
	/** Learnings with updated scores */
	updatedCount: number;
	/** Average confidence score */
	avgConfidence: number;
	/** Low confidence learnings (< 0.3) */
	lowConfidenceCount: number;
}

export interface DedupeResult {
	/** Total learnings checked */
	totalChecked: number;
	/** Duplicate groups found */
	duplicateGroups: number;
	/** Learnings merged */
	mergedCount: number;
	/** Dry run mode? */
	dryRun: boolean;
}

export interface ArchiveResult {
	/** Items archived */
	archived: {
		learnings: number;
		violations: number;
	};
	/** Archive location */
	archivePath: string;
	/** Dry run mode? */
	dryRun: boolean;
}

// =============================================================================
// AUTOMATED LEARNING PRUNER
// =============================================================================

/**
 * Automated Learning Pruner
 *
 * Manages learning and violation lifecycle with intelligent pruning.
 *
 * Day 5: Routes all learning operations through daemon IPC.
 *
 * @example
 * ```typescript
 * const pruner = new AutomatedLearningPruner({
 *   workspaceRoot: '/path/to/project',
 *   dryRun: true,
 *   maxAgeDays: 90
 * });
 *
 * const result = await pruner.pruneStaleViolations();
 * print(...);
 * ```
 */
export class AutomatedLearningPruner {
	private readonly config: Required<PrunerConfig>;
	private client: VrekoLocalClient | null = null;

	constructor(config: PrunerConfig) {
		this.config = {
			workspaceRoot: config.workspaceRoot,
			dryRun: config.dryRun ?? false,
			maxAgeDays: config.maxAgeDays ?? 90,
			minUsageCount: config.minUsageCount ?? 3,
			archiveDir: config.archiveDir ?? ".vreko/archive",
		};
	}

	/**
	 * Initialize pruner (connects to daemon)
	 */
	async initialize(): Promise<void> {
		this.client = createServiceClient();
		await connectServiceClient(this.client);
	}

	/**
	 * Close daemon connection
	 */
	async close(): Promise<void> {
		if (this.client) {
			this.client.close();
			this.client = null;
		}
	}

	/**
	 * Prune stale violations (file existence + pattern validation)
	 *
	 * Day 5: Uses daemon IPC for learning operations.
	 */
	async pruneStaleViolations(): Promise<PruneResult> {
		if (!this.client) {
			throw new Error("Pruner not initialized. Call initialize() first.");
		}

		const daemonResult = await pruneLearningsViaDaemon(this.config.workspaceRoot, this.client);

		if (!daemonResult.success) {
			return {
				totalChecked: 0,
				staleCount: 0,
				archivedCount: 0,
				archivedFiles: [],
				dryRun: this.config.dryRun,
			};
		}

		return {
			totalChecked: daemonResult.result?.remaining ?? 0,
			staleCount: daemonResult.result?.pruned ?? 0,
			archivedCount: this.config.dryRun ? 0 : (daemonResult.result?.archived ?? 0),
			archivedFiles: [],
			dryRun: this.config.dryRun,
		};
	}

	/**
	 * Update learning confidence scores
	 *
	 * Day 5: Uses daemon IPC for learning operations.
	 */
	async updateLearningScores(): Promise<ScoreUpdateResult> {
		if (!this.client) {
			throw new Error("Pruner not initialized. Call initialize() first.");
		}

		const daemonResult = await listLearningsViaDaemon(this.config.workspaceRoot, this.client);

		if (!daemonResult.success || !daemonResult.result) {
			return { totalScored: 0, updatedCount: 0, avgConfidence: 0, lowConfidenceCount: 0 };
		}

		const learnings = daemonResult.result.learnings;
		let totalConfidence = 0;
		let lowConfidenceCount = 0;

		for (const learning of learnings) {
			const score = learning.relevanceScore ?? 0.5;
			totalConfidence += score;
			if (score < 0.3) {
				lowConfidenceCount++;
			}
		}

		return {
			totalScored: learnings.length,
			updatedCount: 0,
			avgConfidence: learnings.length > 0 ? totalConfidence / learnings.length : 0,
			lowConfidenceCount,
		};
	}

	/**
	 * Deduplicate learnings (merge similar entries)
	 *
	 * Day 5: Uses daemon IPC for learning operations.
	 */
	async deduplicateLearnings(): Promise<DedupeResult> {
		if (!this.client) {
			throw new Error("Pruner not initialized. Call initialize() first.");
		}

		const daemonResult = await gcLearningsViaDaemon(this.config.workspaceRoot, this.client, {
			operation: "dedupe",
			dryRun: this.config.dryRun,
		});

		if (!daemonResult.success || !daemonResult.result) {
			return { totalChecked: 0, duplicateGroups: 0, mergedCount: 0, dryRun: this.config.dryRun };
		}

		return {
			totalChecked: daemonResult.result.remaining,
			duplicateGroups: 0,
			mergedCount: daemonResult.result.archived,
			dryRun: this.config.dryRun,
		};
	}

	/**
	 * Archive stale learnings and violations
	 *
	 * Day 5: Uses daemon IPC for learning operations.
	 */
	async archiveStaleItems(): Promise<ArchiveResult> {
		if (!this.client) {
			throw new Error("Pruner not initialized. Call initialize() first.");
		}

		const daemonResult = await gcLearningsViaDaemon(this.config.workspaceRoot, this.client, {
			operation: "archive",
			dryRun: this.config.dryRun,
		});

		if (!daemonResult.success || !daemonResult.result) {
			return {
				archived: { learnings: 0, violations: 0 },
				archivePath: join(this.config.workspaceRoot, this.config.archiveDir),
				dryRun: this.config.dryRun,
			};
		}

		return {
			archived: { learnings: daemonResult.result.archived, violations: daemonResult.result.deleted },
			archivePath: join(this.config.workspaceRoot, this.config.archiveDir),
			dryRun: this.config.dryRun,
		};
	}

	/**
	 * Run full lifecycle maintenance
	 *
	 * Day 5: Uses daemon IPC for learning operations.
	 */
	async runFullMaintenance(): Promise<{
		prune: PruneResult;
		scores: ScoreUpdateResult;
		dedupe: DedupeResult;
		archive: ArchiveResult;
	}> {
		const [prune, scores, dedupe, archive] = await Promise.all([
			this.pruneStaleViolations(),
			this.updateLearningScores(),
			this.deduplicateLearnings(),
			this.archiveStaleItems(),
		]);

		return { prune, scores, dedupe, archive };
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a learning pruner instance
 */
export function createLearningPruner(config: PrunerConfig): AutomatedLearningPruner {
	return new AutomatedLearningPruner(config);
}
