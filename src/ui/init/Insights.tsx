import type { RecoveryRiskProfile, WatchTarget } from "@vreko/intelligence/init-scan";
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { BRAND_COLORS } from "../theme.js";

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function totalWatchCount(targets: WatchTarget[]): number {
	return targets.reduce((s, t) => s + Math.max(t.fileCount, 1), 0);
}

type InsightSeverity = "critical" | "warning" | "notable" | "info";

interface Insight {
	id: string;
	severity: InsightSeverity;
	observation: string;
	whyItMatters: string;
	whatWeWillDo: string;
	comparison?: string;
	type?: string;
}

/**
 * Sort insights by priority:
 * 1. co-change relationships first
 * 2. blast-radius next
 * 3. recovery patterns
 * 4. severity as tiebreaker (critical > warning > info)
 */
function prioritizeInsights(insights: Insight[]): Insight[] {
	return [...insights].sort((a, b) => {
		// Type-based ordering
		if (a.type === "co-change" && b.type !== "co-change") {
			return -1;
		}
		if (b.type === "co-change" && a.type !== "co-change") {
			return 1;
		}
		if (a.type === "blast-radius" && b.type !== "blast-radius") {
			return -1;
		}
		if (b.type === "blast-radius" && a.type !== "blast-radius") {
			return 1;
		}
		if (a.type === "recovery" && b.type !== "recovery") {
			return -1;
		}
		if (b.type === "recovery" && a.type !== "recovery") {
			return 1;
		}

		// Severity tiebreaker
		const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, notable: 2, info: 3 };
		return severityOrder[a.severity] - severityOrder[b.severity];
	});
}

const PAGE_SIZE = 3;

export function Insights({
	profile,
	onContinue,
	onCustomize,
}: {
	profile: RecoveryRiskProfile;
	onContinue: () => void;
	onCustomize?: () => void;
}) {
	const [currentPage, setCurrentPage] = useState(0);

	const { insights, lockedInsights, recommendedConfig } = profile;
	const sorted = prioritizeInsights(insights as Insight[]);
	const maxPage = Math.max(0, sorted.length - PAGE_SIZE);

	useInput((input, key) => {
		if (key.upArrow && currentPage > 0) {
			setCurrentPage((p) => p - 1);
		} else if (key.downArrow && currentPage < maxPage) {
			setCurrentPage((p) => p + 1);
		} else if (key.return) {
			onContinue();
		} else if ((input === "c" || input === "C") && onCustomize) {
			onCustomize();
		}
	});

	const locked = lockedInsights[0];
	const watchCount = totalWatchCount(recommendedConfig.watchTargets);
	const visibleInsights = sorted.slice(currentPage, currentPage + PAGE_SIZE);
	const shownEnd = currentPage + visibleInsights.length;

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
				{visibleInsights.map((insight) => (
					<Box key={insight.id} marginBottom={1}>
						<Box width="50%" paddingRight={2} flexDirection="column">
							<Text
								color={
									insight.severity === "critical"
										? "red"
										: insight.severity === "warning" || insight.severity === "notable"
											? "yellow"
											: undefined
								}
							>
								{insight.severity === "info" ? "ℹ" : "⚠"} {insight.observation}
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

				{locked && currentPage === maxPage && (
					<Box marginBottom={1}>
						<Box width="50%" paddingRight={2} flexDirection="column">
							<Text dimColor>┄ {locked.teaser}</Text>
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
					{" · "}Watching: {watchCount} target{watchCount !== 1 ? "s" : ""}
				</Text>
				<Text>Snapshot Frequency: {capitalize(recommendedConfig.snapshotFrequency)} (risk-adaptive)</Text>
			</Box>

			<Box marginTop={1}>
				<Text color={BRAND_COLORS.primary}>
					{"[ENTER] Accept · "}
					{onCustomize ? "[c] Customize · " : ""}
					{sorted.length > PAGE_SIZE ? `[↑↓] More insights (${shownEnd}/${sorted.length})` : ""}
				</Text>
			</Box>
		</Box>
	);
}
