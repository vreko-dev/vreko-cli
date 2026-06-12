/**
 * Dashboard App
 *
 * Live TUI dashboard for Vreko workspace intelligence.
 * Shows daemon status, session info, and intelligence metrics with real-time polling.
 *
 * @module ui/dashboard
 */

import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { VrekoHeader } from "../brand.js";
import { VrekoTheme } from "../ink-theme.js";

// =============================================================================
// TYPES
// =============================================================================

interface DashboardState {
	daemon: {
		pid: number;
		version: string;
		uptime: string;
		connections: number;
		memoryMB: number;
	} | null;
	session: {
		id: string;
		startedAt: string;
	} | null;
	snapshots: { count: number; latestAt: string | null };
	protection: { fileCount: number };
	learnings: { count: number };
	momentum: { fileCount: number; averageScore: number } | null;
	error: string | null;
	lastRefreshed: Date;
}

interface DashboardAppProps {
	client: VrekoLocalClient;
	workspaceName: string;
	onActions: () => Promise<void>;
}

// =============================================================================
// BRAND COLORS (brand-color-allowed: these use raw hex until DashboardApp is
// migrated to the VrekoTheme token system in a future phase)
// =============================================================================

const COLOR_SUCCESS = "#4ADE80"; // brand-color-allowed
const COLOR_ERROR = "#F87171"; // brand-color-allowed

// =============================================================================
// UTILITIES
// =============================================================================

