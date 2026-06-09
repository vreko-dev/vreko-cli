/**
 * Pulse Command Tests (AMBIENT-02)
 *
 * Covers the behavior the Claude Code PreToolUse hook (AMBIENT-06) relies on:
 * - JSON output shape is stable (`{ sessionId, llmHint, fragileFiles, warnings }`)
 * - Daemon unavailable returns exit-0 with `{}` (advisory, never blocks)
 * - `--focus <file>` narrows fragility output
 * - Hint composition reuses the shared `composeHint` function (same as MCP)
 * - Human format is prose, not JSON
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks  -  must be hoisted before the pulse module is imported
// ---------------------------------------------------------------------------

const mockCall = vi.fn();

vi.mock("../../src/services/service-client.js", () => ({
	withDaemonOptional: vi.fn(
		async (_cmd: string, fn: (client: { call: typeof mockCall } | null) => Promise<unknown>) =>
			fn({ call: mockCall }),
	),
}));

// getCurrentSession is called in the no-session fallback path.
// Return null so tests that expect no-session sentinel remain deterministic.
vi.mock("../../src/services/vreko-dir.js", () => ({
	getCurrentSession: vi.fn(async () => null),
}));

import { createPulseCommand, type PulseJsonOutput, runPulse } from "../../src/commands/pulse.js";
import { withDaemonOptional } from "../../src/services/service-client.js";

// ---------------------------------------------------------------------------
// Stdout capture helper
// ---------------------------------------------------------------------------

function captureConsole(): { lines: string[]; errLines: string[]; restore: () => void } {
	const lines: string[] = [];
	const errLines: string[] = [];
	const originalLog = console.log;
	const originalErr = console.error;
	console.log = (msg?: unknown) => {
		lines.push(typeof msg === "string" ? msg : String(msg));
	};
	console.error = (msg?: unknown) => {
		errLines.push(typeof msg === "string" ? msg : String(msg));
	};
	return {
		lines,
		errLines,
		restore: () => {
			console.log = originalLog;
			console.error = originalErr;
		},
	};
}

// ---------------------------------------------------------------------------

describe("vreko pulse command", () => {
	beforeEach(() => {
		mockCall.mockReset();
		vi.mocked(withDaemonOptional).mockReset();
		vi.mocked(withDaemonOptional).mockImplementation(async (_cmd, fn) => fn({ call: mockCall }) as Promise<void>);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("command factory", () => {
		it("returns a Commander command named 'pulse'", () => {
			const cmd = createPulseCommand();
			expect(cmd.name()).toBe("pulse");
			expect(cmd.description()).toMatch(/intelligence/i);
		});

		it("declares --format and --focus options", () => {
			const cmd = createPulseCommand();
			const optNames = cmd.options.map((o) => o.long);
			expect(optNames).toContain("--format");
			expect(optNames).toContain("--focus");
		});
	});

	describe("--format json", () => {
		it("emits a JSON object with the hook-contract shape on healthy session", async () => {
			mockCall
				.mockResolvedValueOnce({
					state: "active",
					id: "sess-healthy",
					startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
					touchedFiles: ["src/app.ts"],
				}) // session/current
				.mockResolvedValueOnce({ files: [] }) // intelligence/fragile-files
				.mockResolvedValueOnce({ pairs: [] }) // intelligence/co-changes
				.mockResolvedValueOnce({ warnings: [] }); // intelligence/warnings

			const cap = captureConsole();
			try {
				await runPulse({ format: "json" });
			} finally {
				cap.restore();
			}

			expect(cap.lines).toHaveLength(1);
			const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
			expect(payload.sessionId).toBe("sess-healthy");
			expect(typeof payload.llmHint).toBe("string");
			expect(payload.llmHint).toContain("You are in ");
			expect(payload.llmHint.endsWith("No concerning signals. Proceed.")).toBe(true);
			expect(Array.isArray(payload.fragileFiles)).toBe(true);
			expect(Array.isArray(payload.warnings)).toBe(true);
		});

		it("narrows fragileFiles with --focus to only matching entries", async () => {
			mockCall
				.mockResolvedValueOnce({
					state: "active",
					id: "sess-focus",
					startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
					touchedFiles: ["auth.ts", "other.ts"],
				})
				.mockResolvedValueOnce({
					files: [
						{ path: "packages/auth/src/session.ts", fragility: 0.9, rollbackCount: 4, reason: "recent" },
						{ path: "src/unrelated.ts", fragility: 0.8, rollbackCount: 2, reason: "stale" },
					],
				})
				.mockResolvedValueOnce({ pairs: [] })
				.mockResolvedValueOnce({ warnings: [] });

			const cap = captureConsole();
			try {
				await runPulse({ format: "json", focus: "packages/auth/src/session.ts" });
			} finally {
				cap.restore();
			}

			const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
			expect(payload.fragileFiles).toHaveLength(1);
			expect(payload.fragileFiles[0].path).toBe("packages/auth/src/session.ts");
			expect(payload.llmHint).toContain("packages/auth/src/session.ts");
			expect(payload.llmHint).toContain("4 rollbacks");
		});

		it("returns empty fragileFiles when --focus matches nothing", async () => {
			mockCall
				.mockResolvedValueOnce({
					state: "active",
					id: "sess-ghost",
					startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
					touchedFiles: ["app.ts"],
				})
				.mockResolvedValueOnce({
					files: [{ path: "a.ts", fragility: 0.9, rollbackCount: 3, reason: "r" }],
				})
				.mockResolvedValueOnce({ pairs: [] })
				.mockResolvedValueOnce({ warnings: [] });

			const cap = captureConsole();
			try {
				await runPulse({ format: "json", focus: "does-not-exist.ts" });
			} finally {
				cap.restore();
			}

			const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
			expect(payload.fragileFiles).toEqual([]);
		});

		it("emits `{}` on daemon connection failure (advisory, exit 0)", async () => {
			vi.mocked(withDaemonOptional).mockImplementationOnce(async (_cmd, fn) => fn(null) as Promise<void>);

			const cap = captureConsole();
			try {
				await runPulse({ format: "json" });
			} finally {
				cap.restore();
			}

			expect(cap.lines).toEqual(["{}"]);
		});

		it("returns the no-session sentinel when no active session", async () => {
			mockCall.mockResolvedValueOnce({ state: "idle" });

			const cap = captureConsole();
			try {
				await runPulse({ format: "json" });
			} finally {
				cap.restore();
			}

			const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
			expect(payload.sessionId).toBe(null);
			expect(payload.llmHint).toBe("No active session. Call vreko to open one before working.");
			expect(payload.fragileFiles).toEqual([]);
			expect(payload.warnings).toEqual([]);
		});
	});

	describe("--format human", () => {
		it("prints prose (not JSON) including the hint text", async () => {
			mockCall
				.mockResolvedValueOnce({
					state: "active",
					id: "sess-human",
					startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
					touchedFiles: ["app.ts"],
				})
				.mockResolvedValueOnce({ files: [] })
				.mockResolvedValueOnce({ pairs: [] })
				.mockResolvedValueOnce({ warnings: [] });

			const cap = captureConsole();
			try {
				await runPulse({ format: "human" });
			} finally {
				cap.restore();
			}

			// Human output starts with the composed hint  -  not bracketed JSON.
			expect(cap.lines[0].startsWith("{")).toBe(false);
			expect(cap.lines.join("\n")).toContain("You are in ");
		});

		it("emits a terse daemon-unavailable line (not JSON) in human format", async () => {
			vi.mocked(withDaemonOptional).mockImplementationOnce(async (_cmd, fn) => fn(null) as Promise<void>);

			const cap = captureConsole();
			try {
				await runPulse({ format: "human" });
			} finally {
				cap.restore();
			}

			expect(cap.lines.some((l) => l.includes("unavailable"))).toBe(true);
			expect(cap.lines.some((l) => l === "{}")).toBe(false);
		});
	});

	describe("contract stability", () => {
		it("JSON output keys are exactly sessionId, llmHint, fragileFiles, warnings", async () => {
			mockCall
				.mockResolvedValueOnce({
					state: "active",
					id: "sess-keys",
					startedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
					touchedFiles: ["a.ts"],
				})
				.mockResolvedValueOnce({ files: [] })
				.mockResolvedValueOnce({ pairs: [] })
				.mockResolvedValueOnce({ warnings: [] });

			const cap = captureConsole();
			try {
				await runPulse({ format: "json" });
			} finally {
				cap.restore();
			}

			const payload = JSON.parse(cap.lines[0]) as Record<string, unknown>;
			expect(Object.keys(payload).sort()).toEqual(["fragileFiles", "llmHint", "sessionId", "warnings"].sort());
		});
	});
});
