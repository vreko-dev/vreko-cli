/**
 * Benchmark opt-in persistence regression tests
 *
 * Covers invariants from onboard-optin-fix-v1 spec:
 * 1. saveBenchmarkOptIn(true) → config file contains benchmarks.optIn === true
 * 2. saveBenchmarkOptIn(false) → config file contains benchmarks.optIn === false
 * 3. Default (no write) → benchmarks.optIn ?? false === false
 * 4. Writing opt-in does not clobber other config entries
 * 5. Idempotent  -  calling twice produces same result
 */

import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// We need to override the global vreko dir for tests
// saveBenchmarkOptIn writes to ~/.vreko/config.json  -  we redirect via HOME env var
let tempDir: string;
let originalHome: string | undefined;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "vreko-optin-test-"));
	originalHome = process.env.HOME;
	// Redirect HOME so saveBenchmarkOptIn writes to our temp dir
	process.env.HOME = tempDir;
});

afterEach(() => {
	if (originalHome !== undefined) {
		process.env.HOME = originalHome;
	} else {
		delete process.env.HOME;
	}
	rmSync(tempDir, { recursive: true, force: true });
});

async function readGlobalConfig(): Promise<Record<string, unknown>> {
	const configPath = join(tempDir, ".vreko", "config.json");
	try {
		const raw = await readFile(configPath, "utf-8");
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return Object.create(null) as Record<string, unknown>;
	}
}

describe("saveBenchmarkOptIn", () => {
	it("INV-1: persists true correctly", async () => {
		const { saveBenchmarkOptIn } = await import("../../src/services/vreko-dir.js");
		await saveBenchmarkOptIn(true);

		const config = await readGlobalConfig();
		const benchmarks = config.benchmarks as Record<string, unknown> | undefined;
		expect(benchmarks?.optIn).toBe(true);
	});

	it("INV-2: persists false correctly", async () => {
		const { saveBenchmarkOptIn } = await import("../../src/services/vreko-dir.js");
		await saveBenchmarkOptIn(false);

		const config = await readGlobalConfig();
		const benchmarks = config.benchmarks as Record<string, unknown> | undefined;
		expect(benchmarks?.optIn).toBe(false);
	});

	it("INV-3: default (no write) → benchmarks.optIn ?? false === false", async () => {
		const config = await readGlobalConfig();
		const benchmarks = config.benchmarks as Record<string, unknown> | undefined;
		const optIn = (benchmarks?.optIn ?? false) as boolean;
		expect(optIn).toBe(false);
	});

	it("INV-4: does not clobber other config entries", async () => {
		const { saveBenchmarkOptIn } = await import("../../src/services/vreko-dir.js");

		// Pre-populate config with other keys
		const { writeFile, mkdir } = await import("node:fs/promises");
		const configDir = join(tempDir, ".vreko");
		await mkdir(configDir, { recursive: true });
		await writeFile(
			join(configDir, "config.json"),
			JSON.stringify({ daemon: { idleTimeout: 300 }, userId: "test-user" }),
		);

		await saveBenchmarkOptIn(true);

		const config = await readGlobalConfig();
		expect((config.daemon as Record<string, unknown>)?.idleTimeout).toBe(300);
		expect(config.userId).toBe("test-user");
		const benchmarks = config.benchmarks as Record<string, unknown> | undefined;
		expect(benchmarks?.optIn).toBe(true);
	});

	it("INV-5: idempotent  -  calling twice produces same result", async () => {
		const { saveBenchmarkOptIn } = await import("../../src/services/vreko-dir.js");
		await saveBenchmarkOptIn(true);
		await saveBenchmarkOptIn(true);

		const config = await readGlobalConfig();
		const benchmarks = config.benchmarks as Record<string, unknown> | undefined;
		expect(benchmarks?.optIn).toBe(true);
	});
});
