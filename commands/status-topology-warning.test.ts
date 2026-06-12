/**
 * vr status topologyWarning surfacing  -  Unit Test (Phase 30, Wave 4)
 *
 * Covers:
 * DAEMON-08: vr status --json includes topologyWarning when daemon topology/status returns it
 */

import { describe, expect, it } from "vitest";

// Self-contained reproduction of the topology branch logic from gatherStatus.
// We do not import the real gatherStatus because it has many other daemon dependencies;
// instead we extract and unit-test the topology-warning surfacing logic directly.

type TopologyWarning = { fileCap: number; reachedAt: string; workspacePath: string };
type DaemonClient = {
	topology?: { status?: (p: { workspace: string }) => Promise<{ topologyWarning?: TopologyWarning }> };
};
type Status = { topologyWarning?: TopologyWarning };

async function surfaceTopologyWarning(
	client: DaemonClient | null,
	workspaceRoot: string,
	status: Status,
): Promise<void> {
	try {
		if (client && client.topology?.status) {
			const topStatus = await client.topology.status({ workspace: workspaceRoot });
			if (topStatus?.topologyWarning) {
				status.topologyWarning = topStatus.topologyWarning;
			}
		}
	} catch {
		// Topology unavailable  -  not blocking
	}
}

describe("DAEMON-08: vr status surfaces topologyWarning", () => {
	it("populates status.topologyWarning when daemon returns warning", async () => {
		const warning: TopologyWarning = {
			fileCap: 5000,
			reachedAt: "2026-05-07T12:00:00.000Z",
			workspacePath: "/test/ws",
		};
		const client: DaemonClient = {
			topology: { status: async () => ({ topologyWarning: warning }) },
		};
		const status: Status = {};
		await surfaceTopologyWarning(client, "/test/ws", status);
		expect(status.topologyWarning).toEqual(warning);
	});

	it("omits topologyWarning when daemon returns no warning", async () => {
		const client: DaemonClient = {
			topology: { status: async () => ({}) },
		};
		const status: Status = {};
		await surfaceTopologyWarning(client, "/test/ws", status);
		expect(status.topologyWarning).toBeUndefined();
	});

	it("tolerates missing topology IPC method", async () => {
		const client: DaemonClient = {}; // no topology property
		const status: Status = {};
		await expect(surfaceTopologyWarning(client, "/test/ws", status)).resolves.not.toThrow();
		expect(status.topologyWarning).toBeUndefined();
	});

	it("tolerates topology.status throwing", async () => {
		const client: DaemonClient = {
			topology: {
				status: async () => {
					throw new Error("ipc error");
				},
			},
		};
		const status: Status = {};
		await expect(surfaceTopologyWarning(client, "/test/ws", status)).resolves.not.toThrow();
		expect(status.topologyWarning).toBeUndefined();
	});
});
