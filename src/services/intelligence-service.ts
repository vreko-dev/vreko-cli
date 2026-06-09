/**
 * Intelligence Service (Daemon Proxy)
 *
 * @fileoverview Provides proxy access to intelligence via the daemon.
 * All intelligence operations are proxied through vrekod for IP protection.
 *
 * ## Architecture
 *
 * ```
 * CLI Commands
 *     ↓
 * IntelligenceService (this file - PROXY LAYER)
 *     ↓
 * DaemonClientService (IPC client)
 *     ↓
 * vrekod daemon (separate process)
 *     ↓
 * @vreko/intelligence (runs in daemon - NOT bundled in CLI)
 * ```
 *
 * ## IP Protection
 *
 * - CLI has NO direct imports of @vreko/intelligence runtime code
 * - All intelligence code runs in the daemon process
 * - Only types from @vreko/contracts are used
 *
 * @module services/intelligence-service
 */

import { connectToDaemon, isDaemonAvailable } from "./service-client";
import { isVrekoInitialized } from "./vreko-dir";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Intelligence proxy that delegates to the daemon
 *
 * Provides the same interface as Intelligence but proxies all operations
 * through the daemon via IPC.
 */
export interface IntelligenceProxy {
	/**
	 * Get context for a task
	 */
	getContext(params: { task?: string; keywords?: string[]; files?: string[] }): Promise<{
		patterns: Array<{ name: string; description: string }>;
		constraints: Array<{ domain: string; name: string; value: string | number; description: string }>;
		learnings: Array<{ type: string; trigger: string; action: string; relevanceScore: number }>;
		files: string[];
	}>;

	/**
	 * Validate code
	 */
	validateCode(
		code: string,
		filePath: string,
	): Promise<{
		passed: boolean;
		confidence: number;
		totalIssues: number;
		recommendation: string;
	}>;

	/**
	 * Report a violation
	 */
	reportViolation(params: {
		type: string;
		file: string;
		message: string;
		reason: string;
		prevention: string;
	}): Promise<{ recorded: boolean; violationId: string }>;

	/**
	 * Get learning stats
	 */
	getLearningStats(): Promise<{
		totalLearnings: number;
		totalViolations: number;
		byType: Record<string, number>;
	}>;

	/**
	 * Get stats (alias for getLearningStats for compatibility)
	 */
	getStats(): Promise<{
		totalLearnings: number;
		totalViolations: number;
		byType: Record<string, number>;
	}>;

	/**
	 * Get violations summary
	 */
	getViolationsSummary(): Promise<{
		total: number;
		byType: Record<string, number>;
		byFile: Record<string, number>;
	}>;

	/**
	 * Dispose resources
	 */
	dispose(): Promise<void>;
}

// =============================================================================
// INTELLIGENCE PROXY IMPLEMENTATION
// =============================================================================

/**
 * Intelligence proxy that uses the daemon client
 */
