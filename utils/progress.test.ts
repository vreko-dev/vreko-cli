/**
 * CLI-UX-004: Progress Utilities Tests
 *
 * Tests for log-update integration with 4-path coverage:
 * - Happy path: normal operations
 * - Sad path: expected failures
 * - Edge cases: quiet mode, non-TTY
 * - Error cases: unexpected inputs
 *
 * @see ai_dev_utils/resources/new_cli/04-log-update-integration.spec.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createLiveLogger,
	formatDuration,
	formatProgressLine,
	ProgressTracker,
	renderProgressBar,
} from "../../src/utils/progress";

describe("ProgressTracker", () => {
	let originalIsTTY: boolean | undefined;

	beforeEach(() => {
		originalIsTTY = process.stdout.isTTY;
		// Mock isTTY by defining it on the object
		Object.defineProperty(process.stdout, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		Object.defineProperty(process.stdout, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
		vi.restoreAllMocks();
	});

	// Happy path (spec lines 378-389)
	it("should track progress through all items", () => {
		const tracker = new ProgressTracker({ total: 5, quiet: true });

		tracker.start();
		for (let i = 0; i < 5; i++) {
			tracker.update(`file${i}.ts`);
		}

		// Should not throw
		expect(() => tracker.complete("Done")).not.toThrow();
	});

	it("should increment current count on each update", () => {
		const tracker = new ProgressTracker({ total: 5, quiet: true });

		tracker.start();
		expect(tracker.getCurrent()).toBe(0);

		tracker.update("file1.ts");
		expect(tracker.getCurrent()).toBe(1);

		tracker.update("file2.ts");
		expect(tracker.getCurrent()).toBe(2);
	});

	it("should return correct total", () => {
		const tracker = new ProgressTracker({ total: 10, quiet: true });
		expect(tracker.getTotal()).toBe(10);
	});

	// Elapsed time (spec lines 392-400)
	it("should track elapsed time", async () => {
		const tracker = new ProgressTracker({ total: 1, quiet: true });

		tracker.start();
		await new Promise((r) => setTimeout(r, 50));

		const elapsed = tracker.getElapsed();
		expect(elapsed).toMatch(/\d+ms/);
	});

	it("should format elapsed time in seconds for longer durations", async () => {
		const tracker = new ProgressTracker({ total: 1, quiet: true });

		// Mock startTime to simulate longer duration
		(tracker as any).startTime = Date.now() - 2500;

		const elapsed = tracker.getElapsed();
		expect(elapsed).toMatch(/\d+\.\d+s/);
	});

	// Quiet mode (spec lines 403-412)
	it("should suppress output in quiet mode", () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});

		const tracker = new ProgressTracker({ total: 5, quiet: true });
		tracker.start();
		tracker.update("test.ts");
		tracker.complete("Done");

		expect(logSpy).not.toHaveBeenCalled();
	});

	// Non-TTY mode (spec lines 415-430)
	it("should fall back to line-by-line in non-TTY", () => {
		Object.defineProperty(process.stdout, "isTTY", {
			value: false,
			writable: true,
			configurable: true,
		});

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});

		const tracker = new ProgressTracker({ total: 20, quiet: false });
		tracker.start();

		// Update 15 times - should log at 10
		for (let i = 0; i < 15; i++) {
			tracker.update(`file${i}.ts`);
		}

		// Should have logged: start + every 10th
		expect(logSpy).toHaveBeenCalledTimes(2); // start + 10th
	});

	it("should log final item in non-TTY mode", () => {
		Object.defineProperty(process.stdout, "isTTY", {
			value: false,
			writable: true,
			configurable: true,
		});

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});

		const tracker = new ProgressTracker({ total: 5, quiet: false });
		tracker.start();

		for (let i = 0; i < 5; i++) {
			tracker.update(`file${i}.ts`);
		}

		// Should log start and final item
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[5/5]"));
	});

	it("should use custom label", () => {
		const tracker = new ProgressTracker({
			total: 5,
			label: "Analyzing",
			quiet: true,
		});

		// Label should be stored
		expect((tracker as any).label).toBe("Analyzing");
	});

	it("should handle fail correctly in TTY mode", () => {
		const tracker = new ProgressTracker({ total: 5, quiet: false });
		tracker.start();

		// Should not throw
		expect(() => tracker.fail("Something went wrong")).not.toThrow();
	});

	it("should handle fail in non-TTY mode", () => {
		Object.defineProperty(process.stdout, "isTTY", {
			value: false,
			writable: true,
			configurable: true,
		});

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
			/* intentionally empty for test */
		});

		const tracker = new ProgressTracker({ total: 5, quiet: false });
		tracker.fail("Error message");

		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error message"));
	});
});

