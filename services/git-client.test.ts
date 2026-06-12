/**
 * CLI-UX-002: Git Client Tests
 *
 * Tests for GitClient with 4-path coverage:
 * - Happy path: normal operations
 * - Sad path: expected failures
 * - Edge cases: special characters, empty inputs
 * - Error cases: unexpected failures
 *
 * @see ai_dev_utils/resources/new_cli/02-execa-integration.spec.md
 */

import { execa } from "execa";
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import {
	createValidatedGitClient,
	GitClient,
	GitNotInstalledError,
	GitNotRepositoryError,
	isCodeFile,
} from "../../src/services/git-client";

vi.mock("execa");

const mockedExeca = execa as unknown as MockInstance;

describe("GitClient", () => {
	let client: GitClient;

	beforeEach(() => {
		client = new GitClient({ cwd: "/test/repo" });
		vi.clearAllMocks();
	});

	describe("isGitInstalled", () => {
		// Happy path
		it("should return true when git is installed", async () => {
			mockedExeca.mockResolvedValueOnce({ stdout: "git version 2.40.0" });

			expect(await client.isGitInstalled()).toBe(true);
		});

		// Sad path
		it("should return false when git is not installed", async () => {
			mockedExeca.mockRejectedValueOnce(new Error("command not found: git"));

			expect(await client.isGitInstalled()).toBe(false);
		});
	});

	describe("isGitRepository", () => {
		// Happy path
		it("should return true inside a git repo", async () => {
			mockedExeca.mockResolvedValueOnce({ stdout: "true" });

			expect(await client.isGitRepository()).toBe(true);
		});

		// Sad path
		it("should return false outside a git repo", async () => {
			mockedExeca.mockRejectedValueOnce(new Error("not a git repository"));

			expect(await client.isGitRepository()).toBe(false);
		});
	});

	describe("getStagedFiles", () => {
		// Happy path
		it("should parse staged files correctly", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "M\tsrc/index.ts\nA\tsrc/new.ts\nD\tsrc/old.ts",
			});

			const files = await client.getStagedFiles();

			expect(files).toEqual([
				{ path: "src/index.ts", status: "modified" },
				{ path: "src/new.ts", status: "added" },
				{ path: "src/old.ts", status: "deleted" },
			]);
		});

		// Edge case: no staged files
		it("should return empty array when no staged files", async () => {
			mockedExeca.mockResolvedValueOnce({ stdout: "" });

			const files = await client.getStagedFiles();

			expect(files).toEqual([]);
		});

		// Edge case: paths with special characters
		it("should handle paths with spaces and special chars", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "M\tpath with spaces/file.ts\nA\tpath-with-dashes.ts",
			});

			const files = await client.getStagedFiles();

			expect(files).toHaveLength(2);
			expect(files[0].path).toBe("path with spaces/file.ts");
		});

		// Edge case: renamed files
		it("should handle renamed files", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "R\told.ts\tnew.ts",
			});

			const files = await client.getStagedFiles();

			expect(files).toHaveLength(1);
			expect(files[0].status).toBe("renamed");
		});

		// Error case
		it("should throw GitNotRepositoryError when not in repo", async () => {
			const error = new Error("fatal: not a git repository");
			mockedExeca.mockRejectedValueOnce(error);

			await expect(client.getStagedFiles()).rejects.toThrow(GitNotRepositoryError);
		});
	});

	describe("getStagedContent", () => {
		// Happy path
		it("should return staged file content", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "const x = 1;\nexport { x };",
			});

			const content = await client.getStagedContent("src/index.ts");

			expect(content).toBe("const x = 1;\nexport { x };");
		});

		// Error case: binary file
		it("should throw for binary files", async () => {
			mockedExeca.mockRejectedValueOnce(new Error("binary file"));

			await expect(client.getStagedContent("image.png")).rejects.toThrow();
		});

		// Error case: non-existent file
		it("should throw for non-existent staged file", async () => {
			mockedExeca.mockRejectedValueOnce(new Error("path not found"));

			await expect(client.getStagedContent("nonexistent.ts")).rejects.toThrow();
		});
	});

	describe("getStagedDiff", () => {
		// Happy path
		it("should return diff for all staged files", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "+added line\n-removed line",
			});

			const diff = await client.getStagedDiff();

			expect(diff).toContain("+added line");
		});

		// Happy path: specific file
		it("should return diff for specific file", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "+specific change",
			});

			const _diff = await client.getStagedDiff("src/file.ts");

			expect(mockedExeca).toHaveBeenCalledWith(
				"git",
				expect.arrayContaining(["--", "src/file.ts"]),
				expect.any(Object),
			);
		});
	});

	describe("getStagedStats", () => {
		// Happy path
		it("should return correct statistics", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "10\t5\tfile1.ts\n3\t2\tfile2.ts",
			});

			const stats = await client.getStagedStats();

			expect(stats).toEqual({
				additions: 13,
				deletions: 7,
				files: 2,
			});
		});

		// Edge case: empty staging area
		it("should return zeros when no staged files", async () => {
			mockedExeca.mockResolvedValueOnce({ stdout: "" });

			const stats = await client.getStagedStats();

			expect(stats).toEqual({
				additions: 0,
				deletions: 0,
				files: 0,
			});
		});

		// Edge case: binary files (marked with -)
		it("should handle binary files in stats", async () => {
			mockedExeca.mockResolvedValueOnce({
				stdout: "-\t-\tbinary.png\n5\t3\tcode.ts",
			});

			const stats = await client.getStagedStats();

			expect(stats).toEqual({
				additions: 5,
				deletions: 3,
				files: 2,
			});
		});
	});

	describe("getCurrentBranch", () => {
		// Happy path
		it("should return current branch name", async () => {
			mockedExeca.mockResolvedValueOnce({ stdout: "main\n" });

			const branch = await client.getCurrentBranch();

			expect(branch).toBe("main");
		});
	});

	describe("getHeadCommit", () => {
		// Happy path
		it("should return short commit hash", async () => {
			mockedExeca.mockResolvedValueOnce({ stdout: "abc123d\n" });

			const hash = await client.getHeadCommit();

			expect(hash).toBe("abc123d");
		});
	});
});

