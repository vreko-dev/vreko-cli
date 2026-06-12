/**
 * ACP Module
 *
 * Agent Communication Protocol implementation for editor integration.
 *
 * @module acp
 */

// Audit
export { type AuditEntry, AuditLogger, NoOpAuditLogger } from "./audit";
// Handlers
export {
	type AuditLoggerInterface,
	type InitializeParams,
	InitializeParamsSchema,
	type InitializeResult,
	type SessionCloseParams,
	SessionCloseParamsSchema,
	type SessionCreateParams,
	SessionCreateParamsSchema,
	type SessionCreateResult,
	type ToolCallParams,
	ToolCallParamsSchema,
	type ToolCallResult,
	type ToolContext,
	type ToolDefinition,
	type ToolHandler,
} from "./handlers";
// Server
export { ACPError, ACPServer, type ACPServerOptions } from "./server";

// Session
export { type CreateSessionParams, type Session, SessionManager } from "./session";
// Tools
export {
	snapshotHandlers,
	snapshotTools,
	statusHandlers,
	statusTools,
	toolHandlers,
	toolRegistry,
} from "./tools";
// Transport
export {
	ContentLengthFramer,
	type ErrorCode,
	ErrorCodes,
	type FramedMessage,
	type JsonRpcError,
	type JsonRpcNotification,
	type JsonRpcRequest,
	type JsonRpcResponse,
} from "./transport";
