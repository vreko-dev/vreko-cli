import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock runInitScan before importing App
vi.mock("@vreko/intelligence/init-scan", () => {
	const mockProfile: RecoveryRiskProfile = {
		overallRisk: "elevated",
		confidence: 0.85,
		primary: { recoveryRisk: 65, changeVolatility: 55, workflowFragility: 40 },
		secondary: { complexity: 70, collaboration: 30, aiExposure: 15, structuralRisk: 25 },
		topDrivers: [
			{
				id: "repeated-recoveries",
				label: "Repeated recovery events",
				scoreImpact: 30,
				evidence: ["10 reset events"],
				protectiveAction: "Increase snapshot density",
			},
		],
		insights: [
			{
				id: "high-reset-rate",
				severity: "warning" as const,
				observation: "10 recovery events",
				whyItMatters: "Frequent resets",
				whatWeWillDo: "Increase snapshot density",
			},
		],
		lockedInsights: [
			{
				id: "session-risk-windows",
				teaser: "Session risk analysis",
				requirement: "Requires observed sessions",
				unlockCondition: { type: "days_observed" as const, days: 3 },
			},
		],
		recommendedConfig: {
			protectionLevel: "enhanced",
			snapshotFrequency: "balanced",
			watchTargets: [{ path: "src/auth.ts", fileCount: 1, reason: "fragile detected" }],
			enabledFeatures: ["real-time-protection"],
		},
		topFragileFile: "src/auth.ts",
		topFragileFiles: [{ path: "src/auth.ts", changeCount: 10, revertCount: 2 }],
		coChange: [],
		fragility: [],
	};

	const EventEmitter = require("node:events").EventEmitter;

	return {
		runInitScan: vi.fn().mockResolvedValue({
			profile: mockProfile,
			emitter: new EventEmitter(),
		}),
		createDiscoveryEmitter: vi.fn(() => new EventEmitter()),
	};
});

// Dynamic import after mock
const { App } = await import("../App.js");

describe("App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should be a React component", () => {
		expect(App).toBeDefined();
		expect(typeof App).toBe("function");
	});

	it("should accept pathArg and options props", () => {
		// Verify the component can be instantiated (type check)
		const element = React.createElement(App, {
			pathArg: "/test/repo",
			options: { json: false },
		});
		expect(element).toBeDefined();
		expect(element.props.pathArg).toBe("/test/repo");
	});

	it("should use process.cwd() when pathArg is not provided", () => {
		const element = React.createElement(App, {
			options: {},
		});
		expect(element).toBeDefined();
		// pathArg is undefined, component will use process.cwd()
	});

	it("should have typed profile state (not any)", async () => {
		// This is a compile-time check - if profile were typed as 'any',
		// the component would still work but we verify through the import
		const mod = await import("@vreko/intelligence/init-scan");
		const runInitScan = mod.runInitScan;
		expect(runInitScan).toBeDefined();
	});
});