function formatUptime(uptimeMs: number): string {
	const seconds = Math.floor(uptimeMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

function formatMemory(bytes: number): number {
	return Math.round(bytes / (1024 * 1024));
}

function _formatTimeAgo(timestamp: string | null): string {
	if (!timestamp) {
		return "never";
	}
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));

	if (diffMins < 1) {
		return "just now";
	}
	if (diffMins < 60) {
		return `${diffMins}m ago`;
	}
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}
	return `${Math.floor(diffHours / 24)}d ago`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DashboardApp({ client, workspaceName, onActions }: DashboardAppProps) {
	const { exit } = useApp();
	const [state, setState] = useState<DashboardState>({
		daemon: null,
		session: null,
		snapshots: { count: 0, latestAt: null },
		protection: { fileCount: 0 },
		learnings: { count: 0 },
		momentum: null,
		error: null,
		lastRefreshed: new Date(),
	});
	const [isRefreshing, setIsRefreshing] = useState(false);

	// =============================================================================
	// SESSION AUTO-START (one-time on mount)
	// =============================================================================
	// TODO: session/start auto-start is disabled until the daemon path is re-enabled.
	// useEffect(() => {
	// 	const startSession = async () => {
	// 		try {
	// 			const sessionStart = await client.session.start({} as unknown as Parameters<typeof client.session.start>[0]);
	// 			if (sessionStart.id) {
	// 				const sessionId = sessionStart.id;
	// 				setState((prev) => ({
	// 					...prev,
	// 					session: {
	// 						id: sessionId.substring(0, 8),
	// 						startedAt: "just now",
	// 					},
	// 				}));
	// 			}
	// 		} catch {
	// 			// Session auto-start failed, leave as null
	// 		}
	// 	};
	// 	startSession();
	// }, [client]);

	// =============================================================================
	// POLLING - FAST LOOP (5s)
	// =============================================================================

	useEffect(() => {
		const fastPoll = async () => {
			try {
				// Daemon status
				let daemonData = null;
				try {
					const daemonStatus = await client.daemon.status();
					daemonData = {
						pid: daemonStatus.pid,
						version: daemonStatus.version,
						uptime: formatUptime(daemonStatus.uptime),
						connections: daemonStatus.connections,
						memoryMB: formatMemory(daemonStatus.memoryUsage.heapUsed),
					};
				} catch {
					// Daemon error - set to null, don't crash
				}

				setState((prev) => ({
					...prev,
					daemon: daemonData,
					lastRefreshed: new Date(),
					error: null,
				}));
			} catch (err) {
				setState((prev) => ({
					...prev,
					error: err instanceof Error ? err.message : String(err),
				}));
			}
		};

		// Initial call
		fastPoll();

		// Poll every 5s
		const interval = setInterval(fastPoll, 5000);
		return () => clearInterval(interval);
	}, [client]);

	// =============================================================================
	// POLLING - SLOW LOOP (60s)
	// =============================================================================

	useEffect(() => {
		const slowPoll = async () => {
			try {
				// Snapshots
				let snapshotCount = 0;
				let latestSnapshotAt: string | null = null;
				try {
					const snapshotList = await client.snapshot.list({
						limit: 1,
						orderBy: "createdAt",
						orderDir: "desc",
					});
					snapshotCount = snapshotList.totalCount ?? 0;
					if (snapshotList.snapshots.length > 0) {
						latestSnapshotAt = snapshotList.snapshots[0].createdAt;
					}
				} catch {
					// Snapshot error - set to null, don't crash
				}

				// Protection
				let protectionCount = 0;
				try {
					const cwd = process.cwd();
					const protectedFiles = await client.protection.listDaemon({ workspace: cwd });
					protectionCount = protectedFiles.length;
				} catch {
					// Protection error - set to null, don't crash
				}

				// Learnings
				let learningCount = 0;
				try {
					const cwd = process.cwd();
					const learningList = await client.learning.list({
						workspace: cwd,
						limit: 1,
					});
					learningCount = learningList.total;
				} catch {
					// Learning error - set to null, don't crash
				}

				// Momentum
				let momentumData = null;
				try {
					const cwd = process.cwd();
					const momentumStatus = await client.momentum.status({ workspace: cwd });
					momentumData = {
						fileCount: momentumStatus.fileCount,
						averageScore: momentumStatus.averageScore,
					};
				} catch {
					// Momentum error - set to null, don't crash
				}

				setState((prev) => ({
					...prev,
					snapshots: { count: snapshotCount, latestAt: latestSnapshotAt },
					protection: { fileCount: protectionCount },
					learnings: { count: learningCount },
					momentum: momentumData,
					lastRefreshed: new Date(),
					error: null,
				}));
			} catch (err) {
				setState((prev) => ({
					...prev,
					error: err instanceof Error ? err.message : String(err),
				}));
			}
		};

		// Initial call
		slowPoll();

		// Poll every 60s
		const interval = setInterval(slowPoll, 60000);
		return () => clearInterval(interval);
	}, [client]);

	// =============================================================================
	// MANUAL REFRESH
	// =============================================================================

	const handleRefresh = async () => {
		setIsRefreshing(true);
		// Trigger both polls by setting state to force re-render
		// The useEffect hooks will pick up the change
		setState((prev) => ({ ...prev, lastRefreshed: new Date() }));
		// Wait a bit for visual feedback
		await new Promise((resolve) => setTimeout(resolve, 500));
		setIsRefreshing(false);
	};

	// =============================================================================
	// KEY BINDINGS
	// =============================================================================

	useInput((input, key) => {
		if (input === "q" || (key.ctrl && input === "c")) {
			exit();
		} else if (input === "r") {
			handleRefresh();
		} else if (input === "s") {
			// Shell out to snapshot create
			// For now, just trigger actions - can be enhanced later
			void onActions();
		} else if (input === "l") {
			// Shell out to login if not authenticated
			// Check daemon auth status
			if (state.daemon) {
				// For now, just trigger actions - can check auth and enhance later
				void onActions();
			}
		} else if (input === "a") {
			void onActions();
		}
	});

	// =============================================================================
	// RENDER
	// =============================================================================

	const timeStr = state.lastRefreshed.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	return (
		<VrekoTheme>
			<Box flexDirection="column" paddingX={1}>
				{/* Header */}
				<Box marginBottom={1}>
					<VrekoHeader version="3.0.1" />
					<Text dimColor>
						{"  "}
						{workspaceName}
						{"  "}
						{timeStr}
					</Text>
				</Box>

				{/* Three columns */}
				<Box flexDirection="row" gap={2} marginBottom={1}>
					{/* DAEMON Column */}
					<Box flexDirection="column" width={25}>
						<Text bold color={COLOR_SUCCESS}>
							DAEMON
						</Text>
						{state.daemon ? (
							<>
								<Text>✓ v{state.daemon.version}</Text>
								<Text dimColor>
									{state.daemon.memoryMB}MB · {state.daemon.connections} conn
								</Text>
								<Text dimColor>uptime {state.daemon.uptime}</Text>
							</>
						) : (
							<Text color={COLOR_ERROR}>✗ Disconnected</Text>
						)}
					</Box>

					{/* SESSION Column */}
					<Box flexDirection="column" width={25}>
						<Text bold color={COLOR_SUCCESS}>
							SESSION
						</Text>
						{state.session ? (
							<>
								<Text>{state.session.id}</Text>
								<Text dimColor>{state.snapshots.count} snapshots</Text>
								<Text dimColor>started {state.session.startedAt}</Text>
							</>
						) : (
							<Text dimColor>No active session</Text>
						)}
					</Box>

					{/* INTELLIGENCE Column */}
					<Box flexDirection="column" width={40}>
						<Text bold color={COLOR_SUCCESS}>
							INTELLIGENCE
						</Text>
						{state.momentum && state.momentum.fileCount > 0 ? (
							<>
								<Text>{state.momentum.fileCount} files scored</Text>
								<Text dimColor>avg momentum {state.momentum.averageScore.toFixed(2)}</Text>
								<Text dimColor>
									{state.protection.fileCount} protected · {state.learnings.count} learnings
								</Text>
							</>
						) : (
							<Text dimColor>Run vr sync to populate</Text>
						)}
					</Box>
				</Box>

				{/* Error bar */}
				{state.error && (
					<Box marginBottom={1}>
						<Text color={COLOR_ERROR}>⚠ {state.error}</Text>
					</Box>
				)}

				{/* Key bindings */}
				<Box>
					<Text dimColor>[q] quit [r] refresh [s] snapshot [l] login [a] actions</Text>
					{isRefreshing && <Text dimColor>{"  "}refreshing...</Text>}
				</Box>
			</Box>
		</VrekoTheme>
	);
}
