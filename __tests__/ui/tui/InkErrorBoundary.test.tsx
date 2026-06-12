import { describe, expect, it } from "vitest";
import { InkErrorBoundary } from "../../../ui/tui/InkErrorBoundary.js";

describe("InkErrorBoundary", () => {
	it("is a class (React error boundary)", () => {
		expect(typeof InkErrorBoundary).toBe("function");
	});

	it("has getDerivedStateFromError static method", () => {
		expect(typeof InkErrorBoundary.getDerivedStateFromError).toBe("function");
	});
});
