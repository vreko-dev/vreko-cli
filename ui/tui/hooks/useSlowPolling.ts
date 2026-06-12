/**
 * useSlowPolling  -  slow poll (60s) for snapshots, learnings, momentum.
 *
 * Each subsystem call is isolated  -  one failure does not crash others.
 * On failure, last-known-good values are preserved so the UI never shows
 * stale zeros masquerading as truth. Errors are surfaced via `error` field.
 * Slow-poll pattern extracted from legacy dashboard component (Phase 32).
 */
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { useEffect, useRef, useState } from "react";

export interface SlowPollState {
	snapshots: { count: number; latestAt: string | null };
	learnings: { count: number };
	momentum: { fileCount: number; averageScore: number } | null;
	error: string | null;
}

const INITIAL: SlowPollState = {
	snapshots: { count: 0, latestAt: null },
	learnings: { count: 0 },
	momentum: null,
	error: null,
};

export function useSlowPolling(client: VrekoLocalClient, intervalMs = 60000): SlowPollState {
	const [state, setState] = useState<SlowPollState>(INITIAL);
	// Preserve last-good values across failed polls so the UI never flips to
	// zeros just because one interval's IPC calls failed.
	const lastGoodRef = useRef({
		snapshots: INITIAL.snapshots,
		learnings: INITIAL.learnings,
		momentum: INITIAL.momentum,
	});

	useEffect(() => {
		let cancelled = false;
		const cwd = process.cwd();

		const poll = async () => {
			const lg = lastGoodRef.current;
			let snapshotCount = lg.snapshots.count;
			let latestAt = lg.snapshots.latestAt;
			let learningCount = lg.learnings.count;
			let momentumData = lg.momentum;
			const errors: string[] = [];

			try {
				const snap = await client.snapshot.list({ limit: 1, orderBy: "createdAt", orderDir: "desc" });
				snapshotCount = snap.totalCount ?? 0;
				latestAt = snap.snapshots[0]?.createdAt ?? null;
			} catch (err) {
				errors.push(`snapshots: ${err instanceof Error ? err.message : String(err)}`);
			}

			try {
				const learn = await client.learning.list({ workspace: cwd, limit: 1 });
				learningCount = learn.total;
			} catch (err) {
				errors.push(`learnings: ${err instanceof Error ? err.message : String(err)}`);
			}

			try {
				const mom = await client.momentum.status({ workspace: cwd });
				momentumData = { fileCount: mom.fileCount, averageScore: mom.averageScore };
			} catch (err) {
				errors.push(`momentum: ${err instanceof Error ? err.message : String(err)}`);
			}

			if (cancelled) {
				return;
			}

			lastGoodRef.current = {
				snapshots: { count: snapshotCount, latestAt },
				learnings: { count: learningCount },
				momentum: momentumData,
			};

			setState({
				snapshots: { count: snapshotCount, latestAt },
				learnings: { count: learningCount },
				momentum: momentumData,
				error: errors.length > 0 ? errors.join("; ") : null,
			});
		};

		poll();
		const id = setInterval(poll, intervalMs);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [client, intervalMs]);

	return state;
}
