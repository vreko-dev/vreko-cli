/**
 * Unit tests for OutputMode.ts (CLI agent-harness)
 *
 * Covers spec §5.1:
 *  - --json flag activates JSON mode
 *  - VREKO_JSON=1 env var activates JSON mode
 *  - VREKO_JSON=1 env var activates JSON mode
 *  - Non-TTY stdout activates JSON mode
 *  - TTY stdout without flags activates TTY mode
 *  - isJsonMode is a convenience wrapper over detectOutputMode
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectOutputMode, isJsonMode } from "../../src/output/OutputMode.js";

describe("detectOutputMode", () => {
	let originalIsTTY: boolean | undefined;
	let originalSnapbackJson: string | undefined;
	let originalVrekoJson: string | undefined;

	beforeEach(() => {
		originalIsTTY = process.stdout.isTTY;
		originalSnapbackJson = process.env.VREKO_JSON;
		originalVrekoJson = process.env.VREKO_JSON;
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true, writable: true });
		delete process.env.VREKO_JSON;
		delete process.env.VREKO_JSON;
	});

	afterEach(() => {
		Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true, writable: true });
		if (originalSnapbackJson !== undefined) {
			process.env.VREKO_JSON = originalSnapbackJson;
		} else {
			delete process.env.VREKO_JSON;
		}
		if (originalVrekoJson !== undefined) {
			process.env.VREKO_JSON = originalVrekoJson;
		} else {
			delete process.env.VREKO_JSON;
		}
	});

	it("returns tty when TTY, no flags, no env vars", () => {
		expect(detectOutputMode({})).toBe("tty");
	});

	it("returns json when opts.json is true", () => {
		expect(detectOutputMode({ json: true })).toBe("json");
	});

	it("returns json when VREKO_JSON=1", () => {
		process.env.VREKO_JSON = "1";
		expect(detectOutputMode({})).toBe("json");
	});

	it("returns tty when VREKO_JSON=0 (not 1)", () => {
		process.env.VREKO_JSON = "0";
		expect(detectOutputMode({})).toBe("tty");
	});

	it("returns json when VREKO_JSON=1", () => {
		process.env.VREKO_JSON = "1";
		expect(detectOutputMode({})).toBe("json");
	});

	it("returns tty when VREKO_JSON=0 (not 1)", () => {
		process.env.VREKO_JSON = "0";
		expect(detectOutputMode({})).toBe("tty");
	});

	it("returns json when stdout is not a TTY", () => {
		Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true, writable: true });
		expect(detectOutputMode({})).toBe("json");
	});

	it("returns json when stdout.isTTY is undefined (piped)", () => {
		Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true, writable: true });
		expect(detectOutputMode({})).toBe("json");
	});

	it("opts.json=true overrides TTY mode", () => {
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true, writable: true });
		expect(detectOutputMode({ json: true })).toBe("json");
	});
});

describe("isJsonMode", () => {
	beforeEach(() => {
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true, writable: true });
		delete process.env.VREKO_JSON;
		delete process.env.VREKO_JSON;
	});

	afterEach(() => {
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true, writable: true });
		delete process.env.VREKO_JSON;
		delete process.env.VREKO_JSON;
	});

	it("returns false for TTY mode", () => {
		expect(isJsonMode({})).toBe(false);
	});

	it("returns true when opts.json is true", () => {
		expect(isJsonMode({ json: true })).toBe(true);
	});

	it("returns true when VREKO_JSON=1", () => {
		process.env.VREKO_JSON = "1";
		expect(isJsonMode({})).toBe(true);
	});

	it("is a strict boolean (not truthy/falsy)", () => {
		expect(isJsonMode({ json: true })).toBe(true);
		expect(isJsonMode({})).toBe(false);
		expect(typeof isJsonMode({})).toBe("boolean");
	});
});
