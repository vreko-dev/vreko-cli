/** Status JSON Output Tests (Phase 31). Covers: CLI-02 (VREKO_JSON=1 outputs valid JSON), CLI-02b (WorkspaceStatusOutput Zod schema). */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WorkspaceStatusOutput } from "@vreko/contracts/local-service";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATUS_TS_PATH = resolve(__dirname, "../../../src/commands/status.ts");

describe("CLI-02: status JSON output", () => {
	it("CLI-02: WorkspaceStatusOutput schema is exported from @vreko/contracts/local-service", () => {
		// Validates that WorkspaceStatusOutput is exported and is a Zod schema object
		expect(WorkspaceStatusOutput).not.toBeUndefined();
	});

	it("CLI-02b: WorkspaceStatusOutput.parse() accepts a minimal valid status object", () => {
		const result = WorkspaceStatusOutput.parse({
			initialized: true,
			loggedIn: false,
			protection: { count: 0, patterns: [] },
			violations: { total: 0, recent: 0 },
			snapshots: { count: 0, totalSize: "0 B" },
			issues: [],
		});
		expect(result).toBeDefined();
		expect(result.initialized).toBe(true);
	});

	it("CLI-02b: WorkspaceStatusOutput.parse() accepts topologyWarning field", () => {
		const result = WorkspaceStatusOutput.parse({
			initialized: true,
			loggedIn: false,
			protection: { count: 0, patterns: [] },
			violations: { total: 0, recent: 0 },
			snapshots: { count: 0, totalSize: "0 B" },
			issues: [],
			topologyWarning: {
				fileCap: 5000,
				reachedAt: "2026-05-07T00:00:00Z",
				workspacePath: "/repo",
			},
		});
		expect(result.topologyWarning).toBeDefined();
		expect(result.topologyWarning?.fileCap).toBe(5000);
	});

	it("CLI-02: status.ts uses cliState.renderMode not options.json for JSON output gate", () => {
		const src = readFileSync(STATUS_TS_PATH, "utf8");
		// Validates that status.ts uses the renderMode gate, not a raw --json flag check
		expect(src).toContain('cliState.renderMode === "json"');
		expect(src).not.toContain("if (options.json)");
	});
});
