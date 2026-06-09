/**
 * LearningsPanel  -  pattern/learning browser.
 *
 * Shows learnings from daemon with type, trigger, action, and status.
 * UnorderedList from @inkjs/ui for consistent bullet rendering.
 * Filter toggle: all / active.
 *
 * @module ui/tui/panels/LearningsPanel
 */
import { Alert, Select, Spinner, UnorderedList } from "@inkjs/ui";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, Text, useInput } from "ink";
import { useEffect, useRef, useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

type FilterMode = "all" | "active";

interface LearningItem {
	type: string;
	trigger: string;
	action: string;
	relevanceScore?: number;
}

interface LearningsPanelProps {
	client: VrekoLocalClient;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LearningsPanel({ client }: LearningsPanelProps) {
	const [learnings, setLearnings] = useState<LearningItem[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<FilterMode>("all");
	const [showFilterMenu, setShowFilterMenu] = useState(false);
	const hasStarted = useRef(false); // StrictMode guard

	useEffect(() => {
		if (hasStarted.current) {
			return;
		}
		hasStarted.current = true;
		let cancelled = false;
		const cwd = process.cwd();

		const load = async () => {
			setIsLoading(true);
			try {
				const result = await client.learning.list({
					workspace: cwd,
					limit: 50,
				});
				if (cancelled) {
					return;
				}
				const items: LearningItem[] = result.learnings.map((l) => ({
					type: l.type,
					trigger: l.trigger,
					action: l.action,
				}));
				setLearnings(items);
				setTotal(result.total);
				setError(null);
			} catch (err) {
				if (cancelled) {
					return;
				}
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [client]);

	// 'f' key toggles filter menu  -  only active when this panel is mounted
	useInput((input) => {
		if (input === "f") {
			setShowFilterMenu((v) => !v);
		}
	});

	const filtered = learnings.filter((l) => {
		if (filter === "all") {
			return true;
		}
		// "active" = learnings that have a meaningful action (not empty)
		return l.action.length > 0;
	});

	const filterOptions: Array<{ label: string; value: FilterMode }> = [
		{ label: "All learnings", value: "all" },
		{ label: "With action only", value: "active" },
	];

	return (
		<Box flexDirection="column" paddingX={1}>
			<Box gap={2} marginBottom={1}>
				<Text bold>Learnings ({total} total)</Text>
				<Text dimColor>[f:filter = {filter}]</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Alert variant="error">{error}</Alert>
				</Box>
			)}

			{isLoading && <Spinner label="Loading patterns..." />}

			{!isLoading && learnings.length === 0 && !error && (
				<Box marginTop={1}>
					<Text dimColor>
						No patterns learned yet. Run an AI session and use vreko_learn to record patterns.
					</Text>
				</Box>
			)}

			{showFilterMenu ? (
				<Box flexDirection="column" marginBottom={1}>
					<Text>Filter by:</Text>
					<Select
						options={filterOptions}
						onChange={(v) => {
							setFilter(v as FilterMode);
							setShowFilterMenu(false);
						}}
					/>
				</Box>
			) : (
				!isLoading &&
				filtered.length > 0 && (
					<UnorderedList>
						{filtered.slice(0, 30).map((l, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once at mount
							<UnorderedList.Item key={`${l.type}-${i}`}>
								<Text>
									<Text bold>{l.type}</Text>
									<Text dimColor>
										{" "}
										- {l.trigger.length > 40 ? `${l.trigger.slice(0, 40)}…` : l.trigger}
									</Text>
								</Text>
							</UnorderedList.Item>
						))}
						{filtered.length > 30 && (
							<UnorderedList.Item>
								<Text dimColor>...and {filtered.length - 30} more. Use vr patterns for full list.</Text>
							</UnorderedList.Item>
						)}
					</UnorderedList>
				)
			)}

			<Box marginTop={1}>
				<Text dimColor>f:filter 1-4:panels q:quit</Text>
			</Box>
		</Box>
	);
}
