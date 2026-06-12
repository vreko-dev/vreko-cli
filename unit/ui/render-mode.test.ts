/** Render Mode Guard Tests (Phase 31). Covers: CLI-01 (getRenderMode 4-way enum). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cliState } from "../../../src/cli-state.js";
import { getRenderMode } from "../../../src/ui/guards.js";

beforeEach(() => {
	delete process.env.VREKO_JSON;
	delete process.env.VREKO_PLAIN;
	delete process.env.CI;
	// Default: TTY is true, no env overrides
	vi.stubGlobal("process", {
		...process,
		env: { ...process.env },
		stdout: { ...process.stdout, isTTY: true },
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	delete process.env.VREKO_JSON;
	delete process.env.VREKO_PLAIN;
	delete process.env.CI;
});

describe("getRenderMode()", () => {
	describe("JSON mode", () => {
		it("CLI-01: getRenderMode() returns 'json' when VREKO_JSON=1", () => {
			vi.stubGlobal("process", {
				...process,
				env: { ...process.env, VREKO_JSON: "1" },
				stdout: { ...process.stdout, isTTY: true },
			});
			const result = getRenderMode();
			expect(result).toBe("json");
		});

		it("CLI-01: getRenderMode() returns 'json' when VREKO_JSON=true", () => {
			vi.stubGlobal("process", {
				...process,
				env: { ...process.env, VREKO_JSON: "true" },
				stdout: { ...process.stdout, isTTY: true },
			});
			const result = getRenderMode();
			expect(result).toBe("json");
		});
	});

	describe("plain mode", () => {
		it("CLI-01: getRenderMode() returns 'plain' when VREKO_PLAIN=1", () => {
			vi.stubGlobal("process", {
				...process,
				env: { ...process.env, VREKO_PLAIN: "1" },
				stdout: { ...process.stdout, isTTY: true },
			});
			const result = getRenderMode();
			expect(result).toBe("plain");
		});

		it("CLI-01: getRenderMode() returns 'plain' when not a TTY", () => {
			vi.stubGlobal("process", {
				...process,
				env: { ...process.env },
				stdout: { ...process.stdout, isTTY: false },
			});
			const result = getRenderMode();
			expect(result).toBe("plain");
		});

		it("CLI-01: getRenderMode() returns 'plain' when CI=true", () => {
			vi.stubGlobal("process", {
				...process,
				env: { ...process.env, CI: "true" },
				stdout: { ...process.stdout, isTTY: true },
			});
			const result = getRenderMode();
			expect(result).toBe("plain");
		});
	});

	describe("ink mode", () => {
		it("CLI-01: getRenderMode() returns 'ink' when TTY with no overrides", () => {
			// beforeEach sets isTTY=true, no env overrides
			const result = getRenderMode();
			expect(result).toBe("ink");
		});
	});

	describe("priority order", () => {
		it("CLI-01: json mode beats plain when both VREKO_JSON and VREKO_PLAIN are set", () => {
			vi.stubGlobal("process", {
				...process,
				env: { ...process.env, VREKO_JSON: "1", VREKO_PLAIN: "1" },
				stdout: { ...process.stdout, isTTY: true },
			});
			const result = getRenderMode();
			expect(result).toBe("json");
		});
	});

	describe("cliState field", () => {
		it("CLI-01: cliState.renderMode field exists", () => {
			// Validates that cliState exposes the renderMode field set by getRenderMode()
			expect("renderMode" in cliState).toBe(true);
		});
	});
});
