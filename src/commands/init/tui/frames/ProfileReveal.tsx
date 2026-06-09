import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { Box, Text, useInput } from "ink";

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

function renderBar(score: number, width = 20): string {
	const filled = Math.round((score / 100) * width);
	const empty = width - filled;
	return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

export function ProfileReveal({ profile, onContinue }: { profile: RecoveryRiskProfile; onContinue: () => void }) {
	useInput((_input, key) => {
		if (key.return) {
			onContinue();
		}
	});

	const topDriver = profile.topDrivers[0];

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Text bold>Your Codebase Intelligence Profile</Text>

			<Box marginTop={1} padding={1} borderStyle="single" flexDirection="column">
				<Text>
					CODEBASE HEALTH {renderBar(profile.primary.recoveryRisk)} {Math.round(profile.primary.recoveryRisk)}
					% {riskLabel(profile.primary.recoveryRisk)}
				</Text>
				<Text>
					CHANGE VOLATILITY {renderBar(profile.primary.changeVolatility)} {profile.primary.changeVolatility}{" "}
					{riskLabel(profile.primary.changeVolatility)}
				</Text>
				<Text>
					WORKFLOW FRAGILITY {renderBar(profile.primary.workflowFragility)}{" "}
					{profile.primary.workflowFragility} {riskLabel(profile.primary.workflowFragility)}
				</Text>
				<Text color="gray">{"─".repeat(55)}</Text>
				<Text dimColor>
					complexity {profile.secondary.complexity}
					{"  "}
					collaboration {profile.secondary.collaboration}
					{"  "}
					AI exposure {profile.secondary.aiExposure}
					{"  "}
					structural {profile.secondary.structuralRisk}
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				{topDriver && <Text>Top driver: {topDriver.label}</Text>}
				<Text>
					Confidence: {profile.confidence >= 0.7 ? "high" : profile.confidence >= 0.4 ? "moderate" : "low"}
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text color="cyan">Press [ENTER] to see what we found {"→"}</Text>
			</Box>
		</Box>
	);
}
