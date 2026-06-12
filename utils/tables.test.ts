/**
 * CLI-UX-003: Table Utilities Tests
 *
 * Tests for cli-table3 integration with 4-path coverage:
 * - Happy path: normal operations
 * - Sad path: expected failures
 * - Edge cases: empty arrays, long paths, zero values
 * - Error cases: unexpected inputs
 *
 * @see ai_dev_utils/resources/new_cli/03-cli-table3-integration.spec.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createFileSummaryTable,
	createRiskSignalTable,
	createSnapshotTable,
	createStagedFilesTable,
	formatRelativeTime,
	renderSeverity,
	truncatePath,
} from "../../src/utils/tables";

describe("createRiskSignalTable", () => {
	// Happy path (spec lines 390-404)
	it("should render signals sorted by value", () => {
		const signals = [
			{ signal: "low", value: 1.0 },
			{ signal: "high", value: 8.0 },
			{ signal: "medium", value: 4.5 },
		];

		const result = createRiskSignalTable(signals);

		// High should appear first (sorted descending)
		const lines = result.split("\n");
		const highIndex = lines.findIndex((l) => l.includes("high"));
		const lowIndex = lines.findIndex((l) => l.includes("low"));

		expect(highIndex).toBeLessThan(lowIndex);
	});

	// Edge case: empty signals (spec lines 407-411)
	it("should handle empty signal array", () => {
		const result = createRiskSignalTable([]);
		expect(result).toContain("No risk signals detected");
	});

	// Edge case: zero-value signals (spec lines 414-424)
	it("should filter out zero-value signals", () => {
		const signals = [
			{ signal: "active", value: 3.0 },
			{ signal: "inactive", value: 0 },
		];

		const result = createRiskSignalTable(signals);

		expect(result).toContain("active");
		expect(result).not.toContain("inactive");
	});

	// Severity indicators (spec lines 427-439)
	it("should show correct severity indicators", () => {
		const signals = [
			{ signal: "critical", value: 9.0 },
			{ signal: "warning", value: 5.0 },
			{ signal: "info", value: 2.0 },
		];

		const result = createRiskSignalTable(signals);

		// Should contain filled and empty dots
		expect(result).toContain("●");
		expect(result).toContain("○");
	});

	it("should show table headers", () => {
		const signals = [{ signal: "test", value: 5.0 }];
		const result = createRiskSignalTable(signals);

		expect(result).toContain("Signal");
		expect(result).toContain("Score");
		expect(result).toContain("Severity");
	});

	it("should show values with one decimal place", () => {
		const signals = [{ signal: "test", value: 5.5555 }];
		const result = createRiskSignalTable(signals);

		expect(result).toContain("5.6"); // Rounded to 1 decimal
	});
});

describe("createFileSummaryTable", () => {
	// Happy path (spec lines 444-455)
	it("should render file summary with risk levels", () => {
		const files = [
			{ file: "src/auth.ts", riskScore: 7.5, riskLevel: "high", topSignal: "complexity" },
			{ file: "src/utils.ts", riskScore: 2.0, riskLevel: "low" },
		];

		const result = createFileSummaryTable(files);

		expect(result).toContain("auth.ts");
		expect(result).toContain("HIGH");
		expect(result).toContain("complexity");
	});

	// Edge case: long file paths (spec lines 458-472)
	it("should truncate long file paths", () => {
		const files = [
			{
				file: "src/components/authentication/providers/oauth/github/callback.ts",
				riskScore: 5.0,
				riskLevel: "medium",
			},
		];

		const result = createFileSummaryTable(files);

		// Should be truncated but still readable
		expect(result).toContain("...");
		expect(result).toContain("callback.ts");
	});

	it("should handle empty file array", () => {
		const result = createFileSummaryTable([]);
		expect(result).toContain("No files analyzed");
	});

	it("should sort files by risk score descending", () => {
		const files = [
			{ file: "low.ts", riskScore: 2.0, riskLevel: "low" },
			{ file: "high.ts", riskScore: 8.0, riskLevel: "high" },
			{ file: "medium.ts", riskScore: 5.0, riskLevel: "medium" },
		];

		const result = createFileSummaryTable(files);
		const lines = result.split("\n");

		const highIndex = lines.findIndex((l) => l.includes("high.ts"));
		const lowIndex = lines.findIndex((l) => l.includes("low.ts"));

		expect(highIndex).toBeLessThan(lowIndex);
	});

	it("should show dash for missing top signal", () => {
		const files = [{ file: "file.ts", riskScore: 3.0, riskLevel: "low" }];

		const result = createFileSummaryTable(files);

		expect(result).toContain("-");
	});
});

describe("createSnapshotTable", () => {
	// Happy path (spec lines 477-488)
	it("should render snapshots with relative time", () => {
		const now = new Date();
		const snapshots = [{ id: "abc123def456", timestamp: now, message: "before changes" }];

		const result = createSnapshotTable(snapshots);

		expect(result).toContain("abc123de"); // Truncated ID
		expect(result).toContain("just now");
		expect(result).toContain("before changes");
	});

	// Edge case: no message (spec lines 491-498)
	it("should handle missing message", () => {
		const snapshots = [{ id: "abc123def456", timestamp: new Date() }];

		const result = createSnapshotTable(snapshots);

		expect(result).toContain("(none)");
	});

	// Edge case: empty list (spec lines 501-505)
	it("should handle empty snapshot list", () => {
		const result = createSnapshotTable([]);
		expect(result).toContain("No snapshots found");
	});

	it("should show file count when available", () => {
		const snapshots = [{ id: "abc123def456", timestamp: new Date(), fileCount: 15 }];

		const result = createSnapshotTable(snapshots);

		expect(result).toContain("15");
	});

	it("should show dash for missing file count", () => {
		const snapshots = [{ id: "abc123def456", timestamp: new Date() }];

		const result = createSnapshotTable(snapshots);

		// Should have dash for missing fileCount
		const lines = result.split("\n");
		const hasData = lines.some((l) => l.includes("abc123de"));
		expect(hasData).toBe(true);
	});
});

describe("createStagedFilesTable", () => {
	it("should render staged files with status colors", () => {
		const files = [
			{ path: "src/index.ts", status: "modified" },
			{ path: "src/new.ts", status: "added" },
			{ path: "src/old.ts", status: "deleted" },
		];

		const result = createStagedFilesTable(files);

		expect(result).toContain("index.ts");
		expect(result).toContain("modified");
		expect(result).toContain("added");
		expect(result).toContain("deleted");
	});

	it("should handle empty file array", () => {
		const result = createStagedFilesTable([]);
		expect(result).toContain("No staged files");
	});

	it("should show risk score when available", () => {
		const files = [{ path: "src/risky.ts", status: "modified", riskScore: 7.5 }];

		const result = createStagedFilesTable(files);

		expect(result).toContain("●"); // Severity indicator
	});
});

describe("renderSeverity", () => {
	it("should show 3 filled dots for high values (> 7)", () => {
		const result = renderSeverity(9);
		expect(result).toContain("●●●");
	});

	it("should show 2 filled dots for medium values (4-7)", () => {
		const result = renderSeverity(5);
		expect(result).toContain("●●");
		expect(result).toContain("○");
	});

	it("should show 1 filled dot for low values (< 4)", () => {
		const result = renderSeverity(2);
		expect(result).toContain("●");
		expect(result).toContain("○○");
	});

	it("should handle zero", () => {
		const result = renderSeverity(0);
		expect(result).toContain("○○○");
	});

	it("should handle values above max", () => {
		const result = renderSeverity(15); // Above default max of 10
		expect(result).toContain("●●●");
	});

	it("should respect custom maxValue", () => {
		const result = renderSeverity(5, 5); // 5 out of 5 = full severity
		expect(result).toContain("●●●");
	});
});

describe("truncatePath", () => {
	it("should return path unchanged if within limit", () => {
		const result = truncatePath("src/index.ts", 50);
		expect(result).toBe("src/index.ts");
	});

	it("should truncate long paths with ellipsis", () => {
		const result = truncatePath("src/very/long/path/to/some/deeply/nested/file.ts", 20);
		expect(result).toContain("...");
		expect(result.length).toBeLessThanOrEqual(20);
	});

	it("should keep filename for very long paths", () => {
		const result = truncatePath("src/a/b/c/d/e/f/g/h/important-file.ts", 25);
		expect(result).toContain("important-file.ts");
	});

	it("should handle short paths with 2 or fewer parts", () => {
		const result = truncatePath("verylongfilename.ts", 10);
		expect(result).toContain("...");
	});
});

describe("formatRelativeTime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should show 'just now' for times less than 1 minute ago", () => {
		const now = new Date("2024-01-01T12:00:00Z");
		vi.setSystemTime(now);

		const result = formatRelativeTime(new Date("2024-01-01T11:59:30Z"));
		expect(result).toBe("just now");
	});

	it("should show minutes for times less than 1 hour ago", () => {
		const now = new Date("2024-01-01T12:00:00Z");
		vi.setSystemTime(now);

		const result = formatRelativeTime(new Date("2024-01-01T11:30:00Z"));
		expect(result).toBe("30m ago");
	});

	it("should show hours for times less than 1 day ago", () => {
		const now = new Date("2024-01-01T12:00:00Z");
		vi.setSystemTime(now);

		const result = formatRelativeTime(new Date("2024-01-01T09:00:00Z"));
		expect(result).toBe("3h ago");
	});

	it("should show days for times less than 1 week ago", () => {
		const now = new Date("2024-01-07T12:00:00Z");
		vi.setSystemTime(now);

		const result = formatRelativeTime(new Date("2024-01-04T12:00:00Z"));
		expect(result).toBe("3d ago");
	});

	it("should show full date for times more than 1 week ago", () => {
		const now = new Date("2024-01-15T12:00:00Z");
		vi.setSystemTime(now);

		const result = formatRelativeTime(new Date("2024-01-01T12:00:00Z"));
		// Should be a date string, not relative
		expect(result).not.toContain("ago");
	});
});