class DaemonIntelligenceProxy implements IntelligenceProxy {
	private workspaceRoot: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}

	async getContext(params: { task?: string; keywords?: string[]; files?: string[] }): Promise<{
		patterns: Array<{ name: string; description: string }>;
		constraints: Array<{ domain: string; name: string; value: string | number; description: string }>;
		learnings: Array<{ type: string; trigger: string; action: string; relevanceScore: number }>;
		files: string[];
	}> {
		const client = await connectToDaemon();
		return client.context.get({
			workspace: this.workspaceRoot,
			task: params.task ?? "",
			keywords: params.keywords,
			files: params.files,
		});
	}

	async validateCode(
		code: string,
		filePath: string,
	): Promise<{
		passed: boolean;
		confidence: number;
		totalIssues: number;
		recommendation: string;
	}> {
		const client = await connectToDaemon();
		const result = await client.validation.comprehensive({
			workspace: this.workspaceRoot,
			filePath,
			code,
		});
		return {
			passed: result.passed,
			confidence: result.confidence,
			totalIssues: result.totalIssues,
			recommendation: result.recommendation,
		};
	}

	async reportViolation(params: {
		type: string;
		file: string;
		message: string;
		reason: string;
		prevention: string;
	}): Promise<{ recorded: boolean; violationId: string }> {
		const client = await connectToDaemon();
		const result = await client.violation.report({
			workspace: this.workspaceRoot,
			type: params.type,
			file: params.file,
			whatHappened: params.message,
			whyItHappened: params.reason,
			prevention: params.prevention,
		});
		return {
			recorded: result.reported,
			// Use a composite ID from type and file since daemon returns file path
			violationId: `${params.type}:${params.file}`,
		};
	}

	async getLearningStats(): Promise<{
		totalLearnings: number;
		totalViolations: number;
		byType: Record<string, number>;
	}> {
		const client = await connectToDaemon();
		const learnings = await client.learning.list({
			workspace: this.workspaceRoot,
		});
		// Issue: LIN-0000  -  Add violation stats when available
		return {
			totalLearnings: learnings.total,
			totalViolations: 0,
			byType: {},
		};
	}

	async getStats(): Promise<{
		totalLearnings: number;
		totalViolations: number;
		byType: Record<string, number>;
	}> {
		return this.getLearningStats();
	}

	async getViolationsSummary(): Promise<{
		total: number;
		byType: Record<string, number>;
		byFile: Record<string, number>;
	}> {
		// Issue: LIN-0000  -  Implement when daemon has violation summary endpoint
		return {
			total: 0,
			byType: {},
			byFile: {},
		};
	}

	async dispose(): Promise<void> {
		// Nothing to dispose - daemon manages resources
	}
}

// =============================================================================
// SINGLETON CACHE
// =============================================================================

const instances = new Map<string, IntelligenceProxy>();

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get or create Intelligence proxy for a workspace
 *
 * @param workspaceRoot - Path to workspace root (defaults to cwd)
 * @returns Promise<IntelligenceProxy> - Intelligence proxy instance
 * @throws Error if workspace is not initialized or daemon not available
 *
 * @example
 * ```typescript
 * try {
 *   const intel = await getIntelligence();
 *   const context = await intel.getContext({ task: "..." });
 * } catch (error) {
 *   if (error.message.includes("not initialized")) {
 *     print(...));
 *     process.exit(1);
 *   }
 *   throw error;
 * }
 * ```
 */
export async function getIntelligence(workspaceRoot?: string): Promise<IntelligenceProxy> {
	const cwd = workspaceRoot || process.cwd();

	// Check if workspace is initialized
	if (!(await isVrekoInitialized(cwd))) {
		throw new Error("Vreko not initialized. Run: vr init");
	}

	// Check cache
	if (instances.has(cwd)) {
		const cached = instances.get(cwd);
		if (cached) {
			return cached;
		}
	}

	// Create proxy
	const proxy = new DaemonIntelligenceProxy(cwd);
	instances.set(cwd, proxy);

	return proxy;
}

/**
 * Clear the Intelligence instance cache
 */
export async function clearIntelligenceCache(): Promise<void> {
	for (const instance of instances.values()) {
		await instance.dispose().catch(() => {
			// Intentionally silent
		});
	}
	instances.clear();
}

/**
 * Check if Intelligence is available for a workspace
 *
 * @param workspaceRoot - Path to workspace root (defaults to cwd)
 * @returns Promise<boolean> - true if Intelligence can be used
 */
export async function hasIntelligence(workspaceRoot?: string): Promise<boolean> {
	const cwd = workspaceRoot || process.cwd();

	// Check workspace initialization
	if (!(await isVrekoInitialized(cwd))) {
		return false;
	}

	// Check daemon availability
	return isDaemonAvailable();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Intelligence with semantic search enabled
 *
 * @param workspaceRoot - Path to workspace root (defaults to cwd)
 * @returns Promise<IntelligenceProxy> - Instance with semantic search ready
 */
export async function getIntelligenceWithSemantic(workspaceRoot?: string): Promise<IntelligenceProxy> {
	// For now, semantic search is handled by the daemon
	// The daemon config controls whether semantic search is enabled
	return getIntelligence(workspaceRoot);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { IntelligenceProxy as Intelligence };
