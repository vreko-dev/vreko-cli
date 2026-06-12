import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { Box, Text, useInput } from "ink";
import { BRAND_COLORS } from "../theme.js";
import { useTerminalLayout } from "./hooks/useTerminalLayout.js";
import { Logo } from "./Logo.js";

function riskLabel(score: number): string {
	if (score > 75) {
		return "high";
	}
	if (score > 50) {
		return "elevated";
	}
	if (score > 25) {
		return "moderate";
	}
	return "low";
}

/**
 * Render a 10-char progress bar where each block = 10%.
 * Uses brand green (BRAND_COLORS.primary) for filled portion.
 */
function renderBar(score: number, width = 10): string {
	const filled = Math.round((score / 100) * width);
	const empty = width - filled;
	return "█".repeat(filled) + "░".repeat(empty);
}

interface ProfileMetricsProps {
	profile: RecoveryRiskProfile;
}

function ProfileMetrics({ profile }: ProfileMetricsProps) {
	const topDriver = profile.topDrivers[0];

	return (
		<Box flexDirection="column">
			<Text bold>Your Codebase Intelligence Profile</Text>

			<Box marginTop={1} padding={1} borderStyle="single" flexDirection="column">
				{/* Primary metrics  -  always shown, all rounded to integers */}
				<Text>
					{"CODEBASE HEALTH     "}
					<Text color={BRAND_COLORS.primary}>{renderBar(profile.primary.recoveryRisk)}</Text>
					{` ${Math.round(profile.primary.recoveryRisk)}% ${riskLabel(profile.primary.recoveryRisk)}`}
				</Text>
				<Text>
					{"CHANGE VOLATILITY   "}
					<Text color={BRAND_COLORS.primary}>{renderBar(profile.primary.changeVolatility)}</Text>
					{` ${Math.round(profile.primary.changeVolatility)}% ${riskLabel(profile.primary.changeVolatility)}`}
				</Text>
				<Text>
					{"WORKFLOW FRAGILITY  "}
					<Text color={BRAND_COLORS.primary}>{renderBar(profile.primary.workflowFragility)}</Text>
					{` ${Math.round(profile.primary.workflowFragility)}% ${riskLabel(profile.primary.workflowFragility)}`}
				</Text>

				<Text color="gray">{"─".repeat(55)}</Text>

				{/* Secondary metrics  -  gated: only show when meaningful */}
				<Box flexDirection="column">
					<Text dimColor>
						{"complexity "}
						{Math.round(profile.secondary.complexity)}
					</Text>

					{/* Collaboration: hide if solo developer */}
					{profile.secondary.collaboration > 0 ? (
						<Text dimColor>
							{"collaboration "}
							{Math.round(profile.secondary.collaboration)}
						</Text>
					) : (
						<Text dimColor>collaboration Solo developer detected</Text>
					)}

					{/* AI Exposure: show placeholder when zero */}
					{profile.secondary.aiExposure > 0 ? (
						<Text dimColor>
							{"AI exposure "}
							{Math.round(profile.secondary.aiExposure)}
						</Text>
					) : (
						<Text dimColor>AI exposure Tracking begins after first session</Text>
					)}

					{/* Structural risk: hide when zero */}
					{profile.secondary.structuralRisk > 0 && (
						<Text dimColor>
							{"structural "}
							{Math.round(profile.secondary.structuralRisk)}
						</Text>
					)}
				</Box>
			</Box>

			<Box marginTop={1} flexDirection="column">
				{topDriver && <Text>Top driver: {topDriver.label}</Text>}
				<Text>
					Confidence: {profile.confidence >= 0.7 ? "high" : profile.confidence >= 0.4 ? "moderate" : "low"}
				</Text>
			</Box>
		</Box>
	);
}

export function Profile({ profile, onContinue }: { profile: RecoveryRiskProfile; onContinue: () => void }) {
	useInput((_input, key) => {
		if (key.return) {
			onContinue();
		}
	});

	const { isWide } = useTerminalLayout();

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			{/* Wide terminal (>=120 cols): side-by-side logo + metrics */}
			{isWide ? (
				<Box>
					<Box width={45} flexShrink={0}>
						<Logo />
					</Box>
					<Box flexGrow={1}>
						<ProfileMetrics profile={profile} />
					</Box>
				</Box>
			) : (
				<ProfileMetrics profile={profile} />
			)}

			<Box marginTop={1}>
				<Text color={BRAND_COLORS.primary}>Press [ENTER] to see what we found {"→"}</Text>
			</Box>
		</Box>
	);
}
