/**
 * CeremonyView  -  Ink component for the Vreko closing ceremony.
 *
 * Renders a bordered session summary with colored metrics and any-key-to-exit.
 * Used by `vr session end` and `vr stop` when terminal is interactive.
 * Falls back to null-safe message when record is missing.
 *
 * Rendering decision (§I): called only when TTY && renderMode === "ink" && !--no-tui.
 * Plain fallback: renderCeremony() in ui/ceremony.ts (not deleted).
 *
 * Pattern: ui/init/Activation.tsx (useInput + useApp + exit() + Box/Text layout)
 *
 * @module ui/ceremony/CeremonyView
 */
import { Box, Text, useApp, useInput } from "ink";
import type { CeremonyDisplayRecord } from "../ceremony.js";
import { BRAND_COLORS } from "../theme.js";

interface CeremonyViewProps {
	record: CeremonyDisplayRecord | null;
}

export function CeremonyView({ record }: CeremonyViewProps) {
	const { exit } = useApp();

	useInput(
		(_input, _key) => {
			exit();
		},
		{ isActive: true },
	);

	if (!record) {
		return (
			<Box borderStyle="round" padding={1}>
				<Text dimColor>Service not connected - ceremony data unavailable.</Text>
			</Box>
		);
	}

	const durationMs = record.duration ?? 0;
	const durationMin = Math.floor(durationMs / 60000);
	const durationSec = Math.floor((durationMs % 60000) / 1000);
	const durationStr = durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`;

	const sessionIdShort = record.sessionId ? record.sessionId.slice(0, 8) : "unknown";
	const workspaceShort = record.workspacePath ? record.workspacePath.slice(-12) : "unknown";
	const generatedAt = new Date().toLocaleTimeString();

	return (
		<Box flexDirection="column" borderStyle="round" padding={1} width={60}>
			<Text bold>Vreko Session Summary</Text>

			<Box marginTop={1} flexDirection="column">
				<Text>
					{"Learnings captured:  "}
					<Text color={BRAND_COLORS.primary}>{String(record.learningsCaptured ?? 0)}</Text>
				</Text>
				<Text>
					{"Checkpoints created: "}
					<Text color={BRAND_COLORS.primary}>{String(record.checkpointsCreated ?? 0)}</Text>
				</Text>
				<Text>
					{"Duration:            "}
					<Text color={BRAND_COLORS.primary}>{durationStr}</Text>
				</Text>
				<Text>
					{"Pitfalls avoided:    "}
					<Text color={BRAND_COLORS.primary}>{String(record.pitfallsAvoided ?? 0)}</Text>
				</Text>
				<Text>
					{"Fragility exposure:  "}
					<Text color={BRAND_COLORS.primary}>{(record.fragilityExposure ?? 0).toFixed(2)}</Text>
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Session: {sessionIdShort}</Text>
				<Text dimColor>Workspace: ...{workspaceShort}</Text>
				<Text dimColor>Generated: {generatedAt}</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>[any key] continue</Text>
			</Box>
		</Box>
	);
}
