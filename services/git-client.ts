/**
 * CLI-UX-002: Git Integration
 *
 * Provides git operations for staged files detection, content retrieval,
 * and diff display. Fixes the `check` command to analyze staged files only.
 *
 * @see ai_dev_utils/resources/new_cli/02-execa-integration.spec.md
 */

import { execa } from "execa";

// =============================================================================
// TYPES
// =============================================================================

export interface GitClientOptions {
	cwd?: string;
	timeout?: number;
}

export interface StagedFile {
	path: string;
	status: "added" | "modified" | "deleted" | "renamed" | "copied";
	oldPath?: string;
}

export interface DiffHunk {
	header: string;
	additions: number;
	deletions: number;
	content: string;
}

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

export class GitNotInstalledError extends Error {
	constructor() {
		super("Git is not installed or not accessible in PATH");
		this.name = "GitNotInstalledError";
	}
}

export class GitNotRepositoryError extends Error {
	constructor(path: string) {
		super(`Not a git repository: ${path}`);
		this.name = "GitNotRepositoryError";
	}
}

export class GitBinaryFileError extends Error {
	constructor(path: string) {
		super(`Cannot read binary file: ${path}`);
		this.name = "GitBinaryFileError";
	}
}

// =============================================================================
// GIT CLIENT CLASS
// =============================================================================

export class GitClient {
	private cwd: string;
	private timeout: number;

	constructor(options: GitClientOptions = {}) {
		this.cwd = options.cwd || process.cwd();
		this.timeout = options.timeout || 10000;
	}

	/**
	 * Check if git is installed
	 */
	async isGitInstalled(): Promise<boolean> {
		try {
			await execa("git", ["--version"], { timeout: 5000 });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if cwd is inside a git repository
	 */
	async isGitRepository(): Promise<boolean> {
		try {
			await execa("git", ["rev-parse", "--is-inside-work-tree"], {
				cwd: this.cwd,
				timeout: this.timeout,
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get repository root path
	 */
	async getRepositoryRoot(): Promise<string> {
		const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout.trim();
	}

	/**
	 * Get list of staged files with their status
	 */
	async getStagedFiles(): Promise<StagedFile[]> {
		try {
			const { stdout } = await execa("git", ["diff", "--cached", "--name-status"], {
				cwd: this.cwd,
				timeout: this.timeout,
			});

			if (!stdout.trim()) {
				return [];
			}

			return stdout
				.split(/\r?\n/) // Cross-platform: handles both \n (Unix) and \r\n (Windows)
				.filter(Boolean)
				.map((line) => this.parseStatusLine(line));
		} catch (error) {
			if (this.isNotRepositoryError(error)) {
				throw new GitNotRepositoryError(this.cwd);
			}
			throw error;
		}
	}

	/**
	 * Get staged file content (what will be committed)
	 */
	async getStagedContent(filePath: string): Promise<string> {
		try {
			const { stdout } = await execa("git", ["show", `:${filePath}`], {
				cwd: this.cwd,
				timeout: this.timeout,
			});
			return stdout;
		} catch (error) {
			if (this.isBinaryFileError(error)) {
				throw new GitBinaryFileError(filePath);
			}
			throw error;
		}
	}

	/**
	 * Get diff of staged changes for a file
	 */
	async getStagedDiff(filePath?: string): Promise<string> {
		const args = ["diff", "--cached", "--color=always"];
		if (filePath) {
			args.push("--", filePath);
		}

		const { stdout } = await execa("git", args, {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout;
	}

	/**
	 * Get diff statistics
	 */
	async getStagedStats(): Promise<{ additions: number; deletions: number; files: number }> {
		const { stdout } = await execa("git", ["diff", "--cached", "--numstat"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});

		let additions = 0;
		let deletions = 0;
		let files = 0;

		for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
			const [add, del] = line.split("\t");
			if (add !== "-") {
				additions += Number.parseInt(add, 10);
			}
			if (del !== "-") {
				deletions += Number.parseInt(del, 10);
			}
			files++;
		}

		return { additions, deletions, files };
	}

	/**
	 * Get current branch name
	 */
	async getCurrentBranch(): Promise<string> {
		const { stdout } = await execa("git", ["branch", "--show-current"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout.trim();
	}

	/**
	 * Get short commit hash of HEAD
	 */
	async getHeadCommit(): Promise<string> {
		const { stdout } = await execa("git", ["rev-parse", "--short", "HEAD"], {
			cwd: this.cwd,
			timeout: this.timeout,
		});
		return stdout.trim();
	}

	// ===========================================================================
	// PRIVATE HELPERS
	// ===========================================================================

	private parseStatusLine(line: string): StagedFile {
		const [status, ...pathParts] = line.split("\t");
		const path = pathParts[pathParts.length - 1];
		const oldPath = pathParts.length > 1 ? pathParts[0] : undefined;

		return {
			path,
			status: this.parseStatus(status),
			...(oldPath && { oldPath }),
		};
	}

	private parseStatus(status: string): StagedFile["status"] {
		const char = status.charAt(0);
		switch (char) {
			case "A":
				return "added";
			case "M":
				return "modified";
			case "D":
				return "deleted";
			case "R":
				return "renamed";
			case "C":
				return "copied";
			default:
				return "modified";
		}
	}

	private isNotRepositoryError(error: unknown): boolean {
		return error instanceof Error && error.message.toLowerCase().includes("not a git repository");
	}

	private isBinaryFileError(error: unknown): boolean {
		return error instanceof Error && error.message.toLowerCase().includes("binary");
	}
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a code file worth analyzing
 */
export function isCodeFile(filePath: string): boolean {
	const codeExtensions = [
		".ts",
		".tsx",
		".js",
		".jsx",
		".mjs",
		".cjs",
		".py",
		".java",
		".go",
		".rs",
		".rb",
		".php",
		".c",
		".cpp",
		".h",
		".hpp",
		".cs",
		".swift",
		".kt",
		".scala",
		".clj",
		".ex",
		".exs",
	];

	return codeExtensions.some((ext) => filePath.endsWith(ext));
}

/**
 * Create GitClient with validation
 */
export async function createValidatedGitClient(options?: GitClientOptions): Promise<GitClient> {
	const client = new GitClient(options);

	if (!(await client.isGitInstalled())) {
		throw new GitNotInstalledError();
	}

	if (!(await client.isGitRepository())) {
		throw new GitNotRepositoryError(options?.cwd || process.cwd());
	}

	return client;
}
