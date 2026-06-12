/**
 * ACP Tool Registry
 *
 * Exports tool definitions and handlers for the ACP server.
 *
 * @module acp/tools
 */

import type { ToolDefinition, ToolHandler } from "../handlers/types";
import { snapshotHandlers, snapshotTools } from "./snapshot";
import { statusHandlers, statusTools } from "./status";

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * All available ACP tools.
 * These mirror MCP tools for consistency.
 */
export const toolRegistry: ToolDefinition[] = [...snapshotTools, ...statusTools];

/**
 * Tool handlers mapped by name.
 */
export const toolHandlers: Record<string, ToolHandler> = {
	// Snapshot operations
	"snapshot.create": snapshotHandlers.create,
	"snapshot.list": snapshotHandlers.list,
	"snapshot.restore": snapshotHandlers.restore,
	"snapshot.diff": snapshotHandlers.diff,

	// Status operations
	"status.protection": statusHandlers.protection,
	"status.health": statusHandlers.health,
};

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { snapshotHandlers, snapshotTools } from "./snapshot";
export { statusHandlers, statusTools } from "./status";