describe("renderProgressBar", () => {
	// Empty bar at 0% (spec lines 434-438)
	it("should render empty bar at 0%", () => {
		const bar = renderProgressBar(0, 100);
		expect(bar).toContain("░");
		expect(bar).toContain("0%");
	});

	// Full bar at 100% (spec lines 440-444)
	it("should render full bar at 100%", () => {
		const bar = renderProgressBar(100, 100);
		expect(bar).toContain("█");
		expect(bar).toContain("100%");
	});

	// Partial bar at 50% (spec lines 446-450)
	it("should render partial bar at 50%", () => {
		const bar = renderProgressBar(50, 100, 20);
		expect(bar).toContain("50%");
		// Should have both filled and empty characters
		expect(bar).toContain("█");
		expect(bar).toContain("░");
	});

	// Edge case: current > total (spec lines 452-455)
	it("should handle edge case of current > total", () => {
		const bar = renderProgressBar(150, 100);
		expect(bar).toContain("100%"); // Cap at 100%
	});

	it("should respect custom width", () => {
		const bar10 = renderProgressBar(50, 100, 10);
		const bar30 = renderProgressBar(50, 100, 30);

		// Wider bar should be longer
		expect(bar30.length).toBeGreaterThan(bar10.length);
	});

	it("should handle very small progress", () => {
		const bar = renderProgressBar(1, 1000);
		expect(bar).toContain("0%");
	});
});

describe("createLiveLogger", () => {
	let originalIsTTY: boolean | undefined;

	beforeEach(() => {
		originalIsTTY = process.stdout.isTTY;
		Object.defineProperty(process.stdout, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		Object.defineProperty(process.stdout, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
		vi.restoreAllMocks();
	});

	it("should create a logger with update, done, and clear methods", () => {
		const logger = createLiveLogger();

		expect(logger).toHaveProperty("update");
		expect(logger).toHaveProperty("done");
		expect(logger).toHaveProperty("clear");
	});

	it("should not throw when calling methods in TTY mode", () => {
		const logger = createLiveLogger();

		expect(() => {
			logger.update("test");
			logger.done();
			logger.clear();
		}).not.toThrow();
	});

	it("should not throw when calling methods in non-TTY mode", () => {
		Object.defineProperty(process.stdout, "isTTY", {
			value: false,
			writable: true,
			configurable: true,
		});

		const logger = createLiveLogger();

		expect(() => {
			logger.update("test");
			logger.done();
			logger.clear();
		}).not.toThrow();
	});
});

describe("formatProgressLine", () => {
	it("should format progress line with counter and item", () => {
		const result = formatProgressLine(1, 10, "file.ts");

		expect(result).toContain("[1/10]");
		expect(result).toContain("file.ts");
	});

	it("should truncate long item names", () => {
		const longName = "very/long/path/to/some/deeply/nested/directory/structure/file.ts";
		const result = formatProgressLine(1, 10, longName);

		expect(result).toContain("...");
		expect(result.length).toBeLessThan(80);
	});

	it("should not truncate short item names", () => {
		const result = formatProgressLine(1, 10, "short.ts");

		expect(result).not.toContain("...");
		expect(result).toContain("short.ts");
	});
});

describe("formatDuration", () => {
	it("should format milliseconds for short durations", () => {
		expect(formatDuration(500)).toBe("500ms");
		expect(formatDuration(100)).toBe("100ms");
	});

	it("should format seconds for medium durations", () => {
		expect(formatDuration(1500)).toBe("1.5s");
		expect(formatDuration(30000)).toBe("30.0s");
	});

	it("should format minutes and seconds for long durations", () => {
		expect(formatDuration(90000)).toBe("1m 30s");
		expect(formatDuration(150000)).toBe("2m 30s");
	});

	it("should handle edge cases", () => {
		expect(formatDuration(0)).toBe("0ms");
		expect(formatDuration(999)).toBe("999ms");
		expect(formatDuration(1000)).toBe("1.0s");
		expect(formatDuration(59999)).toBe("60.0s");
		expect(formatDuration(60000)).toBe("1m 0s");
	});
});
