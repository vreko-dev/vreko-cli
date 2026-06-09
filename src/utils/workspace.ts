/**
 * Workspace Utilities
 *
 * Shared workspace detection and path utilities for CLI commands.
 * Supersedes @vreko/mcp/middleware workspace helpers  -  no transitive engine/intelligence deps.
 *
 * @module utils/workspace
 */

import { existsSync, lstatSync } from "node:fs";
import { join, normalize, resolve } from "node:path";

// =============================================================================
// WORKSPACE VALIDATION (migrated from @vreko/mcp/middleware  -  Phase 3A)
// =============================================================================

export interface WorkspaceValidationResult {
	valid: boolean;
	root: string;
	error?: string;
}

/**
 * Validate a workspace path according to security criteria.
 * Checks for .git, package.json, or .vreko markers; rejects symlinks.
 */
export function validateWorkspacePath(workspacePath: string): WorkspaceValidationResult {
	try {
		const normalizedPath = normalize(workspacePath);
		const absolutePath = resolve(normalizedPath);

		if (!absolutePath.startsWith(process.cwd()) && !absolutePath.startsWith("/")) {
			return { valid: false, root: "", error: "Invalid workspace path" };
		}

		const hasGit = existsSync(resolve(absolutePath, ".git"));
		const hasPackageJson = existsSync(resolve(absolutePath, "package.json"));
		const hasVreko = existsSync(resolve(absolutePath, ".vreko"));

		if (!hasGit && !hasPackageJson && !hasVreko) {
			return {
				valid: false,
				root: absolutePath,
				error: "Workspace must contain at least one marker: .git, package.json, or .vreko",
			};
		}

		try {
			const stat = lstatSync(absolutePath);
			if (stat.isSymbolicLink()) {
				return {
					valid: false,
					root: absolutePath,
					error: "Workspace path cannot be a symbolic link",
				};
			}
		} catch {
			return { valid: false, root: absolutePath, error: "Cannot access workspace path" };
		}

		return { valid: true, root: absolutePath };
	} catch (error) {
		return {
			valid: false,
			root: "",
			error: error instanceof Error ? error.message : "Unknown error validating workspace",
		};
	}
}

/**
 * Resolve workspace root with fallback chain:
 * 1. Explicit path (if provided and valid)
 * 2. Traversal upward from cwd looking for .git / package.json / .vreko
 * 3. cwd itself as last resort
 */
export function resolveWorkspaceRoot(explicitPath?: string): WorkspaceValidationResult {
	if (explicitPath) {
		const validation = validateWorkspacePath(explicitPath);
		if (validation.valid) {
			return validation;
		}
	}

	// Traverse upward
	let currentPath = resolve(process.cwd());
	const maxIterations = 50;
	for (let i = 0; i < maxIterations; i++) {
		const hasMarker =
			existsSync(resolve(currentPath, ".git")) ||
			existsSync(resolve(currentPath, "package.json")) ||
			existsSync(resolve(currentPath, ".vreko"));
		if (hasMarker) {
			return validateWorkspacePath(currentPath);
		}
		const parent = resolve(currentPath, "..");
		if (parent === currentPath) {
			break;
		}
		currentPath = parent;
	}

	// Fallback: cwd
	return validateWorkspacePath(process.cwd());
}

/**
 * Find the workspace root by traversing up from the given directory
 * looking for a .vreko directory.
 *
 * @param cwd - Current working directory to start from
 * @returns Absolute path to workspace root, or null if not found
 */
export function findWorkspaceRoot(cwd: string): string | null {
	let dir = cwd;
	while (dir !== "/") {
		if (existsSync(join(dir, ".vreko"))) {
			return dir;
		}
		const parent = join(dir, "..");
		if (parent === dir) {
			break;
		}
		dir = parent;
	}
	return null;
}

/**
 * Find git root by traversing up from the given directory.
 *
 * @param cwd - Current working directory to start from
 * @returns Absolute path to git root, or null if not in a git repo
 */
export function findGitRoot(cwd: string): string | null {
	try {
		const { execSync } = require("node:child_process");
		return execSync("git rev-parse --show-toplevel", {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	} catch {
		return null;
	}
}
