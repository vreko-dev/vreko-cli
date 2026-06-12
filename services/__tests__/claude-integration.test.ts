/**
 * Regression tests for claude-integration.ts
 *
 * REQ-001: writeVrekoToClaudeCodeGlobalSettings  -  hermetic unit tests
 * REQ-002: resolveMcpCommand / buildMcpJson  -  absolute-path unit tests
 *
 * All tests mock homedir() so the real ~/.claude/settings.json is never touched.
 * All tests mock node:fs so no real filesystem I/O occurs.
 *
 * Locked in 2026-05-20  -  Pioneer cohort launch blocker.
 */

import { existsSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks (hoisted before any imports that consume them) ──────────────────────

// REQ-001 anti-pattern guard: mock homedir so tests never touch ~/.claude in CI
vi.mock("node:os", () => ({
	homedir: vi.fn().mockReturnValue("/tmp/test-home"),
}));

// Mock resolveVrekoBinaryPath to be deterministic regardless of PATH
vi.mock("@vreko/mcp-config", () => ({
	resolveVrekoBinaryPath: vi.fn().mockReturnValue("/usr/local/bin/vreko"),
}));

// Mock node:fs to prevent all real disk I/O
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	createHash: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { homedir } from "node:os";
import { resolveVrekoBinaryPath } from "@vreko/mcp-config";
import { generateClaudeIntegration } from "../claude-integration.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const SETTINGS_PATH = "/tmp/test-home/.claude/settings.json";

// ── REQ-001: writeVrekoToClaudeCodeGlobalSettings ────────────────────────────

describe("writeVrekoToClaudeCodeGlobalSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(homedir).mockReturnValue("/tmp/test-home");
		vi.mocked(resolveVrekoBinaryPath).mockReturnValue("/usr/local/bin/vreko");
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("merges vreko entry into an existing settings.json without overwriting other entries", async () => {
		const existing = {
			mcpServers: {
				"some-other-tool": { command: "/usr/bin/other", args: [] },
			},
		};
		vi.mocked(existsSync).mockReturnValue(true);
		const { readFileSync } = await import("node:fs");
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));
		vi.mocked(writeFileSync).mockReturnValue(undefined);

		const result = generateClaudeIntegration({ workspacePath: "/fake/workspace", overwrite: true });

		expect(result.globalSettingsUpdated).toBe(true);
		const written = vi.mocked(writeFileSync).mock.calls.find((call) => call[0] === SETTINGS_PATH);
		expect(written).toBeDefined();
		const parsed = JSON.parse(written![1] as string);
		expect(parsed.mcpServers["some-other-tool"]).toBeDefined();
		expect(parsed.mcpServers.vreko).toBeDefined();
		expect(parsed.mcpServers.vreko.command).toBe("/usr/local/bin/vreko");
	});

	it("is idempotent  -  second call with same command returns false and does not re-write", async () => {
		const existingWithVreko = {
			mcpServers: {
				vreko: { command: "/usr/local/bin/vreko", args: ["mcp", "--stdio"] },
			},
		};
		vi.mocked(existsSync).mockReturnValue(true);
		const { readFileSync } = await import("node:fs");
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingWithVreko));

		const result = generateClaudeIntegration({ workspacePath: "/fake/workspace", overwrite: true });

		expect(result.globalSettingsUpdated).toBe(false);
		const settingsWrite = vi.mocked(writeFileSync).mock.calls.find((call) => call[0] === SETTINGS_PATH);
		expect(settingsWrite).toBeUndefined();
	});

	it("returns false gracefully when settings.json does not exist  -  no file is created", () => {
		vi.mocked(existsSync).mockImplementation((p) => {
			if (String(p) === SETTINGS_PATH) return false;
			return true;
		});

		const result = generateClaudeIntegration({ workspacePath: "/fake/workspace", overwrite: true });

		expect(result.globalSettingsUpdated).toBe(false);
		const settingsWrite = vi.mocked(writeFileSync).mock.calls.find((call) => call[0] === SETTINGS_PATH);
		expect(settingsWrite).toBeUndefined();
	});

	it("does NOT overwrite existing non-vreko entries in mcpServers", async () => {
		const existing = {
			mcpServers: {
				cursor: { command: "/cursor-bin", args: [] },
				codex: { command: "/codex-bin", args: [] },
			},
		};
		vi.mocked(existsSync).mockReturnValue(true);
		const { readFileSync } = await import("node:fs");
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));
		vi.mocked(writeFileSync).mockReturnValue(undefined);

		generateClaudeIntegration({ workspacePath: "/fake/workspace", overwrite: true });

		const written = vi.mocked(writeFileSync).mock.calls.find((call) => call[0] === SETTINGS_PATH);
		expect(written).toBeDefined();
		const parsed = JSON.parse(written![1] as string);
		expect(parsed.mcpServers.cursor).toEqual({ command: "/cursor-bin", args: [] });
		expect(parsed.mcpServers.codex).toEqual({ command: "/codex-bin", args: [] });
	});

	it("updates the entry when the command path changes (binary reinstalled to new path)", async () => {
		const existingWithOldPath = {
			mcpServers: {
				vreko: { command: "/old/path/vreko", args: ["mcp", "--stdio"] },
			},
		};
		vi.mocked(existsSync).mockReturnValue(true);
		const { readFileSync } = await import("node:fs");
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingWithOldPath));
		vi.mocked(writeFileSync).mockReturnValue(undefined);
		vi.mocked(resolveVrekoBinaryPath).mockReturnValue("/new/path/vreko");

		const result = generateClaudeIntegration({ workspacePath: "/fake/workspace", overwrite: true });

		expect(result.globalSettingsUpdated).toBe(true);
		const written = vi.mocked(writeFileSync).mock.calls.find((call) => call[0] === SETTINGS_PATH);
		expect(written).toBeDefined();
		const parsed = JSON.parse(written![1] as string);
		expect(parsed.mcpServers.vreko.command).toBe("/new/path/vreko");
	});
});

