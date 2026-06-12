/**
 * ACP Transport Tests
 *
 * Tests for Content-Length framing and JSON-RPC message handling.
 */

import { describe, expect, it } from "vitest";
import { ContentLengthFramer } from "../../src/acp/transport/framing";

describe("ContentLengthFramer", () => {
	describe("parsing", () => {
		it("parses complete message", () => {
			const framer = new ContentLengthFramer();
			const payload = '{"jsonrpc":"2.0","id":1,"method":"test"}';
			const message = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`;

			const results = framer.feed(message);

			expect(results).toHaveLength(1);
			expect(results[0].payload).toBe(payload);
		});

		it("handles partial messages across multiple feeds", () => {
			const framer = new ContentLengthFramer();
			const payload = '{"jsonrpc":"2.0","id":1}';
			const message = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`;

			const results1 = framer.feed(message.substring(0, 10));
			const results2 = framer.feed(message.substring(10, 30));
			const results3 = framer.feed(message.substring(30));

			expect(results1).toHaveLength(0);
			expect(results2).toHaveLength(0);
			expect(results3).toHaveLength(1);
			expect(results3[0].payload).toBe(payload);
		});

		it("handles multiple messages in single feed", () => {
			const framer = new ContentLengthFramer();
			const p1 = '{"id":1}';
			const p2 = '{"id":2}';
			const m1 = `Content-Length: ${Buffer.byteLength(p1)}\r\n\r\n${p1}`;
			const m2 = `Content-Length: ${Buffer.byteLength(p2)}\r\n\r\n${p2}`;

			const results = framer.feed(m1 + m2);

			expect(results).toHaveLength(2);
			expect(results[0].payload).toBe(p1);
			expect(results[1].payload).toBe(p2);
		});

		it("handles unicode correctly", () => {
			const framer = new ContentLengthFramer();
			const payload = '{"emoji":"🚀"}';
			const byteLength = Buffer.byteLength(payload, "utf8");
			const message = `Content-Length: ${byteLength}\r\n\r\n${payload}`;

			const results = framer.feed(message);

			expect(results).toHaveLength(1);
			expect(results[0].payload).toBe(payload);
			expect(results[0].contentLength).toBe(byteLength);
		});

		it("handles incomplete message gracefully", () => {
			const framer = new ContentLengthFramer();
			const payload = '{"test": true}';
			// Send just the header without full payload
			const partial = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n{"test`;

			const results = framer.feed(partial);

			expect(results).toHaveLength(0);
			expect(framer.bufferSize).toBeGreaterThan(0);
		});

		it("handles missing content-length header", () => {
			const framer = new ContentLengthFramer();
			// Missing Content-Length header - framer should wait for valid header
			const partial = "Invalid-Header: 123\r\n\r\n";

			const results = framer.feed(partial);

			// Should not return any message since no Content-Length was found
			expect(results).toHaveLength(0);
		});

		it("can be reset", () => {
			const framer = new ContentLengthFramer();
			framer.feed("Content-Length: 10\r\n\r\npar");

			expect(framer.bufferSize).toBeGreaterThan(0);

			framer.reset();

			expect(framer.bufferSize).toBe(0);
		});
	});

	describe("framing", () => {
		it("frames message correctly", () => {
			const payload = '{"test":true}';
			const framed = ContentLengthFramer.frame(payload);

			expect(framed).toBe(`Content-Length: 13\r\n\r\n${payload}`);
		});

		it("calculates byte length for unicode", () => {
			const payload = '{"emoji":"🎉"}';
			const framed = ContentLengthFramer.frame(payload);

			// "🎉" is 4 bytes in UTF-8
			const expectedLength = Buffer.byteLength(payload, "utf8");
			expect(framed).toBe(`Content-Length: ${expectedLength}\r\n\r\n${payload}`);
		});
	});

	describe("round-trip", () => {
		it("framing and parsing round-trips correctly", () => {
			const framer = new ContentLengthFramer();
			const original = { jsonrpc: "2.0", id: 1, method: "test", params: { foo: "bar" } };
			const payload = JSON.stringify(original);

			const framed = ContentLengthFramer.frame(payload);
			const results = framer.feed(framed);

			expect(results).toHaveLength(1);
			expect(JSON.parse(results[0].payload)).toEqual(original);
		});
	});
});
