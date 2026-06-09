import type { RecoveryRiskProfile, WatchTarget } from "@vreko/intelligence/init-scan";
import { Box, Text, useInput } from "ink";

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function totalWatchCount(targets: WatchTarget[]): number {
	return targets.reduce((s, t) => s + Math.max(t.fileCount, 1), 0);
}

export function InsightsProtection({ profile, onContinue }: { profile: RecoveryRiskProfile; onContinue: () => void }) {
	useInput((input, key) => {
		if (key.return || input === "c" || input === "C") {
			onContinue();
		}
	});

	const { insights, lockedInsights, recommendedConfig } = profile;
	const locked = lockedInsights[0];
	const watchCount = totalWatchCount(recommendedConfig.watchTargets);

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Box>
				<Box width="50%">
					<Text bold>What We Found</Text>
				</Box>
				<Box width="50%">
					<Text bold>What We'll Do</Text>
				</Box>
			</Box>

			<Box marginTop={1} flexDirection="column">
				{insights.slice(0, 3).map((insight, _i) => (
					<Box key={insight.id} marginBottom={1}>
						<Box width="50%" paddingRight={2} flexDirection="column">
							<Text color={insight.severity === "critical" ? "red" : "yellow"}>
								{insight.severity === "info" ? "\u2139" : "\u26a0"} {insight.observation}
							</Text>
							<Text dimColor> {insight.whyItMatters}</Text>
							{insight.comparison && (
								<Text dimColor color="cyan">
									{" "}
									{insight.comparison}
								</Text>
							)}
						</Box>
						<Box width="50%">
							<Text>{insight.whatWeWillDo}</Text>
						</Box>
					</Box>
				))}

				{locked && (
					<Box marginBottom={1}>
						<Box width="50%" paddingRight={2} flexDirection="column">
							<Text dimColor>
								{"\u2504"} {locked.teaser}
							</Text>
							<Text dimColor> {locked.requirement}</Text>
						</Box>
						<Box width="50%">
							<Text dimColor>
								Available after {locked.unlockCondition.days} days of active development.
							</Text>
						</Box>
					</Box>
				)}
			</Box>

			<Box marginTop={1} borderStyle="single" padding={1} flexDirection="column">
				<Text>
					Protection: {capitalize(recommendedConfig.protectionLevel)}
					{" \u00b7 "}Watching: {watchCount} target{watchCount !== 1 ? "s" : ""}
				</Text>
				<Text>Snapshot Frequency: {capitalize(recommendedConfig.snapshotFrequency)} (risk-adaptive)</Text>
			</Box>

			<Box marginTop={1}>
				<Text color="cyan">
					[ENTER] Accept {" \u00b7 "} [c] Customize
					{insights.length > 3 ? ` \u00b7 [↑↓] More insights (3/${insights.length})` : ""}
				</Text>
			</Box>
		</Box>
	);
}
