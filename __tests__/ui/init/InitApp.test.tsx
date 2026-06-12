import { describe, expect, it } from "vitest";
import { InitApp } from "../../../ui/init/InitApp.js";

describe("InitApp", () => {
	it("is a React component (function)", () => {
		expect(typeof InitApp).toBe("function");
	});
});
