import { describe, expect, it } from "vitest";
import { DashboardApp } from "../../../ui/dashboard/DashboardApp.js";

describe("DashboardApp", () => {
	it("is a function (React component)", () => {
		expect(typeof DashboardApp).toBe("function");
	});
});
