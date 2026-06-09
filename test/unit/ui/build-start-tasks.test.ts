/** buildStartTasks Tests (Phase 31). Covers: CLI-05 (listr2 task tree), CLI-06 (all 5 boot profiles). */

import type { BootProfileType } from "@vreko/contracts/local-service";
import { describe, expect, it } from "vitest";
import { buildStartTasks } from "../../../src/ui/start-tasks/index.js";

describe("CLI-05: buildStartTasks", () => {
	it("CLI-05: buildStartTasks is exported from apps/cli/src/ui/start-tasks/index.ts", () => {
		// Validates buildStartTasks is exported and callable
		expect(buildStartTasks).not.toBeUndefined();
		expect(typeof buildStartTasks).toBe("function");
	});

	it("CLI-05: buildStartTasks() returns an object with a run() method (Listr instance)", () => {
		// Validates the return value is a Listr instance with a run() method
		const result = buildStartTasks("WARM_RETURN");
		expect(typeof result.run).toBe("function");
	});

	it("CLI-06: buildStartTasks('VIRGIN') returns task list including 'Initialize workspace'", () => {
		// Validates VIRGIN profile includes full workspace initialization task
		const result = buildStartTasks("VIRGIN");
		const tasks = result.tasks as Array<{ title: string }>;
		const titles = tasks.map((t) => t.title);
		expect(titles).toContain("Initialize workspace");
	});

	it("CLI-06: buildStartTasks('HOT_RECONNECT') returns only the 'Connect to daemon' task as enabled", () => {
		// Validates HOT_RECONNECT profile enables exactly one task (reconnect only)
		const result = buildStartTasks("HOT_RECONNECT");
		const enabledCount = (result.tasks as Array<{ enabled?: () => boolean }>).filter(
			(t) => !t.enabled || t.enabled(),
		).length;
		expect(enabledCount).toBe(1);
	});

	it("CLI-06: buildStartTasks accepts all 5 profile values without throwing", () => {
		// Validates all BootProfileType values are handled without runtime errors
		const profiles: BootProfileType[] = ["VIRGIN", "NEW_WORKSPACE", "COLD_RETURN", "WARM_RETURN", "HOT_RECONNECT"];
		for (const profile of profiles) {
			expect(() => buildStartTasks(profile)).not.toThrow();
		}
	});
});
