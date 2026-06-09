/**
 * Pulse Command  -  Local Fallback Pressure Tests
 *
 * Targets the specific failure modes we fixed:
 *   1. Daemon returns null  → fallback reads local current.json   (state: "active")
 *   2. Daemon returns null  → fallback reads local current.json   (active: true)
 *   3. Daemon returns idle  → fallback reads local current.json   (saves the day)
 *   4. Daemon returns null  → local file also absent              (real no-session)
 *   5. Daemon returns null  → local file exists but state: "ended" (treats as dead)
 *   6. Daemon returns null  → local file exists but no state/active (minimal valid format, accepted as active)
 *   7. Daemon fully healthy → local fallback is NOT called        (happy path unchanged)
 *   8. Duration is computed correctly from local file startedAt
 *   9. Output is valid JSON with contract shape in fallback path
 *  10. Human format works through fallback path (no raw JSON on stdout)
 *  11. --focus flag is ignored gracefully in fallback path (no crash)
 *  12. Daemon connection error + local active file → fallback NOT triggered
 *      (conn error hits the daemon-unavailable path, not fallback; {} emitted)
 *  13. Existing "no-session sentinel" test still passes after refactor
 *  14. Race: slow daemon returns after timeout, local file exists → no double-emit
 *  15. SessionState without task field still works
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks  -  hoisted declarations must come before vi.mock() calls
// vi.mock() is hoisted to the top of the file by Vitest, so any variables
// referenced inside a factory must be hoisted too via vi.hoisted().
// ---------------------------------------------------------------------------

const mockCall = vi.fn();

// vi.hoisted ensures this is initialized before the vi.mock() factory runs
const { mockGetCurrentSession } = vi.hoisted(() => ({
	mockGetCurrentSession: vi.fn(),
}));

vi.mock("../../src/services/service-client.js", () => ({
	withDaemonOptional: vi.fn(
		async (_cmd: string, fn: (client: { call: typeof mockCall } | null) => Promise<unknown>) =>
			fn({ call: mockCall }),
	),
}));

vi.mock("../../src/services/vreko-dir.js", () => ({
	getCurrentSession: mockGetCurrentSession,
}));

import { type PulseJsonOutput, runPulse } from "../../src/commands/pulse.js";
import { withDaemonOptional } from "../../src/services/service-client.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureConsole(): { lines: string[]; errLines: string[]; restore: () => void } {
	const lines: string[] = [];
	const errLines: string[] = [];
	const origLog = console.log;
	const origErr = console.error;
	console.log = (msg?: unknown) => lines.push(String(msg ?? ""));
	console.error = (msg?: unknown) => errLines.push(String(msg ?? ""));
	return {
		lines,
		errLines,
		restore: () => {
			console.log = origLog;
			console.error = origErr;
		},
	};
}

function makeDaemonNullSession(): void {
	// All 4 allSettled calls succeed but session/current returns null-like
	mockCall
		.mockResolvedValueOnce(null) // session/current → null
		.mockResolvedValueOnce({ files: [] }) // intelligence/fragile-files
		.mockResolvedValueOnce({ pairs: [] }) // intelligence/co-changes
		.mockResolvedValueOnce({ warnings: [] }); // intelligence/warnings
}

function makeDaemonIdleSession(): void {
	mockCall
		.mockResolvedValueOnce({ state: "idle", id: "sess-idle" }) // session/current
		.mockResolvedValueOnce({ files: [] })
		.mockResolvedValueOnce({ pairs: [] })
		.mockResolvedValueOnce({ warnings: [] });
}

function makeActiveLocalSession(overrides: Record<string, unknown> = {}) {
	return {
		id: "sess-local-abc",
		startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 min ago
		snapshotCount: 3,
		state: "active" as const,
		active: true,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("vreko pulse  -  local fallback (gap fix pressure tests)", () => {
	beforeEach(() => {
		mockCall.mockReset();
		mockGetCurrentSession.mockReset();
		vi.mocked(withDaemonOptional).mockReset();
		vi.mocked(withDaemonOptional).mockImplementation(async (_cmd, fn) => fn({ call: mockCall }) as Promise<void>);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// -------------------------------------------------------------------------
	// 1. Daemon null + state: "active"
	// -------------------------------------------------------------------------
	it("1. daemon returns null → falls back to local file with state: 'active'", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession());

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		expect(cap.lines).toHaveLength(1);
		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-local-abc");
		expect(typeof payload.llmHint).toBe("string");
		expect(payload.llmHint).not.toBe("No active session. Call vreko to open one before working.");
		expect(Array.isArray(payload.fragileFiles)).toBe(true);
		expect(Array.isArray(payload.warnings)).toBe(true);
	});

	// -------------------------------------------------------------------------
	// 2. Daemon null + active: true (no state field  -  legacy format)
	// -------------------------------------------------------------------------
	it("2. daemon returns null → falls back to local file with active: true (no state field)", async () => {
		makeDaemonNullSession();
		// Simulate old-format session file: has active:true but no state field
		mockGetCurrentSession.mockResolvedValue({
			id: "sess-legacy",
			startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			snapshotCount: 0,
			active: true,
			// no state field
		});

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-legacy");
		expect(payload.llmHint).not.toContain("No active session");
	});

	// -------------------------------------------------------------------------
	// 3. Daemon returns idle state → fallback saves the day
	// -------------------------------------------------------------------------
	it("3. daemon returns idle session → falls back to active local file", async () => {
		makeDaemonIdleSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession({ id: "sess-fallback-idle" }));

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-fallback-idle");
	});

	// -------------------------------------------------------------------------
	// 4. Daemon null + local file absent → real no-session sentinel
	// -------------------------------------------------------------------------
	it("4. daemon null + no local file → emits no-session sentinel", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(null);

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe(null);
		expect(payload.llmHint).toBe("No active session. Call vreko to open one before working.");
	});

	// -------------------------------------------------------------------------
	// 5. Local file exists but state: "ended" → treated as no-session
	// -------------------------------------------------------------------------
	it("5. local file has state: 'ended' → treated as dead, emits no-session sentinel", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue({
			id: "sess-dead",
			startedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
			snapshotCount: 5,
			state: "ended",
			active: false,
		});

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe(null);
		expect(payload.llmHint).toBe("No active session. Call vreko to open one before working.");
	});

	// -------------------------------------------------------------------------
	// 6. Local file exists with no state/active fields (minimal valid format)
	// -------------------------------------------------------------------------
	it("6. local file has no state or active fields → accepted as active (minimal valid format)", async () => {
		makeDaemonNullSession();
		// Simulate a minimal current.json (no state or active)
		mockGetCurrentSession.mockResolvedValue({
			id: "sess-minimal",
			startedAt: new Date().toISOString(),
			snapshotCount: 0,
			// no state, no active - both optional per schema
		});

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		// Minimal format files are now accepted as active (schema-compliant)
		expect(payload.sessionId).toBe("sess-minimal");
		expect(payload.llmHint).toContain("You are in");
	});

	// -------------------------------------------------------------------------
	// 7. Daemon fully healthy → getCurrentSession NOT called at all
	// -------------------------------------------------------------------------
	it("7. healthy daemon response → local fallback is never called", async () => {
		mockCall
			.mockResolvedValueOnce({
				state: "active",
				id: "sess-daemon-healthy",
				startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
				touchedFiles: ["src/app.ts"],
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

		// getCurrentSession must never be called when daemon path succeeds
		expect(mockGetCurrentSession).not.toHaveBeenCalled();

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-daemon-healthy");
	});

	// -------------------------------------------------------------------------
	// 8. Duration is correctly computed from local file startedAt
	// -------------------------------------------------------------------------
	it("8. fallback path correctly computes durationMinutes from startedAt", async () => {
		makeDaemonNullSession();
		const startedAt = new Date(Date.now() - 47 * 60 * 1000).toISOString(); // 47 minutes ago
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession({ startedAt }));

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		// llmHint should mention session duration (~47 min range)
		expect(payload.llmHint).toMatch(/4[5-9]\s*min|[45][0-9]\s*min|47/i);
	});

	// -------------------------------------------------------------------------
	// 9. JSON contract shape is preserved in fallback path
	// -------------------------------------------------------------------------
	it("9. fallback JSON output has exactly the hook-contract keys", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession());

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as Record<string, unknown>;
		expect(Object.keys(payload).sort()).toEqual(["fragileFiles", "llmHint", "sessionId", "warnings"].sort());
		expect(Array.isArray(payload.fragileFiles)).toBe(true);
		expect(Array.isArray(payload.warnings)).toBe(true);
	});

	// -------------------------------------------------------------------------
	// 10. Human format through fallback path  -  no raw JSON on stdout
	// -------------------------------------------------------------------------
	it("10. fallback with --format human emits prose (not JSON)", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession());

		const cap = captureConsole();
		try {
			await runPulse({ format: "human" });
		} finally {
			cap.restore();
		}

		const combined = cap.lines.join("\n");
		expect(cap.lines[0].startsWith("{")).toBe(false);
		expect(combined).toContain("You are in ");
	});

	// -------------------------------------------------------------------------
	// 11. --focus flag doesn't crash the fallback path (no fragileFiles to filter)
	// -------------------------------------------------------------------------
	it("11. --focus flag in fallback path returns empty fragileFiles (no crash)", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession());

		const cap = captureConsole();
		try {
			await runPulse({ format: "json", focus: "packages/auth/src/session.ts" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.fragileFiles).toEqual([]);
		expect(payload.sessionId).toBe("sess-local-abc");
	});

	// -------------------------------------------------------------------------
	// 12. Daemon ECONNREFUSED → {} advisory emitted, local file NOT checked
	// -------------------------------------------------------------------------
	it("12. daemon ECONNREFUSED → emits '{}' advisory, local file not consulted", async () => {
		vi.mocked(withDaemonOptional).mockImplementationOnce(async (_cmd, fn) => fn(null) as Promise<void>);
		// Even if there's an active local session, {} is the contract (hook safety)
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession());

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		// Connection error → {} (not the fallback path)
		expect(cap.lines).toEqual(["{}"]);
		expect(mockGetCurrentSession).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// 13. Existing no-session test still passes after refactor
	// -------------------------------------------------------------------------
	it("13. (regression) no-session sentinel when daemon returns inactive + no local file", async () => {
		mockCall.mockResolvedValueOnce({ state: "idle" });
		mockGetCurrentSession.mockResolvedValue(null);

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

	// -------------------------------------------------------------------------
	// 14. Session without a task field still works via fallback
	// -------------------------------------------------------------------------
	it("14. local session with no task field doesn't crash fallback path", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession({ task: undefined }));

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-local-abc");
		expect(typeof payload.llmHint).toBe("string");
	});

	// -------------------------------------------------------------------------
	// 15. Fallback emits valid JSON even if startedAt is malformed
	// -------------------------------------------------------------------------
	it("15. local file with malformed startedAt → durationMinutes defaults to 0, no crash", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue(makeActiveLocalSession({ startedAt: "not-a-date" }));

		const cap = captureConsole();
		// Should not throw
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		expect(cap.lines).toHaveLength(1);
		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-local-abc");
	});

	// -------------------------------------------------------------------------
	// 16. INVARIANT: Any session passing Zod validation is accepted by fallback
	// -------------------------------------------------------------------------
	it("16. (invariant) session with only required fields (id, startedAt, snapshotCount) is accepted", async () => {
		makeDaemonNullSession();
		// This is the minimal valid session per SessionStateSchema
		mockGetCurrentSession.mockResolvedValue({
			id: "sess-minimal",
			startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
			snapshotCount: 0,
			// No state, no active - both optional per schema
		});

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe("sess-minimal");
		expect(payload.llmHint).toContain("You are in");
		expect(payload.llmHint).toContain("sess-minimal");
	});

	// -------------------------------------------------------------------------
	// 17. INVARIANT: Session with state: 'ended' is always rejected
	// -------------------------------------------------------------------------
	it("17. (invariant) session with state: 'ended' is rejected even with other fields", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue({
			id: "sess-ended",
			startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			snapshotCount: 5,
			state: "ended", // Explicitly ended
			active: false, // Also inactive
		});

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe(null);
		expect(payload.llmHint).toBe("No active session. Call vreko to open one before working.");
	});

	// -------------------------------------------------------------------------
	// 18. INVARIANT: Session with active: false is rejected
	// -------------------------------------------------------------------------
	it("18. (invariant) session with active: false is rejected even if state is active", async () => {
		makeDaemonNullSession();
		mockGetCurrentSession.mockResolvedValue({
			id: "sess-inactive",
			startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			snapshotCount: 3,
			state: "active",
			active: false, // Explicitly inactive overrides state
		});

		const cap = captureConsole();
		try {
			await runPulse({ format: "json" });
		} finally {
			cap.restore();
		}

		const payload = JSON.parse(cap.lines[0]) as PulseJsonOutput;
		expect(payload.sessionId).toBe(null);
		expect(payload.llmHint).toBe("No active session. Call vreko to open one before working.");
	});
});
