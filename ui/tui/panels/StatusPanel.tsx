/**
 * StatusPanel  -  focused workspace health and daemon status view.
 *
 * Shown when user runs `vr status` (launchTui('dashboard') with statusFocus=true).
 * Displays: daemon connection, workspace health signals, protection active count,
 * invariant check status (from .vreko/invariants/).
 *
 * @module ui/tui/panels/StatusPanel
 */
import { Alert, Badge, Spinner } from "@inkjs/ui";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, Text } from "ink";
import { VrekoHeader } from "../../brand.js";
import { BRAND_COLORS } from "../../theme.js";
import { useDaemonPolling } from "../hooks/useDaemonPolling.js";
import { useSlowPolling } from "../hooks/useSlowPolling.js";

interface StatusPanelProps {
	client: VrekoLocalClient;
}

export function StatusPanel({ client }: StatusPanelProps) {
	const { daemon, error: daemonError } = useDaemonPolling(client, 5000);
	const { snapshots, learnings, momentum, error: slowError } = useSlowPolling(client, 60000);

	const isConnected = daemon !== null;
	const error = daemonError ?? slowError;
	const daemonVersion = daemon?.version ?? " - ";

	return (
		<Box flexDirection="column" paddingX={1}>
			<VrekoHeader version={daemonVersion} subtitle="workspace status" />

			{/* Daemon status badge */}
			<Box marginBottom={1}>
				<Badge color={isConnected ? "green" : "red"}>
					{isConnected
						? `daemon v${daemonVersion}  pid:${daemon?.pid}  uptime:${daemon?.uptime}`
						: "daemon offline  -  run: vr service start"}
				</Badge>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Alert variant="warning">{error}</Alert>
				</Box>
			)}

			{/* Health signals table */}
			<Box flexDirection="column" borderStyle="round" paddingX={1} marginBottom={1}>
				<Text bold>Workspace Health</Text>
				<Text>
					Snapshots <Text color={BRAND_COLORS.primary}>{snapshots.count}</Text>
				</Text>
				<Text>
					Learnings <Text color={BRAND_COLORS.primary}>{learnings.count}</Text>
				</Text>
				<Text>
					Momentum{" "}
					<Text dimColor>{momentum ? `${Math.round(momentum.averageScore * 100)}%` : "uncalibrated"}</Text>
				</Text>
				<Text>
					Connection{" "}
					{isConnected ? (
						<Text color={BRAND_COLORS.primary}>healthy</Text>
					) : (
						<Text color={BRAND_COLORS.error}>offline</Text>
					)}
				</Text>
			</Box>

			{!daemon && <Spinner label="Connecting to daemon..." />}

			<Box marginTop={1}>
				<Text dimColor>r:refresh 1-4:panels q:quit</Text>
			</Box>
		</Box>
	);
}
