/**
 * ACP Integration Tests
 *
 * End-to-end tests for the ACP server protocol flow.
 */

import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock problematic infrastructure imports that fail in test environment
vi.mock("@vreko/infrastructure/files", () => ({
	makeWatcher: vi.fn(),
}));

vi.mock("@vreko/infrastructure/cache", () => ({
	createCacheKey: vi.fn(),
	memoryCache: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("@vreko/infrastructure/resiliency", () => ({
	withBreaker: vi.fn((fn: () => unknown) => fn),
	withRetry: vi.fn((fn: () => unknown) => fn),
	getCircuitBreakerState: vi.fn(() => "closed"),
	RetryOptions: {},
}));

import { ACPServer, ContentLengthFramer } from "../../src/acp";

describe("ACPServer Integration", () => {
	let server: ACPServer;
	let input: PassThrough;
	let output: PassThrough;
	let framer: ContentLengthFramer;
	let responses: unknown[];

	beforeEach(() => {
		input = new PassThrough();
		output = new PassThrough();
		framer = new ContentLengthFramer();
		responses = [];

		server = new ACPServer({
			workspacePath: "/tmp/test-workspace",
		});

		output.on("data", (chunk: Buffer) => {
			const messages = framer.feed(chunk.toString());
			for (const { payload } of messages) {
				responses.push(JSON.parse(payload));
			}
		});

		server.start(input, output);
	});

	afterEach(async () => {
		await server.shutdown();
	});

	function sendRequest(method: string, params?: unknown, id = 1): void {
		const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
		const framed = ContentLengthFramer.frame(payload);
		input.write(framed);
	}

	async function waitForResponse(timeoutMs = 1000): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
			const check = () => {
				if (responses.length > 0) {
					clearTimeout(timeout);
					resolve(responses.shift());
				} else {
					setTimeout(check, 10);
				}
			};
			check();
		});
	}

	describe("initialize", () => {
		it("initializes successfully", async () => {
			sendRequest("initialize", {
				clientInfo: { name: "test", version: "1.0" },
			});

			const response = (await waitForResponse()) as {
				jsonrpc: string;
				id: number;
				result: {
					serverInfo: { name: string };
					capabilities: { sessions: boolean };
				};
			};

			expect(response).toMatchObject({
				jsonrpc: "2.0",
				id: 1,
				result: {
					serverInfo: {
						name: "vreko",
					},
					capabilities: {
						sessions: true,
					},
				},
			});
		});

		it("rejects requests before initialization", async () => {
			sendRequest("tools/list", {});

			const response = (await waitForResponse()) as {
				error: { code: number; message: string };
			};

			expect(response).toMatchObject({
				error: {
					code: -32600,
					message: "Server not initialized",
				},
			});
		});

		it("rejects double initialization", async () => {
			sendRequest("initialize", { clientInfo: { name: "test", version: "1.0" } }, 1);
			await waitForResponse();

			sendRequest("initialize", { clientInfo: { name: "test", version: "1.0" } }, 2);
			const response = (await waitForResponse()) as {
				error: { code: number; message: string };
			};

			expect(response).toMatchObject({
				error: {
					code: -32600,
					message: "Already initialized",
				},
			});
		});
	});

	describe("tools", () => {
		beforeEach(async () => {
			sendRequest("initialize", { clientInfo: { name: "test", version: "1.0" } });
			await waitForResponse();
		});

		it("lists available tools", async () => {
			sendRequest("tools/list", {}, 2);

			const response = (await waitForResponse()) as { result: { tools: unknown[] } };

			expect(response.result.tools).toBeInstanceOf(Array);
			expect(response.result.tools.length).toBeGreaterThan(0);
		});

		it("returns error for unknown tool", async () => {
			sendRequest("tools/call", { name: "nonexistent.tool", arguments: {} }, 3);

			const response = (await waitForResponse()) as {
				error: { code: number; message: string };
			};

			expect(response).toMatchObject({
				error: {
					code: -32002,
					message: expect.stringContaining("Unknown tool"),
				},
			});
		});
	});

	describe("sessions", () => {
		beforeEach(async () => {
			sendRequest("initialize", { clientInfo: { name: "test", version: "1.0" } });
			await waitForResponse();
		});

		it("creates and closes session", async () => {
			sendRequest("session/create", { name: "test-session" }, 2);
			const createResponse = (await waitForResponse()) as {
				result: { sessionId: string };
			};

			expect(createResponse.result.sessionId).toBeDefined();

			sendRequest("session/close", { sessionId: createResponse.result.sessionId }, 3);
			const closeResponse = (await waitForResponse()) as {
				result: { success: boolean };
			};

			expect(closeResponse.result.success).toBe(true);
		});

		it("returns error for unknown session", async () => {
			sendRequest("session/close", { sessionId: "nonexistent" }, 2);

			const response = (await waitForResponse()) as {
				error: { code: number; message: string };
			};

			expect(response).toMatchObject({
				error: {
					code: -32001,
					message: "Session not found",
				},
			});
		});
	});

	describe("unknown methods", () => {
		beforeEach(async () => {
			sendRequest("initialize", { clientInfo: { name: "test", version: "1.0" } });
			await waitForResponse();
		});

		it("returns error for unknown method", async () => {
			sendRequest("unknown/method", {}, 2);

			const response = (await waitForResponse()) as {
				error: { code: number; message: string };
			};

			expect(response).toMatchObject({
				error: {
					code: -32601,
					message: expect.stringContaining("Unknown method"),
				},
			});
		});
	});
});
