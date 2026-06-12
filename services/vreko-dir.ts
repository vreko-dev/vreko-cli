/**
 * Vreko Directory Service
 *
 * Manages .vreko/ workspace directory and ~/.vreko/ global directory.
 * This is the foundation for CLI commands that need persistent storage.
 *
 * Storage Architecture:
 * - ~/.vreko/ (GLOBAL) - credentials, user config, MCP configs
 * - .vreko/ (WORKSPACE) - patterns, learnings, session, snapshots
 *
 * @see implementation_plan.md Section 1.3
 */

import { access, appendFile, constants, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { LearningType } from "@vreko/contracts/local-service/schemas";
import { z } from "zod";

// =============================================================================
// CONSTANTS
// =============================================================================

const VREKO_DIR = ".vreko";
const GLOBAL_VREKO_DIR = ".vreko";

// =============================================================================
// ZOD SCHEMAS (Runtime validation)
// =============================================================================

export const WorkspaceConfigSchema = z.object({
	workspaceId: z.string().optional(),
	tier: z.enum(["free", "pro"]).optional(),
	protectionLevel: z.enum(["standard", "strict"]).optional(),
	syncEnabled: z.boolean().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const WorkspaceVitalsSchema = z.object({
	framework: z.string().optional(),
	frameworkConfidence: z.number().optional(),
	packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).optional(),
	typescript: z
		.object({
			enabled: z.boolean(),
			strict: z.boolean().optional(),
			version: z.string().optional(),
		})
		.optional(),
	criticalFiles: z.array(z.string()).optional(),
	detectedAt: z.string(),
});

export const ProtectedFileSchema = z.object({
	pattern: z.string(),
	addedAt: z.string(),
	reason: z.string().optional(),
});

export const SessionStateSchema = z.object({
	id: z.string(),
	task: z.string().optional(),
	startedAt: z.string(),
	snapshotCount: z.number(),
	filesModified: z.number().optional(),
	state: z.enum(["active", "ended"]).optional(),
	active: z.boolean().optional(),
});

export const LearningEntrySchema = z.object({
	id: z.string(),
	type: z.enum(["pattern", "pitfall", "efficiency", "discovery", "workflow"]),
	trigger: z.string(),
	action: z.string(),
	source: z.string(),
	createdAt: z.string(),
});

export const ViolationEntrySchema = z.object({
	type: z.string(),
	file: z.string(),
	message: z.string(),
	count: z.number().optional(),
	date: z.string(),
	prevention: z.string().optional(),
});

export const GlobalCredentialsSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string().optional(),
	email: z.string(),
	tier: z.enum(["free", "pro"]),
	expiresAt: z.string().optional(),
});

export const GlobalConfigSchema = z.object({
	apiUrl: z.string().optional(),
	defaultWorkspace: z.string().optional(),
	analytics: z.boolean().optional(),
});

// =============================================================================
// TYPE DEFINITIONS (derived from schemas)
// =============================================================================

