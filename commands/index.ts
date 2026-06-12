/**
 * Commands Index
 *
 * @fileoverview Exports all CLI commands for easy registration.
 *
 * ## Command Categories
 *
 * ### Authentication
 * - `createLoginCommand()` - OAuth login flow
 * - `createLogoutCommand()` - Clear credentials
 * - `createWhoamiCommand()` - Show current user
 *
 * ### Workspace Management
 * - `createInitCommand()` - Initialize .vreko/ directory
 * - `createStatusCommand()` - Show workspace status
 * - `createFixCommand()` - Fix common issues
 *
 * ### Intelligence (CLI-UX-005)
 * - `createContextCommand()` - Get context before work
 * - `createValidateCommand()` - Run validation pipeline
 * - `createStatsCommand()` - Show learning statistics
 *
 * ### Learning System
 * - `createLearnCommand()` - Record learnings
 * - `createPatternsCommand()` - Manage patterns and violations
 *
 * ### Protection
 * - `createProtectCommand()` - Configure file protection
 * - `createSessionCommand()` - Manage coding sessions
 * - `createWatchCommand()` - Continuous file watching
 *
 * ### MCP Integration
 * - `createToolsCommand()` - Configure MCP tools
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   createContextCommand,
 *   createValidateCommand,
 *   createStatsCommand,
 *   // ... other commands
 * } from "./commands";
 *
 * program.addCommand(createContextCommand());
 * program.addCommand(createValidateCommand());
 * program.addCommand(createStatsCommand());
 * ```
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module commands
 */

// =============================================================================
// AUTHENTICATION COMMANDS
// =============================================================================

export {
	createLoginCommand,
	createLogoutCommand,
	createSetKeyCommand,
	createWhoamiCommand,
	createWorkspacesCommand,
} from "./auth";

// =============================================================================
// WORKSPACE MANAGEMENT COMMANDS
// =============================================================================

export { createAnalyzeCommand } from "./analyze";
export { createClaudeSyncCommand } from "./claude-sync";
export { createFixCommand } from "./fix";
export { createInitCommand } from "./init";
export { createOnboardCommand } from "./onboard";
export { createStatusCommand } from "./status";

// =============================================================================
// SHELL COMPLETIONS
// =============================================================================

/**
 * Completion command - Generate shell completion scripts
 *
 * @example
 * ```bash
 * vreko completion bash
 * vreko completion zsh
 * vreko completion fish
 * ```
 */
export { createCompletionCommand } from "./completion";

// =============================================================================
// INTELLIGENCE COMMANDS (CLI-UX-005)
// =============================================================================
// These commands integrate @vreko/intelligence into the CLI.
// They are the customer-facing equivalents of the internal MCP tools.
//
// @see ai_dev_utils/mcp/server.ts for internal MCP implementation
// @see packages/intelligence/src/Intelligence.ts for the facade

/**
 * Context command - Get relevant context before starting work
 *
 * Equivalent to MCP's `codebase.start_task()` tool.
 *
 * @example
 * ```bash
 * vreko context "add authentication" --keywords auth session
 * ```
 */
export { createContextCommand } from "./context";
/**
 * Stats command - Show learning engine statistics
 *
 * Equivalent to MCP's `codebase.get_learning_stats()` tool.
 *
 * @example
 * ```bash
 * vreko stats
 * vreko stats --json
 * ```
 */
export { createStatsCommand } from "./stats";
/**
 * Validate command - Run 7-layer validation pipeline
 *
 * Equivalent to MCP's `codebase.validate_code()` tool.
 *
 * @example
 * ```bash
 * vreko validate src/auth.ts
 * vreko validate --all  # All staged files
 * ```
 */
export { createValidateCommand } from "./validate";

// =============================================================================
// MOMENTUM SCORING COMMANDS
// =============================================================================
// These commands support the momentum scoring system for identifying critical files.
//
// @see docs/roadmap/onboard_momentum.md for specification
// @see packages/intelligence/src/momentum/ for core algorithms

/**
 * Metrics command - Show momentum scores for files
 *
 * @example
 * ```bash
 * vreko metrics
 * vreko metrics src/auth.ts
 * vreko metrics --all
 * ```
 */
export { createMetricsCommand } from "./metrics";
/**
 * Refresh command - Incrementally update momentum signals
 *
 * @example
 * ```bash
 * vreko refresh
 * vreko refresh --since HEAD~5
 * ```
 */
export { createRefreshCommand } from "./refresh";
/**
 * Sync command - Collect signals and fit momentum scoring normalizers
 *
 * @example
 * ```bash
 * vreko sync
 * vreko sync --quick
 * ```
 */
export { createSyncCommand } from "./sync";

// =============================================================================
// LEARNING SYSTEM COMMANDS
// =============================================================================

export { createConsolidateCommand } from "./consolidate";
export { createLearnCommand } from "./learn";
export { createPatternsCommand } from "./patterns";
/**
 * Pulse command - Mid-session intelligence snapshot (advisory, read-only)
 *
 * Used by the Claude Code PreToolUse hook (AMBIENT-06) to fetch fragile-file
 * intelligence before an agent edit. Shares `composeHint` with the MCP
 * `vreko_pulse` tool for consistent advisory text across surfaces.
 *
 * @example
 * ```bash
 * vreko pulse --format json --focus packages/auth/src/session.ts
 * vreko pulse
 * ```
 */
