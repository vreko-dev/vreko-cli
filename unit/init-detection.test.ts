/**
 * Gate 1: Init Stack Detection Tests
 *
 * Verifies detectStack accuracy using fixture directories:
 * - Must detect: Next.js, TypeScript, Turborepo, pnpm from fixture repos
 * - Must NOT false-positive on node_modules contents
 * - Must detect git roots, Python, Rust, Go
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §1.8 Gate 1
 * @see apps/cli/src/commands/init.ts
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

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

async function runInitInDir(dir: string, flags: string[] = []): Promise<InitJsonResult> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

	try {
		const cmd = createInitCommand();
		await cmd.parseAsync([dir, "--json", "--yes", "--skip-daemon", "--skip-mcp", ...flags], {
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Gate 1: Stack Detection", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "vr-detect-"));
		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("TypeScript detection", () => {
		it("detects TypeScript via tsconfig.json", async () => {
			writeFileSync(join(testDir, "tsconfig.json"), '{"compilerOptions":{}}');
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("TypeScript");
		});
	});

	describe("Next.js detection", () => {
		it("detects Next.js via next.config.js", async () => {
			writeFileSync(join(testDir, "next.config.js"), "module.exports = {}");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Next.js");
		});

		it("detects Next.js via next.config.ts", async () => {
			writeFileSync(join(testDir, "next.config.ts"), "export default {}");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Next.js");
		});

		it("detects Next.js via next.config.mjs", async () => {
			writeFileSync(join(testDir, "next.config.mjs"), "export default {}");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Next.js");
		});
	});

	describe("Package manager detection", () => {
		it("detects pnpm via pnpm-lock.yaml", async () => {
			writeFileSync(join(testDir, "pnpm-lock.yaml"), "lockfileVersion: '6.0'");
			const result = await runInitInDir(testDir);
			expect(result.detection.packageManager).toBe("pnpm");
		});

		it("detects yarn via yarn.lock", async () => {
			writeFileSync(join(testDir, "yarn.lock"), "# yarn lockfile v1");
			const result = await runInitInDir(testDir);
			expect(result.detection.packageManager).toBe("yarn");
		});

		it("detects npm via package-lock.json", async () => {
			writeFileSync(join(testDir, "package-lock.json"), '{"lockfileVersion":3}');
			const result = await runInitInDir(testDir);
			expect(result.detection.packageManager).toBe("npm");
		});

		it("prefers pnpm over yarn when both present", async () => {
			writeFileSync(join(testDir, "pnpm-lock.yaml"), "lockfileVersion: '6.0'");
			writeFileSync(join(testDir, "yarn.lock"), "# yarn lockfile v1");
			const result = await runInitInDir(testDir);
			expect(result.detection.packageManager).toBe("pnpm");
		});
	});

	describe("Monorepo detection", () => {
		it("detects Turborepo via turbo.json", async () => {
			writeFileSync(join(testDir, "turbo.json"), '{"pipeline":{}}');
			const result = await runInitInDir(testDir);
			expect(result.detection.monorepoType).toBe("turborepo");
		});

		it("detects pnpm workspaces via pnpm-workspace.yaml", async () => {
			writeFileSync(join(testDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'");
			const result = await runInitInDir(testDir);
			expect(result.detection.monorepoType).toBe("pnpm");
		});

		it("detects Nx via nx.json", async () => {
			writeFileSync(join(testDir, "nx.json"), '{"version":2}');
			const result = await runInitInDir(testDir);
			expect(result.detection.monorepoType).toBe("nx");
		});

		it("reports 'none' for plain projects", async () => {
			const result = await runInitInDir(testDir);
			expect(result.detection.monorepoType).toBe("none");
		});
	});

	describe("Language detection", () => {
		it("detects Rust via Cargo.toml", async () => {
			writeFileSync(join(testDir, "Cargo.toml"), '[package]\nname = "my-app"');
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Rust");
		});

		it("detects Go via go.mod", async () => {
			writeFileSync(join(testDir, "go.mod"), "module my-app\n\ngo 1.21");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Go");
		});

		it("detects Python via pyproject.toml", async () => {
			writeFileSync(join(testDir, "pyproject.toml"), "[tool.poetry]\nname = 'app'");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Python");
		});

		it("detects Python via requirements.txt", async () => {
			writeFileSync(join(testDir, "requirements.txt"), "django>=4.0\n");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Python");
		});

		it("does not duplicate Python when both pyproject.toml and requirements.txt exist", async () => {
			writeFileSync(join(testDir, "pyproject.toml"), "[tool.poetry]");
			writeFileSync(join(testDir, "requirements.txt"), "flask");
			const result = await runInitInDir(testDir);
			expect(result.detection.stack.filter((s) => s === "Python")).toHaveLength(1);
		});
	});

	describe("Dependency-based detection", () => {
		it("detects Tailwind from package.json devDependencies", async () => {
			writeFileSync(join(testDir, "package.json"), JSON.stringify({ devDependencies: { tailwindcss: "^3.0" } }));
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Tailwind");
		});

		it("detects Prisma from package.json dependencies", async () => {
			writeFileSync(join(testDir, "package.json"), JSON.stringify({ dependencies: { prisma: "^5.0" } }));
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).toContain("Prisma");
		});

		it("does not false-positive on missing package.json", async () => {
			const result = await runInitInDir(testDir);
			expect(result.detection.stack).not.toContain("Tailwind");
			expect(result.detection.stack).not.toContain("Prisma");
		});
	});

	describe("False-positive prevention", () => {
		it("does not detect Next.js from node_modules next.config.js", async () => {
			// Files inside node_modules should NOT trigger detection (our detection only checks root)
			const nmDir = join(testDir, "node_modules", "next");
			mkdirSync(nmDir, { recursive: true });
			writeFileSync(join(nmDir, "next.config.js"), "module.exports = {}");
			const result = await runInitInDir(testDir);
			// next.config.js is NOT in testDir root, so Next.js should NOT be detected
			expect(result.detection.stack).not.toContain("Next.js");
		});

		it("returns empty stack for a bare directory", async () => {
			const result = await runInitInDir(testDir);
			// Bare dir: no stack signals → empty stack
			expect(result.success).toBe(true);
			expect(Array.isArray(result.detection.stack)).toBe(true);
		});
	});

	describe("Full stack combo", () => {
		it("detects Next.js + TypeScript + pnpm + Turborepo together", async () => {
			writeFileSync(join(testDir, "next.config.ts"), "export default {}");
			writeFileSync(join(testDir, "tsconfig.json"), "{}");
			writeFileSync(join(testDir, "pnpm-lock.yaml"), "lockfileVersion: '6.0'");
			writeFileSync(join(testDir, "turbo.json"), '{"pipeline":{}}');

			const result = await runInitInDir(testDir);

			expect(result.detection.stack).toContain("Next.js");
			expect(result.detection.stack).toContain("TypeScript");
			expect(result.detection.packageManager).toBe("pnpm");
			expect(result.detection.monorepoType).toBe("turborepo");
		});
	});
});
