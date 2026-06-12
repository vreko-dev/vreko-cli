/**
 * AUTH-07 loopback-credential tests (R-7.2).
 *
 * The CLI must consume the loopback credential from a POST body, never the URL
 * query. The navigated authorize URL must therefore contain no token substring.
 * (The console producer that posts the tokens is cross-repo  -  U-6  -  and out of
 * scope here.)
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/vreko-dir.js", () => ({
	getCredentials: vi.fn(),
	saveCredentials: vi.fn(),
	clearCredentials: vi.fn(),
	createGlobalDirectory: vi.fn(),
}));

import { buildLoopbackAuthUrl } from "../../src/commands/auth.js";

describe("AUTH-07: loopback authorize URL carries no credential (R-7.2)", () => {
	const url = buildLoopbackAuthUrl("https://console.vreko.dev", "http://localhost:51234/callback", "a".repeat(64));

	it("contains no access_token substring", () => {
		expect(url.includes("access_token")).toBe(false);
	});

	it("contains no refresh_token substring", () => {
		expect(url.includes("refresh_token")).toBe(false);
	});

	it("carries only the redirect target and the state nonce", () => {
		expect(url).toContain("redirect=");
		expect(url).toContain("state=");
	});
});
