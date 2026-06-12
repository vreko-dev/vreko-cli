import { describe, expect, it } from "vitest";
import { StatusPanel } from "../../../../ui/tui/panels/StatusPanel.js";

describe("StatusPanel", () => {
	it("is a function (React component)", () => {
		expect(typeof StatusPanel).toBe("function");
	});
});
