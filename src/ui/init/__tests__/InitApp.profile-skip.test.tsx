/**
 * InitApp Profile Skip Table Unit Tests  -  Phase 32
 *
 * Tests isFrameEnabled() for all 5 boot profiles × 6 frame stages (30 assertions).
 * Requirement: TUI-07  -  InitApp.tsx skips frames per spec §D skip table.
 */
import { describe, expect, it } from "vitest";
import { isFrameEnabled } from "../InitApp.js";

describe("isFrameEnabled  -  VIRGIN profile (all frames enabled)", () => {
	it("enables detection", () => expect(isFrameEnabled("detection", "VIRGIN")).toBe(true));
	it("enables scanning", () => expect(isFrameEnabled("scanning", "VIRGIN")).toBe(true));
	it("enables profile", () => expect(isFrameEnabled("profile", "VIRGIN")).toBe(true));
	it("enables insights", () => expect(isFrameEnabled("insights", "VIRGIN")).toBe(true));
	it("enables consent", () => expect(isFrameEnabled("consent", "VIRGIN")).toBe(true));
	it("enables activation", () => expect(isFrameEnabled("activation", "VIRGIN")).toBe(true));
});

describe("isFrameEnabled  -  NEW_WORKSPACE profile", () => {
	it("disables detection", () => expect(isFrameEnabled("detection", "NEW_WORKSPACE")).toBe(false));
	it("enables scanning", () => expect(isFrameEnabled("scanning", "NEW_WORKSPACE")).toBe(true));
	it("enables profile", () => expect(isFrameEnabled("profile", "NEW_WORKSPACE")).toBe(true));
	it("enables insights", () => expect(isFrameEnabled("insights", "NEW_WORKSPACE")).toBe(true));
	it("enables consent", () => expect(isFrameEnabled("consent", "NEW_WORKSPACE")).toBe(true));
	it("enables activation", () => expect(isFrameEnabled("activation", "NEW_WORKSPACE")).toBe(true));
});

describe("isFrameEnabled  -  COLD_RETURN profile (safe default)", () => {
	it("disables detection", () => expect(isFrameEnabled("detection", "COLD_RETURN")).toBe(false));
	it("enables scanning", () => expect(isFrameEnabled("scanning", "COLD_RETURN")).toBe(true));
	it("enables profile", () => expect(isFrameEnabled("profile", "COLD_RETURN")).toBe(true));
	it("enables insights", () => expect(isFrameEnabled("insights", "COLD_RETURN")).toBe(true));
	it("disables consent", () => expect(isFrameEnabled("consent", "COLD_RETURN")).toBe(false));
	it("enables activation", () => expect(isFrameEnabled("activation", "COLD_RETURN")).toBe(true));
});

describe("isFrameEnabled  -  WARM_RETURN profile", () => {
	it("disables detection", () => expect(isFrameEnabled("detection", "WARM_RETURN")).toBe(false));
	it("disables scanning", () => expect(isFrameEnabled("scanning", "WARM_RETURN")).toBe(false));
	it("enables profile", () => expect(isFrameEnabled("profile", "WARM_RETURN")).toBe(true));
	it("disables insights", () => expect(isFrameEnabled("insights", "WARM_RETURN")).toBe(false));
	it("disables consent", () => expect(isFrameEnabled("consent", "WARM_RETURN")).toBe(false));
	it("enables activation", () => expect(isFrameEnabled("activation", "WARM_RETURN")).toBe(true));
});

describe("isFrameEnabled  -  HOT_RECONNECT profile (activation only)", () => {
	it("disables detection", () => expect(isFrameEnabled("detection", "HOT_RECONNECT")).toBe(false));
	it("disables scanning", () => expect(isFrameEnabled("scanning", "HOT_RECONNECT")).toBe(false));
	it("disables profile", () => expect(isFrameEnabled("profile", "HOT_RECONNECT")).toBe(false));
	it("disables insights", () => expect(isFrameEnabled("insights", "HOT_RECONNECT")).toBe(false));
	it("disables consent", () => expect(isFrameEnabled("consent", "HOT_RECONNECT")).toBe(false));
	it("enables activation", () => expect(isFrameEnabled("activation", "HOT_RECONNECT")).toBe(true));
});

describe("isFrameEnabled  -  undefined profile (defaults to COLD_RETURN)", () => {
	it("disables detection by default", () => expect(isFrameEnabled("detection")).toBe(false));
	it("enables activation by default", () => expect(isFrameEnabled("activation")).toBe(true));
});
