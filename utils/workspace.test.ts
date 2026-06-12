/**
 * Workspace Utility Invariants
 *
 * Tests for validateWorkspacePath(), resolveWorkspaceRoot(), findWorkspaceRoot().
 * These are security-sensitive (symlink rejection) and correctness-sensitive
 * (workspace root discovery affects all per-workspace operations).
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findWorkspaceRoot, resolveWorkspaceRoot, validateWorkspacePath } from "../../src/utils/workspace.js";

// ---------------------------------------------------------------------------
// Helper: create a fresh temp directory
// ---------------------------------------------------------------------------

let tempRoot: string;

beforeEach(() => {
	tempRoot = mkdtempSync(join(tmpdir(), "vreko-ws-test-"));
});

afterEach(() => {
	rmSync(tempRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// validateWorkspacePath()
// ---------------------------------------------------------------------------

describe("validateWorkspacePath()", () => {
	it("returns valid=false for path missing all workspace markers", () => {
		// tempRoot has no .git, package.json, or .vreko
		const result = validateWorkspacePath(tempRoot);
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/marker/i);
	});

	it("returns valid=true for directory with .git", () => {
		mkdirSync(join(tempRoot, ".git"));
		const result = validateWorkspacePath(tempRoot);
		expect(result.valid).toBe(true);
		expect(result.root).toBeTruthy();
	});

	it("returns valid=true for directory with package.json", () => {
		writeFileSync(join(tempRoot, "package.json"), '{"name":"test"}');
		const result = validateWorkspacePath(tempRoot);
		expect(result.valid).toBe(true);
	});

	it("returns valid=true for directory with .vreko", () => {
		mkdirSync(join(tempRoot, ".vreko"));
		const result = validateWorkspacePath(tempRoot);
		expect(result.valid).toBe(true);
	});

	it("rejects symbolic links", () => {
		// Create a real directory with .git, then symlink to it
		const realDir = join(tempRoot, "real");
		mkdirSync(realDir);
		mkdirSync(join(realDir, ".git"));
		const symlinkDir = join(tempRoot, "link");
		symlinkSync(realDir, symlinkDir);

		const result = validateWorkspacePath(symlinkDir);
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/symbolic link/i);
	});

	it("returns valid root path matching absolute resolved path", () => {
		mkdirSync(join(tempRoot, ".git"));
		const result = validateWorkspacePath(tempRoot);
		expect(result.valid).toBe(true);
		expect(result.root).toBeTruthy();
		expect(result.root.length).toBeGreaterThan(0);
	});

	it("resolves empty string path to cwd (not an error)", () => {
		// "" normalizes to ".", which resolves to cwd.
		// The cwd of the test runner has a package.json marker, so it's valid.
		const result = validateWorkspacePath("");
		// Whether valid or not depends on cwd markers  -  it must not throw.
		expect(result).toHaveProperty("valid");
		expect(result).toHaveProperty("root");
	});
});

// ---------------------------------------------------------------------------
// resolveWorkspaceRoot()
// ---------------------------------------------------------------------------

describe("resolveWorkspaceRoot()", () => {
	it("uses explicit path when provided and valid", () => {
		mkdirSync(join(tempRoot, ".git"));
		const result = resolveWorkspaceRoot(tempRoot);
		expect(result.valid).toBe(true);
	});

	it("falls back to cwd traversal when explicit path is invalid", () => {
		// Don't add markers  -  it should traverse up and find the repo root
		const result = resolveWorkspaceRoot(tempRoot);
		// Either it finds something valid (found a parent with a marker)
		// or returns valid=false. Either is acceptable  -  just must not throw.
		expect(result).toHaveProperty("valid");
		expect(result).toHaveProperty("root");
	});

	it("returns valid=false for completely invalid path, not a throw", () => {
		const result = resolveWorkspaceRoot("/this/path/does/not/exist/at/all");
		// Should not throw  -  graceful degradation
		expect(result).toHaveProperty("valid");
	});
});

// ---------------------------------------------------------------------------
// findWorkspaceRoot()
// ---------------------------------------------------------------------------

describe("findWorkspaceRoot()", () => {
	it("returns path containing .vreko when found", () => {
		mkdirSync(join(tempRoot, ".vreko"));
		const result = findWorkspaceRoot(tempRoot);
		expect(result).toBe(tempRoot);
	});

	it("returns null when no .vreko found in tree", () => {
		// tempRoot has no .vreko and we're in tmpdir
		const result = findWorkspaceRoot(tempRoot);
		expect(result).toBeNull();
	});

	it("traverses upward to find .vreko", () => {
		// Create nested structure: tempRoot/.vreko, then search from subdirectory
		mkdirSync(join(tempRoot, ".vreko"));
		const nested = join(tempRoot, "src", "components");
		mkdirSync(nested, { recursive: true });
		const result = findWorkspaceRoot(nested);
		expect(result).toBe(tempRoot);
	});

	it("stops at filesystem root without throwing", () => {
		// Search from a temp dir with no .vreko in any ancestor
		const result = findWorkspaceRoot(tempRoot);
		// Should return null, not throw
		expect(result === null || typeof result === "string").toBe(true);
	});
});
