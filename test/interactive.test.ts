/**
 * Interactive Command Tests
 *
 * Smoke tests verifying the interactive command wires into the CLI.
 * Uses @inquirer/prompts (not the old inquirer library).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @inquirer/prompts  -  the interactive command uses these
vi.mock("@inquirer/prompts", () => ({
	search: vi.fn().mockResolvedValue("exit"),
	checkbox: vi.fn().mockResolvedValue([]),
	confirm: vi.fn().mockResolvedValue(false),
	input: vi.fn().mockResolvedValue(""),
}));

// Mock ora spinner
vi.mock("ora", () => ({
	default: vi.fn(() => ({
		start: vi.fn().mockReturnThis(),
		succeed: vi.fn().mockReturnThis(),
		fail: vi.fn().mockReturnThis(),
		stop: vi.fn().mockReturnThis(),
	})),
}));

// Mock chalk  -  recursive Proxy so chalk.hex("#fff")("text") and chalk.bold("text") both work
vi.mock("chalk", () => {
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

// Mock risk-analysis (has fs dependencies)
vi.mock("../src/services/risk-analysis.js", () => ({
	analyzeFileRisk: vi.fn().mockResolvedValue({ riskScore: 0, signals: [] }),
	getAllFiles: vi.fn().mockResolvedValue([]),
}));

// Mock contracts storage
vi.mock("@vreko/contracts/storage", () => ({
	createSnapshotStorage: vi.fn().mockReturnValue({
		list: vi.fn().mockResolvedValue([]),
		create: vi.fn().mockResolvedValue({ id: "snap-1" }),
	}),
}));

// Suppress UI error display
vi.mock("../src/ui/errors.js", () => ({
	displaySmartError: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("interactive command", () => {
	it("exports createInteractiveCommand function", async () => {
		const { createInteractiveCommand } = await import("../src/commands/interactive.js");
		expect(typeof createInteractiveCommand).toBe("function");
	});

	it("returns a Commander Command instance with name 'interactive'", async () => {
		const { createInteractiveCommand } = await import("../src/commands/interactive.js");
		const cmd = createInteractiveCommand();
		expect(cmd.name()).toBe("interactive");
		expect(typeof cmd.description).toBe("function");
	});
});

describe("CLI integration", () => {
	it("createCLI includes the interactive command", async () => {
		const { createCLI } = await import("../src/index.js");
		const program = await createCLI();
		const commands = program.commands.map((c) => c.name());
		expect(commands).toContain("interactive");
	});
});
