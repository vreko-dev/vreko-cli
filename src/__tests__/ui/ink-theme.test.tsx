/**
 * Vreko Ink Theme Tests
 *
 * Validates the brand theme configuration and VrekoTheme component
 * structure without requiring a full Ink rendering environment.
 */

import { describe, expect, it } from "vitest";
import { VrekoTheme, vrekoTheme } from "../../ui/ink-theme.js";

describe("vrekoTheme", () => {
	it("is a valid theme object with component overrides", () => {
		expect(vrekoTheme).toBeDefined();
		expect(typeof vrekoTheme).toBe("object");
	});

	it("includes Vreko brand color overrides for Spinner", () => {
		expect(vrekoTheme.components).toBeDefined();
		expect(vrekoTheme.components.Spinner).toBeDefined();
	});

	it("includes brand overrides for Badge and ProgressBar", () => {
		expect(vrekoTheme.components.Badge).toBeDefined();
		expect(vrekoTheme.components.ProgressBar).toBeDefined();
	});
});

describe("VrekoTheme", () => {
	it("is a function (React component)", () => {
		expect(typeof VrekoTheme).toBe("function");
	});
});
