/**
 * ACP Server
 *
 * Main server implementation for the Agent Communication Protocol.
 * Handles JSON-RPC messages over stdin/stdout with Content-Length framing.
 *
 * @module acp/server
 */

import { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
import { AuditLogger, NoOpAuditLogger } from "./audit/logger";
import {
	type AuditLoggerInterface,
	InitializeParamsSchema,
	type InitializeResult,
	SessionCloseParamsSchema,
	SessionCreateParamsSchema,
	ToolCallParamsSchema,
} from "./handlers/types";
import { SessionManager } from "./session/manager";
import { toolHandlers, toolRegistry } from "./tools";
import {
	ContentLengthFramer,
	ErrorCodes,
	type JsonRpcNotification,
	type JsonRpcRequest,
	type JsonRpcResponse,
} from "./transport";

// =============================================================================
// TYPES
// =============================================================================

export interface ACPServerOptions {
	workspacePath?: string;
	auditPath?: string;
	verbose?: boolean;
}

// =============================================================================
// ACP ERROR
// =============================================================================

export class ACPError extends Error {
	constructor(
		public readonly code: number,
		message: string,
		public readonly data?: unknown,
	) {
		super(message);
		this.name = "ACPError";
	}
}

// =============================================================================
// ACP SERVER
// =============================================================================

export class ACPServer extends EventEmitter {
	private readonly framer = new ContentLengthFramer();
	private readonly sessionManager: SessionManager;
	private readonly auditLogger: AuditLoggerInterface;
	private readonly verbose: boolean;

	private input: Readable | null = null;
	private output: Writable | null = null;
	private initialized = false;
	private shuttingDown = false;
	private workspacePath?: string;
	private version = "1.0.0";

	constructor(options: ACPServerOptions) {
		super();
		this.workspacePath = options.workspacePath;
		this.verbose = options.verbose ?? false;

		// Create session manager with logging
		this.sessionManager = new SessionManager(this.verbose ? (msg, data) => this.log("info", msg, data) : undefined);

		// Create audit logger (no-op if no path specified)
		this.auditLogger = options.auditPath ? new AuditLogger(options.auditPath) : new NoOpAuditLogger();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Lifecycle
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Start the ACP server on the given input/output streams.
	 */
	start(input: Readable, output: Writable): void {
		this.input = input;
		this.output = output;

		this.input.setEncoding("utf8");
		this.input.on("data", (chunk: string) => {
			this.handleInput(chunk);
		});

		this.input.on("end", () => {
			this.shutdown();
		});

		this.input.on("error", (error) => {
			this.log("error", "Input stream error", { error: error.message });
			this.shutdown();
		});

		this.log("info", "ACP server started");
	}

	/**
	 * Shutdown the ACP server.
	 */
	async shutdown(): Promise<void> {
		if (this.shuttingDown) {
			return;
		}
		this.shuttingDown = true;

		this.log("info", "Shutting down ACP server");

		await this.sessionManager.closeAll();
		await this.auditLogger.close();

		this.emit("shutdown");
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Message Handling
	// ─────────────────────────────────────────────────────────────────────────

	private handleInput(data: string): void {
		const messages = this.framer.feed(data);

		for (const { payload } of messages) {
			try {
				const message = JSON.parse(payload);
				this.handleMessage(message).catch((error) => {
					this.log("error", "Unhandled error in message handler", { error: String(error) });
				});
			} catch {
				this.sendError(null, ErrorCodes.ParseError, "Parse error");
			}
		}
	}

	private async handleMessage(message: JsonRpcRequest | JsonRpcNotification): Promise<void> {
		const isRequest = "id" in message;
		const id = isRequest ? (message as JsonRpcRequest).id : null;

		try {
			const result = await this.dispatch(message.method, message.params);

			if (isRequest && id !== null) {
				this.sendResult(id, result);
			}
		} catch (error) {
			if (isRequest && id !== null) {
				if (error instanceof ACPError) {
					this.sendError(id, error.code, error.message, error.data);
				} else {
					this.sendError(
						id,
						ErrorCodes.InternalError,
						error instanceof Error ? error.message : "Internal error",
					);
				}
			}
		}
	}

	private async dispatch(method: string, params?: unknown): Promise<unknown> {
		// Pre-initialization: only allow initialize
		if (!this.initialized && method !== "initialize") {
			throw new ACPError(ErrorCodes.InvalidRequest, "Server not initialized");
		}

		this.log("debug", `Dispatching: ${method}`);
		this.auditLogger.log(method, params);

		switch (method) {
			case "initialize":
				return this.handleInitialize(params);

			case "shutdown":
				return this.handleShutdown();

			case "session/create":
				return this.handleSessionCreate(params);

			case "session/close":
				return this.handleSessionClose(params);

			case "tools/list":
				return this.handleToolsList();

			case "tools/call":
				return this.handleToolCall(params);

			default:
				throw new ACPError(ErrorCodes.MethodNotFound, `Unknown method: ${method}`);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Protocol Handlers
	// ─────────────────────────────────────────────────────────────────────────

	private async handleInitialize(params: unknown): Promise<InitializeResult> {
		if (this.initialized) {
			throw new ACPError(ErrorCodes.InvalidRequest, "Already initialized");
		}

		const validated = InitializeParamsSchema.parse(params);
		this.log("info", `Initializing for ${validated.clientInfo.name} v${validated.clientInfo.version}`);

		if (validated.workspacePath) {
			this.workspacePath = validated.workspacePath;
		}

		this.initialized = true;

		return {
			serverInfo: {
				name: "vreko",
				version: this.version,
			},
			capabilities: {
				tools: toolRegistry,
				sessions: true,
				streaming: false,
			},
		};
	}

	private async handleShutdown(): Promise<{ success: true }> {
		this.log("info", "Shutdown requested");
		await this.shutdown();
		return { success: true };
	}

	private async handleSessionCreate(params: unknown): Promise<{ sessionId: string; createdAt: string }> {
		const validated = SessionCreateParamsSchema.parse(params);

		const session = await this.sessionManager.create({
			name: validated.name,
			workspacePath: validated.workspacePath || this.workspacePath,
			metadata: validated.metadata,
		});

		return {
			sessionId: session.id,
			createdAt: session.createdAt.toISOString(),
		};
	}

	private async handleSessionClose(params: unknown): Promise<{ success: boolean }> {
		const validated = SessionCloseParamsSchema.parse(params);
		const success = await this.sessionManager.close(validated.sessionId);

		if (!success) {
			throw new ACPError(ErrorCodes.SessionNotFound, "Session not found");
		}

		return { success: true };
	}

	private handleToolsList(): { tools: typeof toolRegistry } {
		return { tools: toolRegistry };
	}

	private async handleToolCall(params: unknown): Promise<unknown> {
		const validated = ToolCallParamsSchema.parse(params);
		const handler = toolHandlers[validated.name];

		if (!handler) {
			throw new ACPError(ErrorCodes.ToolNotFound, `Unknown tool: ${validated.name}`);
		}

		const session = validated.sessionId ? this.sessionManager.get(validated.sessionId) : null;

		const context = {
			sessionId: validated.sessionId,
			workspacePath: session?.workspacePath || this.workspacePath,
			auditLogger: this.auditLogger,
		};

		return handler(validated.arguments, context);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Response Helpers
	// ─────────────────────────────────────────────────────────────────────────

	private send(message: JsonRpcResponse | JsonRpcNotification): void {
		if (!this.output) {
			return;
		}

		const payload = JSON.stringify(message);
		const framed = ContentLengthFramer.frame(payload);
		this.output.write(framed);
	}

	private sendResult(id: string | number, result: unknown): void {
		this.send({ jsonrpc: "2.0", id, result });
	}

	private sendError(id: string | number | null, code: number, message: string, data?: unknown): void {
		if (id === null) {
			this.log("error", `Error in notification: ${message}`, { code, data });
			return;
		}

		this.send({
			jsonrpc: "2.0",
			id,
			error: { code, message, data },
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Logging
	// ─────────────────────────────────────────────────────────────────────────

	private log(level: "debug" | "info" | "error", message: string, data?: Record<string, unknown>): void {
		if (level === "debug" && !this.verbose) {
			return;
		}

		// Log to stderr so it doesn't interfere with JSON-RPC on stdout
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [ACP] [${level.toUpperCase()}]`;
		const dataStr = data ? ` ${JSON.stringify(data)}` : "";
		process.stderr.write(`${prefix} ${message}${dataStr}\n`);
	}
}
