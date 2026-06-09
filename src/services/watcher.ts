/**
 * Watcher Service
 *
 * Continuous file watching daemon for behavioral learning.
 * Uses chokidar pattern from packages/core/src/utils/watcher.ts
 *
 * Watches for:
 * - File changes in workspace (for protection suggestions)
 * - .vreko/ changes (for pattern promotion)
 * - Config file changes (for auto-detection)
 *
 * Records behavioral signals:
 * - Which files are frequently modified
 * - Which files trigger rollbacks
 * - Patterns in developer activity
 *
 * @see the_vision.md - behavioral learning
 * @see lib_implementation.md TASK 5 - chokidar
 */

import { EventEmitter } from "node:events";
import { basename, relative } from "node:path";
import type { FSWatcher } from "chokidar";
import chokidar from "chokidar";

import {
	appendVrekoJsonl,
	getProtectedFiles,
	getViolations,
	getWorkspaceDir,
	isVrekoInitialized,
	type LearningEntry,
	loadVrekoJsonl,
} from "./vreko-dir";

// =============================================================================
// TYPES
// =============================================================================

export interface WatcherConfig {
	/** Workspace root directory */
	workspaceRoot: string;
	/** Debounce delay in ms (default: 120) */
	debounceMs?: number;
	/** Max depth for directory watching (default: 10) */
	depth?: number;
	/** Patterns to ignore */
	ignored?: string[];
	/** Enable verbose logging */
	verbose?: boolean;
}

export interface BehavioralSignal {
	type: "file_change" | "file_add" | "file_delete" | "protection_added" | "violation_detected";
	path: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface WatcherStats {
	startedAt: string;
	filesWatched: number;
	signalsRecorded: number;
	patternsDetected: number;
	lastActivityAt: string | null;
}

export type WatcherEvent = "ready" | "change" | "add" | "unlink" | "error" | "signal" | "pattern";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: Partial<WatcherConfig> = {
	debounceMs: 120,
	depth: 10,
	ignored: [
		"**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**",
		"**/*.log",
		"**/.*cache*/**",
		"**/.vreko/snapshots/**",
		"**/.vreko/embeddings.db",
	],
};

// Critical file patterns that should suggest protection
const CRITICAL_FILE_PATTERNS = [
	/\.env.*$/,
	/config\.(json|yaml|yml|toml)$/,
	/secrets?\.(json|yaml|yml)$/,
	/\.pem$/,
	/\.key$/,
	/auth\.ts$/,
	/middleware\.ts$/,
	/schema\.(ts|prisma)$/,
];

// Patterns that indicate potential issues
const RISKY_CHANGE_PATTERNS = [
	/package\.json$/,
	/package-lock\.json$/,
	/pnpm-lock\.yaml$/,
	/yarn\.lock$/,
	/tsconfig\.json$/,
];

// =============================================================================
// WATCHER CLASS
// =============================================================================

export class VrekoWatcher extends EventEmitter {
	private watcher: FSWatcher | null = null;
	private config: WatcherConfig;
	private stats: WatcherStats;
	private signalBuffer: BehavioralSignal[] = [];
	private flushTimer: NodeJS.Timeout | null = null;
	private changeCountByFile: Map<string, number> = new Map();

	constructor(config: WatcherConfig) {
		super();
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.stats = {
			startedAt: new Date().toISOString(),
			filesWatched: 0,
			signalsRecorded: 0,
			patternsDetected: 0,
			lastActivityAt: null,
		};
	}