// ── REQ-002: resolveMcpCommand / buildMcpJson absolute path ─────────────────

describe("resolveMcpCommand (via buildMcpJson)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(homedir).mockReturnValue("/tmp/test-home");
		vi.mocked(resolveVrekoBinaryPath).mockReturnValue("/usr/local/bin/vreko");
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(writeFileSync).mockReturnValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("buildMcpJson command is never 'node' or 'npx' when resolveVrekoBinaryPath returns an absolute path", () => {
		generateClaudeIntegration({ workspacePath: "/my/workspace", overwrite: true });

		const mcpWrite = vi.mocked(writeFileSync).mock.calls.find((call) => String(call[0]).endsWith(".mcp.json"));
		expect(mcpWrite).toBeDefined();
		const parsed = JSON.parse(mcpWrite![1] as string);
		const command = parsed.mcpServers?.vreko?.command;
		expect(command).not.toBe("node");
		expect(command).not.toBe("npx");
		expect(command).toBe("/usr/local/bin/vreko");
	});

	it("buildMcpJson args include --workspace <path>", () => {
		generateClaudeIntegration({ workspacePath: "/my/specific/workspace", overwrite: true });

		const mcpWrite = vi.mocked(writeFileSync).mock.calls.find((call) => String(call[0]).endsWith(".mcp.json"));
		expect(mcpWrite).toBeDefined();
		const parsed = JSON.parse(mcpWrite![1] as string);
		const args = parsed.mcpServers?.vreko?.args;
		expect(args).toContain("--workspace");
		expect(args).toContain("/my/specific/workspace");
	});

	it("buildMcpJson command equals the return value of resolveVrekoBinaryPath()", () => {
		vi.mocked(resolveVrekoBinaryPath).mockReturnValue("/opt/homebrew/bin/vreko");

		generateClaudeIntegration({ workspacePath: "/any/path", overwrite: true });

		const mcpWrite = vi.mocked(writeFileSync).mock.calls.find((call) => String(call[0]).endsWith(".mcp.json"));
		expect(mcpWrite).toBeDefined();
		const parsed = JSON.parse(mcpWrite![1] as string);
		expect(parsed.mcpServers?.vreko?.command).toBe("/opt/homebrew/bin/vreko");
	});
});
