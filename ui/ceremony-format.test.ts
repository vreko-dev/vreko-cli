import { describe, expect, it } from "vitest";

describe("CEREM-02: CLI ceremony output format", () => {
	it("renderCeremony returns string with all lines ≤ 80 chars", async () => {
		// This test will fail (RED) until apps/cli/src/ui/ceremony.ts is created in Wave 1
		let renderCeremony: ((record: unknown) => string) | undefined;
		try {
			const mod = await import("../../src/ui/ceremony.js");
			renderCeremony = mod.renderCeremony;
		} catch {
			// Module not yet created  -  test is correctly RED
			expect.fail("apps/cli/src/ui/ceremony.ts does not exist yet  -  implement in Wave 1 (11-01)");
		}
		const mockRecord = {
			sessionId: "test-session-id",
			workspacePath: "/workspace/test-project",
			duration: 3_600_000,
			learningsCaptured: 5,
			checkpointsCreated: 3,
			tokensSaved: 1500,
			tokensSavedIsEstimate: true as const,
			coherenceScore: "high" as const,
			coherenceScoreTyped: { level: "high" as const, domainCount: 1 },
			coherenceRationale: "single domain",
			fragileFilesInSession: [],
			healthDelta: null,
			concurrentSessions: null,
			topLearnings: [],
		};
		const output = renderCeremony!(mockRecord);
		const lines = output.split("\n");
		for (const line of lines) {
			expect(line.length, `Line exceeds 80 chars: "${line}"`).toBeLessThanOrEqual(80);
		}
		expect(output).toContain("## Vreko Session Summary");
		expect(output).toContain("|---------------------|");
	});

	it("renderCeremony with null record returns graceful fallback under 80 chars", async () => {
		let renderCeremony: ((record: unknown) => string) | undefined;
		try {
			const mod = await import("../../src/ui/ceremony.js");
			renderCeremony = mod.renderCeremony;
		} catch {
			expect.fail("apps/cli/src/ui/ceremony.ts does not exist yet  -  implement in Wave 1 (11-01)");
		}
		const output = renderCeremony!(null);
		const lines = output.split("\n");
		for (const line of lines) {
			expect(line.length, `Fallback line exceeds 80 chars: "${line}"`).toBeLessThanOrEqual(80);
		}
		expect(output).toContain("## Vreko Session Summary");
	});
});
