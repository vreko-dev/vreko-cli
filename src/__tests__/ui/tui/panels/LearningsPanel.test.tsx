import { describe, expect, it } from "vitest";
import { LearningsPanel } from "../../../../ui/tui/panels/LearningsPanel.js";

describe("LearningsPanel", () => {
	it("is a function (React component)", () => {
		expect(typeof LearningsPanel).toBe("function");
	});
});
