import { describe, expect, it } from "vitest";
import { Detection } from "../../../ui/init/Detection.js";

describe("Detection", () => {
	it("is a React component (function)", () => {
		expect(typeof Detection).toBe("function");
	});
});
