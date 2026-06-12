/**
 * CLI Local Service Adapter
 *
 * Thin adapter over @vreko/local-service-client providing CLI commands
 * with a familiar interface for talking to the unified Vreko local service.
 * Replaces direct use of the hand-rolled DaemonClient for service operations.
 *
 * CLI pattern: one-shot connections (connect → operate → disconnect)
 * unlike MCP which caches workspace-scoped connections.
 *
 * @module service-adapter/local-service-adapter
 */

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getDefaultSocketPath, VrekoLocalClient } from "@vreko/local-service-client";

// =============================================================================
// SERVICE PATHS
// =============================================================================

/**
 * Get the local service PID file path (~/.vreko/service.pid)
 */
export function getServicePidPath(): string {
	return join(homedir(), ".vreko", "service.pid");
}

/**
 * Get the local service socket path (see getDefaultSocketPath() for the resolved value).
 * Note: VrekoLocalClient defaults to this path internally,
 * but we expose it for CLI status display.
 */
export function getServiceSocketPath(): string {
	return process.env.VREKO_DAEMON_SOCKET ?? getDefaultSocketPath();
}

/**
 * Get the ready marker path (~/.vreko/.ready)
 */
function getReadyMarkerPath(): string {
	return join(homedir(), ".vreko", ".ready");
}

/**
 * Clean up stale daemon artifacts (PID file, socket, ready marker)
 * Called automatically when isServiceRunning() detects a stale PID.
 * Logs what was cleaned at INFO level for visibility without alarming users.
 *
 * Based on daemon lifecycle research: always auto-clean and restart - never prompt.
 * The two-call bug (user must run daemon start twice after crash) is a UX failure.
 */
function cleanupStaleArtifacts(): void {
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
		// Ignore unlink errors
	}

	try {
		if (existsSync(socketPath)) {
			unlinkSync(socketPath);
			cleaned.push("socket");
		}
	} catch {
		// Ignore unlink errors
	}

	try {
		if (existsSync(readyPath)) {
			unlinkSync(readyPath);
			cleaned.push("ready marker");
		}
	} catch {
		// Ignore unlink errors
	}

	if (cleaned.length > 0) {
		process.stderr.write(`[vreko] Cleaned up stale daemon artifacts: ${cleaned.join(", ")}\n`);
	}
}

/**
 * Check if the local service is running by reading its PID file
 * and verifying the process is alive.
 *
 * If the PID file exists but the process is not running (stale PID),
 * automatically cleans up stale artifacts to prevent user-stuck issues.
 *
 * Uses kill(pid, 0) as the primary check (O(1), authoritative).
 * For full health check including socket probe, use isServiceHealthy().
 */
export function isServiceRunning(): boolean {
	const pidPath = getServicePidPath();
	if (!existsSync(pidPath)) {
		return false;
	}

	try {
		const pid = Number.parseInt(readFileSync(pidPath, "utf-8").trim(), 10);
		if (Number.isNaN(pid)) {
			// Corrupted PID file - clean up
			cleanupStaleArtifacts();
			return false;
		}
		// Signal 0 checks if process exists without killing it
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// ESRCH (No such process) means stale PID - auto-clean
		// Other errors (EACCES, etc.) don't indicate stale state
		if ((error as NodeJS.ErrnoException).code === "ESRCH") {
			cleanupStaleArtifacts();
		}
		return false;
	}
}

/**
 * Full health check including a real IPC handshake to detect hung-but-alive processes.
 * Use this when you need to verify the daemon is actually able to accept requests,
 * not just that the process exists.
 *
 * Returns true if process exists AND the daemon answers a health ping.
 */
