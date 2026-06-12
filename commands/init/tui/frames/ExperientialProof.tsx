import type { RecoveryRiskProfile, WatchTarget } from "@vreko/intelligence/init-scan";
import { Box, Text, useApp, useInput } from "ink";
import { captureBenchmarkOptIn } from "../../../../services/analytics.js";
import { saveBenchmarkOptIn } from "../../../../services/vreko-dir.js";

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function totalWatchCount(targets: WatchTarget[]): number {
	return targets.reduce((s, t) => s + Math.max(t.fileCount, 1), 0);
}

export function ExperientialProof({ profile }: { profile: RecoveryRiskProfile }) {
	const { exit } = useApp();

	useInput((_input, key) => {
		const answer = _input.toLowerCase();
		let optedIn: boolean;

		if (answer === "y") {
			optedIn = true;
		} else if (answer === "n") {
			optedIn = false;
		} else if (key.return) {
			optedIn = false;
		} else {
			return;
		}

		// Capture analytics event (fire-and-forget, non-blocking per Execution Clarification #5)
		captureBenchmarkOptIn(optedIn).catch(() => {
			// Silently fail - analytics must never block user flow
		});

		saveBenchmarkOptIn(optedIn).then(() => {
			exit();
		});
	});

	const fragileFile = profile.topFragileFile || "your most-changed file";
	const { recommendedConfig } = profile;
	const watchCount = totalWatchCount(recommendedConfig.watchTargets);
	const patternCount = profile.insights.length + profile.lockedInsights.length;

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Text bold color="green">
				Vreko is watching your codebase.
			</Text>

			<Box marginTop={1} borderStyle="single" padding={1} flexDirection="column">
				<Text>Try it now:</Text>
				<Text />
				<Text color="cyan">
					$ echo "test" {">>"} {fragileFile}
				</Text>
				<Text />
				<Text>Vreko will catch the change to your most fragile</Text>
				<Text>file in real time.</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text>
					Recovery Risk: {capitalize(profile.overallRisk)}
					{" \u00b7 "}Protection: {capitalize(recommendedConfig.protectionLevel)}
				</Text>
				<Text>
					{watchCount} target{watchCount !== 1 ? "s" : ""} watched
					{" \u00b7 "}
					{patternCount} patterns seeded
					{" \u00b7 "}
					{profile.lockedInsights.length} insight unlocking
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Run `vreko status` anytime. Your code stays local.</Text>
			</Box>

			<Box marginTop={1}>
				<Text>Share anonymous benchmarks to improve comparisons? [y/N]</Text>
			</Box>
		</Box>
	);
}
