/**
 * Symlink binary execution guard  -  Invariant 6
 *
 * The CLI is typically invoked via a global symlink (e.g.
 * /opt/homebrew/bin/vreko → apps/cli/dist/index.js). ESM's
 * `import.meta.url` resolves to the real file path, while
 * `process.argv[1]` retains the symlink path.
 *
 * Without a realpathSync() call, the main-module guard
 *   if (process.argv[1] === fileURLToPath(import.meta.url))
 * is always false under a symlink, so the CLI body never runs  -
 * commands silently do nothing and exit 0.
 *
 * This test suite is a structural ratchet: if the guard is regressed,
 * these tests fail immediately without needing a live symlink.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(__dirname, "../../src/index.ts"), "utf-8");

describe("CLI entrypoint  -  symlink-safe main-module guard", () => {
	it("resolves process.argv[1] via realpathSync before comparison", () => {
		// realpathSync resolves symlinks to the real filesystem path,
		// making the guard work whether invoked directly or via a symlink.
		expect(src).toMatch(/realpathSync/);
	});

	it("compares the resolved path against fileURLToPath(import.meta.url)", () => {
		// import.meta.url always points to the real file (not the symlink),
		// so the comparison partner must also be the real path.
		expect(src).toMatch(/fileURLToPath\(import\.meta\.url\)/);
	});

	it("does NOT compare raw process.argv[1] directly to import.meta.url", () => {
		// Anti-pattern: process.argv[1] === fileURLToPath(import.meta.url)
		// This fails under global symlinks because argv[1] has the symlink path.
		expect(src).not.toMatch(/process\.argv\[1\]\s*===\s*fileURLToPath\(import\.meta\.url\)/);
	});

	it("wraps realpathSync in a try/catch (dangling symlinks must not crash the CLI)", () => {
		// realpathSync throws ENOENT for dangling symlinks or deleted targets.
		// The guard must fall back to the raw argv[1] value rather than crash.
		// Use the LAST occurrence of realpathSync (inside the IIFE, not the import).
		const lastPos = src.lastIndexOf("realpathSync(");
		const callSite = src.slice(lastPos, lastPos + 200);
		expect(callSite).toMatch(/catch/);
	});

	it("realpathSync import appears at the top of the file (not in a dynamic import)", () => {
		// Static import ensures the guard works before any async code runs.
		const importMatch = src.match(/import\s*\{[^}]*realpathSync[^}]*\}\s*from\s*['"]node:fs['"]/);
		expect(importMatch).not.toBeNull();

		// And it appears before the main-module guard
		const importPos = src.indexOf("realpathSync");
		const guardPos = src.indexOf("_argv1Real");
		expect(importPos).toBeLessThan(guardPos);
	});
});
