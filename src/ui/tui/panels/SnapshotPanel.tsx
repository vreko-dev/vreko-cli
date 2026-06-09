/**
 * SnapshotPanel  -  snapshot browser with action menu.
 *
 * Lists snapshots ordered by creation date (newest first).
 * Select component from @inkjs/ui handles keyboard navigation within the list.
 * Actions: restore, diff, delete (+ back to list).
 *
 * Pattern: RESEARCH.md don't-hand-roll: "Use Select from @inkjs/ui for scrollable menus"
 *
 * @module ui/tui/panels/SnapshotPanel
 */
import { Alert, Select, Spinner } from "@inkjs/ui";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, Text } from "ink";
import { useEffect, useRef, useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface SnapshotItem {
	id: string;
	relativePath: string;
	filePath: string;
	trigger: string;
	createdAt: string;
}

type ViewMode = "list" | "action";

interface SnapshotPanelProps {
	client: VrekoLocalClient;
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatSnapshotDate(ts: string): string {
	const d = new Date(ts);
	return d.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SnapshotPanel({ client }: SnapshotPanelProps) {
	const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("list");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [actionResult, setActionResult] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const hasStarted = useRef(false); // StrictMode guard

	const PAGE_SIZE = 20;

	// Load snapshots on mount (and page change)
	useEffect(() => {
		if (hasStarted.current && page === 0) {
			return;
		}
		hasStarted.current = true;
		let cancelled = false;

		const load = async () => {
			setIsLoading(true);
			try {
				const result = await client.snapshot.list({
					limit: PAGE_SIZE,
					cursor: page > 0 ? String(page * PAGE_SIZE) : undefined,
					orderBy: "createdAt",
					orderDir: "desc",
				});
				if (cancelled) {
					return;
				}
				const items: SnapshotItem[] = result.snapshots.map((s) => ({
					id: s.id,
					relativePath: s.relativePath,
					filePath: s.filePath,
					trigger: s.trigger,
					createdAt: s.createdAt,
				}));
				setSnapshots((prev) => (page === 0 ? items : [...prev, ...items]));
				setTotalCount(result.totalCount ?? result.snapshots.length);
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
	}, [client, page]);

	// Build Select options for snapshot list
	const snapshotOptions = [
		...snapshots.map((s) => ({
			label: `${formatSnapshotDate(s.createdAt)}  [${s.trigger}]  ${s.relativePath}`,
			value: s.id,
		})),
		...(snapshots.length < totalCount
			? [{ label: `Load more (${totalCount - snapshots.length} remaining)`, value: "__load_more__" }]
			: []),
	];

	// Action menu options for a selected snapshot
	const actionOptions = [
		{ label: "Restore this snapshot", value: "restore" },
		{ label: "Diff against current file", value: "diff" },
		{ label: "Delete snapshot", value: "delete" },
		{ label: "Back to list", value: "back" },
	];

	const handleSnapshotSelect = (value: string) => {
		if (value === "__load_more__") {
			setPage((p) => p + 1);
			return;
		}
		setSelectedId(value);
		setViewMode("action");
		setActionResult(null);
	};

	const handleAction = async (action: string) => {
		if (action === "back") {
			setViewMode("list");
			setSelectedId(null);
			return;
		}
		if (!selectedId) {
			return;
		}

		setActionResult(null);
		try {
			switch (action) {
				case "restore": {
					await client.snapshot.restore({ snapshotId: selectedId, createBackup: true, dryRun: false });
					setActionResult("Snapshot restored successfully.");
					break;
				}
				case "diff": {
					const result = await client.snapshot.diff({
						baseSnapshotId: selectedId,
						contextLines: 3,
						format: "unified",
					});
					const stats = result.stats;
					setActionResult(
						`Diff: +${stats.additions} -${stats.deletions} across ${stats.filesChanged} file(s)`,
					);
					break;
				}
				case "delete": {
					await client.snapshot.delete({ snapshotIds: [selectedId], dryRun: false });
					setActionResult("Snapshot deleted.");
					// Refresh list
					hasStarted.current = false;
					setPage(0);
					setSnapshots([]);
					setViewMode("list");
					break;
				}
			}
		} catch (err) {
			setActionResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	return (
		<Box flexDirection="column" paddingX={1}>
			<Text bold>Snapshots ({totalCount} total)</Text>

			{error && (
				<Box marginTop={1}>
					<Alert variant="error">{error}</Alert>
				</Box>
			)}

			{isLoading && snapshots.length === 0 && <Spinner label="Loading snapshots..." />}

			{!isLoading && snapshots.length === 0 && !error && (
				<Box marginTop={1}>
					<Text dimColor>No snapshots yet. Vreko creates snapshots automatically as you work with AI.</Text>
				</Box>
			)}

			{viewMode === "list" && snapshotOptions.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text dimColor>↑↓ navigate ENTER select 1-4:panels</Text>
					<Select options={snapshotOptions} onChange={handleSnapshotSelect} visibleOptionCount={12} />
				</Box>
			)}

			{viewMode === "action" && selectedId && (
				<Box flexDirection="column" marginTop={1}>
					<Text>
						Selected: <Text bold>{selectedId.slice(0, 8)}</Text>
					</Text>
					{actionResult && (
						<Box marginY={1}>
							<Alert variant={actionResult.startsWith("Error") ? "error" : "success"}>
								{actionResult}
							</Alert>
						</Box>
					)}
					<Select options={actionOptions} onChange={handleAction} />
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>1-4:panels q:quit</Text>
			</Box>
		</Box>
	);
}