export { createPulseCommand } from "./pulse";
export { createPurgeCommand } from "./purge";

// =============================================================================
// FILE ANALYSIS COMMANDS
// =============================================================================

export { createCheckCommand } from "./check";
export { createInteractiveCommand } from "./interactive";
export { createRiskAnalyzeCommand } from "./risk-analyze";

// =============================================================================
// PROTECTION COMMANDS
// =============================================================================

export { createProtectCommand } from "./protect";
export { createSessionCommand } from "./session";
export { createSnapshotCommand } from "./snapshot";
export { createWatchCommand } from "./watch";

// =============================================================================
// MCP INTEGRATION COMMANDS
// =============================================================================

export { mcpCommand } from "./mcp";
export { createToolsCommand } from "./tools";

// =============================================================================
// HOOKS COMMANDS
// =============================================================================

/**
 * Hooks command  -  install/uninstall/status for AI tool integration hooks.
 *
 * @example
 * ```bash
 * vreko hooks install --tool claude-code
 * vreko hooks uninstall --tool claude-code
 * vreko hooks status
 * ```
 */
export { createHooksCommand, hookStatus, installHook, uninstallHook } from "./hooks";

// =============================================================================
// PROJECTIONS COMMANDS
// =============================================================================

/**
 * Projections command  -  consent-gated pointer injection into AI tool config files.
 *
 * @example
 * ```bash
 * vreko projections docs preview
 * vreko projections docs enable
 * vreko projections docs disable
 * vreko projections docs status
 * ```
 */
export { createProjectionsCommand } from "./projections";

// =============================================================================
// ACP INTEGRATION COMMANDS
// =============================================================================

export { acpCommand, createAcpCommand } from "./acp";

// =============================================================================
// TOP-LEVEL LIFECYCLE COMMANDS
// =============================================================================

export { createVrStartCommand } from "./start.js";
export { createVrStopCommand } from "./stop.js";

// registerDaemonCommands (backward-compat alias stub) is imported directly
// in src/index.ts  -  excluded from re-export here because the stub file
// name contains a reserved brand term.

// =============================================================================
// BASELINE COMMANDS (Phase 5)
// =============================================================================
// These commands manage workspace baselines for intelligence context.
//
// @see docs/daemon_complete_implementation.md Phase 5 specification

/**
 * Baseline command - Manage workspace baselines
 *
 * @example
 * ```bash
 * vreko baseline scan --workspace .
 * vreko baseline status
 * vreko baseline show
 * vreko baseline invalidate
 * ```
 */
export { registerBaselineCommands } from "./baseline";

// =============================================================================
// SERVICE COMMANDS
// =============================================================================
// These commands manage the Vreko local service lifecycle.
// The service provides shared state for multi-client support (CLI, Extension, etc).
//
// @see docs/roadmap/cli/coordination_layer.md for architecture

/**
 * Service command - Manage Vreko local service
 *
 * @example
 * ```bash
 * vreko service start --service
 * vreko service status
 * vreko service stop
 * vreko service logs --follow
 * vreko service install
 * vreko service uninstall
 * ```
 */
export { registerServiceCommands } from "./service";

// =============================================================================
// POLISH COMMANDS (Phase 6)
// =============================================================================
// These commands complete the CLI experience with diagnostics, updates, and config.
//
// @see cli_ui_imp.md Phase 6 specification

/**
 * Alias command - Create command shortcuts
 *
 * @example
 * ```bash
 * vreko alias list
 * vreko alias set st status
 * vreko alias delete st
 * ```
 */
export { createAliasCommand, expandAlias } from "./alias";
/**
 * Config command - Manage CLI configuration
 *
 * @example
 * ```bash
 * vreko config list
 * vreko config get apiUrl
 * vreko config set apiUrl https://api.vreko.dev
 * vreko config path
 * ```
 */
export { createConfigCommand } from "./config";
export { createDiagnosticsCommand } from "./diagnostics";
/**
 * Doctor command - Comprehensive diagnostics
 *
 * @example
 * ```bash
 * vreko doctor
 * vreko doctor --fix
 * vreko doctor --json
 * ```
 */
export { createDoctorCommand } from "./doctor";
/**
 * Intel command  -  expose IntelligenceSnapshot to CLI/agent harnesses.
 *
 * @example
 * ```bash
 * vr intel snapshot
 * vr intel snapshot --json
 * ```
 */
export { registerIntelCommand } from "./intel.js";
/**
 * Undo command - Restore from last destructive operation
 *
 * @example
 * ```bash
 * vreko undo
 * vreko undo --list
 * ```
 */
export { createUndoCommand } from "./undo";
/**
 * Upgrade command - Self-update CLI
 *
 * @example
 * ```bash
 * vreko upgrade
 * vreko upgrade --check
 * vreko upgrade --canary
 * ```
 */
export { createUpgradeCommand } from "./upgrade";
