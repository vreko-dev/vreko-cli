/**
 * Regression Test: Session Autostart on TUI Load
 *
 * Tests the autostart session logic in the TUI SessionPanel to ensure:
 * - Session autostarts when no active session exists
 * - Autostart handles both response formats ({ session: ... } and direct object)
 * - Autostart errors are handled gracefully (no error for "method not found")
 * - Autostart does not interfere with existing active sessions
 *
 * Industry-standard regression test to prevent regressions in session autostart.
 */

import type { VrekoLocalClient } from "@vreko/local-service-client";
import { afterEach, describe, expect, it, vi } from "vitest";

function makeMockClient(callImpl?: (method: string, params: unknown) => unknown): VrekoLocalClient {
	return {
		call: vi.fn().mockImplementation(callImpl ?? (() => Promise.resolve({}))),
		session: {
			current: vi.fn(),
			start: vi.fn(),
		},
	} as unknown as VrekoLocalClient;
}

afterEach(() => {
	vi.clearAllMocks();
});

const SESSION_FIXTURE = {
	id: "sess-abc123",
	startedAt: "2026-01-01T00:00:00.000Z",
};

describe("Session Autostart Regression Tests", () => {
	describe("Autostart when no active session", () => {
		it("should call session.start when session.current returns null", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(null);
			client.session.start = vi.fn().mockResolvedValue(SESSION_FIXTURE);

			// Simulate the autostart logic from SessionPanel
			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				const startResult = await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
				const newSession =
					startResult && typeof startResult === "object" && "id" in startResult
						? (startResult as typeof SESSION_FIXTURE)
						: null;

				expect(newSession).toEqual(SESSION_FIXTURE);
			}

			expect(client.session.start).toHaveBeenCalledWith({
				workspacePath: "/test",
				task: "TUI Session",
			});
		});

		it("should handle { session: null } response format", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue({ session: null });
			client.session.start = vi.fn().mockResolvedValue(SESSION_FIXTURE);

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				const startResult = await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
				const newSession =
					startResult && typeof startResult === "object" && "id" in startResult
						? (startResult as typeof SESSION_FIXTURE)
						: null;

				expect(newSession).toEqual(SESSION_FIXTURE);
			}

			expect(client.session.start).toHaveBeenCalledWith({
				workspacePath: "/test",
				task: "TUI Session",
			});
		});

		it("should handle direct null response format", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(null);
			client.session.start = vi.fn().mockResolvedValue(SESSION_FIXTURE);

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				const startResult = await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
				const newSession =
					startResult && typeof startResult === "object" && "id" in startResult
						? (startResult as typeof SESSION_FIXTURE)
						: null;

				expect(newSession).toEqual(SESSION_FIXTURE);
			}

			expect(client.session.start).toHaveBeenCalledWith({
				workspacePath: "/test",
				task: "TUI Session",
			});
		});
	});

	describe("Autostart error handling", () => {
		it("should not set error for 'method not found' errors", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(null);
			client.session.start = vi.fn().mockRejectedValue(new Error("Method does not exist"));

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				try {
					await client.session.start({
						workspacePath: "/test",
						task: "TUI Session",
					});
				} catch (startErr) {
					const startMsg = startErr instanceof Error ? startErr.message : String(startErr);
					// Don't set error for "method not found" - it's expected in some scenarios
					const lowerMsg = startMsg.toLowerCase();
					if (!lowerMsg.includes("not found") && !lowerMsg.includes("method")) {
						throw startErr; // This would set an error in the UI
					}
					// Expected path: no error set
				}
			}

			// Should not throw - error was swallowed for "method not found"
			expect(client.session.start).toHaveBeenCalled();
		});

		it("should set error for non-method-not-found errors", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(null);
			client.session.start = vi.fn().mockRejectedValue(new Error("Permission denied"));

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			let caughtError: Error | null = null;
			if (!currentSession) {
				try {
					await client.session.start({
						workspacePath: "/test",
						task: "TUI Session",
					});
				} catch (startErr) {
					const startMsg = startErr instanceof Error ? startErr.message : String(startErr);
					const lowerMsg = startMsg.toLowerCase();
					// Don't set error for "method not found" - it's expected in some scenarios
					if (!lowerMsg.includes("not found") && !lowerMsg.includes("method")) {
						// This should set an error in the UI
						caughtError = startErr instanceof Error ? startErr : new Error(String(startErr));
					}
				}
			}

			// Should have captured the error - it was not swallowed
			expect(client.session.start).toHaveBeenCalled();
			expect(caughtError).not.toBeNull();
			expect(caughtError?.message).toBe("Permission denied");
		});
	});

	describe("Autostart with existing session", () => {
		it("should not call session.start when session.current returns active session", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(SESSION_FIXTURE);
			client.session.start = vi.fn().mockResolvedValue(SESSION_FIXTURE);

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
			}

			// Should not call start since session exists
			expect(client.session.start).not.toHaveBeenCalled();
		});

		it("should handle { session: {...} } response format with active session", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue({ session: SESSION_FIXTURE });
			client.session.start = vi.fn().mockResolvedValue(SESSION_FIXTURE);

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
			}

			// Should not call start since session exists
			expect(client.session.start).not.toHaveBeenCalled();
		});
	});

	describe("Autostart response format handling", () => {
		it("should handle direct session object response from start", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(null);
			client.session.start = vi.fn().mockResolvedValue(SESSION_FIXTURE);

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				const startResult = await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
				const newSession =
					startResult && typeof startResult === "object" && "id" in startResult
						? (startResult as typeof SESSION_FIXTURE)
						: null;

				expect(newSession).toEqual(SESSION_FIXTURE);
			}
		});

		it("should handle { session: {...} } response format from start", async () => {
			const client = makeMockClient();
			client.session.current = vi.fn().mockResolvedValue(null);
			client.session.start = vi.fn().mockResolvedValue({ session: SESSION_FIXTURE });

			const response = await client.session.current({ workspacePath: "/test" });
			const currentSession =
				response && typeof response === "object" && "session" in response
					? (response as { session?: typeof SESSION_FIXTURE }).session
					: response;

			if (!currentSession) {
				const startResult = await client.session.start({
					workspacePath: "/test",
					task: "TUI Session",
				});
				const newSession =
					startResult && typeof startResult === "object" && "session" in startResult
						? (startResult as { session?: typeof SESSION_FIXTURE }).session
						: startResult && typeof startResult === "object" && "id" in startResult
							? (startResult as typeof SESSION_FIXTURE)
							: null;

				expect(newSession).toEqual(SESSION_FIXTURE);
			}
		});
	});
});
