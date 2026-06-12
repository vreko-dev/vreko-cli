/**
 * DashboardPanel  -  command center overview.
 *
 * Shows daemon health, session summary, protection status, snapshot count,
 * learnings count, and momentum score. Uses extracted polling hooks.
 *
 * Polling pattern migrated from legacy dashboard component (Phase 32) to useDaemonPolling hook.
 *
 * @module ui/tui/panels/DashboardPanel
 */
import { Alert, Badge, ProgressBar, Spinner } from "@inkjs/ui";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, Text } from "ink";
import { VrekoHeader } from "../../brand.js";
import { BRAND_COLORS } from "../../theme.js";
import { useDaemonPolling } from "../hooks/useDaemonPolling.js";
import { useSlowPolling } from "../hooks/useSlowPolling.js";

interface DashboardPanelProps {
	client: VrekoLocalClient;
}

function formatTimeAgo(ts: string | null): string {
	if (!ts) {
		return "never";
	}
	const diffMs = Date.now() - new Date(ts).getTime();
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) {
		return "just now";
	}
	if (mins < 60) {
		return `${mins}m ago`;
	}
	const hours = Math.floor(mins / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}
	return `${Math.floor(hours / 24)}d ago`;
}

export function DashboardPanel({ client }: DashboardPanelProps) {
	const { daemon, error: daemonError } = useDaemonPolling(client, 5000);
	const { snapshots, learnings, momentum, error: slowError } = useSlowPolling(client, 60000);

	const columns = process.stdout.columns ?? 80;
	const daemonVersion = daemon?.version ?? " - ";
	const isConnected = daemon !== null;
	const error = daemonError ?? slowError;

	return (
		<Box flexDirection="column" paddingX={1}>
			<VrekoHeader version={daemonVersion} />

			{/* Connection status badge */}
			<Box marginBottom={1}>
				<Badge color={isConnected ? "green" : "red"}>
					{isConnected ? "daemon connected" : "daemon offline"}
				</Badge>
			</Box>

			{/* Error bar */}
			{error && (
				<Box marginBottom={1}>
					<Alert variant="error">{error}</Alert>
				</Box>
			)}

			{/* Main content: 3-column layout (narrow: stacked) */}
			<Box flexDirection={columns >= 100 ? "row" : "column"} gap={3}>
				{/* Column 1: Daemon vitals */}
				<Box flexDirection="column" minWidth={24}>
					<Text bold underline>
						Daemon
					</Text>
					{daemon ? (
						<>
							<Text>
								PID <Text color={BRAND_COLORS.primary}>{daemon.pid}</Text>
							</Text>
							<Text>
								Uptime <Text color={BRAND_COLORS.primary}>{daemon.uptime}</Text>
							</Text>
							<Text>
								Memory <Text dimColor>{daemon.memoryMB} MB</Text>
							</Text>
							<Text>
								Conns <Text dimColor>{daemon.connections}</Text>
							</Text>
						</>
					) : (
						<Spinner label="connecting..." />
					)}
				</Box>

				{/* Column 2: Protection & Snapshots */}
				<Box flexDirection="column" minWidth={24}>
					<Text bold underline>
						Protection
					</Text>
					<Text>
						Snapshots <Text color={BRAND_COLORS.primary}>{snapshots.count}</Text>
					</Text>
					<Text>
						Last snap <Text dimColor>{formatTimeAgo(snapshots.latestAt)}</Text>
					</Text>
					<Text>
						Learnings <Text color={BRAND_COLORS.primary}>{learnings.count}</Text>
					</Text>
				</Box>

				{/* Column 3: Momentum */}
				<Box flexDirection="column" minWidth={30}>
					<Text bold underline>
						Momentum
					</Text>
					{momentum ? (
						<>
							<Text>
								Files tracked <Text dimColor>{momentum.fileCount}</Text>
							</Text>
							<Box>
								<Text>Score </Text>
								<ProgressBar value={Math.round(momentum.averageScore * 100)} />
								<Text>
									{" "}
									<Text dimColor>{Math.round(momentum.averageScore * 100)}%</Text>
								</Text>
							</Box>
						</>
					) : (
						<Text dimColor>No momentum data yet</Text>
					)}
				</Box>
			</Box>

			{/* Hint bar */}
			<Box marginTop={1}>
				<Text dimColor>r:refresh 1-4:panels q:quit</Text>
			</Box>
		</Box>
	);
}