	/**
	 * Start watching the workspace
	 */
	async start(): Promise<void> {
		if (this.watcher) {
			throw new Error("Watcher already started");
		}

		// Verify vreko is initialized
		if (!(await isVrekoInitialized(this.config.workspaceRoot))) {
			throw new Error("Vreko not initialized. Run: vr init");
		}

		const { workspaceRoot, debounceMs, depth, ignored } = this.config;

		this.log("Starting watcher...");

		this.watcher = chokidar.watch(workspaceRoot, {
			ignoreInitial: true,
			ignored: ignored,
			awaitWriteFinish: { stabilityThreshold: debounceMs, pollInterval: 50 },
			ignorePermissionErrors: true,
			depth: depth,
			persistent: true,
		});

		// Set up event handlers
		this.watcher
			.on("ready", () => {
				this.stats.filesWatched = this.getWatchedCount();
				this.log(`Ready. Watching ${this.stats.filesWatched} files`);
				this.emit("ready", this.stats);
			})
			.on("change", (path) => this.handleChange("change", path))
			.on("add", (path) => this.handleChange("add", path))
			.on("unlink", (path) => this.handleChange("unlink", path))
			.on("error", (error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				this.log(`Error: ${message}`, true);
				this.emit("error", error);
			});

		// Watch .vreko/ specifically for pattern promotion
		this.watchVrekoDir();

		// Start flush timer
		this.startFlushTimer();
	}

	/**
	 * Stop watching
	 */
	async stop(): Promise<void> {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}

		// Flush remaining signals
		await this.flushSignals();

		if (this.watcher) {
			await this.watcher.close();
			this.watcher = null;
			this.log("Stopped");
		}
	}

	/**
	 * Get current stats
	 */
	getStats(): WatcherStats {
		return { ...this.stats };
	}

	/**
	 * Check if watcher is running
	 */
	isRunning(): boolean {
		return this.watcher !== null;
	}

	// =============================================================================
	// PRIVATE METHODS
	// =============================================================================

	private handleChange(type: "change" | "add" | "unlink", path: string): void {
		const relativePath = relative(this.config.workspaceRoot, path);

		this.stats.lastActivityAt = new Date().toISOString();

		// Create signal
		const signal: BehavioralSignal = {
			type: type === "add" ? "file_add" : type === "unlink" ? "file_delete" : "file_change",
			path: relativePath,
			timestamp: this.stats.lastActivityAt,
		};

		// Track change frequency
		const count = (this.changeCountByFile.get(relativePath) || 0) + 1;
		this.changeCountByFile.set(relativePath, count);

		// Check if file is critical
		const isCritical = this.isCriticalFile(relativePath);
		const isRisky = this.isRiskyChange(relativePath);

		if (isCritical) {
			signal.metadata = { critical: true };
			this.emit("signal", { ...signal, suggestion: "Consider protecting this file" });
		}

		if (isRisky) {
			signal.metadata = { ...signal.metadata, risky: true };
		}

		// Buffer signal for batch write
		this.signalBuffer.push(signal);

		// Emit event
		this.emit(type, relativePath, { isCritical, isRisky, changeCount: count });

		// Check for patterns
		this.detectPatterns(relativePath, count);

		this.log(`${type}: ${relativePath}${isCritical ? " [CRITICAL]" : ""}${isRisky ? " [RISKY]" : ""}`);
	}

	private watchVrekoDir(): void {
		const vrekoDir = getWorkspaceDir(this.config.workspaceRoot);

		// Watch violations.jsonl for auto-promotion
		const violationsWatcher = chokidar.watch(`${vrekoDir}/patterns/violations.jsonl`, {
			ignoreInitial: true,
			awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
		});

		violationsWatcher.on("change", async () => {
			await this.checkViolationPromotion();
		});
	}

	private async checkViolationPromotion(): Promise<void> {
		try {
			const violations = await getViolations(this.config.workspaceRoot);

			// Count by type
			const typeCounts = new Map<string, number>();
			for (const v of violations) {
				typeCounts.set(v.type, (typeCounts.get(v.type) || 0) + 1);
			}

			// Check for promotion candidates (3+ occurrences)
			for (const [type, count] of typeCounts) {
				if (count >= 3) {
					this.emit("pattern", {
						type: "PROMOTION_READY",
						violationType: type,
						count,
						message: `Violation "${type}" seen ${count}x - ready for promotion`,
					});
					this.stats.patternsDetected++;
				}
			}
		} catch {
			// Ignore errors
		}
	}

