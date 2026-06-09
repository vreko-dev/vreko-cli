import { describe, expect, it } from "vitest";
import { TabBar } from "../../../ui/tui/TabBar.js";

describe("TabBar", () => {
	it("is a function (React component)", () => {
		expect(typeof TabBar).toBe("function");
	});
});
