/**
 * ACP Session Manager
 *
 * Manages session lifecycle for ACP connections.
 *
 * Day 5: Routes session operations through daemon IPC.
 *
 * @module acp/session/manager
 */

import { randomUUID } from "node:crypto";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import {
	connectServiceClient,
	createServiceClient,
	createSessionViaDaemon,
	endSessionViaDaemon,
} from "../../service-adapter/local-service-adapter.js";

// =============================================================================
// TYPES
// =============================================================================

export interface Session {
	id: string;
	name?: string;
	workspacePath?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	lastActivityAt: Date;
}

export interface CreateSessionParams {
	name?: string;
	workspacePath?: string;
	metadata?: Record<string, unknown>;
}

// =============================================================================
// SESSION MANAGER
// =============================================================================

/**
 * SessionManager handles the lifecycle of ACP sessions.
 *
 * Day 5: Routes session operations through daemon IPC.
 * Sessions are lightweight containers that hold context for a sequence
 * of tool calls. They can optionally override the workspace path and
 * carry metadata.
 */
export class SessionManager {
	private sessions = new Map<string, Session>();
	private readonly logFn: (msg: string, data?: Record<string, unknown>) => void;
	private client: VrekoLocalClient | null = null;

	constructor(logFn?: (msg: string, data?: Record<string, unknown>) => void) {
		this.logFn =
			logFn ??
			(() => {
				/* intentionally empty */
			});
	}

	/**
	 * Initialize connection to daemon
	 */
	async initialize(): Promise<void> {
		this.client = createServiceClient();
		await connectServiceClient(this.client);
	}

	/**
	 * Create a new session.
	 * Day 5: Routes through daemon IPC.
	 */
	async create(params: CreateSessionParams): Promise<Session> {
		// Try daemon IPC first
		if (this.client) {
			try {
				const daemonResult = await createSessionViaDaemon(this.client, params);
				if (daemonResult.success && daemonResult.result) {
					const session: Session = {
						id: daemonResult.result.id,
						name: params.name,
						workspacePath: daemonResult.result.workspacePath ?? params.workspacePath,
						metadata: daemonResult.result.metadata,
						createdAt: new Date(daemonResult.result.createdAt),
						lastActivityAt: new Date(daemonResult.result.lastActivityAt),
					};
					this.sessions.set(session.id, session);
					this.logFn("Session created via daemon", { sessionId: session.id, name: session.name });
					return session;
				}
			} catch (error) {
				this.logFn("Daemon session create failed, using local fallback", { error: String(error) });
			}
		}

		// Fallback: local session creation
		const session: Session = {
			id: randomUUID(),
			name: params.name,
			workspacePath: params.workspacePath,
			metadata: params.metadata,
			createdAt: new Date(),
			lastActivityAt: new Date(),
		};

		this.sessions.set(session.id, session);
		this.logFn("Session created locally", { sessionId: session.id, name: session.name });

		return session;
	}

	/**
	 * Get a session by ID.
	 * Updates the lastActivityAt timestamp.
	 */
	get(id: string): Session | undefined {
		const session = this.sessions.get(id);
		if (session) {
			session.lastActivityAt = new Date();
		}
		return session;
	}

	/**
	 * Check if a session exists.
	 */
	has(id: string): boolean {
		return this.sessions.has(id);
	}

	/**
	 * Close a session by ID.
	 * Day 5: Routes through daemon IPC.
	 */
	async close(id: string): Promise<boolean> {
		const existed = this.sessions.has(id);

		// Try daemon IPC
		if (this.client && existed) {
			try {
				const workspacePath = this.sessions.get(id)?.workspacePath;
				if (workspacePath) {
					await endSessionViaDaemon(this.client, id, workspacePath);
				}
			} catch {
				// Continue with local cleanup
			}
		}

		this.sessions.delete(id);

		if (existed) {
			this.logFn("Session closed", { sessionId: id });
		}

		return existed;
	}

	/**
	 * Close all sessions.
	 */
	async closeAll(): Promise<void> {
		const count = this.sessions.size;

		// Close each session via daemon
		if (this.client) {
			const closePromises = Array.from(this.sessions.values()).map((session) => {
				if (!session.workspacePath) {
					return Promise.resolve();
				}
				// biome-ignore lint/style/noNonNullAssertion: this.client checked truthy by enclosing if
				return endSessionViaDaemon(this.client!, session.id, session.workspacePath).catch(() => {
					/* intentionally empty */
				});
			});
			await Promise.all(closePromises);
		}

		this.sessions.clear();
		this.logFn("All sessions closed", { count });
	}

	/**
	 * List all active sessions.
	 */
	list(): Session[] {
		return Array.from(this.sessions.values());
	}

	/**
	 * Get the count of active sessions.
	 */
	get count(): number {
		return this.sessions.size;
	}

	/**
	 * Clean up inactive sessions (idle for longer than timeout).
	 */
	cleanup(maxIdleMs: number = 30 * 60 * 1000): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [id, session] of this.sessions) {
			if (now - session.lastActivityAt.getTime() > maxIdleMs) {
				this.sessions.delete(id);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			this.logFn("Sessions cleaned up", { cleaned, remaining: this.sessions.size });
		}

		return cleaned;
	}
}
