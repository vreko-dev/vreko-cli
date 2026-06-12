/**
 * AUTH-03 browser-open + API_URL security tests (R-3.3, R-3.4, R-3.5).
 *
 * - R-3.3: openBrowser given a URL with shell metacharacters ($(), backticks)
 *          launches nothing through a shell  -  the URL reaches execFile as a
 *          single literal argument, and no side-effect file is created.
 * - R-3.4: openBrowser given a non-https (non-localhost) URL returns without
 *          launching anything.
 * - R-3.5: resolveApiUrl rejects a non-localhost VREKO_API_URL that is not https.
 */

import { existsSync, rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock vreko-dir so importing the auth module does not touch the real home dir.
vi.mock("../../src/services/vreko-dir.js", () => ({
	getCredentials: vi.fn(),
	saveCredentials: vi.fn(),
	clearCredentials: vi.fn(),
	createGlobalDirectory: vi.fn(),
}));

// Capture execFile calls. The real execFile would NOT invoke a shell; we assert
// the URL is passed as a literal arg, never interpolated into a shell string.
// Partial mock: keep the rest of child_process intact for transitive importers.
const execFileMock = vi.fn();
vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	return {
		...actual,
		execFile: (...args: unknown[]) => execFileMock(...args),
	};
});

import { openBrowser, resolveApiUrl } from "../../src/commands/auth.js";

const PWNED = "/tmp/auth03-pwned-marker";

describe("AUTH-03: openBrowser shell-injection resistance (R-3.3)", () => {
	beforeEach(() => {
		execFileMock.mockReset();
		rmSync(PWNED, { force: true });
	});
	afterEach(() => {
		rmSync(PWNED, { force: true });
	});

	it("passes a metacharacter URL as a single literal arg (no shell expansion)", () => {
		const malicious = `https://x.example/$(touch ${PWNED})\`touch ${PWNED}\``;
		openBrowser(malicious);

		// No shell ran the command-substitution payload.
		expect(existsSync(PWNED)).toBe(false);

		// execFile was called with an argv array; the URL is one untouched element.
		expect(execFileMock).toHaveBeenCalledTimes(1);
		const callArgs = execFileMock.mock.calls[0];
		const argv = callArgs[1] as string[];
		expect(Array.isArray(argv)).toBe(true);
		// The exact malicious string appears verbatim as an array element  -  proof
		// it was not split/expanded by a shell.
		expect(argv).toContain(malicious);
		// The launcher binary is not a shell.
		expect(callArgs[0]).not.toMatch(/sh$|bash$|cmd$|\bsh\b/);
	});
});

describe("AUTH-03: openBrowser rejects non-https schemes (R-3.4)", () => {
	beforeEach(() => execFileMock.mockReset());

	it("does not launch anything for a non-https, non-localhost URL", () => {
		openBrowser("http://evil");
		expect(execFileMock).not.toHaveBeenCalled();
	});

	it("does not launch for a custom-protocol URL", () => {
		openBrowser("file:///etc/passwd");
		expect(execFileMock).not.toHaveBeenCalled();
	});

	it("permits https and http://localhost (loopback dev) URLs", () => {
		openBrowser("https://console.vreko.dev/auth");
		openBrowser("http://localhost:8910/callback");
		expect(execFileMock).toHaveBeenCalledTimes(2);
	});
});

describe("AUTH-03: resolveApiUrl forces https for non-localhost (R-3.5)", () => {
	it("rejects a non-localhost API URL without https", () => {
		expect(() => resolveApiUrl("http://api.vreko.dev")).toThrow(/https/);
	});

	it("accepts an https non-localhost API URL", () => {
		expect(resolveApiUrl("https://api.vreko.dev")).toBe("https://api.vreko.dev");
	});

	it("accepts http://localhost and http://127.0.0.1 for local dev", () => {
		expect(resolveApiUrl("http://localhost:3002")).toBe("http://localhost:3002");
		expect(resolveApiUrl("http://127.0.0.1:3002")).toBe("http://127.0.0.1:3002");
	});

	it("rejects a malformed URL", () => {
		expect(() => resolveApiUrl("not-a-url")).toThrow(/Invalid VREKO_API_URL/);
	});
});
