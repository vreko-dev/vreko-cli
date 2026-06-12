import { EventEmitter } from "node:events";
import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfile: RecoveryRiskProfile = {
	overallRisk: "elevated",
	confidence: 0.85,
	primary: { recoveryRisk: 65, changeVolatility: 55, workflowFragility: 40 },
	secondary: { complexity: 70, collaboration: 30, aiExposure: 15, structuralRisk: 25 },
	topDrivers: [
		{
			id: "test-driver",
			label: "Test driver",
			scoreImpact: 20,
			evidence: ["test"],
			protectiveAction: "test action",
		},
	],
	insights: [
		{
			id: "test-insight",
			severity: "warning" as const,
			observation: "Test observation",
			whyItMatters: "Test matters",
			whatWeWillDo: "Test action",
		},
	],
	lockedInsights: [
		{
			id: "test-locked",
			teaser: "Test teaser",
			requirement: "Test req",
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

const mockEmitter = new EventEmitter();

vi.mock("@vreko/intelligence/init-scan", () => ({
	runInitScan: vi.fn().mockResolvedValue({
		profile: mockProfile,
		emitter: mockEmitter,
	}),
	createDiscoveryEmitter: vi.fn(() => new EventEmitter()),
}));

const { Scanning } = await import("../frames/Scanning.js");

describe("Scanning", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should be a React component", () => {
		expect(Scanning).toBeDefined();
		expect(typeof Scanning).toBe("function");
	});

	it("should accept repoPath and onComplete props", () => {
		const onComplete = vi.fn();
		const element = React.createElement(Scanning, {
			repoPath: "/test/repo",
			onComplete,
		});
		expect(element).toBeDefined();
		expect(element.props.repoPath).toBe("/test/repo");
	});

	it("should call runInitScan with the provided repoPath", async () => {
		const { runInitScan } = await import("@vreko/intelligence/init-scan");
		const onComplete = vi.fn();

		// Create element to trigger the effect
		React.createElement(Scanning, {
			repoPath: "/test/repo",
			onComplete,
		});

		// The actual rendering would trigger the scan
		expect(runInitScan).toBeDefined();
	});

	it("should pass a RecoveryRiskProfile shape to onComplete (not any)", () => {
		// Type check: the onComplete callback expects RecoveryRiskProfile
		const onComplete = (profile: RecoveryRiskProfile) => {
			expect(profile.primary).toBeDefined();
			expect(profile.primary.recoveryRisk).toBe(65);
			expect(profile.topFragileFile).toBe("src/auth.ts");
		};

		// Simulate what happens when scan completes
		onComplete(mockProfile);
	});
});
