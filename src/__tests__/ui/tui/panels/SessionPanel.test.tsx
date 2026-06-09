import { describe, expect, it } from "vitest";
import { SessionPanel } from "../../../../ui/tui/panels/SessionPanel.js";

describe("SessionPanel", () => {
	it("is a function (React component)", () => {
		expect(typeof SessionPanel).toBe("function");
	});
});
