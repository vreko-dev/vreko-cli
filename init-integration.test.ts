import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Import the pipeline directly (no mocks - real git operations)
// Use relative path to avoid ESM resolution issues in worktrees
import { runInitScan } from "../../../packages/intelligence/src/init-scan/index.js";

const tempDirs: string[] = [];

function createTestRepo(): string {
	const dir = join(tmpdir(), `vreko-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);

	// Initialize git repo
	execSync("git init", { cwd: dir, stdio: "pipe" });
	execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "pipe" });
	execSync('git config user.name "Test"', { cwd: dir, stdio: "pipe" });

	// Create initial structure
	writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "test-repo" }));
	writeFileSync(join(dir, "vitest.config.ts"), "export default {}");
	writeFileSync(join(dir, ".gitignore"), "node_modules\ndist\n.env");

	mkdirSync(join(dir, "src"), { recursive: true });
	mkdirSync(join(dir, "test"), { recursive: true });

	// Create files that will be churned
	writeFileSync(join(dir, "src/auth.ts"), "export function login() { return true; }");
	writeFileSync(join(dir, "src/config.ts"), "export const config = {};");
	writeFileSync(join(dir, "src/utils.ts"), "export function helper() { /* intentionally empty */ }");
	writeFileSync(join(dir, "test/auth.test.ts"), "test('login', () => { /* intentionally empty */ })");

	// Initial commit
	execSync("git add -A", { cwd: dir, stdio: "pipe" });
	execSync('git commit -m "initial commit"', { cwd: dir, stdio: "pipe" });

	// Create a series of commits with churn
	for (let i = 0; i < 15; i++) {
		writeFileSync(join(dir, "src/auth.ts"), `export function login() { return ${i}; }`);
		if (i % 3 === 0) {
			writeFileSync(join(dir, "src/config.ts"), `export const config = { v: ${i} };`);
		}
		execSync("git add -A", { cwd: dir, stdio: "pipe" });
		execSync(`git commit -m "change ${i}"`, { cwd: dir, stdio: "pipe" });
	}

	// Create a revert
	writeFileSync(join(dir, "src/auth.ts"), "export function login() { return 'reverted'; }");
	execSync("git add -A", { cwd: dir, stdio: "pipe" });
	execSync('git commit -m "Revert bad change"', { cwd: dir, stdio: "pipe" });

	// Create a second branch with some work
	execSync("git checkout -b feature-branch", { cwd: dir, stdio: "pipe" });
	writeFileSync(join(dir, "src/feature.ts"), "export function feature() { /* intentionally empty */ }");
	execSync("git add -A", { cwd: dir, stdio: "pipe" });
	execSync('git commit -m "add feature"', { cwd: dir, stdio: "pipe" });
	execSync("git checkout main 2>/dev/null || git checkout master", { cwd: dir, stdio: "pipe" });

	// Do a few resets
	for (let i = 0; i < 3; i++) {
		writeFileSync(join(dir, "src/auth.ts"), `export function login() { return 'temp-${i}'; }`);
		execSync("git add -A", { cwd: dir, stdio: "pipe" });
		execSync(`git commit -m "temp commit ${i}"`, { cwd: dir, stdio: "pipe" });
		execSync("git reset HEAD~1", { cwd: dir, stdio: "pipe" });
		execSync("git checkout -- .", { cwd: dir, stdio: "pipe" });
	}

	// Final commits to stabilize
	for (let i = 0; i < 3; i++) {
		writeFileSync(join(dir, "src/auth.ts"), `export function login() { return 'final-${i}'; }`);
		execSync("git add -A", { cwd: dir, stdio: "pipe" });
		execSync(`git commit -m "final ${i}"`, { cwd: dir, stdio: "pipe" });
	}

	return dir;
}

describe("init-scan integration", () => {
	afterAll(() => {
		for (const dir of tempDirs) {
			try {
				rmSync(dir, { recursive: true, force: true });
			} catch {
				/* ignore */
			}
		}
	});

	it("should produce a realistic profile from a test repo", async () => {
		const repoDir = createTestRepo();
		const { profile, emitter } = await runInitScan(repoDir);

		// Profile should have non-zero, non-hardcoded values
		expect(profile.overallRisk).toBeDefined();
		expect(profile.confidence).toBeGreaterThan(0);

		// Primary dimensions should be populated (not all zeros, not hardcoded 78)
		expect(profile.primary.recoveryRisk).toBeGreaterThanOrEqual(0);
		expect(profile.primary.recoveryRisk).toBeLessThanOrEqual(100);
		expect(profile.primary.recoveryRisk).not.toBe(78); // not the old hardcoded value

		expect(profile.primary.changeVolatility).toBeGreaterThanOrEqual(0);
		expect(profile.primary.workflowFragility).toBeGreaterThanOrEqual(0);

		// Insights should be non-empty and reference actual data
		// (may or may not have insights depending on churn thresholds)
		expect(profile.insights).toBeDefined();

		// Locked insight should exist
		expect(profile.lockedInsights).toHaveLength(1);

		// topFragileFile should be set and be a real file from the repo
		// (auth.ts has the most churn)
		expect(profile.topFragileFile).toBeTruthy();
		expect(profile.topFragileFile).toContain("auth.ts");

		// Emitter should be functional
		expect(emitter).toBeDefined();
		expect(typeof emitter.on).toBe("function");
	}, 30000);

	it("should handle a minimal repo (few commits)", async () => {
		const dir = join(tmpdir(), `vreko-minimal-${Date.now()}`);
		mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);

		execSync("git init", { cwd: dir, stdio: "pipe" });
		execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "pipe" });
		execSync('git config user.name "Test"', { cwd: dir, stdio: "pipe" });
		writeFileSync(join(dir, "README.md"), "# Test");
		execSync("git add -A", { cwd: dir, stdio: "pipe" });
		execSync('git commit -m "init"', { cwd: dir, stdio: "pipe" });

		const { profile } = await runInitScan(dir);

		expect(profile).toBeDefined();
		expect(profile.overallRisk).toBeDefined();
		expect(profile.confidence).toBeGreaterThan(0);
	}, 30000);
});