export async function isServiceHealthy(): Promise<boolean> {
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
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ESRCH") {
				cleanupStaleArtifacts();
				return false;
			}

			// EPERM/EACCES can occur in environments where pid probes are
			// restricted even though the daemon is healthy. Fall through to the
			// IPC probe, which is the authoritative readiness signal.
		}

		const client = new VrekoLocalClient({
			socketPath: getServiceSocketPath(),
			timeout: 5000,
			autoReconnect: false,
		});

		try {
			await client.connect();
			await client.initialize({
				protocolVersion: "1.0.0",
				clientInfo: { name: "vreko-cli", version: "1.0.0" },
				capabilities: { notifications: false },
			});
			await client.health.ping();
			return true;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ECONNREFUSED" || code === "ENOENT") {
				process.stderr.write(
					"[vreko] Daemon process exists but socket not accepting connections (likely hung)\n",
				);
			}
			return false;
		} finally {
			client.close();
		}
	} catch {
		return false;
	}
}

/**
 * Read the service PID from the PID file.
 * Returns null if the file doesn't exist or is unreadable.
 */
export function readServicePid(): number | null {
	const pidPath = getServicePidPath();
	try {
		const content = readFileSync(pidPath, "utf-8").trim();
		const pid = Number.parseInt(content, 10);
		return Number.isNaN(pid) ? null : pid;
	} catch {
		return null;
	}
}

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Create a VrekoLocalClient configured for CLI one-shot use.
 *
 * Does NOT connect  -  call `client.connect()` and `client.initialize()`
 * before making requests, and `client.close()` when done.
 *
 * @example
 * ```ts
 * const client = createServiceClient();
 * await connectServiceClient(client);
 * const status = await client.daemon.status();
 * client.close();
 * ```
 */
export function createServiceClient(): VrekoLocalClient {
	return new VrekoLocalClient({
		timeout: 30_000,
		autoReconnect: false, // CLI is one-shot, no reconnect needed
	});
}

/**
 * Connect and initialize a service client.
 * Convenience function for the common connect+initialize pattern.
 */
export async function connectServiceClient(client: VrekoLocalClient): Promise<void> {
	await client.connect();
	await client.initialize({
		protocolVersion: "1.0.0",
		clientInfo: { name: "vreko-cli", version: "1.0.0" },
		capabilities: { notifications: false },
	});
}

// =============================================================================
// LEARNING IPC METHODS (Day 5: daemon-first architecture)
// =============================================================================

/**
 * Learning prune result from daemon
 */
export interface DaemonPruneResult {
	pruned: number;
	remaining: number;
	archived?: number;
}

/**
 * Learning GC result from daemon
 */
export interface DaemonGcResult {
	operation: string;
	dryRun: boolean;
	archived: number;
	deleted: number;
	remaining: number;
}

/**
 * Learning list result from daemon
 */
export interface DaemonLearningListResult {
	learnings: Array<{
		type: string;
		trigger: string;
		action: string;
		relevanceScore?: number;
	}>;
	total: number;
}

/**
 * Prune stale learnings via daemon IPC.
 * Day 5: Replaces direct StateStore usage in learning-pruner.ts
 */