export interface WorkspaceConfig {
	workspaceId?: string;
	tier?: "free" | "pro";
	/**
	 * CLI protection preset - user-friendly abstraction layer.
	 *
	 * Maps to canonical ProtectionLevel values (@vreko/contracts):
	 * - "standard" → "watch" (auto-snapshot, warn on risky changes)
	 * - "strict" → "block" (confirmation required, block high-risk)
	 *
	 * The CLI uses presets for better UX, while internal operations
	 * use the canonical "watch" | "warn" | "block" values.
	 */
	protectionLevel?: "standard" | "strict";
	syncEnabled?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface WorkspaceVitals {
	framework?: string;
	frameworkConfidence?: number;
	packageManager?: "npm" | "pnpm" | "yarn" | "bun";
	typescript?: {
		enabled: boolean;
		strict?: boolean;
		version?: string;
	};
	criticalFiles?: string[];
	detectedAt: string;
}

export interface ProtectedFile {
	pattern: string;
	addedAt: string;
	reason?: string;
}

export interface SessionState {
	id: string;
	task?: string;
	startedAt: string;
	snapshotCount: number;
	filesModified?: number;
	/** Daemon-compatible state field  -  written on session start for pulse fallback */
	state?: "active" | "ended";
	/** Legacy boolean alias  -  written alongside state for isActiveSession() compatibility */
	active?: boolean;
}

export interface LearningEntry {
	id: string;
	type: z.infer<typeof LearningType>;
	trigger: string;
	action: string;
	source: string;
	createdAt: string;
}

export interface ViolationEntry {
	type: string;
	file: string;
	message: string;
	count?: number;
	date: string;
	prevention?: string;
}

export interface GlobalCredentials {
	accessToken: string;
	refreshToken?: string;
	email: string;
	tier: "free" | "pro";
	expiresAt?: string;
}

export interface GlobalConfig {
	apiUrl?: string;
	defaultWorkspace?: string;
	analytics?: boolean;
}

// =============================================================================
// PATH HELPERS
// =============================================================================

/**
 * Get global vreko directory path (~/.vreko/)
 */
export function getGlobalDir(): string {
	return join(homedir(), GLOBAL_VREKO_DIR);
}

/**
 * Get workspace vreko directory path
 */
export function getWorkspaceDir(workspaceRoot?: string): string {
	return join(workspaceRoot || process.cwd(), VREKO_DIR);
}

/**
 * Get path to a file in the global directory
 */
export function getGlobalPath(relativePath: string): string {
	return join(getGlobalDir(), relativePath);
}

/**
 * Get path to a file in the workspace directory
 */
export function getWorkspacePath(relativePath: string, workspaceRoot?: string): string {
	return join(getWorkspaceDir(workspaceRoot), relativePath);
}

// =============================================================================
// DIRECTORY MANAGEMENT
// =============================================================================

/**
 * Create the .vreko/ directory structure in a workspace
 * Mirrors the structure expected by MCP server (context-tools.ts)
 */
export async function createVrekoDirectory(workspaceRoot?: string): Promise<void> {
	const baseDir = getWorkspaceDir(workspaceRoot);

	const dirs = ["", "patterns", "learnings", "session", "snapshots"];

	for (const dir of dirs) {
		await mkdir(join(baseDir, dir), { recursive: true });
	}

	// Create .gitignore to exclude snapshots but keep patterns
	const gitignore = `# Vreko Directory
# Ignore snapshot content (large binary data)
snapshots/
embeddings.db

# Keep these for team sharing
!patterns/
!learnings/
!vitals.json
!config.json
!protected.json
`.trim();

	await writeFile(join(baseDir, ".gitignore"), gitignore);
}

/**
 * Create the global ~/.vreko/ directory structure
 */
export async function createGlobalDirectory(): Promise<void> {
	const baseDir = getGlobalDir();

	const dirs = ["", "cache", "mcp-configs"];

	for (const dir of dirs) {
		await mkdir(join(baseDir, dir), { recursive: true });
	}
}

/**
 * Check if .vreko/ directory exists in workspace
 */
export async function isVrekoInitialized(workspaceRoot?: string): Promise<boolean> {
	try {
		const dirPath = getWorkspaceDir(workspaceRoot);
		await access(dirPath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if user is logged in (has credentials)
 */
export async function isLoggedIn(): Promise<boolean> {
	try {
		const credentials = await getCredentials();
		if (!credentials?.accessToken) {
			return false;
		}

		// Check if token is expired
		if (credentials.expiresAt) {
			const expiresAt = new Date(credentials.expiresAt);
			if (expiresAt < new Date()) {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// JSON FILE OPERATIONS - WORKSPACE
// =============================================================================

/**
 * Read JSON file from .vreko/
 */
export async function readVrekoJson<T>(relativePath: string, workspaceRoot?: string): Promise<T | null> {
	try {
		const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Write JSON file to .vreko/
 */
export async function writeVrekoJson<T>(relativePath: string, data: T, workspaceRoot?: string): Promise<void> {
	const fullPath = getWorkspacePath(relativePath, workspaceRoot);
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, JSON.stringify(data, null, 2));
}

/**
 * Append to JSONL file in .vreko/
 */
export async function appendVrekoJsonl<T extends object>(
	relativePath: string,
	data: T,
	workspaceRoot?: string,
): Promise<void> {
	const fullPath = getWorkspacePath(relativePath, workspaceRoot);
	await mkdir(dirname(fullPath), { recursive: true });
	await appendFile(fullPath, `${JSON.stringify(data)}\n`);
}

/**
 * Load JSONL file from .vreko/
 */
export async function loadVrekoJsonl<T>(relativePath: string, workspaceRoot?: string): Promise<T[]> {
	try {
		const content = await readFile(getWorkspacePath(relativePath, workspaceRoot), "utf-8");
		return content
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as T);
	} catch {
		return [];
	}
}

// =============================================================================
// JSON FILE OPERATIONS - GLOBAL
// =============================================================================

/**
 * Read JSON file from ~/.vreko/
 */
export async function readGlobalJson<T>(relativePath: string): Promise<T | null> {
	try {
		const content = await readFile(getGlobalPath(relativePath), "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Write JSON file to ~/.vreko/
 *
 * @param mode optional file mode. Pass 0o600 for secrets so a plaintext fallback
 *   is at least owner-only readable (AUTH-06 / F-8).
 */
export async function writeGlobalJson<T>(relativePath: string, data: T, mode?: number): Promise<void> {
	const fullPath = getGlobalPath(relativePath);
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, JSON.stringify(data, null, 2), mode !== undefined ? { mode } : undefined);
}

/**
 * Delete JSON file from ~/.vreko/
 */
export async function deleteGlobalJson(relativePath: string): Promise<void> {
	const fullPath = getGlobalPath(relativePath);
	try {
		const { unlink } = await import("node:fs/promises");
		await unlink(fullPath);
	} catch {
		// File doesn't exist, that's fine
	}
}

// =============================================================================
// TYPED ACCESSORS
// =============================================================================

/**
 * Get workspace configuration with Zod validation
 */
export async function getWorkspaceConfig(workspaceRoot?: string): Promise<WorkspaceConfig | null> {
	const data = await readVrekoJson<unknown>("config.json", workspaceRoot);
	if (!data) {
		return null;
	}
	const result = WorkspaceConfigSchema.safeParse(data);
	return result.success ? result.data : null;
}

/**
 * Save workspace configuration
 */
export async function saveWorkspaceConfig(config: WorkspaceConfig, workspaceRoot?: string): Promise<void> {
	await writeVrekoJson("config.json", config, workspaceRoot);
}

/**
 * Get workspace vitals with Zod validation
 */
export async function getWorkspaceVitals(workspaceRoot?: string): Promise<WorkspaceVitals | null> {
	const data = await readVrekoJson<unknown>("vitals.json", workspaceRoot);
	if (!data) {
		return null;
	}
	const result = WorkspaceVitalsSchema.safeParse(data);
	return result.success ? result.data : null;
}

/**
 * Save workspace vitals
 */
export async function saveWorkspaceVitals(vitals: WorkspaceVitals, workspaceRoot?: string): Promise<void> {
	await writeVrekoJson("vitals.json", vitals, workspaceRoot);
}

/**
 * Get protected files list with Zod validation
 */
export async function getProtectedFiles(workspaceRoot?: string): Promise<ProtectedFile[]> {
	const data = await readVrekoJson<unknown[]>("protected.json", workspaceRoot);
	if (!data) {
		return [];
	}
	const result = z.array(ProtectedFileSchema).safeParse(data);
	return result.success ? result.data : [];
}

/**
 * Save protected files list
 */
export async function saveProtectedFiles(files: ProtectedFile[], workspaceRoot?: string): Promise<void> {
	await writeVrekoJson("protected.json", files, workspaceRoot);
}

/**
 * Get current session state with Zod validation
 */
export async function getCurrentSession(workspaceRoot?: string): Promise<SessionState | null> {
	const data = await readVrekoJson<unknown>("session/current.json", workspaceRoot);
	if (!data) {
		return null;
	}
	const result = SessionStateSchema.safeParse(data);
	return result.success ? result.data : null;
}

/**
 * Save current session state
 */
export async function saveCurrentSession(session: SessionState, workspaceRoot?: string): Promise<void> {
	await writeVrekoJson("session/current.json", session, workspaceRoot);
}

/**
 * End current session (delete current.json)
 */
export async function endCurrentSession(workspaceRoot?: string): Promise<void> {
	const fullPath = getWorkspacePath("session/current.json", workspaceRoot);
	try {
		const { unlink } = await import("node:fs/promises");
		await unlink(fullPath);
	} catch {
		// File doesn't exist, that's fine
	}
}

/**
 * Record a learning
 */
export async function recordLearning(learning: LearningEntry, workspaceRoot?: string): Promise<void> {
	await appendVrekoJsonl("learnings/user-learnings.jsonl", learning, workspaceRoot);
}

/**
 * Get all learnings with Zod validation
 */
export async function getLearnings(workspaceRoot?: string): Promise<LearningEntry[]> {
	const data = await loadVrekoJsonl<unknown>("learnings/user-learnings.jsonl", workspaceRoot);
	return data.filter((item): item is LearningEntry => LearningEntrySchema.safeParse(item).success);
}

/**
 * Record a violation
 */
export async function recordViolation(violation: ViolationEntry, workspaceRoot?: string): Promise<void> {
	await appendVrekoJsonl("patterns/violations.jsonl", violation, workspaceRoot);
}

/**
 * Get all violations with Zod validation
 */
export async function getViolations(workspaceRoot?: string): Promise<ViolationEntry[]> {
	const data = await loadVrekoJsonl<unknown>("patterns/violations.jsonl", workspaceRoot);
	return data.filter((item): item is ViolationEntry => ViolationEntrySchema.safeParse(item).success);
}

/**
 * Get credentials
 * @deprecated Use getCredentialsSecure from secure-credentials.ts for production
 */
export async function getCredentials(): Promise<GlobalCredentials | null> {
	// Try secure credentials first, fall back to legacy
	try {
		const { getCredentialsSecure } = await import("./secure-credentials");
		return await getCredentialsSecure();
	} catch {
		// Fallback to legacy plain text (development mode)
		return readGlobalJson<GlobalCredentials>("credentials.json");
	}
}

/**
 * Result of a credential save, describing which backend actually stored the
 * credential. Callers MUST gate any "stored securely" messaging on `secure`
 * and surface a downgrade warning when it is false (AUTH-06 / F-7+F-8).
 */
export interface CredentialStorageResult {
	/** The backend that stored the credential. */
	backend: "keychain" | "encrypted-file" | "plaintext-file";
	/** True only for keychain or encrypted-file; false for the plaintext fallback. */
	secure: boolean;
	/** Populated when the secure path failed and we fell back to plaintext. */
	downgradeReason?: string;
}

/**
 * Save credentials
 * @deprecated Use saveCredentialsSecure from secure-credentials.ts for production
 */
export async function saveCredentials(credentials: GlobalCredentials): Promise<CredentialStorageResult> {
	// Try secure credentials first, fall back to legacy
	try {
		const { saveCredentialsSecure, getSecureCredentials } = await import("./secure-credentials");
		await saveCredentialsSecure(credentials);
		const providerName = getSecureCredentials().getProviderName();
		// keytar names itself "keytar"/keychain; otherwise the encrypted-file backend.
		const backend =
			providerName.includes("keytar") || providerName.includes("keychain") ? "keychain" : "encrypted-file";
		return { backend, secure: true };
	} catch (error) {
		// Secure backends unavailable  -  downgrade to a restricted-permission (0o600)
		// plaintext file and report the downgrade honestly so the caller does NOT
		// claim secure storage (AP-3: never swallow this silently).
		const downgradeReason = error instanceof Error ? error.message : String(error);
		await createGlobalDirectory();
		await writeGlobalJson("credentials.json", credentials, 0o600);
		return { backend: "plaintext-file", secure: false, downgradeReason };
	}
}

/**
 * Clear credentials (logout)
 * @deprecated Use clearCredentialsSecure from secure-credentials.ts for production
 */
export async function clearCredentials(): Promise<void> {
	// Try secure credentials first, fall back to legacy
	try {
		const { clearCredentialsSecure } = await import("./secure-credentials");
		return await clearCredentialsSecure();
	} catch {
		// Fallback to legacy plain text (development mode)
		await deleteGlobalJson("credentials.json");
	}
}

/**
 * Get global config with Zod validation
 */
export async function getGlobalConfig(): Promise<GlobalConfig | null> {
	const data = await readGlobalJson<unknown>("config.json");
	if (!data) {
		return null;
	}
	const result = GlobalConfigSchema.safeParse(data);
	return result.success ? result.data : null;
}

/**
 * Save global config
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
	await createGlobalDirectory();
	await writeGlobalJson("config.json", config);
}

/**
 * Persist the user's benchmark opt-in decision to ~/.vreko/config.json.
 *
 * Merges into existing config so other keys (e.g. daemon.idleTimeout) are preserved.
 * Creates ~/.vreko/config.json if it does not exist.
 */
export async function saveBenchmarkOptIn(optedIn: boolean): Promise<void> {
	await createGlobalDirectory();

	let existing: Record<string, unknown> = {};
	try {
		const raw = await readGlobalJson<Record<string, unknown>>("config.json");
		if (raw !== null) {
			existing = raw;
		}
	} catch {
		// File doesn't exist or is unparseable  -  start fresh
	}

	existing.benchmarks = {
		...((existing.benchmarks as Record<string, unknown>) ?? {}),
		optIn: optedIn,
	};

	await writeGlobalJson("config.json", existing);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Re-export generateId from @vreko/contracts for backwards compatibility
export { generateId } from "@vreko/contracts/id-generator";

/**
 * Get workspace root by searching for .vreko/ or package.json
 */
export async function findWorkspaceRoot(startDir?: string): Promise<string | null> {
	let currentDir = startDir || process.cwd();

	// Limit search depth to prevent infinite loops
	const maxDepth = 10;
	let depth = 0;

	while (depth < maxDepth) {
		// Check for .vreko directory
		try {
			await access(join(currentDir, VREKO_DIR), constants.F_OK);
			return currentDir;
		} catch {
			// Not found, continue
		}

		// Check for package.json (workspace root indicator)
		try {
			await access(join(currentDir, "package.json"), constants.F_OK);
			return currentDir;
		} catch {
			// Not found, continue
		}

		// Move up one directory
		const parentDir = dirname(currentDir);
		if (parentDir === currentDir) {
			// Reached root
			break;
		}
		currentDir = parentDir;
		depth++;
	}

	return null;
}

/**
 * Check if a path exists
 */
export async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get file stats
 */
export async function getStats(path: string): Promise<{ size: number; modifiedAt: Date } | null> {
	try {
		const stats = await stat(path);
		return {
			size: stats.size,
			modifiedAt: stats.mtime,
		};
	} catch {
		return null;
	}
}
