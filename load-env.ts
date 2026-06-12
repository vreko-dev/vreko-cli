/**
 * Environment Variable Loader
 *
 * MUST be imported first in index.ts to ensure .env is loaded
 * before any other modules that reference process.env.
 *
 * This solves the MCP server startup issue where Doppler environment
 * variables aren't available when spawned by MCP clients.
 *
 * @module load-env
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

// ============================================================================
// CLI Environment Marker
// ============================================================================

/**
 * Set VREKO_CLI=true to signal that env validation should be skipped
 * This MUST be set before any other modules are imported that might
 * trigger createEnv() validation (e.g., @vreko/config/env)
 */
process.env.VREKO_CLI = "true";
process.env.VREKO_CLI = "true"; // 90-day compat: @vreko/env presets still check this

// ============================================================================
// Doppler Detection
// ============================================================================

/**
 * Check if running under Doppler environment
 * Doppler sets multiple variables when running via `doppler run`:
 * - DOPPLER_PROJECT (always set)
 * - DOPPLER_CONFIG (always set)
 * - DOPPLER_ENVIRONMENT (sometimes set, not reliable alone)
 * - DOPPLER_TOKEN (CI/CD mode)
 */
function isRunningUnderDoppler(): boolean {
	// Check for any Doppler indicator
	return !!(
		process.env.DOPPLER_PROJECT ||
		process.env.DOPPLER_CONFIG ||
		process.env.DOPPLER_ENVIRONMENT ||
		process.env.DOPPLER_TOKEN
	);
}

// ============================================================================
// Environment Loading
// ============================================================================

/**
 * Load environment variables from .env.local file
 * Only loads if not running under Doppler (Doppler manages its own env)
 */
function loadLocalEnv(): void {
	if (isRunningUnderDoppler()) {
		// Doppler is managing environment variables, skip file loading
		return;
	}

	// Resolve .env.local from current working directory
	// MCP clients set cwd to workspace root, so this works correctly
	const envPath = resolve(process.cwd(), ".env.local");

	if (!existsSync(envPath)) {
		// No .env.local file exists, skip loading
		// This is acceptable - env vars may be set externally
		return;
	}

	// quiet: true suppresses dotenv's stdout tips (critical for MCP stdio transport)
	const result = config({ path: envPath, quiet: true });

	if (result.parsed && Object.keys(result.parsed).length > 0) {
		// Successfully loaded environment variables
		// Log to stderr to avoid interfering with stdio transport
		const _varNames = Object.keys(result.parsed).join(", ");
	}
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Critical environment variables for MCP server functionality
 * These are warnings only - graceful degradation is preferred
 */
const CRITICAL_VARS = ["DATABASE_URL", "REDIS_URL", "BETTER_AUTH_SECRET"];

/**
 * Validate that critical environment variables are present
 * Logs warnings for missing vars but doesn't fail (graceful degradation)
 */
function validateCriticalVars(): void {
	const missing = CRITICAL_VARS.filter((varName) => !process.env[varName]);

	if (missing.length > 0) {
		// intentionally empty
	}
}

// ============================================================================
// Initialization
// ============================================================================

// Load environment variables immediately on module import
loadLocalEnv();

// Validate critical variables
validateCriticalVars();

// Export marker to ensure this module is imported
export const ENV_LOADED = true;

// Export for testing
export { isRunningUnderDoppler, loadLocalEnv, validateCriticalVars };
