/**
 * Warn Mode Integration Test (Phase 2)
 *
 * Tests for learning evaluation in warn mode during validation.
 * Verifies that warn-type learnings are surfaced to the user without modifying behavior.
 *
 * Spec: docs/implementation/learning_retrieval_overhaul/learning_autoprune.md
 * - Phase 2: Warn Mode - Apply warn-type actions only, CLI output, E2E test
 *
 * @see {@link file:///Users/user1/WebstormProjects/Vreko-Site/docs/implementation/learning_retrieval_overhaul/learning_autoprune.md}
 */

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { StateStore } from "@vreko/intelligence/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// TODO: SB-190 - Skip entire suite. daemon/server module doesn't exist yet.
// This test was written ahead of implementation (TDD). Enable when daemon is implemented.
// import { VrekoDaemon } from "../../src/daemon/server";
type VrekoDaemon = any;

// Test directory for this suite
const TEST_DIR = join(process.cwd(), ".test-warn-mode-integration");
const TEST_SOCKET = join(TEST_DIR, "daemon.sock");
const TEST_PID = join(TEST_DIR, "daemon.pid");
const TEST_WORKSPACE = join(TEST_DIR, "workspace");

// Skip entire suite - daemon/server module not yet implemented
describe("@integration Warn Mode Integration", () => {
	let daemon: VrekoDaemon | null = null;

	beforeEach(async () => {
		// Clean and create test directory
		if (await exists(TEST_DIR)) {
			await rm(TEST_DIR, { recursive: true, force: true });
		}
		await mkdir(TEST_DIR, { recursive: true });
		await mkdir(TEST_WORKSPACE, { recursive: true });
		await mkdir(join(TEST_WORKSPACE, ".vreko"), { recursive: true });
	});

	afterEach(async () => {
		// Stop daemon if running
		if (daemon?.isRunning()) {
			await daemon.shutdown();
		}

		// Clean up test directory
		if (await exists(TEST_DIR)) {
			await rm(TEST_DIR, { recursive: true, force: true });
		}
	});

	it("should return warn-type learnings when mode=warn", async () => {
		// ARRANGE: Seed StateStore with warn-type learning
		const stateStore = new StateStore({
			vrekoDir: join(TEST_WORKSPACE, ".vreko"),
		});
		await stateStore.load();

		stateStore.addLearning({
			type: "pitfall",
			trigger: "verify catch without logging",
			action: "warn on silent catch blocks",
			tier: "hot",
			keywords: ["verify", "pitfall", "catch"],
		});
		await stateStore.save();

		// ACT: Start daemon and evaluate with mode=warn
		daemon = new VrekoDaemon({
			socketPath: TEST_SOCKET,
			pidPath: TEST_PID,
			idleTimeoutMs: 60000,
			maxConnections: 5,
			version: "1.0.0-test",
		});
		await daemon.start();

		const { DaemonClient } = await import("../../src/daemon/client");
		const client = new DaemonClient({
			socketPath: TEST_SOCKET,
			pidPath: TEST_PID,
			autoStart: false,
		});

		await client.connect();
		const result = await client.evaluateLearnings(TEST_WORKSPACE, "verify", {
			filesOrPaths: ["src/auth.ts"],
			intent: "review",
			mode: "warn",
		});
		await client.disconnect();

		// ASSERT: Should return warn-type learnings
		expect(result).toBeDefined();
		expect(result.selectedLearnings).toBeDefined();
		expect(result.selectedLearnings.length).toBeGreaterThan(0);

		// All returned learnings should be warn-type
		for (const learning of result.selectedLearnings) {
			expect(learning.action.type).toBe("warn");
		}

		// Debug info should show evaluation occurred
		expect(result.debug).toBeDefined();
		expect(result.debug?.evaluatedCount).toBeGreaterThan(0);
		expect(result.debug?.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("should filter out non-warn learnings in warn mode", async () => {
		// ARRANGE: Seed StateStore with mixed learning types
		const stateStore = new StateStore({
			vrekoDir: join(TEST_WORKSPACE, ".vreko"),
		});
		await stateStore.load();

		// Add warn-type learning
		stateStore.addLearning({
			type: "pitfall",
			trigger: "verify catch without logging",
			action: "warn on silent catch blocks",
			tier: "hot",
			keywords: ["verify", "pitfall"],
		});

		// Add non-warn learning (pattern with add-flag action)
		stateStore.addLearning({
			type: "pattern",
			trigger: "verify JWT validation",
			action: "add --validate-expiry flag",
			tier: "hot",
			keywords: ["verify", "jwt"],
		});

		await stateStore.save();

		// ACT: Start daemon and evaluate with mode=warn
		daemon = new VrekoDaemon({
			socketPath: TEST_SOCKET,
			pidPath: TEST_PID,
			idleTimeoutMs: 60000,
			maxConnections: 5,
			version: "1.0.0-test",
		});
		await daemon.start();

		const { DaemonClient } = await import("../../src/daemon/client");
		const client = new DaemonClient({
			socketPath: TEST_SOCKET,
			pidPath: TEST_PID,
			autoStart: false,
		});

		await client.connect();
		const result = await client.evaluateLearnings(TEST_WORKSPACE, "verify", {
			filesOrPaths: ["src/auth.ts"],
			intent: "review",
			mode: "warn",
		});
		await client.disconnect();

		// ASSERT: Should only return warn-type learnings
		expect(result.selectedLearnings.length).toBeGreaterThan(0);

		// All returned learnings must be warn-type
		for (const learning of result.selectedLearnings) {
			expect(learning.action.type).toBe("warn");
		}

		// Non-warn learnings should be filtered out
		const addFlagLearnings = result.selectedLearnings.filter((l) => l.action.type === "add-flag");
		expect(addFlagLearnings.length).toBe(0);
	});

	it("should not evaluate for non-high-value commands", async () => {
		// ARRANGE: Seed StateStore with warn-type learning
		const stateStore = new StateStore({
			vrekoDir: join(TEST_WORKSPACE, ".vreko"),
		});
		await stateStore.load();

		stateStore.addLearning({
			type: "pitfall",
			trigger: "help pitfall",
			action: "warn message",
			tier: "hot",
			keywords: ["help"],
		});
		await stateStore.save();

		// ACT: Start daemon and evaluate for "help" (NEVER_EVALUATE_COMMAND)
		daemon = new VrekoDaemon({
			socketPath: TEST_SOCKET,
			pidPath: TEST_PID,
			idleTimeoutMs: 60000,
			maxConnections: 5,
			version: "1.0.0-test",
		});
		await daemon.start();

		const { DaemonClient } = await import("../../src/daemon/client");
		const client = new DaemonClient({
			socketPath: TEST_SOCKET,
			pidPath: TEST_PID,
			autoStart: false,
		});

		await client.connect();
		const result = await client.evaluateLearnings(TEST_WORKSPACE, "help", {
			mode: "warn",
		});
		await client.disconnect();

		// ASSERT: Should skip evaluation for "help" command
		expect(result.selectedLearnings.length).toBe(0);
		expect(result.debug?.skippedReason).toContain("not in evaluation scope");
	});
});

// Helper function
async function exists(path: string): Promise<boolean> {
	try {
		await import("node:fs/promises").then((fs) => fs.access(path));
		return true;
	} catch {
		return false;
	}
}
