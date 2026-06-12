import { describe, expect, it } from "vitest";
import { Profile } from "../../../ui/init/Profile.js";

describe("Profile", () => {
	it("is a React component (function)", () => {
		expect(typeof Profile).toBe("function");
	});
});
