/**
 * ACP Handler Types
 *
 * Protocol message schemas and types for ACP handlers.
 * Uses Zod for runtime validation.
 *
 * @module acp/handlers/types
 */

import { z } from "zod";

// =============================================================================
// INITIALIZE
// =============================================================================

export const InitializeParamsSchema = z.object({
	clientInfo: z.object({
		name: z.string(),
		version: z.string(),
	}),
	workspacePath: z.string().optional(),
	capabilities: z
		.object({
			streaming: z.boolean().optional(),
			progress: z.boolean().optional(),
		})
		.optional(),
});

export type InitializeParams = z.infer<typeof InitializeParamsSchema>;

export interface InitializeResult {
	serverInfo: {
		name: string;
		version: string;
	};
	capabilities: {
		tools: ToolDefinition[];
		sessions: boolean;
		streaming: boolean;
	};
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export const SessionCreateParamsSchema = z.object({
	name: z.string().optional(),
	workspacePath: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export type SessionCreateParams = z.infer<typeof SessionCreateParamsSchema>;

export interface SessionCreateResult {
	sessionId: string;
	createdAt: string;
}

export const SessionCloseParamsSchema = z.object({
	sessionId: z.string(),
});

export type SessionCloseParams = z.infer<typeof SessionCloseParamsSchema>;

// =============================================================================
// TOOLS
// =============================================================================

export interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
}

export const ToolCallParamsSchema = z.object({
	sessionId: z.string().optional(),
	name: z.string(),
	arguments: z.record(z.unknown()),
});

export type ToolCallParams = z.infer<typeof ToolCallParamsSchema>;

export interface ToolCallResult {
	content: Array<{ type: "text"; text: string } | { type: "json"; json: unknown }>;
	isError: boolean;
}

// =============================================================================
// TOOL CONTEXT
// =============================================================================

export interface ToolContext {
	sessionId?: string;
	workspacePath?: string;
	auditLogger: AuditLoggerInterface;
}

export interface AuditLoggerInterface {
	log(method: string, params?: unknown, sessionId?: string): void;
	close(): Promise<void>;
}

// =============================================================================
// TOOL HANDLER TYPE
// =============================================================================

export type ToolHandler = (params: Record<string, unknown>, context: ToolContext) => Promise<ToolCallResult>;
