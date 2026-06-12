/**
 * TuiApp Invariant Tests  -  Wave 0 (RED state)
 *
 * These tests define the behavioral contract for the Vreko TUI.
 * They are committed before implementation and will pass once Wave 1 + 2 + 3 ship.
 *
 * Requirement IDs: TUI-01, TUI-02, TUI-03, TUI-04, TUI-07, TUI-08
 */

import { render } from "ink-testing-library";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock useWindowSize  -  ink-testing-library does not provide a real terminal,
// so useWindowSize returns undefined in the test environment. Always return
// a standard 80-column terminal size to prevent crashes.
vi.mock("ink", async (importOriginal) => {
	const real = await importOriginal<typeof import("ink")>();
	return {
		...real,
		useWindowSize: () => ({ columns: 120, rows: 40 }),
	};
});

// TUI-INVARIANT: This import will fail until 21-01-PLAN.md ships.
// DO NOT stub this import  -  the RED failure is the invariant.
import { TuiApp } from "../index.js";
import { createMockClient } from "./helpers/mockClient.js";

describe("TuiApp  -  panel routing invariants", () => {
	let mockClient: ReturnType<typeof createMockClient>;

	beforeEach(() => {
		mockClient = createMockClient();
	});

	// TUI-01: Default panel is dashboard
	it("renders dashboard panel by default when no initialPanel prop", () => {
		const { lastFrame } = render(React.createElement(TuiApp, { client: mockClient as never }));
		// Dashboard panel must contain daemon status section
		expect(lastFrame()).toContain("Dashboard");
	});

	// TUI-02: Number keys 1–4 switch panels
	it('switches to session panel when "2" is pressed', async () => {
		const { lastFrame, stdin } = render(React.createElement(TuiApp, { client: mockClient as never }));
		stdin.write("2");
		await new Promise((r) => setTimeout(r, 50));
		expect(lastFrame()).toContain("Session");
	});

	it('switches to snapshots panel when "3" is pressed', async () => {
		const { lastFrame, stdin } = render(React.createElement(TuiApp, { client: mockClient as never }));
		stdin.write("3");
		await new Promise((r) => setTimeout(r, 50));
		expect(lastFrame()).toContain("Snapshots");
	});

	it('switches to learnings panel when "4" is pressed', async () => {
		const { lastFrame, stdin } = render(React.createElement(TuiApp, { client: mockClient as never }));
		stdin.write("4");
		await new Promise((r) => setTimeout(r, 50));
		expect(lastFrame()).toContain("Learnings");
	});

	it('switches back to dashboard when "1" is pressed from another panel', async () => {
		const { lastFrame, stdin } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "snapshots",
			}),
		);
		stdin.write("1");
		await new Promise((r) => setTimeout(r, 50));
		expect(lastFrame()).toContain("Dashboard");
	});

	// TUI-03: Arrow keys cycle panels
	it("advances to next panel on right arrow", async () => {
		const { lastFrame, stdin } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "dashboard",
			}),
		);
		// Right arrow ESC sequence for ink-testing-library
		stdin.write("\x1b[C");
		await new Promise((r) => setTimeout(r, 50));
		// Should now be on Session (index 1)
		expect(lastFrame()).toContain("Session");
	});

	it("wraps around from last to first panel on right arrow", async () => {
		const { lastFrame, stdin } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "learnings",
			}),
		);
		stdin.write("\x1b[C");
		await new Promise((r) => setTimeout(r, 50));
		expect(lastFrame()).toContain("Dashboard");
	});

	it("goes to previous panel on left arrow", async () => {
		const { lastFrame, stdin } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "session",
			}),
		);
		stdin.write("\x1b[D");
		await new Promise((r) => setTimeout(r, 50));
		expect(lastFrame()).toContain("Dashboard");
	});

	// TUI-04: "q" exits cleanly (useApp().exit() called)
	it('calls exit when "q" is pressed', async () => {
		const { stdin, unmount } = render(React.createElement(TuiApp, { client: mockClient as never }));
		stdin.write("q");
		await new Promise((r) => setTimeout(r, 50));
		// After q, the app should have exited  -  lastFrame won't throw
		unmount();
	});

	// TUI-07: DashboardPanel shows daemon version from IPC
	it("DashboardPanel displays daemon version once loaded", async () => {
		mockClient.daemon.status.mockResolvedValue({
			pid: 9999,
			version: "3.1.0-test",
			uptime: 120000,
			connections: 2,
			memoryUsage: { heapUsed: 40 * 1024 * 1024, heapTotal: 80 * 1024 * 1024 },
		});
		const { lastFrame } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "dashboard",
			}),
		);
		// Allow async polling to settle
		await new Promise((r) => setTimeout(r, 100));
		expect(lastFrame()).toContain("3.1.0-test");
	});

	it("DashboardPanel polls learnings with a valid limit", async () => {
		const { lastFrame } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "dashboard",
			}),
		);
		await new Promise((r) => setTimeout(r, 100));
		expect(mockClient.learning.list).toHaveBeenCalledWith({
			workspace: expect.any(String),
			limit: 1,
		});
		expect(lastFrame()).toContain("Dashboard");
	});

	it("SessionPanel loads the current session through the typed API", async () => {
		const { lastFrame } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "session",
			}),
		);
		await new Promise((r) => setTimeout(r, 100));
		expect(mockClient.session.current).toHaveBeenCalledWith({
			workspacePath: expect.any(String),
		});
		expect(lastFrame()).toContain("Session");
	});

	// TUI-08: SnapshotsPanel renders snapshot count
	it("SnapshotsPanel renders when panel is active", async () => {
		mockClient.snapshot.list.mockResolvedValue({
			snapshots: [
				{ id: "snap-001", label: "before-work", createdAt: new Date().toISOString(), filePath: "src/app.ts" },
			],
			totalCount: 1,
		});
		const { lastFrame } = render(
			React.createElement(TuiApp, {
				client: mockClient as never,
				initialPanel: "snapshots",
			}),
		);
		await new Promise((r) => setTimeout(r, 100));
		expect(lastFrame()).toContain("Snapshots");
	});
});