describe("isCodeFile", () => {
	// Happy path: common code extensions
	it("should return true for TypeScript files", () => {
		expect(isCodeFile("src/index.ts")).toBe(true);
		expect(isCodeFile("component.tsx")).toBe(true);
	});

	it("should return true for JavaScript files", () => {
		expect(isCodeFile("script.js")).toBe(true);
		expect(isCodeFile("app.jsx")).toBe(true);
		expect(isCodeFile("config.mjs")).toBe(true);
		expect(isCodeFile("config.cjs")).toBe(true);
	});

	it("should return true for other languages", () => {
		expect(isCodeFile("main.py")).toBe(true);
		expect(isCodeFile("App.java")).toBe(true);
		expect(isCodeFile("main.go")).toBe(true);
		expect(isCodeFile("lib.rs")).toBe(true);
	});

	// Sad path: non-code files
	it("should return false for non-code files", () => {
		expect(isCodeFile("readme.md")).toBe(false);
		expect(isCodeFile("package.json")).toBe(false);
		expect(isCodeFile("image.png")).toBe(false);
		expect(isCodeFile("styles.css")).toBe(false);
	});

	// Edge case: no extension
	it("should return false for files without extension", () => {
		expect(isCodeFile("Makefile")).toBe(false);
		expect(isCodeFile("Dockerfile")).toBe(false);
	});
});

describe("createValidatedGitClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Happy path
	it("should return client when git is installed and in repo", async () => {
		mockedExeca
			.mockResolvedValueOnce({ stdout: "git version 2.40.0" }) // isGitInstalled
			.mockResolvedValueOnce({ stdout: "true" }); // isGitRepository

		const client = await createValidatedGitClient();

		expect(client).toBeInstanceOf(GitClient);
	});

	// Error case: git not installed
	it("should throw GitNotInstalledError when git not installed", async () => {
		mockedExeca.mockRejectedValueOnce(new Error("command not found: git"));

		await expect(createValidatedGitClient()).rejects.toThrow(GitNotInstalledError);
	});

	// Error case: not a repository
	it("should throw GitNotRepositoryError when not in repo", async () => {
		mockedExeca
			.mockResolvedValueOnce({ stdout: "git version 2.40.0" }) // isGitInstalled
			.mockRejectedValueOnce(new Error("not a git repository")); // isGitRepository

		await expect(createValidatedGitClient()).rejects.toThrow(GitNotRepositoryError);
	});
});
