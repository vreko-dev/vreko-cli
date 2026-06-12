import { describe, expect, it } from "vitest";
import { TuiApp } from "../../../ui/tui/TuiApp.js";

describe("TuiApp", () => {
	it("is a function (React component)", () => {
		expect(typeof TuiApp).toBe("function");
	});
});