	private detectPatterns(path: string, changeCount: number): void {
		// Detect frequently changed files
		if (changeCount >= 5) {
			this.emit("pattern", {
				type: "FREQUENTLY_CHANGED",
				path,
				count: changeCount,
				message: `File "${basename(path)}" changed ${changeCount}x - consider protection`,
			});
			this.stats.patternsDetected++;
		}

		// Detect if critical file is unprotected
		if (this.isCriticalFile(path) && changeCount >= 2) {
			this.checkProtectionSuggestion(path);
		}
	}

	private async checkProtectionSuggestion(path: string): Promise<void> {
		const protectedFiles = await getProtectedFiles(this.config.workspaceRoot);
		const isProtected = protectedFiles.some(
			(p) =>
				p.pattern === path ||
				(p.pattern.includes("*") && new RegExp(p.pattern.replace(/\*/g, ".*")).test(path)),
		);

		if (!isProtected) {
			this.emit("signal", {
				type: "protection_added",
				path,
				timestamp: new Date().toISOString(),
				suggestion: `Consider: vr protect add "${path}"`,
			});
		}
	}

	private isCriticalFile(path: string): boolean {
		return CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(path));
	}

	private isRiskyChange(path: string): boolean {
		return RISKY_CHANGE_PATTERNS.some((pattern) => pattern.test(path));
	}

	private startFlushTimer(): void {
		// Flush signals every 30 seconds
		this.flushTimer = setInterval(() => {
			this.flushSignals().catch(() => {
				// Ignore flush errors
			});
		}, 30000);
	}

	private async flushSignals(): Promise<void> {
		if (this.signalBuffer.length === 0) {
			return;
		}

		const signals = [...this.signalBuffer];
		this.signalBuffer = [];

		for (const signal of signals) {
			await appendVrekoJsonl("learnings/behavioral-signals.jsonl", signal, this.config.workspaceRoot);
			this.stats.signalsRecorded++;
		}
	}

	private getWatchedCount(): number {
		if (!this.watcher) {
			return 0;
		}
		const watched = this.watcher.getWatched();
		return Object.values(watched).reduce((acc, files) => acc + files.length, 0);
	}

	private log(_message: string, isError = false): void {
		if (this.config.verbose) {
			const _prefix = "[Vreko Watch]";
			if (isError) {
				// intentionally empty
			} else {
				// intentionally empty
			}
		}
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a watcher for a workspace
 */
export function createWatcher(config: WatcherConfig): VrekoWatcher {
	return new VrekoWatcher(config);
}

// =============================================================================
// BEHAVIORAL LEARNING HELPERS
// =============================================================================

/**
 * Get behavioral signals from a workspace
 */
export async function getBehavioralSignals(workspaceRoot?: string): Promise<BehavioralSignal[]> {
	return loadVrekoJsonl<BehavioralSignal>("learnings/behavioral-signals.jsonl", workspaceRoot);
}

/**
 * Analyze behavioral signals and generate learnings
 */
export async function analyzeBehavioralSignals(workspaceRoot?: string): Promise<LearningEntry[]> {
	const signals = await getBehavioralSignals(workspaceRoot);

	if (signals.length === 0) {
		return [];
	}

	// Count changes by file
	const fileCounts = new Map<string, number>();
	for (const signal of signals) {
		if (signal.type === "file_change") {
			fileCounts.set(signal.path, (fileCounts.get(signal.path) || 0) + 1);
		}
	}

	const learnings: LearningEntry[] = [];

	// Generate learnings for frequently changed files
	for (const [path, count] of fileCounts) {
		if (count >= 10) {
			learnings.push({
				id: `behavioral_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
				type: "pattern",
				trigger: `editing ${basename(path)}`,
				action: `This file is frequently modified (${count}x). Consider adding protection.`,
				source: "behavioral-analysis",
				createdAt: new Date().toISOString(),
			});
		}
	}

	return learnings;
}
