import { describe, expect, it } from "vitest";
import { SnapshotPanel } from "../../../../ui/tui/panels/SnapshotPanel.js";

describe("SnapshotPanel", () => {
	it("is a function (React component)", () => {
		expect(typeof SnapshotPanel).toBe("function");
	});
});
