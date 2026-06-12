/**
 * ACP Audit Logger
 *
 * Provides audit trail logging for ACP operations.
 * Logs are written to ~/.vreko/audit/acp.jsonl in JSON Lines format.
 *
 * @module acp/audit/logger
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AuditLoggerInterface } from "../handlers/types";

// =============================================================================
// TYPES
// =============================================================================

export interface AuditEntry {
	timestamp: string;
	method: string;
	params?: unknown;
	sessionId?: string;
}

// =============================================================================
// AUDIT LOGGER
// =============================================================================

/**
 * AuditLogger writes audit trail entries to a JSON Lines file.
 *
 * This provides a tamper-evident log of all ACP operations for
 * debugging, compliance, and forensic purposes.
 */
export class AuditLogger implements AuditLoggerInterface {
	private stream: fs.WriteStream | null = null;
	private readonly logPath: string;
	private initError: Error | null = null;

	constructor(logPath?: string) {
		this.logPath = logPath || path.join(os.homedir(), ".vreko", "audit", "acp.jsonl");

		try {
			// Ensure directory exists
			const dir = path.dirname(this.logPath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			this.stream = fs.createWriteStream(this.logPath, { flags: "a" });

			// Handle stream errors gracefully
			this.stream.on("error", (error) => {
				this.initError = error;
				this.stream = null;
			});
		} catch (error) {
			this.initError = error instanceof Error ? error : new Error(String(error));
		}
	}

	/**
	 * Log an audit entry.
	 */
	log(method: string, params?: unknown, sessionId?: string): void {
		if (!this.stream) {
			return;
		}

		const entry: AuditEntry = {
			timestamp: new Date().toISOString(),
			method,
			params: this.sanitizeParams(params),
			sessionId,
		};

		try {
			this.stream.write(`${JSON.stringify(entry)}\n`);
		} catch {
			// Silently fail - audit logging should not break the server
		}
	}

	/**
	 * Sanitize params to remove sensitive data before logging.
	 */
	private sanitizeParams(params: unknown): unknown {
		if (params === undefined || params === null) {
			return undefined;
		}

		if (typeof params !== "object") {
			return params;
		}

		// For arrays, recursively sanitize each element
		if (Array.isArray(params)) {
			return params.map((item) => this.sanitizeParams(item));
		}

		// For objects, redact sensitive fields
		const sanitized: Record<string, unknown> = {};
		const sensitiveKeys = ["password", "token", "secret", "apiKey", "credentials"];

		for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
			if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
				sanitized[key] = "[REDACTED]";
			} else if (typeof value === "object" && value !== null) {
				sanitized[key] = this.sanitizeParams(value);
			} else {
				sanitized[key] = value;
			}
		}

		return sanitized;
	}

	/**
	 * Close the audit logger.
	 */
	async close(): Promise<void> {
		return new Promise((resolve) => {
			if (this.stream) {
				this.stream.end(() => {
					this.stream = null;
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Get the log file path.
	 */
	get path(): string {
		return this.logPath;
	}

	/**
	 * Check if the logger is active.
	 */
	get isActive(): boolean {
		return this.stream !== null;
	}

	/**
	 * Get any initialization error.
	 */
	get error(): Error | null {
		return this.initError;
	}
}

// =============================================================================
// NO-OP LOGGER
// =============================================================================

/**
 * NoOpAuditLogger is a no-op implementation for testing or when audit logging is disabled.
 */
export class NoOpAuditLogger implements AuditLoggerInterface {
	log(_method: string, _params?: unknown, _sessionId?: string): void {
		// No-op
	}

	async close(): Promise<void> {
		// No-op
	}
}
