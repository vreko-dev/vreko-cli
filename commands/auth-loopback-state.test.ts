/**
 * AUTH-05 loopback state-nonce tests (R-5.2, R-5.3).
 *
 * The browser OAuth loopback flow generates a crypto-random `state` per attempt
 * and the /callback handler must reject any response whose state is missing or
 * does not match  -  persisting no token. These tests exercise the validation
 * core (isExpectedState) that gates the callback.
 */

import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

// Import the auth module without touching the real home dir.
vi.mock("../../src/services/vreko-dir.js", () => ({
	getCredentials: vi.fn(),
	saveCredentials: vi.fn(),
	clearCredentials: vi.fn(),
	createGlobalDirectory: vi.fn(),
}));

import { isExpectedState } from "../../src/commands/auth.js";

describe("AUTH-05: loopback callback state-nonce validation", () => {
	const expected = "a".repeat(64); // shape of randomBytes(32).toString("hex")

	it("R-5.2: a state that does not match the generated value is rejected", () => {
		expect(isExpectedState("b".repeat(64), expected)).toBe(false);
	});

	it("R-5.3: a missing/empty state is rejected", () => {
		expect(isExpectedState("", expected)).toBe(false);
	});

	it("R-5.2: a different-length state is rejected (no timingSafeEqual throw)", () => {
		expect(isExpectedState("short", expected)).toBe(false);
	});

	it("the matching state is accepted", () => {
		expect(isExpectedState(expected, expected)).toBe(true);
	});

	it("a real generated nonce round-trips and a tampered one fails", () => {
		const nonce = randomBytes(32).toString("hex");
		expect(isExpectedState(nonce, nonce)).toBe(true);
		const tampered = `${nonce.slice(0, -1)}${nonce.endsWith("0") ? "1" : "0"}`;
		expect(isExpectedState(tampered, nonce)).toBe(false);
	});
});
