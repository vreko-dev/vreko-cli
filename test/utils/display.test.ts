/**
 * CLI-UX-001: Display Utilities Tests
 *
 * Tests for boxen integration with 4-path coverage:
 * - Happy path: normal operations
 * - Sad path: expected failures
 * - Edge cases: empty content, long content
 * - Error cases: unknown types
 *
 * @see ai_dev_utils/resources/new_cli/01-boxen-integration.spec.md
 */

import { describe, expect, it } from "vitest";
import {
	displayBox,
	displayError,
	displayHighRiskWarning,
	displayInfo,
	displaySaveStory,
	displaySnapshotSuccess,
} from "../../src/utils/display";

describe("displayBox", () => {
	// Happy path (spec lines 214-224)
	it("should render a success box with title", () => {
		const result = displayBox("Test content", {
			title: "Test Title",
			type: "success",
		});

		expect(result).toContain("Test content");
		expect(result).toContain("Test Title");
		// Box characters present
		expect(result).toMatch(/[╭╮╰╯│─]/);
	});

	it("should render different box types", () => {
		const types = ["success", "warning", "error", "info", "save-story"] as const;

		for (const type of types) {
			const result = displayBox("Content", { type });
			expect(result).toContain("Content");
			expect(result).toMatch(/[╭╮╰╯│─╔╗╚╝║═]/); // Box characters
		}
	});

	// Sad path (spec lines 227-231)
	it("should handle empty content gracefully", () => {
		const result = displayBox("", { type: "info" });
		expect(result).toBeDefined();
		expect(typeof result).toBe("string");
	});

	// Edge case (spec lines 234-238)
	it("should handle very long content without breaking", () => {
		const longContent = "A".repeat(500);
		const result = displayBox(longContent, { type: "info" });
		// boxen wraps content, so verify we have multiple A's (not necessarily consecutive)
		const aCount = (result.match(/A/g) || []).length;
		expect(aCount).toBeGreaterThanOrEqual(100);
	});

	it("should handle multiline content", () => {
		const content = "Line 1\nLine 2\nLine 3";
		const result = displayBox(content, { type: "info" });

		expect(result).toContain("Line 1");
		expect(result).toContain("Line 2");
		expect(result).toContain("Line 3");
	});

	it("should apply custom padding and margin", () => {
		const result = displayBox("Content", {
			type: "info",
			padding: 2,
			margin: 1,
		});

		expect(result).toBeDefined();
		// Result should have extra whitespace from padding/margin
		expect(result.length).toBeGreaterThan(displayBox("Content", { type: "info", padding: 0, margin: 0 }).length);
	});

	// Error case (spec lines 241-245)
	it("should default to info type for unknown types", () => {
		// @ts-expect-error - Testing runtime behavior with invalid type
		const result = displayBox("Test", { type: "unknown" });
		expect(result).toBeDefined();
		expect(result).toContain("Test");
	});

	it("should work with no options", () => {
		const result = displayBox("Simple content");
		expect(result).toContain("Simple content");
	});
});

describe("displaySaveStory", () => {
	// Happy path (spec lines 250-257)
	it("should render save story with all fields", () => {
		const result = displaySaveStory(8.5, ["file1.ts", "file2.ts"], "abc123def456");

		expect(result).toContain("Vreko protected you.");
		expect(result).toContain("8.5/10");
		expect(result).toContain("2"); // file count
		expect(result).toContain("abc123de"); // truncated ID
		expect(result).toContain("vreko.dev/stories");
	});

	// Edge case (spec lines 260-263)
	it("should handle zero files", () => {
		const result = displaySaveStory(5.0, [], "abc123def456");
		expect(result).toContain("0");
	});

	it("should handle low risk score", () => {
		const result = displaySaveStory(1.5, ["file.ts"], "abc123");
		expect(result).toContain("1.5/10");
	});

	it("should handle maximum risk score", () => {
		const result = displaySaveStory(10.0, ["file.ts"], "abc123");
		expect(result).toContain("10.0/10");
	});

	it("should handle many files", () => {
		const files = Array.from({ length: 100 }, (_, i) => `file${i}.ts`);
		const result = displaySaveStory(7.0, files, "abc123");
		expect(result).toContain("100");
	});
});

describe("displaySnapshotSuccess", () => {
	// Happy path
	it("should display snapshot success with all fields", () => {
		const result = displaySnapshotSuccess("abc123def456", "Test message", 12);

		expect(result).toContain("Snapshot created");
		expect(result).toContain("abc123de"); // truncated ID
		expect(result).toContain("Test message");
		expect(result).toContain("12 protected");
		expect(result).toContain("Vreko Protection Active");
	});

	// Edge case: no message
	it("should handle undefined message", () => {
		const result = displaySnapshotSuccess("abc123", undefined, 5);
		expect(result).toContain("(none)");
	});

	// Edge case: zero files
	it("should handle zero files", () => {
		const result = displaySnapshotSuccess("abc123", "msg", 0);
		expect(result).toContain("0 protected");
	});
});

describe("displayHighRiskWarning", () => {
	// Happy path
	it("should display high risk warning with all fields", () => {
		const result = displayHighRiskWarning("src/index.ts", 8.5);

		expect(result).toContain("High Risk Detected");
		expect(result).toContain("src/index.ts");
		expect(result).toContain("8.5/10");
		expect(result).toContain("Create a snapshot");
		expect(result).toContain("Risk Analysis");
	});

	// Edge case: path with special characters
	it("should handle paths with special characters", () => {
		const result = displayHighRiskWarning("src/path with spaces/file.ts", 7.0);
		expect(result).toContain("src/path with spaces/file.ts");
	});
});

describe("displayError", () => {
	// Happy path
	it("should display error with title and message", () => {
		const result = displayError("Git Error", "Not a git repository");

		expect(result).toContain("Git Error");
		expect(result).toContain("Not a git repository");
	});

	// With suggestion
	it("should display error with suggestion", () => {
		const result = displayError("Git Error", "Not a git repository", "Run git init first");

		expect(result).toContain("Git Error");
		expect(result).toContain("Not a git repository");
		expect(result).toContain("Suggestion:");
		expect(result).toContain("Run git init first");
	});

	// Without suggestion
	it("should work without suggestion", () => {
		const result = displayError("Error", "Message");
		expect(result).not.toContain("Suggestion:");
	});
});

describe("displayInfo", () => {
	// Happy path
	it("should display info box with title and content", () => {
		const result = displayInfo("Information", "Some helpful info");

		expect(result).toContain("Information");
		expect(result).toContain("Some helpful info");
	});

	// Edge case: multiline content
	it("should handle multiline content", () => {
		const content = "Line 1\nLine 2\nLine 3";
		const result = displayInfo("Multi-line", content);

		expect(result).toContain("Line 1");
		expect(result).toContain("Line 2");
		expect(result).toContain("Line 3");
	});
});
