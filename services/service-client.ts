/**
 * Daemon Client Service
 *
 * Manages connection to the Vreko local service daemon (vrekod).
 * All intelligence operations are proxied through the daemon for IP protection.
 *
 * ## Architecture
 *
 * ```
 * CLI Commands
 *     ↓
 * DaemonClientService (this file)
 *     ↓
 * @vreko/local-service-client (IPC client)
 *     ↓
 * vrekod daemon (Unix socket / named pipe)
 *     ↓
 * @vreko/intelligence (runs in daemon process)
 * ```
 *
 * ## IP Protection
 *
 * - CLI has NO direct imports of @vreko/intelligence
 * - All intelligence code runs in the daemon process
 * - CLI only has types from @vreko/contracts and local-service-client
 *
 * ## Canonical Daemon Connection Patterns
 *
 * **For commands that require the daemon:**
 * - Use `withDaemon(command, fn)` - exits with code 1 on failure
 * - Always calls `renderDegradedState()` for consistent error messaging
 * - No inline daemon-unavailable messaging allowed
 *
 * **For commands with graceful degraded mode:**
 * - Use `withDaemonOptional(command, fn)` - does not exit on failure
 * - Callback receives `client | null` to handle degraded state
 * - Surfaces clear "limited mode" indicator to user
 *
 * **Do NOT use:**
 * - `requireDaemon()` - deprecated, replaced by withDaemon/withDaemonOptional
 * - Inline error handling for daemon unavailability
 *
 * @module services/service-client
 */

// Version is inlined at build time by tsup's define option
// This avoids runtime package.json resolution issues in bundled output
declare const __CLI_VERSION__: string | undefined;

import { VrekoLocalClient } from "@vreko/local-service-client";
import { isServiceHealthy } from "../service-adapter/local-service-adapter.js";
import { type DegradedStateOptions, renderDegradedState } from "../ui/degraded-state.js";

// Use build-time version if available, otherwise fall back to package.json
// This supports both production builds (tsup defines __CLI_VERSION__) and dev (tsx)
let version = "0.0.0";
if (typeof __CLI_VERSION__ !== "undefined") {
	version = __CLI_VERSION__;
} else {
	try {
		// Dynamic import for dev mode - works with tsx
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pkg = require("../../package.json") as { version: string };
		version = pkg.version ?? "0.0.0";
	} catch {
		// Fallback if package.json can't be loaded
		version = "0.0.0-dev";
	}
}

// =============================================================================
// TYPES
// =============================================================================

export interface DaemonStatus {
	connected: boolean;
	version?: string;
	uptime?: number;
}

export interface DaemonClientOptions {
	/** Socket path for IPC (default: OS-specific) */
	socketPath?: string;
	/** Auto-reconnect on disconnect */
	autoReconnect?: boolean;
	/**
	 * Connection probe timeout hint (ms). Accepted but not forwarded to
	 * VrekoLocalClient - per DAEMON-06, the 5s probe hint must not become
	 * the per-request RPC timeout. Reserved for a future probe mechanism.
	 */
	timeout?: number;
}

// =============================================================================
// SINGLETON CLIENT
// =============================================================================

let client: VrekoLocalClient | null = null;
let connectionPromise: Promise<void> | null = null;

/**
 * Get or create the daemon client
 *
 * @param options - Client options
 * @returns The daemon client instance
 */
export function getDaemonClient(options: DaemonClientOptions = {}): VrekoLocalClient {
	if (!client) {
		client = new VrekoLocalClient({
			socketPath: options.socketPath,
			// DAEMON-06: No timeout forwarded. IpcConnection hardcodes its own 5s connect
			// timeout (client.ts:140). Per-request RPC timeout defaults to 30s from
			// VrekoLocalClient constructor - unverified against large-repo cold-start
			// (workspace/analyze on next.js/shadcn). If hero-capture runs hit this ceiling,
			// VrekoLocalClient.call() needs a per-request timeout override.
			autoReconnect: options.autoReconnect ?? true,
		});
	}
	return client;
}

