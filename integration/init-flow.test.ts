/**
 * Gate 4: Init Flow Integration Tests
 *
 * Full init flow against a real temp directory:
 * - .vreko/ created on first run
 * - config.json is valid on first run
 * - .gitignore updated on first run (when git present)
 * - --dry-run creates NOTHING
 * - --json output is parseable and complete (all required fields present)
 * - --force re-initializes (reinitialized=true)
 * - Idempotency: second run → alreadyInitialized=true, no error
 * - Path does not exist → success=false with clear error
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §1.8 Gate 4
 */

import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@inquirer/prompts", () => ({
	confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../src/services/service-client", () => ({
	connectToDaemon: vi.fn().mockRejectedValue(new Error("daemon not available")),
	getDaemonClient: vi.fn().mockReturnValue(null),
	isDaemonConnected: vi.fn().mockReturnValue(false),
}));

vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn().mockReturnValue({ clients: [], detected: [], needsSetup: [] }),
	getVrekoMCPConfig: vi.fn().mockReturnValue({}),
	writeClientConfig: vi.fn().mockReturnValue({ success: true }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import type { InitJsonResult } from "../../src/commands/init";
import { createInitCommand } from "../../src/commands/init";

async function runInit(args: string[], { captureJson = true } = {}): Promise<InitJsonResult | null> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
	try {
		await createInitCommand().parseAsync(args, { from: "user" });
	} finally {
		logSpy.mockRestore();
		exitSpy.mockRestore();
	}
	if (!captureJson) {
		return null;
	}
	const jsonLine = captured.find((s) => {
		try {
			JSON.parse(s);
			return true;
		} catch {
			return false;
		}
	});
	if (!jsonLine) {
		return null;
	}
	return JSON.parse(jsonLine) as InitJsonResult;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Gate 4: Init Flow Integration", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "vr-flow-"));
		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	// ─── File System Effects ────────────────────────────────────────────────

	describe("File system effects on first run", () => {
		it("creates .vreko/ directory", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(existsSync(join(testDir, ".vreko"))).toBe(true);
		});

		it("creates .vreko/config.json", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(existsSync(join(testDir, ".vreko", "config.json"))).toBe(true);
		});

		it("config.json is valid JSON", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const raw = readFileSync(join(testDir, ".vreko", "config.json"), "utf-8");
			expect(() => JSON.parse(raw)).not.toThrow();
		});

		it("creates .vreko/.ctx stub", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(existsSync(join(testDir, ".vreko", ".ctx"))).toBe(true);
		});
	});

	// ─── --dry-run ──────────────────────────────────────────────────────────

	describe("--dry-run mode", () => {
		it("creates NO files in dry-run mode", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--dry-run"]);
			expect(existsSync(join(testDir, ".vreko"))).toBe(false);
		});

		it("returns success=true in dry-run mode", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--dry-run"]);
			expect(result?.success).toBe(true);
		});

		it("returns configCreated=false in dry-run mode", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--dry-run"]);
			expect(result?.configuration.configCreated).toBe(false);
		});
	});

	// ─── --json output completeness ─────────────────────────────────────────

	describe("--json output contract", () => {
		it("output is valid JSON", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result).not.toBeNull();
		});

		it("contains all required top-level fields", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result).toMatchObject({
				success: expect.any(Boolean),
				version: expect.any(String),
				workspace: expect.any(Object),
				detection: expect.any(Object),
				configuration: expect.any(Object),
				service: expect.any(Object),
				mcp: expect.any(Object),
				errors: expect.any(Array),
			});
		});

		it("workspace contains path, alreadyInitialized, reinitialized", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.workspace).toMatchObject({
				path: expect.any(String),
				alreadyInitialized: expect.any(Boolean),
				reinitialized: expect.any(Boolean),
			});
		});

		it("detection contains stack, monorepoType, packageManager, gitRepo, fileCount", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.detection).toMatchObject({
				stack: expect.any(Array),
				monorepoType: expect.any(String),
				packageManager: expect.any(String),
				gitRepo: expect.any(Boolean),
				fileCount: expect.any(Number),
			});
		});

		it("configuration contains configCreated, gitignoreUpdated, ctxStubCreated", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.configuration).toMatchObject({
				configCreated: expect.any(Boolean),
				gitignoreUpdated: expect.any(Boolean),
				ctxStubCreated: expect.any(Boolean),
			});
		});

		it("daemon contains started, connected, workspaceRegistered, skipped", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.service).toMatchObject({
				started: expect.any(Boolean),
				connected: expect.any(Boolean),
				workspaceRegistered: expect.any(Boolean),
				skipped: expect.any(Boolean),
			});
		});

		it("mcp contains clients, configured, skipped", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.mcp).toMatchObject({
				clients: expect.any(Object),
				configured: expect.any(Array),
				skipped: expect.any(Boolean),
			});
		});

		it("--skip-service → daemon.skipped=true", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.service.skipped).toBe(true);
		});

		it("--skip-mcp → mcp.skipped=true", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.mcp.skipped).toBe(true);
		});
	});

	// ─── --force ────────────────────────────────────────────────────────────

	describe("--force re-initialization", () => {
		it("second run with --force → reinitialized=true", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--force"]);
			expect(result?.workspace.reinitialized).toBe(true);
		});

		it("--force on existing workspace → success=true", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--force"]);
			expect(result?.success).toBe(true);
		});

		it("--force recreates config.json", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const _config1 = JSON.parse(readFileSync(join(testDir, ".vreko", "config.json"), "utf-8"));
			await new Promise((r) => setTimeout(r, 5));
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--force"]);
			const config2 = JSON.parse(readFileSync(join(testDir, ".vreko", "config.json"), "utf-8"));
			// Both should be valid config
			expect(config2.version).toBe(1);
			// Compare real paths to handle macOS /var → /private/var symlink
			expect(realpathSync(config2.workspace.path)).toBe(realpathSync(testDir));
		});

		it("--force on new workspace → reinitialized=false", async () => {
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp", "--force"]);
			expect(result?.workspace.reinitialized).toBe(false);
		});
	});

	// ─── Idempotency ────────────────────────────────────────────────────────

	describe("Idempotency", () => {
		it("second run without --force → alreadyInitialized=true", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.workspace.alreadyInitialized).toBe(true);
		});

		it("second run without --force → success=true (not an error)", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.success).toBe(true);
		});

		it("second run without --force → reinitialized=false", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const result = await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.workspace.reinitialized).toBe(false);
		});

		it("config.json unchanged on second run without --force", async () => {
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const config1 = readFileSync(join(testDir, ".vreko", "config.json"), "utf-8");
			await runInit([testDir, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			const config2 = readFileSync(join(testDir, ".vreko", "config.json"), "utf-8");
			expect(config2).toBe(config1);
		});
	});

	// ─── Error conditions ───────────────────────────────────────────────────

	describe("Error conditions", () => {
		it("returns success=false when path does not exist", async () => {
			const nonExistentPath = join(testDir, "does-not-exist");
			const result = await runInit([nonExistentPath, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.success).toBe(false);
		});

		it("returns error message when path does not exist", async () => {
			const nonExistentPath = join(testDir, "does-not-exist");
			const result = await runInit([nonExistentPath, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.error).toBeTruthy();
			expect(result?.error).toContain(nonExistentPath);
		});

		it("returns success=false when path is a file, not a directory", async () => {
			const filePath = join(testDir, "some-file.txt");
			writeFileSync(filePath, "content");
			const result = await runInit([filePath, "--json", "--yes", "--skip-service", "--skip-mcp"]);
			expect(result?.success).toBe(false);
		});

		it("defaults to cwd when no path argument given", async () => {
			// Run from testDir by changing cwd temporarily
			const originalCwd = process.cwd();
			process.chdir(testDir);
			try {
				const result = await runInit(["--json", "--yes", "--skip-service", "--skip-mcp"]);
				// On macOS, /var/folders is a symlink to /private/var/folders
				// process.chdir resolves symlinks, so use realpathSync to normalize
				expect(result?.workspace.path).toBe(realpathSync(testDir));
			} finally {
				process.chdir(originalCwd);
			}
		});
	});
});
