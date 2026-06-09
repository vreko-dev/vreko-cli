/**
 * IPC Source Invariants
 *
 * Grep-based invariants that prevent whack-a-mole bugs in the IPC adapter
 * and CLI service spawning. Each test encodes a specific root cause that
 * previously caused hard-to-trace runtime failures.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../src");

function src(rel: string) {
	return readFileSync(join(SRC, rel), "utf8");
}

describe("local-service-adapter: IPC call invariants", () => {
	it("must not reference callMethodAsync (was never imported; causes ReferenceError at runtime)", () => {
		const code = src("service-adapter/local-service-adapter.ts");
		expect(code).not.toContain("callMethodAsync");
	});
});

describe("service/start: resolveVrekodBin path invariants", () => {
	it("must use import.meta.url not process.argv[1] to locate the bundle", () => {
		const code = src("commands/service/start.ts");
		// import.meta.url is baked into the bundle and always points to
		// apps/cli/dist/index.js regardless of how the process was launched.
		expect(code).toContain("import.meta.url");
	});

	it("must assign bundleFile from import.meta.url, not process.argv", () => {
		const code = src("commands/service/start.ts");
		// Extract the function body only (not comments above it).
		const fn = code.slice(
			code.indexOf("function resolveVrekodBin"),
			code.indexOf("export function createStartCommand"),
		);
		// The variable used to derive workspaceRoot must come from import.meta.url.
		expect(fn).toMatch(/const bundleFile\s*=\s*fileURLToPath\(import\.meta\.url\)/);
		// workspaceRoot must be resolved from bundleFile, not from process.argv.
		expect(fn).toMatch(/resolve\(\s*dirname\(\s*bundleFile\s*\)/);
	});
});

describe("index: smartRouter sub-command spawning invariants", () => {
	it("must not hardcode 'vreko service start' as an execSync string", () => {
		const code = src("index.ts");
		expect(code).not.toMatch(/execSync\(["'`]vreko service start/);
	});

	it("must not hardcode 'vreko init' as an execSync string", () => {
		const code = src("index.ts");
		expect(code).not.toMatch(/execSync\(["'`]vreko init/);
	});

	it("must use process.argv[1] as the CLI binary when spawning sub-commands", () => {
		const code = src("index.ts");
		// Ensures smartRouter self-references the running binary rather than
		// relying on PATH resolution which may find a stale global shim.
		expect(code).toContain("process.argv[1]");
	});
});
