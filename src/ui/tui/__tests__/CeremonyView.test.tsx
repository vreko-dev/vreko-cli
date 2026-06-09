/**
 * CeremonyView Unit Tests  -  Phase 32
 *
 * Tests the Ink ceremony view for null record (fallback) and full CeremonyDisplayRecord.
 * Requirement: TUI-03  -  CeremonyView.tsx is a real Ink component with null-safe fallback.
 */
import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("ink", async (importOriginal) => {
	const real = await importOriginal<typeof import("ink")>();
	return {
		...real,
		useInput: vi.fn(),
		useApp: () => ({ exit: vi.fn() }),
	};
});

import { CeremonyView } from "../../ceremony/CeremonyView.js";

describe("CeremonyView  -  null record (service not connected)", () => {
	it("renders fallback message when record is null", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: null }));
		expect(lastFrame()).toContain("Service not connected - ceremony data unavailable.");
	});

	it("does not render session summary header when record is null", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: null }));
		expect(lastFrame()).not.toContain("Vreko Session Summary");
	});
});

describe("CeremonyView  -  full CeremonyDisplayRecord", () => {
	const fullRecord = {
		sessionId: "abc12345-6789-0000-0000-000000000000",
		workspacePath: "/home/user/projects/my-workspace",
		duration: 3600000,
		learningsCaptured: 5,
		checkpointsCreated: 3,
		pitfallsAvoided: 2,
		fragilityExposure: 7.42,
	};

	it("renders Vreko Session Summary header", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: fullRecord }));
		expect(lastFrame()).toContain("Vreko Session Summary");
	});

	it("renders learning count from record", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: fullRecord }));
		expect(lastFrame()).toContain("5");
	});

	it("renders checkpoint count from record", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: fullRecord }));
		expect(lastFrame()).toContain("3");
	});

	it("renders any-key hint footer", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: fullRecord }));
		expect(lastFrame()).toContain("[any key] continue");
	});

	it("renders session ID prefix (first 8 chars)", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: fullRecord }));
		expect(lastFrame()).toContain("abc12345");
	});

	it("does not render null fallback message for full record", () => {
		const { lastFrame } = render(React.createElement(CeremonyView, { record: fullRecord }));
		expect(lastFrame()).not.toContain("Service not connected");
	});
});