/**
 * Connect to the daemon
 *
 * @param options - Connection options
 * @throws If connection fails
 */
export async function connectToDaemon(options: DaemonClientOptions = {}): Promise<VrekoLocalClient> {
	const daemonClient = getDaemonClient(options);

	// Avoid duplicate connection attempts
	if (connectionPromise) {
		await connectionPromise;
		return daemonClient;
	}

	if (daemonClient.isConnected()) {
		return daemonClient;
	}

	connectionPromise = (async () => {
		await daemonClient.connect();

		// Initialize protocol
		await daemonClient.initialize({
			protocolVersion: "1.0.0",
			clientInfo: {
				name: "@vreko/cli",
				version,
			},
		});
	})();

	try {
		await connectionPromise;
	} finally {
		connectionPromise = null;
	}

	return daemonClient;
}

/**
 * Check if daemon is connected
 */
export function isDaemonConnected(): boolean {
	return client?.isConnected() ?? false;
}

/**
 * Check if daemon is available (try to connect)
 *
 * @returns true if daemon is running and accessible
 */
export async function isDaemonAvailable(): Promise<boolean> {
	try {
		await connectToDaemon();
		return true;
	} catch {
		return false;
	}
}

/**
 * Get daemon status
 */
export async function getDaemonStatus(): Promise<DaemonStatus> {
	if (!isDaemonConnected()) {
		return { connected: false };
	}

	try {
		const daemonClient = getDaemonClient();
		const health = await daemonClient.health.check();
		return {
			connected: true,
			version: health.version,
			uptime: health.uptime,
		};
	} catch {
		return { connected: false };
	}
}

/**
 * Disconnect from the daemon
 */
export function disconnectFromDaemon(): void {
	if (client) {
		client.close();
		client = null;
	}
}

/**
 * Canonical wrapper for commands that require daemon connectivity.
 *
 * Rules:
 * - withDaemon() always calls renderDegradedState() on failure  -  never logs inline
 * - withDaemon() always exits with code 1 on failure  -  no silent degradation
 * - withDaemon() accepts the command name string for telemetry attribution
 *
 * @param command - Command name for telemetry attribution
 * @param fn - Function to execute with daemon client
 * @param opts - Optional degradation reason
 * @returns Result from fn, or never exits on failure
 */
export async function withDaemon<T>(
	command: string,
	fn: (client: VrekoLocalClient) => Promise<T>,
	opts?: { reason?: DegradedStateOptions["reason"] },
): Promise<T | never> {
	// DAEMON-03: pre-flight socket probe  -  catches zombie daemon (PID alive, socket dead).
	// isServiceHealthy() is async; the missing-await form would be silently truthy (Pitfall 4).
	const healthy = await isServiceHealthy();
	if (!healthy) {
		renderDegradedState({ command, reason: opts?.reason ?? "unreachable" });
		process.exit(1);
	}

	let client: VrekoLocalClient | null = null;

	try {
		client = await connectToDaemon();
		await client.health.check();
	} catch {
		renderDegradedState({ command, reason: opts?.reason ?? "unreachable" });
		process.exit(1);
	}

	return fn(client);
}

/**
 * Canonical wrapper for commands with graceful offline mode.
 *
 * Some commands can show partial data without the daemon. These use a different
 * wrapper that does not exit on failure but surfaces a clear "limited mode" indicator.
 *
 * Rules:
 * - withDaemonOptional() does not exit on failure
 * - withDaemonOptional() surfaces a clear "limited mode" indicator
 * - withDaemonOptional() accepts client | null in the callback function
 *
 * @param command - Command name for telemetry attribution
 * @param fn - Function to execute with daemon client (may receive null)
 * @returns Result from fn
 */
export async function withDaemonOptional<T>(
	command: string,
	fn: (client: VrekoLocalClient | null) => Promise<T>,
): Promise<T> {
	let client: VrekoLocalClient | null = null;

	try {
		client = await connectToDaemon();
		await client.health.check();
	} catch (_error) {
		void _error;
		client = null;
	}

	return fn(client);
}
