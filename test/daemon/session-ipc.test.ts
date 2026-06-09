/**
 * Session IPC Method Tests
 *
 * Tests for daemon IPC wrappers for session lifecycle operations.
 *
 * Mocking strategy (post CAL-phantom-ipc-p3 migration):
 *   - createSessionViaDaemon → migrated to typed namespace (client.session.start)
 *   - endSessionViaDaemon, getSessionStatusViaDaemon → still raw (client.call)
 */

import type { VrekoLocalClient } from "@vreko/local-service-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createSessionViaDaemon,
	endSessionViaDaemon,
	getSessionStatusViaDaemon,
} from "../../src/service-adapter/local-service-adapter.js";

/**
 * Build a mock client that has both the legacy `call` shim (for end-daemon /
 * status, which stay raw) and the typed `session` namespace (for start).
 */
function makeMockClient(callImpl?: (method: string, params: unknown) => unknown): VrekoLocalClient {
	return {
		call: vi.fn().mockImplementation(callImpl ?? (() => Promise.resolve({}))),
		session: {
			start: vi.fn(),
		},
	} as unknown as VrekoLocalClient;
}

afterEach(() => {
	vi.clearAllMocks();
});

/**
 * Fixture returned by the raw client.call mock for end/status tests.
 * Uses the DaemonSessionResult shape that those raw calls return directly.
 */
const SESSION_FIXTURE = {
	id: "sess-abc123",
	name: "test-session",
	workspacePath: "/test/workspace",
	createdAt: "2026-01-01T00:00:00.000Z",
	lastActivityAt: "2026-01-01T01:00:00.000Z",
};

/**
 * Fixture returned by the typed client.session.start mock.
 * Uses the Session entity shape (startedAt, not createdAt) that the typed
 * client returns; the implementation maps startedAt → createdAt.
 */
const SESSION_START_FIXTURE = {
	id: "sess-abc123",
	workspacePath: "/test/workspace",
	startedAt: "2026-01-01T00:00:00.000Z",
	lastActivityAt: "2026-01-01T01:00:00.000Z",
};

describe("createSessionViaDaemon", () => {
	it("calls session/start with provided params", async () => {
		const client = makeMockClient();
		(client.session.start as ReturnType<typeof vi.fn>).mockResolvedValue(SESSION_START_FIXTURE);

		const result = await createSessionViaDaemon(client, {
			name: "test-session",
			workspacePath: "/test/workspace",
		});

		expect(result.success).toBe(true);
		expect(result.result?.id).toBe("sess-abc123");
		expect(client.session.start).toHaveBeenCalledWith({
			workspacePath: "/test/workspace",
			metadata: undefined,
		});
	});

	it("calls session/start with no params when none provided", async () => {
		const client = makeMockClient();
		(client.session.start as ReturnType<typeof vi.fn>).mockResolvedValue(SESSION_START_FIXTURE);

		await createSessionViaDaemon(client);

		expect(client.session.start).toHaveBeenCalledWith({
			workspacePath: undefined,
			metadata: undefined,
		});
	});

	it("passes metadata through", async () => {
		const client = makeMockClient();
		(client.session.start as ReturnType<typeof vi.fn>).mockResolvedValue(SESSION_START_FIXTURE);
		const metadata = { source: "cli", version: "1.0" };

		await createSessionViaDaemon(client, { metadata });

		expect(client.session.start).toHaveBeenCalledWith({
			workspacePath: undefined,
			metadata,
		});
	});

	it("returns success:false on IPC error", async () => {
		const client = makeMockClient();
		(client.session.start as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("connection refused"));

		const result = await createSessionViaDaemon(client);

		expect(result.success).toBe(false);
		expect(result.error).toBe("connection refused");
	});
});

describe("endSessionViaDaemon", () => {
	it("calls session/end-daemon with sessionId", async () => {
		const client = makeMockClient(() => Promise.resolve(undefined));

		const result = await endSessionViaDaemon(client, "sess-abc123", "/test/workspace");

		expect(result.success).toBe(true);
		expect(client.call).toHaveBeenCalledWith("session/end-daemon", {
			sessionId: "sess-abc123",
			workspacePath: "/test/workspace",
		});
	});

	it("returns success:false on IPC error", async () => {
		const client = makeMockClient(() => Promise.reject(new Error("session not found")));

		const result = await endSessionViaDaemon(client, "sess-missing", "/test/workspace");

		expect(result.success).toBe(false);
		expect(result.error).toBe("session not found");
	});
});

describe("getSessionStatusViaDaemon", () => {
	it("calls session/status with sessionId", async () => {
		const client = makeMockClient(() => Promise.resolve(SESSION_FIXTURE));

		const result = await getSessionStatusViaDaemon(client, "sess-abc123", "/test/workspace");

		expect(result.success).toBe(true);
		expect(result.result?.id).toBe("sess-abc123");
		expect(client.call).toHaveBeenCalledWith("session/status", {
			sessionId: "sess-abc123",
			workspacePath: "/test/workspace",
		});
	});

	it("returns full session data on success", async () => {
		const client = makeMockClient(() => Promise.resolve(SESSION_FIXTURE));

		const result = await getSessionStatusViaDaemon(client, "sess-abc123", "/test/workspace");

		expect(result.result).toMatchObject({
			id: "sess-abc123",
			name: "test-session",
			workspacePath: "/test/workspace",
		});
	});

	it("returns success:false on error", async () => {
		const client = makeMockClient(() => Promise.reject(new Error("session expired")));

		const result = await getSessionStatusViaDaemon(client, "sess-old", "/test/workspace");

		expect(result.success).toBe(false);
		expect(result.error).toBe("session expired");
	});
});
