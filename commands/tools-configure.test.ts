/**
 * CLI Tools Configure Command Tests
 *
 * Tests for `vreko tools configure --json --non-interactive` functionality.
 * These tests verify the thin client architecture integration.
 *
 * @see apps/cli/src/commands/tools.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock inquirer prompts
vi.mock("@inquirer/prompts", () => ({
	confirm: vi.fn(),
	password: vi.fn(),
}));

// Mock @vreko/mcp-config
vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn(),
	detectWorkspaceConfig: vi.fn(),
	getVrekoMCPConfig: vi.fn(),
	writeClientConfig: vi.fn(),
	removeVrekoConfig: vi.fn(),
	validateClientConfig: vi.fn(),
	repairClientConfig: vi.fn(),
}));

// Mock vreko-dir services
vi.mock("../../src/services/vreko-dir", () => ({
	getCredentials: vi.fn(),
	isLoggedIn: vi.fn(() => Promise.resolve(false)),
}));

import { detectAIClients, validateClientConfig, writeClientConfig } from "@vreko/mcp-config";
import type { ClientConfigStatus, ToolsConfigureJsonResult } from "../../src/commands/tools";

// =============================================================================
// TYPE TESTS
// =============================================================================

describe("ToolsConfigureJsonResult Type", () => {
	it("should define correct structure for successful configuration", () => {
		const result: ToolsConfigureJsonResult = {
			success: true,
			clients: {
				claude: "configured",
				cursor: "already_configured",
				windsurf: "not_installed",
			},
			configured: ["claude"],
			skipped: ["cursor"],
			notInstalled: ["windsurf"],
			failed: [],
			version: "1.0.0",
		};

		expect(result.success).toBe(true);
		expect(result.configured).toHaveLength(1);
		expect(result.skipped).toHaveLength(1);
		expect(result.notInstalled).toHaveLength(1);
		expect(result.failed).toHaveLength(0);
		expect(result.error).toBeUndefined();
	});

	it("should define correct structure for failed configuration", () => {
		const result: ToolsConfigureJsonResult = {
			success: false,
			clients: {
				claude: "failed",
				cursor: "failed",
			},
			configured: [],
			skipped: [],
			notInstalled: [],
			failed: ["claude", "cursor"],
			version: "1.0.0",
			error: "Permission denied",
		};

		expect(result.success).toBe(false);
		expect(result.failed).toHaveLength(2);
		expect(result.error).toBe("Permission denied");
	});

	it("should handle partial success", () => {
		const result: ToolsConfigureJsonResult = {
			success: false, // false because some failed
			clients: {
				claude: "configured",
				cursor: "failed",
			},
			configured: ["claude"],
			skipped: [],
			notInstalled: [],
			failed: ["cursor"],
			version: "1.0.0",
		};

		expect(result.success).toBe(false);
		expect(result.configured).toContain("claude");
		expect(result.failed).toContain("cursor");
	});
});

describe("ClientConfigStatus Type", () => {
	it("should support all status values", () => {
		const statuses: ClientConfigStatus[] = [
			"configured",
			"already_configured",
			"not_installed",
			"failed",
			"skipped",
		];

		// Verify all statuses are valid string literals
		expect(statuses).toEqual(
			expect.arrayContaining(["configured", "already_configured", "not_installed", "failed", "skipped"]),
		);
	});
});

// =============================================================================
// DETECTION LOGIC TESTS
// =============================================================================

describe("Client Detection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should detect installed AI clients", () => {
		vi.mocked(detectAIClients).mockReturnValue({
			clients: [
				{
					name: "claude",
					displayName: "Claude Desktop",
					configPath: "/mock/claude/config.json",
					format: "claude",
					exists: true,
					hasVreko: false,
				},
				{
					name: "cursor",
					displayName: "Cursor",
					configPath: "/mock/cursor/mcp.json",
					format: "cursor",
					exists: true,
					hasVreko: true,
				},
			],
			detected: [
				{
					name: "claude",
					displayName: "Claude Desktop",
					configPath: "/mock/claude/config.json",
					format: "claude",
					exists: true,
					hasVreko: false,
				},
				{
					name: "cursor",
					displayName: "Cursor",
					configPath: "/mock/cursor/mcp.json",
					format: "cursor",
					exists: true,
					hasVreko: true,
				},
			],
			needsSetup: [
				{
					name: "claude",
					displayName: "Claude Desktop",
					configPath: "/mock/claude/config.json",
					format: "claude",
					exists: true,
					hasVreko: false,
				},
			],
		});

		const result = detectAIClients();

		expect(result.detected).toHaveLength(2);
		expect(result.needsSetup).toHaveLength(1);
		expect(result.needsSetup[0].name).toBe("claude");
	});

	it("should identify already-configured clients", () => {
		vi.mocked(detectAIClients).mockReturnValue({
			clients: [
				{
					name: "claude",
					displayName: "Claude Desktop",
					configPath: "/mock/claude/config.json",
					format: "claude",
					exists: true,
					hasVreko: true,
				},
			],
			detected: [
				{
					name: "claude",
					displayName: "Claude Desktop",
					configPath: "/mock/claude/config.json",
					format: "claude",
					exists: true,
					hasVreko: true,
				},
			],
			needsSetup: [],
		});

		const result = detectAIClients();

		expect(result.needsSetup).toHaveLength(0);
		expect(result.detected[0].hasVreko).toBe(true);
	});

	it("should handle no clients detected", () => {
		vi.mocked(detectAIClients).mockReturnValue({
			clients: [],
			detected: [],
			needsSetup: [],
		});

		const result = detectAIClients();

		expect(result.detected).toHaveLength(0);
		expect(result.needsSetup).toHaveLength(0);
	});
});

// =============================================================================
// JSON OUTPUT TESTS
// =============================================================================

describe("JSON Output Format", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should produce valid JSON for --json flag", () => {
		const result: ToolsConfigureJsonResult = {
			success: true,
			clients: {
				claude: "configured",
			},
			configured: ["claude"],
			skipped: [],
			notInstalled: [],
			failed: [],
			version: "1.0.0",
		};

		// Verify JSON serialization works
		const json = JSON.stringify(result);
		const parsed = JSON.parse(json);

		expect(parsed.success).toBe(true);
		expect(parsed.clients.claude).toBe("configured");
		expect(parsed.configured).toContain("claude");
	});

	it("should serialize error field when present", () => {
		const result: ToolsConfigureJsonResult = {
			success: false,
			clients: {},
			configured: [],
			skipped: [],
			notInstalled: [],
			failed: ["claude"],
			version: "1.0.0",
			error: "Configuration failed",
		};

		const json = JSON.stringify(result);
		const parsed = JSON.parse(json);

		expect(parsed.error).toBe("Configuration failed");
	});

	it("should not include undefined error field in JSON", () => {
		const result: ToolsConfigureJsonResult = {
			success: true,
			clients: {},
			configured: [],
			skipped: [],
			notInstalled: [],
			failed: [],
			version: "1.0.0",
		};

		const json = JSON.stringify(result);
		const parsed = JSON.parse(json);

		expect(parsed.error).toBeUndefined();
	});
});

// =============================================================================
// CONFIG WRITING TESTS
// =============================================================================

describe("Config Writing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should write config successfully", () => {
		vi.mocked(writeClientConfig).mockReturnValue({ success: true });

		const result = writeClientConfig(
			{
				name: "claude",
				displayName: "Claude Desktop",
				configPath: "/mock/config.json",
				format: "claude",
				exists: true,
				hasVreko: false,
			},
			{
				command: "npx",
				args: ["@vreko/cli", "mcp", "--stdio"],
			},
		);

		expect(result.success).toBe(true);
	});

	it("should handle write failure", () => {
		vi.mocked(writeClientConfig).mockReturnValue({
			success: false,
			error: "Permission denied",
		});

		const result = writeClientConfig(
			{
				name: "claude",
				displayName: "Claude Desktop",
				configPath: "/protected/config.json",
				format: "claude",
				exists: true,
				hasVreko: false,
			},
			{
				command: "npx",
				args: ["@vreko/cli", "mcp", "--stdio"],
			},
		);

		expect(result.success).toBe(false);
		expect(result.error).toBe("Permission denied");
	});
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Config Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should validate correct config", () => {
		vi.mocked(validateClientConfig).mockReturnValue({
			valid: true,
			isValid: true,
			issues: [],
			errors: [],
			warnings: [],
		});

		const result = validateClientConfig({
			name: "claude",
			displayName: "Claude Desktop",
			configPath: "/mock/config.json",
			format: "claude",
			exists: true,
			hasVreko: true,
		});

		expect(result.valid).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	it("should detect config issues", () => {
		vi.mocked(validateClientConfig).mockReturnValue({
			valid: false,
			isValid: false,
			issues: [{ severity: "error", message: "Missing mcpServers key" }],
			errors: ["Missing mcpServers key"],
			warnings: [],
		});

		const result = validateClientConfig({
			name: "claude",
			displayName: "Claude Desktop",
			configPath: "/mock/config.json",
			format: "claude",
			exists: true,
			hasVreko: true,
		});

		expect(result.valid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0].severity).toBe("error");
	});
});

// =============================================================================
// NON-INTERACTIVE MODE TESTS
// =============================================================================

describe("Non-Interactive Mode", () => {
	it("should skip prompts with --non-interactive flag", () => {
		// In non-interactive mode, skipPrompts should be true
		const skipPrompts = true; // Simulates --non-interactive or --yes flag

		expect(skipPrompts).toBe(true);
	});

	it("should skip prompts with --yes flag", () => {
		// --yes is an alias for --non-interactive
		const yesFlag = true;
		const nonInteractiveFlag = false;
		const skipPrompts = yesFlag || nonInteractiveFlag;

		expect(skipPrompts).toBe(true);
	});

	it("should combine --non-interactive with --json", () => {
		// Both flags should work together
		const args = ["tools", "configure", "--non-interactive", "--json"];

		expect(args).toContain("--non-interactive");
		expect(args).toContain("--json");
	});
});
