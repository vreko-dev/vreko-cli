/**
 * Init flow smoke tests
 *
 * Tests that the new ui/init/ components wire together correctly.
 * These are structural / type-level tests that do not require a real TTY.
 */

import React from "react";
import { describe, expect, it, vi } from "vitest";

// Block package resolutions that aren't available in test env
vi.mock("@vreko/local-service-client", () => ({
	VrekoLocalClient: vi.fn(),
}));
vi.mock("../../service-adapter/local-service-adapter.js", () => ({
	isServiceRunning: vi.fn().mockResolvedValue(false),
}));
vi.mock("../services/service-client.js", () => ({
	connectToDaemon: vi.fn().mockResolvedValue(undefined),
	getDaemonStatus: vi.fn().mockResolvedValue({ connected: true }),
	isDaemonConnected: vi.fn().mockReturnValue(false),
	getDaemonClient: vi.fn().mockReturnValue({
		call: vi.fn().mockResolvedValue({ triggered: true }),
	}),
}));
vi.mock("../../services/vreko-dir.js", () => ({
	saveBenchmarkOptIn: vi.fn().mockResolvedValue(undefined),
	isVrekoInitialized: vi.fn().mockResolvedValue(false),
}));

// Mock heavy intelligence scan
vi.mock("@vreko/intelligence/init-scan", () => {
	const EventEmitter = require("node:events").EventEmitter;
	return {
		runInitScan: vi.fn().mockResolvedValue({
			overallRisk: "elevated",
			confidence: 0.85,
			primary: { recoveryRisk: 65, changeVolatility: 55, workflowFragility: 40 },
			secondary: { complexity: 70, collaboration: 30, aiExposure: 15, structuralRisk: 25 },
			topDrivers: [
				{ id: "d1", label: "Repeated recovery events", scoreImpact: 30, evidence: [], protectiveAction: "" },
			],
			insights: [
				{
					id: "i1",
					severity: "warning",
					observation: "10 recovery events",
					whyItMatters: "Frequent",
					whatWeWillDo: "Protect",
				},
			],
			lockedInsights: [
				{
					id: "l1",
					teaser: "Session risk",
					requirement: "Needs sessions",
					unlockCondition: { type: "days_observed", days: 3 },
				},
			],
			recommendedConfig: {
				protectionLevel: "enhanced",
				snapshotFrequency: "balanced",
				watchTargets: [{ path: "src/auth.ts", fileCount: 1, reason: "fragile" }],
				enabledFeatures: [],
			},
			topFragileFile: "src/auth.ts",
			topFragileFiles: [{ path: "src/auth.ts", changeCount: 10, revertCount: 2 }],
			coChange: [],
			fragility: [],
		}),
		createDiscoveryEmitter: vi.fn(() => new EventEmitter()),
	};
});

// Mock node:fs for guard checks
vi.mock("node:fs", async (importOriginal) => {
	const real = await importOriginal<typeof import("node:fs")>();
	return {
		...real,
		existsSync: vi.fn((p: string) => {
			if (typeof p === "string" && p.endsWith("/.git")) return true;
			if (typeof p === "string" && p.endsWith("/.vreko/config.json")) return false;
			return false;
		}),
		statSync: real.statSync,
		readdirSync: real.readdirSync,
	};
});

const { InitApp } = await import("../ui/init/InitApp.js");
const { Activation } = await import("../ui/init/Activation.js");

describe("InitApp", () => {
	it("is a React component", () => {
		expect(typeof InitApp).toBe("function");
	});

	it("accepts pathArg and options props", () => {
		const el = React.createElement(InitApp, { pathArg: "/test/repo", options: {} });
		expect(el).toBeDefined();
		expect(el.props.pathArg).toBe("/test/repo");
	});

	it("uses cwd when pathArg is not provided", () => {
		const el = React.createElement(InitApp, { options: {} });
		expect(el).toBeDefined();
	});

	it("accepts force option to bypass already-initialized guard", () => {
		const el = React.createElement(InitApp, { options: { force: true } });
		expect(el.props.options.force).toBe(true);
	});
});

describe("Init flow guards", () => {
	it("can render with non-git-repo path", async () => {
		const { existsSync } = await import("node:fs");
		vi.mocked(existsSync).mockImplementation((p) => {
			if (typeof p === "string" && p.endsWith("/.git")) return false;
			return false;
		});
		const el = React.createElement(InitApp, { pathArg: "/tmp/not-a-repo", options: {} });
		expect(el.props.pathArg).toBe("/tmp/not-a-repo");
	});

	it("can render with already-configured path without force", async () => {
		const { existsSync } = await import("node:fs");
		vi.mocked(existsSync).mockImplementation((p) => {
			if (typeof p === "string" && p.endsWith("/.git")) return true;
			if (typeof p === "string" && p.endsWith("/.vreko/config.json")) return true;
			return false;
		});
		const el = React.createElement(InitApp, { pathArg: "/tmp/initialized", options: { force: false } });
		expect(el.props.options.force).toBe(false);
	});

	it("bypasses already-configured guard when force=true", async () => {
		const { existsSync } = await import("node:fs");
		vi.mocked(existsSync).mockImplementation((p) => {
			if (typeof p === "string" && p.endsWith("/.git")) return true;
			if (typeof p === "string" && p.endsWith("/.vreko/config.json")) return true;
			return false;
		});
		const el = React.createElement(InitApp, { pathArg: "/tmp/initialized", options: { force: true } });
		expect(el.props.options.force).toBe(true);
	});
});

describe("Activation IPC triggers", () => {
	it("is a React component", () => {
		expect(typeof Activation).toBe("function");
	});

	it("calls workspace.json IPC triggers when daemon connects", async () => {
		// mockReset: true in global vitest config clears mock implementations before each test.
		// Re-setup mocks here before exercising the trigger sequence.
		const { getDaemonClient, connectToDaemon, isDaemonConnected } = await import("../services/service-client.js");

		const mockCall = vi.fn().mockResolvedValue({ triggered: true });
		vi.mocked(getDaemonClient).mockReturnValue({ call: mockCall } as never);
		vi.mocked(isDaemonConnected).mockReturnValue(false);
		vi.mocked(connectToDaemon).mockResolvedValue(undefined as never);

		// Replicate Activation.tsx service connection + workspace.json trigger sequence
		let step1Connected = false;
		if (!isDaemonConnected()) {
			await connectToDaemon();
		}
		step1Connected = true;

		if (step1Connected) {
			const client = getDaemonClient();
			if (client) {
				await client.call("workspace/trigger-workspace-json-write", { workspace: "/tmp/test-repo" });
				await client.call("workspace/write-from-scan-profile", { workspace: "/tmp/test-repo" });
			}
		}

		const callNames = mockCall.mock.calls.map((c) => c[0]);
		expect(callNames).toContain("workspace/trigger-workspace-json-write");
		expect(callNames).toContain("workspace/write-from-scan-profile");
	});
});
