/**
 * TabBar  -  keyboard-navigable panel tab strip.
 *
 * Shows active panel highlighted in brand green; others dimmed.
 * Adapts label length when terminal is narrower than 80 columns.
 * Pattern: RESEARCH.md Pattern 2 (Responsive Tab Bar)
 */
import { Box, Text } from "ink";
import type { PanelId } from "./TuiApp.js";

const LABELS: Record<PanelId, [full: string, short: string]> = {
	dashboard: ["[1] Dashboard", "[1]"],
	session: ["[2] Session", "[2]"],
	snapshots: ["[3] Snapshots", "[3]"],
	learnings: ["[4] Learnings", "[4]"],
};

const PANELS: PanelId[] = ["dashboard", "session", "snapshots", "learnings"];

interface TabBarProps {
	active: PanelId;
}

export function TabBar({ active }: TabBarProps) {
	const columns = process.stdout.columns ?? 80;
	const narrow = columns < 80;
	return (
		<Box
			gap={2}
			marginBottom={1}
			borderStyle="single"
			borderColor="#4ADE80" // brand-color-allowed
			paddingX={1}
		>
			{PANELS.map((p) => (
				<Text
					key={p}
					color={p === active ? "#4ADE80" : undefined} // brand-color-allowed
					bold={p === active}
					dimColor={p !== active}
				>
					{narrow ? LABELS[p][1] : LABELS[p][0]}
				</Text>
			))}
			<Text dimColor> q:quit r:refresh</Text>
		</Box>
	);
}
