/**
 * Mock VrekoLocalClient for TUI unit tests.
 * Provides vitest.fn() stubs for all IPC methods used by TUI panels.
 */
import { vi } from "vitest";

// Shape mirrors VrekoLocalClient without importing the real class
export interface MockDaemonStatus {
	pid: number;
	version: string;
	uptime: number;
	connections: number;
	memoryUsage: { heapUsed: number; heapTotal: number };
}

export interface MockSnapshot {
	id: string;
	label: string;
	createdAt: string;
	filePath: string;
}

export function createMockClient() {
	return {
		daemon: {
			status: vi.fn<() => Promise<MockDaemonStatus>>().mockResolvedValue({
				pid: 12345,
				version: "3.0.0-test",
				uptime: 60000,
				connections: 1,
				memoryUsage: { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 },
			}),
		},
		snapshot: {
			list: vi.fn().mockResolvedValue({
				snapshots: [] as MockSnapshot[],
				totalCount: 0,
			}),
		},
		learning: {
			list: vi.fn().mockResolvedValue({ learnings: [], total: 0 }),
		},
		session: {
			current: vi.fn().mockResolvedValue({ session: null }),
			start: vi.fn().mockResolvedValue({
				id: "test-session-001",
				startedAt: new Date().toISOString(),
			}),
			begin: vi.fn().mockResolvedValue({ sessionId: "test-session-001" }),
			end: vi.fn().mockResolvedValue({ ok: true }),
		},
		momentum: {
			status: vi.fn().mockResolvedValue({ fileCount: 5, averageScore: 0.72 }),
		},
		protection: {
			listDaemon: vi.fn().mockResolvedValue([]),
		},
		close: vi.fn(),
	};
}

export type MockClient = ReturnType<typeof createMockClient>;
