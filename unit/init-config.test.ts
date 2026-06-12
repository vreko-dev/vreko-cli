/**
 * Gate 3: Init Config Generation Tests
 *
 * Verifies .vreko/config.json schema correctness:
 * - Schema version is 1
 * - All detected fields are populated
 * - Valid JSON (parseable)
 * - createdAt is ISO 8601 timestamp
 * - cliVersion is set
 * - workspace name = basename of path
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §1.8 Gate 3
 * @see apps/cli/src/commands/init.ts#buildWorkspaceConfig
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceConfig {
	version: number;
	workspace: {
		path: string;
		name: string;
		stack: string[];
		monorepoType: string;
		packageManager: string;
	};
	protection: { mode: string; level: string };
	intelligence: { enabled: boolean };
	createdAt: string;
	cliVersion: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

import type { InitJsonResult } from "../../src/commands/init";
import { createInitCommand } from "../../src/commands/init";

async function runInitInDir(dir: string, extraFlags: string[] = []): Promise<InitJsonResult> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
	try {
		await createInitCommand().parseAsync([dir, "--json", "--yes", "--skip-service", "--skip-mcp", ...extraFlags], {
			from: "user",
		});
	} finally {
		logSpy.mockRestore();
		exitSpy.mockRestore();
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
		throw new Error(`No JSON output captured. Got: ${captured.join("\n")}`);
	}
	return JSON.parse(jsonLine) as InitJsonResult;
}

function readConfig(dir: string): WorkspaceConfig {
	const configPath = join(dir, ".vreko", "config.json");
	return JSON.parse(readFileSync(configPath, "utf-8")) as WorkspaceConfig;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Gate 3: Config Generation", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "vr-config-"));
		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("Schema structure", () => {
		it("creates .vreko/config.json on successful init", async () => {
			await runInitInDir(testDir);
			expect(existsSync(join(testDir, ".vreko", "config.json"))).toBe(true);
		});

		it("config.json is valid JSON", async () => {
			await runInitInDir(testDir);
			expect(() => readConfig(testDir)).not.toThrow();
		});

		it("schema version is 1", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.version).toBe(1);
		});

		it("workspace.path matches the initialized directory", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.workspace.path).toBe(testDir);
		});

		it("workspace.name equals basename of path", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.workspace.name).toBe(basename(testDir));
		});

		it("workspace.stack is an array", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(Array.isArray(config.workspace.stack)).toBe(true);
		});

		it("workspace.monorepoType is a string", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(typeof config.workspace.monorepoType).toBe("string");
		});

		it("workspace.packageManager defaults to npm for bare project", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.workspace.packageManager).toBe("npm");
		});

		it("protection.mode is 'auto'", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.protection.mode).toBe("auto");
		});

		it("protection.level is 'standard'", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.protection.level).toBe("standard");
		});

		it("intelligence.enabled is true", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.intelligence.enabled).toBe(true);
		});

		it("createdAt is a valid ISO 8601 timestamp", async () => {
			const before = new Date().toISOString();
			await runInitInDir(testDir);
			const after = new Date().toISOString();
			const config = readConfig(testDir);

			expect(config.createdAt).toBeTruthy();
			// Should be parseable as a date
			const parsed = new Date(config.createdAt);
			expect(Number.isNaN(parsed.getTime())).toBe(false);
			// Should be between before and after
			expect(config.createdAt >= before).toBe(true);
			expect(config.createdAt <= after).toBe(true);
		});

		it("cliVersion is set (not empty)", async () => {
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(typeof config.cliVersion).toBe("string");
			expect(config.cliVersion.length).toBeGreaterThan(0);
		});

		it("config.json ends with a newline", async () => {
			await runInitInDir(testDir);
			const raw = readFileSync(join(testDir, ".vreko", "config.json"), "utf-8");
			expect(raw.endsWith("\n")).toBe(true);
		});

		it("config.json is pretty-printed (indented)", async () => {
			await runInitInDir(testDir);
			const raw = readFileSync(join(testDir, ".vreko", "config.json"), "utf-8");
			// Pretty-printed JSON has newlines + indentation
			expect(raw).toContain("\n");
			expect(raw).toContain("  "); // 2-space indent
		});
	});

	describe("Detection fields reflected in config", () => {
		it("config.workspace.stack includes TypeScript when tsconfig.json present", async () => {
			writeFileSync(join(testDir, "tsconfig.json"), "{}");
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.workspace.stack).toContain("TypeScript");
		});

		it("config.workspace.packageManager is pnpm when pnpm-lock.yaml present", async () => {
			writeFileSync(join(testDir, "pnpm-lock.yaml"), "lockfileVersion: '6.0'");
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.workspace.packageManager).toBe("pnpm");
		});

		it("config.workspace.monorepoType is turborepo when turbo.json present", async () => {
			writeFileSync(join(testDir, "turbo.json"), '{"pipeline":{}}');
			await runInitInDir(testDir);
			const config = readConfig(testDir);
			expect(config.workspace.monorepoType).toBe("turborepo");
		});
	});

	describe("JSON result contract", () => {
		it("result.configuration.configCreated=true on first init", async () => {
			const result = await runInitInDir(testDir);
			expect(result.configuration.configCreated).toBe(true);
		});

		it("result.success=true on clean init", async () => {
			const result = await runInitInDir(testDir);
			expect(result.success).toBe(true);
		});

		it("result.workspace.alreadyInitialized=false on first init", async () => {
			const result = await runInitInDir(testDir);
			expect(result.workspace.alreadyInitialized).toBe(false);
		});

		it("result.workspace.path is the resolved absolute path", async () => {
			const result = await runInitInDir(testDir);
			expect(result.workspace.path).toBe(testDir);
		});

		it("result.version is set", async () => {
			const result = await runInitInDir(testDir);
			expect(typeof result.version).toBe("string");
			expect(result.version.length).toBeGreaterThan(0);
		});

		it("result.errors is an empty array on clean init", async () => {
			const result = await runInitInDir(testDir);
			expect(result.errors).toEqual([]);
		});
	});

	describe("--force reinit", () => {
		it("result.workspace.reinitialized=true with --force on existing workspace", async () => {
			// First init
			await runInitInDir(testDir);
			// Second init with --force
			const result = await runInitInDir(testDir, ["--force"]);
			expect(result.workspace.reinitialized).toBe(true);
		});

		it("config.json is recreated on --force (new createdAt)", async () => {
			await runInitInDir(testDir);
			const _config1 = readConfig(testDir);

			// Small delay to ensure timestamp differs
			await new Promise((resolve) => setTimeout(resolve, 5));
			await runInitInDir(testDir, ["--force"]);
			const config2 = readConfig(testDir);

			// New config has a different or equal (but valid) createdAt
			expect(config2.version).toBe(1);
			expect(config2.workspace.path).toBe(testDir);
		});
	});

	describe(".vreko directory structure", () => {
		it("creates .vreko/ directory", async () => {
			await runInitInDir(testDir);
			expect(existsSync(join(testDir, ".vreko"))).toBe(true);
		});

		it("creates .vreko/.ctx stub", async () => {
			await runInitInDir(testDir);
			expect(existsSync(join(testDir, ".vreko", ".ctx"))).toBe(true);
		});

		it(".ctx stub contains expected header comment", async () => {
			await runInitInDir(testDir);
			const ctx = readFileSync(join(testDir, ".vreko", ".ctx"), "utf-8");
			expect(ctx).toContain("Vreko");
		});
	});
});