export async function pruneLearningsViaDaemon(
	workspaceRoot: string,
	client: VrekoLocalClient,
): Promise<{ success: boolean; result?: DaemonPruneResult; error?: string }> {
	try {
		const result = await client.learning.prune({ workspace: workspaceRoot });
		return { success: true, result };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * Run learning garbage collection via daemon IPC.
 */
export async function gcLearningsViaDaemon(
	workspaceRoot: string,
	client: VrekoLocalClient,
	options?: { operation?: string; dryRun?: boolean },
): Promise<{ success: boolean; result?: DaemonGcResult; error?: string }> {
	try {
		const result = await client.call("learning/gc", {
			workspace: workspaceRoot,
			operation: (options?.operation ?? "all") as "all" | "stale" | "orphaned" | undefined,
			dryRun: options?.dryRun ?? true,
		});
		return { success: true, result: result as DaemonGcResult };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * List learnings via daemon IPC.
 */
export async function listLearningsViaDaemon(
	workspaceRoot: string,
	client: VrekoLocalClient,
	limit?: number,
): Promise<{ success: boolean; result?: DaemonLearningListResult; error?: string }> {
	try {
		const result = await client.learning.list({ workspace: workspaceRoot, limit: limit ?? 50 });
		return { success: true, result };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * Search learnings via daemon IPC.
 */
export async function searchLearningsViaDaemon(
	workspaceRoot: string,
	client: VrekoLocalClient,
	keywords: string[],
	limit?: number,
): Promise<{ success: boolean; result?: DaemonLearningListResult; error?: string }> {
	try {
		const result = await client.learning.search({
			workspace: workspaceRoot,
			keywords,
			limit: limit ?? 10,
		});
		return { success: true, result };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

// =============================================================================
// SESSION IPC METHODS (Day 5: daemon-first architecture)
// =============================================================================

/**
 * Session result from daemon
 */
export interface DaemonSessionResult {
	id: string;
	name?: string;
	workspacePath?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
	lastActivityAt: string;
}

/**
 * Create session via daemon IPC.
 */
export async function createSessionViaDaemon(
	client: VrekoLocalClient,
	params?: { name?: string; workspacePath?: string; metadata?: Record<string, unknown> },
): Promise<{ success: boolean; result?: DaemonSessionResult; error?: string }> {
	try {
		// workspacePath! preserves the runtime semantics of the original raw call:
		// when params?.workspacePath is undefined the daemon receives undefined (same
		// as before); the typed method signature requires string but the previous
		// untyped client.call() passed undefined unchanged.
		const session = await client.session.start({
			workspacePath: params?.workspacePath!,
			metadata: params?.metadata as { editorName?: string; editorVersion?: string } | undefined,
		});
		return {
			success: true,
			result: {
				id: session.id,
				name: (session as { name?: string }).name,
				workspacePath: session.workspacePath,
				metadata: session.metadata,
				createdAt: session.startedAt,
				lastActivityAt: session.lastActivityAt,
			},
		};
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * End session via daemon IPC.
 */
export async function endSessionViaDaemon(
	client: VrekoLocalClient,
	sessionId: string,
	workspacePath: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await client.call("session/end-daemon", { sessionId, workspacePath });
		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * Get session status via daemon IPC.
 */
export async function getSessionStatusViaDaemon(
	client: VrekoLocalClient,
	sessionId: string,
	workspacePath: string,
): Promise<{ success: boolean; result?: DaemonSessionResult; error?: string }> {
	try {
		const result = await client.call("session/status", { sessionId, workspacePath });
		return { success: true, result: result as DaemonSessionResult };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

// =============================================================================
// DISPLAY UTILITIES
// =============================================================================
// Migrated from platform.ts during daemon merge cleanup.

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
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

/**
 * Format bytes in human-readable form
 */
export function formatBytes(bytes: number): string {
	const units = ["B", "KB", "MB", "GB"];
	let unitIndex = 0;
	let value = bytes;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	return `${value.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Get the daemon log file path (~/.vreko/daemon/daemon.log)
 */
export function getLogPath(): string {
	return join(homedir(), ".vreko", "daemon", "daemon.log");
}

// =============================================================================
// BACKWARD COMPATIBILITY ALIASES
// =============================================================================
// These preserve the old function names from platform.ts during migration.

export { isServiceRunning as isDaemonRunning };
export { getServiceSocketPath as getSocketPath };
export { getServicePidPath as getPidPath };

// =============================================================================
// VERSION DETECTION & HEALTH CHECK
// =============================================================================

/**
 * Daemon generation identifier
 * Gen1 (legacy) - removed, only Gen2 supported
 */
export const DAEMON_GENERATION = 2;

/**
 * Get daemon version info for health checks
 */
export function getDaemonVersion(): { generation: number; version: string } {
	return {
		generation: DAEMON_GENERATION,
		version: "2.0.0", // Should match local-service package.json version
	};
}
