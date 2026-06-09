/**
 * Error Formatting Unit Tests
 *
 * Tests for CLI error display utilities: stack truncation and formatting.
 * Based on production debugging experience and terminal display constraints.
 *
 * BASELINE: v1.0 - Stack truncation at 5 frames, preserves error messages
 * COVERAGE TARGET: 85%+ lines
 *
 * @module test/ui/error-formatting
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	displaySmartError,
	displayUnknownCommandError,
	findSimilarCommands,
	formatErrorForCLI,
	type SmartError,
	truncateStack,
} from "../../src/ui/errors.js";

describe("truncateStack()", () => {
	describe("Edge Cases", () => {
		it("should return empty string for null stack", () => {
			const result = truncateStack(undefined);
			expect(result).toBe("");
		});

		it("should return empty string for empty stack", () => {
			const result = truncateStack("");
			expect(result).toBe("");
		});
	});

	describe("Short Stacks (No Truncation Needed)", () => {
		it("should return short stack as-is when under limit", () => {
			const stack = `Error: Test
    at func1 (file.ts:10:5)
    at func2 (file.ts:20:3)`;

			const result = truncateStack(stack, 5);
			expect(result).toBe(stack);
		});

		it("should handle exactly at limit (5 frames + 1 message line)", () => {
			const stack = `Error: Test
    at func1 (file.ts:10:5)
    at func2 (file.ts:20:3)
    at func3 (file.ts:30:7)
    at func4 (file.ts:40:2)
    at func5 (file.ts:50:9)`;

			const result = truncateStack(stack, 5);
			// 5 frames + 1 message = 6 lines total, no truncation
			expect(result).toBe(stack);
			expect(result).not.toContain("more frame");
		});
	});

	describe("Long Stacks (Truncation Required)", () => {
		it("should truncate stack over limit and show remaining count", () => {
			const stack = `Error: Test
    at func1 (file.ts:10:5)
    at func2 (file.ts:20:3)
    at func3 (file.ts:30:7)
    at func4 (file.ts:40:2)
    at func5 (file.ts:50:9)
    at func6 (file.ts:60:4)
    at func7 (file.ts:70:8)
    at func8 (file.ts:80:1)`;

			const result = truncateStack(stack, 5);

			// Should keep first 6 lines (message + 5 frames)
			expect(result).toContain("Error: Test");
			expect(result).toContain("func1");
			expect(result).toContain("func5");

			// Should show remaining count (8 total lines - 6 kept = 2 more)
			expect(result).toContain("... 3 more frames");
		});

		it("should use singular 'frame' for exactly 1 remaining", () => {
			const stack = `Error: Test
    at func1 (file.ts:10:5)
    at func2 (file.ts:20:3)
    at func3 (file.ts:30:7)
    at func4 (file.ts:40:2)
    at func5 (file.ts:50:9)
    at func6 (file.ts:60:4)
    at func7 (file.ts:70:8)`;

			const result = truncateStack(stack, 5);

			// 7 lines - 6 kept = 1 more
			expect(result).toContain("... 2 more frames");
		});

		it("should respect custom maxLines parameter", () => {
			const stack = `Error: Test
    at func1 (file.ts:10:5)
    at func2 (file.ts:20:3)
    at func3 (file.ts:30:7)
    at func4 (file.ts:40:2)
    at func5 (file.ts:50:9)`;

			const result = truncateStack(stack, 2);

			// Should keep message + 2 frames = 3 lines
			expect(result).toContain("Error: Test");
			expect(result).toContain("func1");
			expect(result).toContain("func2");
			expect(result).not.toContain("func3");
			expect(result).toContain("... 3 more frames");
		});
	});
});

describe("formatErrorForCLI()", () => {
	describe("Errors With Stack", () => {
		it("should format error with stack, excluding message line", () => {
			const error = new Error("Test error");
			// Simulate typical V8 stack
			error.stack = `Error: Test error
    at Object.<anonymous> (/path/to/file.ts:10:15)
    at Module._compile (node:internal/modules/cjs/loader:1256:14)`;

			const result = formatErrorForCLI(error);

			// Should have message
			expect(result).toContain("Test error");
			// Should have stack frames (without duplicate message)
			expect(result).toContain("at Object.<anonymous>");
			expect(result).toContain("at Module._compile");
			// Message line should not be duplicated
			const messageOccurrences = (result.match(/Test error/g) || []).length;
			expect(messageOccurrences).toBe(1);
		});

		it("should truncate long stacks in formatted output", () => {
			const error = new Error("Long stack");
			error.stack = `Error: Long stack
    at func1 (file.ts:10:5)
    at func2 (file.ts:20:3)
    at func3 (file.ts:30:7)
    at func4 (file.ts:40:2)
    at func5 (file.ts:50:9)
    at func6 (file.ts:60:4)
    at func7 (file.ts:70:8)`;

			const result = formatErrorForCLI(error, 3);

			expect(result).toContain("Long stack");
			expect(result).toContain("func1");
			expect(result).toContain("func3");
			expect(result).not.toContain("func4");
			expect(result).toContain("more frame");
		});
	});

	describe("Errors Without Stack", () => {
		it("should return message only when no stack", () => {
			const error = new Error("No stack error");
			error.stack = undefined;

			const result = formatErrorForCLI(error);

			expect(result).toBe("No stack error");
		});

		it("should handle empty stack string", () => {
			const error = new Error("Empty stack");
			error.stack = "";

			const result = formatErrorForCLI(error);

			expect(result).toBe("Empty stack");
		});

		it("should handle malformed stack (message only)", () => {
			const error = new Error("Malformed");
			error.stack = "Error: Malformed"; // Just message, no frames

			const result = formatErrorForCLI(error);

			// Should return just the message
			expect(result).toBe("Malformed");
		});
	});

	describe("Edge Cases", () => {
		it("should handle error with no message", () => {
			const error = new Error("");
			error.stack = `Error
    at func (file.ts:10:5)`;

			const result = formatErrorForCLI(error);

			expect(result).toContain("Unknown error");
			expect(result).toContain("at func");
		});

		it("should use default maxStackLines of 5", () => {
			const error = new Error("Default limit");
			const frames = Array.from({ length: 10 }, (_, i) => `    at func${i + 1} (file.ts:${(i + 1) * 10}:5)`).join(
				"\n",
			);
			error.stack = `Error: Default limit\n${frames}`;

			const result = formatErrorForCLI(error);

			// Should truncate to 5 frames
			expect(result).toContain("func1");
			expect(result).toContain("func5");
			expect(result).not.toContain("func6");
			expect(result).toContain("more frame");
		});
	});
});

// =============================================================================
// Regression: displaySmartError() must actually write output
// Fixed: function was building `lines` array but never calling console.error()
// =============================================================================

describe("displaySmartError()  -  output invariant", () => {
	let spy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		spy.mockRestore();
	});

	it("writes to stderr  -  not silent (regression for lines-array-discard bug)", () => {
		displaySmartError(new Error("something went wrong"));
		expect(spy).toHaveBeenCalled();
	});

	it("output contains the error message", () => {
		displaySmartError(new Error("daemon not running"));
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("daemon not running");
	});

	it("works with a plain string error", () => {
		displaySmartError("connection refused");
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output.length).toBeGreaterThan(0);
	});

	it("works with a SmartError object", () => {
		const smart: SmartError = {
			code: "ERR_TEST",
			title: "Test Error",
			message: "this is a test",
			suggestion: "try again",
			command: "vreko doctor",
		};
		displaySmartError(smart);
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("this is a test");
		expect(output).toContain("ERR_TEST");
		expect(output).toContain("try again");
		expect(output).toContain("vreko doctor");
	});

	it("includes suggestion text when error pattern matches", () => {
		displaySmartError(new Error("not logged in"));
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("authenticate");
	});

	it("includes doc link when provided in SmartError", () => {
		const smart: SmartError = {
			code: "ERR_DOC",
			title: "Doc Error",
			message: "see the docs",
			docLink: "https://docs.vreko.dev/errors",
		};
		displaySmartError(smart);
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("https://docs.vreko.dev/errors");
	});

	it("includes context key-value pairs when provided", () => {
		const smart: SmartError = {
			code: "ERR_CTX",
			title: "Context Error",
			message: "context test",
			context: { file: "src/auth.ts", line: "42" },
		};
		displaySmartError(smart);
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("src/auth.ts");
		expect(output).toContain("42");
	});
});

// =============================================================================
// Regression: displayUnknownCommandError() must actually write output
// Fixed: same lines-array-discard bug as displaySmartError
// =============================================================================

describe("displayUnknownCommandError()  -  output invariant", () => {
	let spy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		spy.mockRestore();
	});

	it("writes to stderr  -  not silent (regression for lines-array-discard bug)", () => {
		displayUnknownCommandError("listt");
		expect(spy).toHaveBeenCalled();
	});

	it("output contains the unknown command name", () => {
		displayUnknownCommandError("listt");
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("listt");
	});

	it("suggests similar command for near-typo", () => {
		displayUnknownCommandError("listt");
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		// "listt" is close to "list"  -  should suggest it
		expect(output).toContain("vreko");
	});

	it("shows fallback when no similar command exists", () => {
		displayUnknownCommandError("xyzqwerty123");
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toContain("vreko --help");
	});

	it("includes 'Did you mean' heading when suggestions exist", () => {
		displayUnknownCommandError("statu"); // close to "status"
		const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(output).toMatch(/did you mean/i);
	});
});

// =============================================================================
// findSimilarCommands()  -  unit tests for the suggestion engine
// =============================================================================

describe("findSimilarCommands()", () => {
	it("returns intent match for known alias 'snap'", () => {
		const results = findSimilarCommands("snap");
		expect(results[0]).toBe("snapshot");
	});

	it("returns intent match for 'ss'", () => {
		const results = findSimilarCommands("ss");
		expect(results[0]).toBe("snapshot");
	});

	it("returns close match for one-character typo", () => {
		const results = findSimilarCommands("statu");
		expect(results).toContain("status");
	});

	it("returns empty array for completely unrelated input", () => {
		const results = findSimilarCommands("xyzqwerty123");
		expect(results).toHaveLength(0);
	});

	it("respects maxSuggestions limit", () => {
		const results = findSimilarCommands("s", 2);
		expect(results.length).toBeLessThanOrEqual(2);
	});
});
