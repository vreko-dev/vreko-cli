/**
 * ACP Transport Types
 *
 * JSON-RPC 2.0 message types for the Agent Communication Protocol.
 *
 * @module acp/transport/types
 */

// =============================================================================
// JSON-RPC MESSAGE TYPES
// =============================================================================

export interface JsonRpcRequest {
	jsonrpc: "2.0";
	id: string | number;
	method: string;
	params?: unknown;
}

export interface JsonRpcResponse {
	jsonrpc: "2.0";
	id: string | number;
	result?: unknown;
	error?: JsonRpcError;
}

export interface JsonRpcNotification {
	jsonrpc: "2.0";
	method: string;
	params?: unknown;
}

export interface JsonRpcError {
	code: number;
	message: string;
	data?: unknown;
}

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Standard JSON-RPC error codes plus ACP-specific extensions.
 */
export const ErrorCodes = {
	// Standard JSON-RPC errors
	ParseError: -32700,
	InvalidRequest: -32600,
	MethodNotFound: -32601,
	InvalidParams: -32602,
	InternalError: -32603,

	// ACP-specific error codes (reserved range: -32000 to -32099)
	SessionNotFound: -32001,
	ToolNotFound: -32002,
	PermissionDenied: -32003,
	OperationFailed: -32004,
	WorkspaceNotInitialized: -32005,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isJsonRpcRequest(message: unknown): message is JsonRpcRequest {
	if (typeof message !== "object" || message === null) {
		return false;
	}
	const msg = message as Record<string, unknown>;
	return msg.jsonrpc === "2.0" && "id" in msg && typeof msg.method === "string";
}

export function isJsonRpcNotification(message: unknown): message is JsonRpcNotification {
	if (typeof message !== "object" || message === null) {
		return false;
	}
	const msg = message as Record<string, unknown>;
	return msg.jsonrpc === "2.0" && !("id" in msg) && typeof msg.method === "string";
}
