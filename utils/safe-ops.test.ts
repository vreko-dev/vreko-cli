/**
 * Safe Operations Invariants
 *
 * Tests for createDiff(), handleDryRun(), getRecentOperations(), showAffectedFiles().
 *
 * showAffectedFiles was previously a stripped-output bug (intentionally empty loops).
 * These tests document and enforce the correct output behavior.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock clackLog to avoid TTY side effects
vi.mock("../../src/ui/prompts-clack.js", () => ({
	clackLog: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		success: vi.fn(),
		message: vi.fn(),
	},
	clackConfirm: vi.fn().mockResolvedValue(false),
}));

// Mock fs functions to avoid hitting real disk for history tests
vi.mock("node:fs", async (importOriginal) => {
	const real = await importOriginal<typeof import("node:fs")>();
	return {
		...real,
		existsSync: vi.fn((p: string) => {
			// Allow real existsSync for non-history paths
			if (String(p).includes("operation-history")) return false;
			return real.existsSync(p);
		}),
	};
});

import {
	createDiff,
	type DryRunChange,
	getRecentOperations,
	handleDryRun,
	showAffectedFiles,
} from "../../src/utils/safe-ops.js";

// ---------------------------------------------------------------------------
// createDiff()
// ---------------------------------------------------------------------------

describe("createDiff()", () => {
	it("returns empty array for identical strings", () => {
		const diff = createDiff("hello\nworld", "hello\nworld");
		expect(diff).toHaveLength(0);
	});

	it("shows added lines with + prefix", () => {
		const diff = createDiff("", "new line");
		expect(diff).toContain("+ new line");
	});

	it("shows removed lines with - prefix", () => {
		const diff = createDiff("old line", "");
		expect(diff).toContain("- old line");
	});

	it("shows changed lines as remove + add", () => {
		const diff = createDiff("old content", "new content");
		expect(diff.some((l) => l.startsWith("-"))).toBe(true);
		expect(diff.some((l) => l.startsWith("+"))).toBe(true);
	});

	it("handles multi-line diffs", () => {
		const before = "line1\nline2\nline3";
		const after = "line1\nchanged\nline3";
		const diff = createDiff(before, after);
		expect(diff).toContain("- line2");
		expect(diff).toContain("+ changed");
		// line1 and line3 unchanged, so no entries for them
		expect(diff.every((l) => !l.includes("line1") && !l.includes("line3"))).toBe(true);
	});

	it("returns an array", () => {
		expect(Array.isArray(createDiff("a", "b"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// handleDryRun()
// ---------------------------------------------------------------------------

describe("handleDryRun()", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns false when dryRun is not set", () => {
		const changes: DryRunChange[] = [{ type: "create", path: "src/auth.ts" }];
		const result = handleDryRun({}, changes);
		expect(result).toBe(false);
	});

	it("returns false when dryRun is explicitly false", () => {
		const result = handleDryRun({ dryRun: false }, []);
		expect(result).toBe(false);
	});

	it("returns true when dryRun is true", () => {
		const result = handleDryRun({ dryRun: true }, []);
		expect(result).toBe(true);
	});

	it("outputs DRY RUN info for each change", async () => {
		const { clackLog } = await import("../../src/ui/prompts-clack.js");
		const changes: DryRunChange[] = [
			{ type: "create", path: "src/new.ts" },
			{ type: "delete", path: "src/old.ts" },
			{ type: "update", path: "src/changed.ts" },
		];
		handleDryRun({ dryRun: true }, changes);
		expect(clackLog.info).toHaveBeenCalledWith(expect.stringContaining("[DRY RUN]"));
		expect(clackLog.info).toHaveBeenCalledWith(expect.stringContaining("src/new.ts"));
		expect(clackLog.info).toHaveBeenCalledWith(expect.stringContaining("src/old.ts"));
		expect(clackLog.info).toHaveBeenCalledWith(expect.stringContaining("src/changed.ts"));
	});

	it("uses + icon for create, - for delete, ~ for update", async () => {
		const { clackLog } = await import("../../src/ui/prompts-clack.js");
		vi.clearAllMocks();
		handleDryRun({ dryRun: true }, [
			{ type: "create", path: "a.ts" },
			{ type: "delete", path: "b.ts" },
			{ type: "update", path: "c.ts" },
		]);
		const calls = vi.mocked(clackLog.info).mock.calls.map((c) => c[0] as string);
		expect(calls.some((c) => c.includes("+ a.ts"))).toBe(true);
		expect(calls.some((c) => c.includes("- b.ts"))).toBe(true);
		expect(calls.some((c) => c.includes("~ c.ts"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// showAffectedFiles()  -  was a stripped-output bug
// ---------------------------------------------------------------------------

describe("showAffectedFiles()  -  output invariant (was silent bug)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("outputs each file when <= 10 files", async () => {
		const { clackLog } = await import("../../src/ui/prompts-clack.js");
		const files = ["src/auth.ts", "src/config.ts", "src/index.ts"];
		showAffectedFiles(files, "delete");
		// Each file should appear in some output call
		const allOutput = vi
			.mocked(clackLog.info)
			.mock.calls.map((c) => c[0] as string)
			.join("\n");
		for (const file of files) {
			expect(allOutput).toContain(file);
		}
	});

	it("shows first 10 files and a summary when > 10 files", async () => {
		const { clackLog } = await import("../../src/ui/prompts-clack.js");
		const files = Array.from({ length: 15 }, (_, i) => `src/file${i}.ts`);
		showAffectedFiles(files, "update");
		const allOutput = vi
			.mocked(clackLog.info)
			.mock.calls.map((c) => c[0] as string)
			.join("\n");
		// Should show the first 10
		expect(allOutput).toContain("src/file0.ts");
		expect(allOutput).toContain("src/file9.ts");
		// Should indicate the remaining 5
		expect(allOutput).toContain("5");
	});

	it("does not throw for empty files array", () => {
		expect(() => showAffectedFiles([], "delete")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getRecentOperations()
// ---------------------------------------------------------------------------

describe("getRecentOperations()", () => {
	it("returns an array", () => {
		const ops = getRecentOperations();
		expect(Array.isArray(ops)).toBe(true);
	});

	it("returns empty array when history file is missing", () => {
		const ops = getRecentOperations();
		expect(ops).toHaveLength(0);
	});

	it("respects the count parameter", () => {
		const ops = getRecentOperations(5);
		expect(ops.length).toBeLessThanOrEqual(5);
	});
});
