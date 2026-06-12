/**
 * TuiApp  -  root panel router for the Vreko TUI.
 *
 * Owns activePanel state, keyboard navigation, and panel mounting.
 * All panels are conditionally rendered (not mounted simultaneously).
 * Pattern: commands/init/tui/App.tsx (frame-machine pattern)
 *          RESEARCH.md Pattern 1 (Panel Router with useReducer + useInput)
 *
 * @module ui/tui/TuiApp
 */
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { VrekoTheme } from "../ink-theme.js";
import { InkErrorBoundary } from "./InkErrorBoundary.js";
import { DashboardPanel } from "./panels/DashboardPanel.js";
import { LearningsPanel } from "./panels/LearningsPanel.js";
import { SessionPanel } from "./panels/SessionPanel.js";
import { SnapshotPanel } from "./panels/SnapshotPanel.js";
import { StatusPanel } from "./panels/StatusPanel.js";
import { TabBar } from "./TabBar.js";

// =============================================================================
// TYPES
// =============================================================================

export type PanelId = "dashboard" | "session" | "snapshots" | "learnings";

const PANELS: PanelId[] = ["dashboard", "session", "snapshots", "learnings"];

export interface TuiAppProps {
	client: VrekoLocalClient;
	initialPanel?: PanelId;
	/** When true, shows StatusPanel instead of DashboardPanel on tab 1 (used by `vr status`) */
	statusFocus?: boolean;
}

// =============================================================================
// ROOT COMPONENT
// =============================================================================

export function TuiApp({ client, initialPanel = "dashboard", statusFocus = false }: TuiAppProps) {
	const { exit } = useApp();
	const [activePanel, setActivePanel] = useState<PanelId>(initialPanel);

	useEffect(() => {
		return () => {
			client.close();
		};
	}, [client]);

	useInput((input, key) => {
		// Quit
		if (input === "q" || (key.ctrl && input === "c")) {
			exit();
			return;
		}
		// Direct panel select
		if (input === "1") {
			setActivePanel("dashboard");
			return;
		}
		if (input === "2") {
			setActivePanel("session");
			return;
		}
		if (input === "3") {
			setActivePanel("snapshots");
			return;
		}
		if (input === "4") {
			setActivePanel("learnings");
			return;
		}
		// Arrow key cycle
		if (key.rightArrow) {
			const idx = PANELS.indexOf(activePanel);
			setActivePanel(PANELS[(idx + 1) % PANELS.length]);
			return;
		}
		if (key.leftArrow) {
			const idx = PANELS.indexOf(activePanel);
			setActivePanel(PANELS[(idx - 1 + PANELS.length) % PANELS.length]);
		}
	});

	return (
		<VrekoTheme>
			<Box flexDirection="column">
				<TabBar active={activePanel} />
				{activePanel === "dashboard" && (
					<InkErrorBoundary panel="dashboard">
						{statusFocus ? <StatusPanel client={client} /> : <DashboardPanel client={client} />}
					</InkErrorBoundary>
				)}
				{activePanel === "session" && (
					<InkErrorBoundary panel="session">
						<SessionPanel client={client} />
					</InkErrorBoundary>
				)}
				{activePanel === "snapshots" && (
					<InkErrorBoundary panel="snapshots">
						<SnapshotPanel client={client} />
					</InkErrorBoundary>
				)}
				{activePanel === "learnings" && (
					<InkErrorBoundary panel="learnings">
						<LearningsPanel client={client} />
					</InkErrorBoundary>
				)}
			</Box>
		</VrekoTheme>
	);
}
