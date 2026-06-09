/**
 * Score Display Tests
 *
 * Validates that:
 * 1. All floating-point scores are rounded to integers (the P0 critical bug fix)
 * 2. Metric gating works correctly (zero values show appropriate placeholders)
 */

import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it, vi } from "vitest";

// Mock useWindowSize before importing Profile
vi.mock("ink", async (importOriginal) => {
	const real = await importOriginal<typeof import("ink")>();
	return {
		...real,
		useWindowSize: () => ({ columns: 100, rows: 40 }),
	};
});

const { Profile } = await import("../ui/init/Profile.js");

function mockProfile(
	overrides: Partial<{
		recoveryRisk: number;
		changeVolatility: number;
		workflowFragility: number;
		complexity: number;
		collaboration: number;
		aiExposure: number;
		structuralRisk: number;
	}> = {},
) {
	return {
		overallRisk: "elevated" as const,
		confidence: 0.85,
		primary: {
			recoveryRisk: overrides.recoveryRisk ?? 65.5,
			changeVolatility: overrides.changeVolatility ?? 55.7,
			workflowFragility: overrides.workflowFragility ?? 40.2,
		},
		secondary: {
			complexity: overrides.complexity ?? 70.1,
			collaboration: overrides.collaboration ?? 30.9,
			aiExposure: overrides.aiExposure ?? 15.3,
			structuralRisk: overrides.structuralRisk ?? 25.8,
		},
		topDrivers: [
			{
				id: "d1",
				label: "Repeated recovery events",
				scoreImpact: 30,
				evidence: ["10 reset events"],
				protectiveAction: "Increase snapshot density",
			},
		],
		insights: [],
		lockedInsights: [],
		recommendedConfig: {
			protectionLevel: "enhanced" as const,
			snapshotFrequency: "balanced" as const,
			watchTargets: [{ path: "src/auth.ts", fileCount: 1, reason: "fragile detected" }],
			enabledFeatures: ["real-time-protection"],
		},
		topFragileFile: "src/auth.ts",
		topFragileFiles: [{ path: "src/auth.ts", changeCount: 10, revertCount: 2 }],
		coChange: [],
		fragility: [],
	};
}

describe("Score Display", () => {
	it("rounds floating-point recoveryRisk to integer with % suffix", () => {
		const profile = mockProfile({ recoveryRisk: 82.78282472811074 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("83%");
		expect(frame).not.toMatch(/8[23]\.\d+/); // No raw floating-point decimals like 82.78
	});

	it("rounds changeVolatility to integer", () => {
		const profile = mockProfile({ changeVolatility: 55.7 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("56%");
	});

	it("rounds workflowFragility to integer", () => {
		const profile = mockProfile({ workflowFragility: 40.2 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("40%");
	});

	it("shows tracking-begins message for AI exposure = 0", () => {
		const profile = mockProfile({ aiExposure: 0 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("Tracking begins after first session");
	});

	it("shows AI exposure value when > 0", () => {
		const profile = mockProfile({ aiExposure: 42 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("42");
	});

	it("hides structuralRisk when = 0", () => {
		const profile = mockProfile({ structuralRisk: 0 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).not.toContain("structural");
	});

	it("shows structuralRisk when > 0", () => {
		const profile = mockProfile({ structuralRisk: 35 });
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("35");
	});

	it("no raw floating-point decimals anywhere in output", () => {
		const profile = mockProfile({
			recoveryRisk: 82.78282472811074,
			changeVolatility: 55.12345,
			workflowFragility: 40.9999,
		});
		const { lastFrame } = render(
			React.createElement(Profile, {
				profile,
				onContinue: () => {
					/* noop */
				},
			}),
		);
		const frame = lastFrame() ?? "";
		// No patterns like "82.78" or "55.12" should appear
		expect(frame).not.toMatch(/\d+\.\d+/);
	});
});
