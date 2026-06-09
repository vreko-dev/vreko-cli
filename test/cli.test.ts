/**
 * CLI Entry Point Tests
 *
 * Smoke tests for the top-level CLI program structure.
 * Verifies createCLI returns a correctly configured Commander program.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Suppress output from CLI setup
vi.mock("ora", () => ({
	default: vi.fn(() => ({
		start: vi.fn().mockReturnThis(),
		succeed: vi.fn().mockReturnThis(),
		fail: vi.fn().mockReturnThis(),
		stop: vi.fn().mockReturnThis(),
	})),
}));

vi.mock("chalk", () => {
	// Recursive Proxy: every property access and every call returns the same
	// chalk-like function. chalk.hex("#fff")("text"), chalk.bold("text"), etc.
	// The apply trap always returns a new proxy so multi-step chaining works
	// (e.g. chalk.hex(color) → callable function → chalk.hex(color)("text") → string).
	// We must NOT return String(args[0]) from apply because chalk.hex(color) is
	// supposed to return a function, not a string. Instead we only produce a
	// string when the result is used as a primitive (via Symbol.toPrimitive /
	// toString), keeping it callable at every level.
	function makeChalkFn(lastArg?: string): unknown {
		const fn = Object.assign((s: unknown) => makeChalkFn(String(s ?? "")), {
			[Symbol.toPrimitive]: () => lastArg ?? "",
			toString: () => lastArg ?? "",
		});
		return new Proxy(fn, {
			get: (target, prop) => {
				if (prop === Symbol.toPrimitive || prop === "toString") {
					return target[prop as keyof typeof target];
				}
				return makeChalkFn(lastArg);
			},
			apply: (_target, _this, args) => makeChalkFn(String(args[0] ?? "")),
		});
	}
	return { default: makeChalkFn() };
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("CLI program structure", () => {
	it("createCLI is exported and is a function", async () => {
		const { createCLI } = await import("../src/index.js");
		expect(typeof createCLI).toBe("function");
	});

	it("createCLI returns a Commander program", async () => {
		const { createCLI } = await import("../src/index.js");
		const program = await createCLI();
		expect(program).toBeDefined();
		expect(typeof program.name).toBe("function");
		expect(typeof program.version).toBe("function");
	});

	it("program includes core commands", async () => {
		const { createCLI } = await import("../src/index.js");
		const program = await createCLI();
		const commandNames = program.commands.map((c) => c.name());

		expect(commandNames).toContain("init");
		expect(commandNames).toContain("snapshot");
		expect(commandNames).toContain("undo");
	});

	it("program name is vreko", async () => {
		const { createCLI } = await import("../src/index.js");
		const program = await createCLI();
		expect(program.name()).toBe("vreko");
	});
});
