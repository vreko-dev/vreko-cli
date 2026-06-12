/** Unknown Command Routing Tests (Phase 31). Covers: CLI-03 (command:* handler routes to Sentry + PostHog + exit 1). */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_TS_PATH = resolve(__dirname, "../../../src/index.ts");
const SRC = readFileSync(INDEX_TS_PATH, "utf8");

function getCommandStarBlock(): string {
	const idx = SRC.indexOf('program.on("command:*"');
	if (idx < 0) throw new Error("command:* handler not found");
	return SRC.slice(idx, idx + 500);
}

function getCatchBlock(): string {
	const asyncIdx = SRC.indexOf("parseAsync");
	if (asyncIdx < 0) throw new Error("parseAsync not found");
	return SRC.slice(asyncIdx, asyncIdx + 600);
}

describe("CLI-03: unknown command routing", () => {
	it("CLI-03: index.ts command:* handler source contains Sentry.captureException call", () => {
		// Validates unknown commands are reported to Sentry for observability
		const block = getCommandStarBlock();
		expect(block).toContain("Sentry.captureException");
	});

	it("CLI-03: index.ts command:* handler source contains captureEvent call for cli.unknown_command", () => {
		// Validates unknown commands fire a PostHog analytics event
		const block = getCommandStarBlock();
		expect(block).toContain('captureEvent("cli.unknown_command"');
	});

	it("CLI-03: index.ts command:* handler source contains process.exit(1)", () => {
		// Validates unknown commands exit with a non-zero code
		const block = getCommandStarBlock();
		expect(block).toContain("process.exit(1)");
	});

	it("CLI-03: index.ts catch block source contains captureEvent call for cli.unhandled_error", () => {
		// Validates unhandled errors in the main catch block fire a PostHog analytics event
		const block = getCatchBlock();
		expect(block).toContain('captureEvent("cli.unhandled_error"');
	});

	it("CLI-03: captureEvent is imported from ./services/analytics.js in index.ts", () => {
		// Validates the analytics service is imported and captureEvent is available
		expect(SRC).toContain("captureEvent");
		expect(SRC).toMatch(/import.*captureEvent.*from.*services\/analytics/);
	});
});
