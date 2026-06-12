import { describe, expect, it } from "vitest";
import { DashboardPanel } from "../../../../ui/tui/panels/DashboardPanel.js";

describe("DashboardPanel", () => {
	it("is a function (React component)", () => {
		expect(typeof DashboardPanel).toBe("function");
	});
});
