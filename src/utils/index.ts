/**
 * CLI Utilities
 *
 * @fileoverview Barrel export for all CLI UX utilities.
 * These utilities implement the CLI-UX-001 through CLI-UX-005 specifications.
 *
 * ## Utility Categories
 *
 * ### Display (CLI-UX-001, CLI-UX-005)
 * - `displayBox()` - Styled boxes for important messages
 * - `displaySaveStory()` - Pioneer Program save story boxes
 * - `displaySnapshotSuccess()` - Snapshot creation success
 * - `displayHighRiskWarning()` - High risk detection warning
 * - `displayError()` - Error display with suggestions
 * - `displayInfo()` - Info boxes
 * - `displayContextSummary()` - Context command summary (CLI-UX-005)
 * - `displayValidationFailure()` - Validation failure summary (CLI-UX-005)
 * - `displayValidationSuccess()` - Validation success (CLI-UX-005)
 *
 * ### Tables (CLI-UX-003, CLI-UX-005)
 * - `createRiskSignalTable()` - Risk signals with severity
 * - `createFileSummaryTable()` - File analysis results
 * - `createSnapshotTable()` - Snapshot listing
 * - `createStagedFilesTable()` - Git staged files
 * - `createContextTable()` - Context learnings (CLI-UX-005)
 * - `createValidationTable()` - Validation results (CLI-UX-005)
 *
 * ### Progress (CLI-UX-004)
 * - `ProgressTracker` - Real-time progress tracking
 * - `createLiveLogger()` - Log-update based live output
 * - `renderProgressBar()` - Progress bar rendering
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/00-overview.md}
 * @module utils
 */

// =============================================================================
// CLI-UX-001: Boxen Integration - Visual box output
// =============================================================================

export {
	// Types
	type BoxType,
	type DisplayBoxObjectOptions,
	type DisplayBoxStringOptions,
	// Core display function
	displayBox,
	// Intelligence display functions (CLI-UX-005)
	displayContextSummary,
	displayError,
	displayHighRiskWarning,
	displayInfo,
	// Specialized display functions
	displaySaveStory,
	displaySnapshotSuccess,
	displayValidationFailure,
	displayValidationSuccess,
} from "./display";

// =============================================================================
// CLI-UX-003: CLI-Table3 Integration - Table rendering
// =============================================================================

export {
	// Intelligence tables (CLI-UX-005)
	createContextTable,
	createFileSummaryTable,
	// Risk tables
	createRiskSignalTable,
	// Snapshot tables
	createSnapshotTable,
	createStagedFilesTable,
	createValidationTable,
	type FileRiskSummary,
	formatConfidence,
	// Date formatting (consolidated utility)
	formatDate,
	formatRecommendation,
	formatRelativeTime,
	type LearningEntry,
	// Types
	type RiskSignal,
	// Helpers
	renderSeverity,
	truncatePath,
	type ValidationResult,
} from "./tables";

// =============================================================================
// CLI-UX-004: Log-Update Integration - Progress tracking
// =============================================================================

export {
	// Live logging
	createLiveLogger,
	formatDuration,
	formatProgressLine,
	// Progress tracker class
	ProgressTracker,
	type ProgressTrackerOptions,
	// Helpers
	renderProgressBar,
} from "./progress";

// =============================================================================
// SAFE OPERATIONS - Dry-run, confirmation, undo
// =============================================================================

export {
	confirmOperation,
	createDiff,
	getLastOperation,
	getRecentOperations,
	handleDryRun,
	type OperationChange,
	recordOperation,
	removeOperation,
	type SafeOperationOptions,
	safeOps,
	showAffectedFiles,
	type UndoableOperation,
	undoLastOperation,
} from "./safe-ops";

// =============================================================================
// WORKSPACE UTILITIES
// =============================================================================

export { findGitRoot, findWorkspaceRoot } from "./workspace";
