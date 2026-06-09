/**
 * TUI View Data Contract Invariants
 *
 * Tests that the Zod schemas correctly accept valid data and reject invalid data.
 * These schemas are the boundary between daemon RPC responses and Ink view rendering  -
 * a parse failure crashes the view silently if not caught.
 */

import { describe, expect, it } from "vitest";
import { GaugeStage, PulseEvent, StatusViewData, WatchEvent } from "../../src/ui/contracts.js";

// ---------------------------------------------------------------------------
// StatusViewData
// ---------------------------------------------------------------------------

describe("StatusViewData schema", () => {
	const validData: StatusViewData = {
		intelligence: {
			codebaseHealth: 85,
			knowledgeChunks: 42,
			learnedPatterns: 7,
			fragileFiles: 3,
			cochangeRelationships: 12,
		},
		session: {
			task: "implement auth",
			duration: 3600,
			active: true,
		},
		protection: { active: true, filesWatched: 150 },
		aiActivity: {
			"Claude Code": { contextServed: 5, warningsServed: 1, lastActivity: 1700000000 },
		},
		recentEvents: [{ timestamp: 1700000000, type: "save", message: "Snapshot created" }],
		daemon: { connected: true, uptime: 7200, version: "2.0.0" },
	};

	it("parses valid StatusViewData", () => {
		const result = StatusViewData.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("accepts null session", () => {
		const data = { ...validData, session: null };
		expect(StatusViewData.safeParse(data).success).toBe(true);
	});

	it("rejects codebaseHealth > 100", () => {
		const data = {
			...validData,
			intelligence: { ...validData.intelligence, codebaseHealth: 101 },
		};
		expect(StatusViewData.safeParse(data).success).toBe(false);
	});

	it("rejects codebaseHealth < 0", () => {
		const data = {
			...validData,
			intelligence: { ...validData.intelligence, codebaseHealth: -1 },
		};
		expect(StatusViewData.safeParse(data).success).toBe(false);
	});

	it("rejects negative filesWatched", () => {
		const data = { ...validData, protection: { active: true, filesWatched: -1 } };
		expect(StatusViewData.safeParse(data).success).toBe(false);
	});

	it("rejects unknown recentEvent type", () => {
		const data = {
			...validData,
			recentEvents: [{ timestamp: 1700000000, type: "unknown", message: "test" }],
		};
		expect(StatusViewData.safeParse(data).success).toBe(false);
	});

	it("accepts all valid recentEvent types", () => {
		const types = ["fragile", "cochange", "learning", "risk", "pattern", "save", "warning", "mcp"] as const;
		for (const type of types) {
			const data = {
				...validData,
				recentEvents: [{ timestamp: 1700000000, type, message: "test" }],
			};
			expect(StatusViewData.safeParse(data).success).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// WatchEvent
// ---------------------------------------------------------------------------

describe("WatchEvent schema", () => {
	const validEvent: WatchEvent = {
		timestamp: 1700000000,
		filePath: "src/auth.ts",
		riskScore: 0.75,
		riskLevel: "HIGH",
		aiDetected: true,
		aiTool: "Claude Code",
		aiConfidence: 90,
		restorePointCreated: false,
	};

	it("parses valid WatchEvent", () => {
		expect(WatchEvent.safeParse(validEvent).success).toBe(true);
	});

	it("accepts minimal WatchEvent (only required fields)", () => {
		const minimal = { timestamp: 1700000000, filePath: "src/index.ts" };
		expect(WatchEvent.safeParse(minimal).success).toBe(true);
	});

	it("rejects riskScore > 1", () => {
		expect(WatchEvent.safeParse({ ...validEvent, riskScore: 1.1 }).success).toBe(false);
	});

	it("rejects riskScore < 0", () => {
		expect(WatchEvent.safeParse({ ...validEvent, riskScore: -0.1 }).success).toBe(false);
	});

	it("rejects invalid riskLevel", () => {
		expect(WatchEvent.safeParse({ ...validEvent, riskLevel: "EXTREME" }).success).toBe(false);
	});

	it("accepts all valid riskLevel values", () => {
		for (const level of ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const) {
			expect(WatchEvent.safeParse({ ...validEvent, riskLevel: level }).success).toBe(true);
		}
	});

	it("aiConfidence defaults to undefined (not required)", () => {
		const { aiConfidence: _ignored, ...withoutConfidence } = validEvent;
		expect(WatchEvent.safeParse(withoutConfidence).success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// PulseEvent
// ---------------------------------------------------------------------------

describe("PulseEvent schema", () => {
	const validEvent: PulseEvent = {
		timestamp: 1700000000,
		agentName: "Claude Code",
		action: "context-request",
		filePath: "src/auth.ts",
		served: {
			learnings: 5,
			cochangePatterns: 2,
			riskScore: 0.6,
			warnings: 1,
		},
	};

	it("parses valid PulseEvent", () => {
		expect(PulseEvent.safeParse(validEvent).success).toBe(true);
	});

	it("accepts minimal PulseEvent", () => {
		const minimal = { timestamp: 1700000000, agentName: "Claude Code", action: "heartbeat" };
		expect(PulseEvent.safeParse(minimal).success).toBe(true);
	});

	it("rejects invalid action", () => {
		expect(PulseEvent.safeParse({ ...validEvent, action: "unknown-action" }).success).toBe(false);
	});

	it("accepts all valid action values", () => {
		const actions = ["context-request", "learning-recorded", "pulse-checked", "heartbeat"] as const;
		for (const action of actions) {
			expect(PulseEvent.safeParse({ ...validEvent, action }).success).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// GaugeStage
// ---------------------------------------------------------------------------

describe("GaugeStage schema", () => {
	const validStage: GaugeStage = {
		name: "Scanning commits",
		weight: 25,
		status: "active",
		metric: "45 commits",
		displayText: "Scanning commit history...",
	};

	it("parses valid GaugeStage", () => {
		expect(GaugeStage.safeParse(validStage).success).toBe(true);
	});

	it("accepts all valid status values", () => {
		for (const status of ["pending", "active", "complete", "failed"] as const) {
			expect(GaugeStage.safeParse({ ...validStage, status }).success).toBe(true);
		}
	});

	it("rejects invalid status", () => {
		expect(GaugeStage.safeParse({ ...validStage, status: "running" }).success).toBe(false);
	});

	it("rejects weight > 100", () => {
		expect(GaugeStage.safeParse({ ...validStage, weight: 101 }).success).toBe(false);
	});

	it("rejects weight < 0", () => {
		expect(GaugeStage.safeParse({ ...validStage, weight: -1 }).success).toBe(false);
	});

	it("metric is optional", () => {
		const { metric: _ignored, ...withoutMetric } = validStage;
		expect(GaugeStage.safeParse(withoutMetric).success).toBe(true);
	});
});
