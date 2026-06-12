/**
 * CLI Result Pattern
 *
 * Provides a Result<T, E> pattern for CLI operations, enabling:
 * - Explicit error handling without exceptions
 * - Testable exit code determination
 * - Clean separation of error handling from exit logic
 *
 * SECURITY: Replaces scattered process.exit() calls with centralized exit handling,
 * preventing unexpected termination and enabling proper cleanup.
 *
 * @module result
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Success result with data
 */
export interface CliOk<T> {
	readonly ok: true;
	readonly data: T;
	readonly exitCode?: 0;
}

/**
 * Error result with message and exit code
 */
export interface CliErr {
	readonly ok: false;
	readonly error: string;
	readonly code?: string;
	readonly exitCode: number;
	readonly suggestion?: string;
	readonly command?: string;
}

/**
 * CLI Result type - discriminated union of success/error
 */
export type CliResult<T = void> = CliOk<T> | CliErr;

// =============================================================================
// CONSTRUCTORS
// =============================================================================

/**
 * Create a success result
 */
export function ok<T>(data: T): CliOk<T> {
	return { ok: true, data, exitCode: 0 };
}

/**
 * Create a success result with no data (void)
 */
export function okVoid(): CliOk<void> {
	return { ok: true, data: undefined, exitCode: 0 };
}

/**
 * Create an error result
 */
export function err(
	error: string,
	options: {
		code?: string;
		exitCode?: number;
		suggestion?: string;
		command?: string;
	} = {},
): CliErr {
	return {
		ok: false,
		error,
		code: options.code,
		exitCode: options.exitCode ?? 1,
		suggestion: options.suggestion,
		command: options.command,
	};
}

/**
 * Create an error result from an Error object
 */
export function errFromError(e: Error | unknown, options: { exitCode?: number } = {}): CliErr {
	const message = e instanceof Error ? e.message : String(e);
	const code = e instanceof Error && "code" in e ? String(e.code) : undefined;
	return err(message, { code, exitCode: options.exitCode ?? 1 });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if result is successful
 */
export function isOk<T>(result: CliResult<T>): result is CliOk<T> {
	return result.ok === true;
}

/**
 * Check if result is an error
 */
export function isErr<T>(result: CliResult<T>): result is CliErr {
	return result.ok === false;
}

/**
 * Unwrap a result or throw
 * Use sparingly - prefer pattern matching
 */
export function unwrap<T>(result: CliResult<T>): T {
	if (result.ok) {
		return result.data;
	}
	throw new Error(result.error);
}

/**
 * Unwrap a result with a default value for errors
 */
export function unwrapOr<T>(result: CliResult<T>, defaultValue: T): T {
	if (result.ok) {
		return result.data;
	}
	return defaultValue;
}

/**
 * Map over a successful result
 */
export function map<T, U>(result: CliResult<T>, fn: (data: T) => U): CliResult<U> {
	if (result.ok) {
		return ok(fn(result.data));
	}
	return result;
}

/**
 * Chain result operations
 */
export function andThen<T, U>(result: CliResult<T>, fn: (data: T) => CliResult<U>): CliResult<U> {
	if (result.ok) {
		return fn(result.data);
	}
	return result;
}

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Wrap an async function to return a CliResult
 */
export async function tryAsync<T>(fn: () => Promise<T>, options: { exitCode?: number } = {}): Promise<CliResult<T>> {
	try {
		const data = await fn();
		return ok(data);
	} catch (e) {
		return errFromError(e, options);
	}
}

/**
 * Run a function and exit with the appropriate code
 *
 * SECURITY: This is the ONLY place process.exit() should be called.
 * All other code should return CliResult and let main() handle exit.
 */
export function exitWithResult<T>(result: CliResult<T>): never {
	if (result.ok) {
		process.exit(0);
	}
	process.exit(result.exitCode);
}

// =============================================================================
// COMMON ERROR RESULTS
// =============================================================================

/**
 * Common CLI error results
 */
export const CommonCliErrors = {
	notInitialized: () =>
		err("Workspace not initialized", {
			code: "NOT_INITIALIZED",
			suggestion: "Run vr init to initialize this workspace",
			command: "vr init",
		}),

	notAuthenticated: () =>
		err("Not logged in", {
			code: "NOT_AUTHENTICATED",
			suggestion: "You need to authenticate first",
			command: "vr login",
		}),

	gitNotInstalled: () =>
		err("Git is not installed", {
			code: "GIT_NOT_INSTALLED",
			suggestion: "Install Git from https://git-scm.com/downloads",
		}),

	gitNotRepository: (path: string) =>
		err(`Not a git repository: ${path}`, {
			code: "NOT_GIT_REPO",
			suggestion: "Initialize a git repository first",
			command: "git init",
		}),

	fileNotFound: (path: string) =>
		err(`File not found: ${path}`, {
			code: "ENOENT",
		}),

	permissionDenied: (path: string) =>
		err(`Permission denied: ${path}`, {
			code: "EACCES",
		}),

	timeout: (operation: string) =>
		err(`Operation timed out: ${operation}`, {
			code: "ETIMEDOUT",
			suggestion: "Try again or check your connection",
		}),

	cancelled: () =>
		err("Operation cancelled", {
			code: "CANCELLED",
			exitCode: 130, // Standard SIGINT exit code
		}),
} as const;
