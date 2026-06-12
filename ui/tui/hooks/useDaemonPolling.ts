/**
 * useDaemonPolling  -  fast poll (5s) for daemon vital signs.
 *
 * Extracts the fast-poll useEffect pattern into a standalone hook.
 * Pattern: apps/cli/src/ui/init/hooks/useAnalysis.ts (StrictMode guard)
 * Dual-interval polling pattern extracted from legacy dashboard component (Phase 32).
 */
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { useEffect, useState } from "react";

export interface DaemonState {
	pid: number;
	version: string;
	uptime: string;
	connections: number;
	memoryMB: number;
}

export function useDaemonPolling(
	client: VrekoLocalClient,
	intervalMs = 5000,
): { daemon: DaemonState | null; error: string | null } {
	const [daemon, setDaemon] = useState<DaemonState | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		function formatUptime(ms: number): string {
			const s = Math.floor(ms / 1000);
			const m = Math.floor(s / 60);
			const h = Math.floor(m / 60);
			const d = Math.floor(h / 24);
			if (d > 0) {
				return `${d}d ${h % 24}h`;
			}
			if (h > 0) {
				return `${h}h ${m % 60}m`;
			}
			if (m > 0) {
				return `${m}m ${s % 60}s`;
			}
			return `${s}s`;
		}

		const poll = async () => {
			try {
				const status = await client.daemon.status();
				if (cancelled) {
					return;
				}
				setDaemon({
					pid: status.pid,
					version: status.version,
					uptime: formatUptime(status.uptime),
					connections: status.connections,
					memoryMB: Math.round(status.memoryUsage.heapUsed / (1024 * 1024)),
				});
				setError(null);
			} catch (err) {
				if (cancelled) {
					return;
				}
				setDaemon(null);
				setError(err instanceof Error ? err.message : String(err));
			}
		};

		poll();
		const id = setInterval(poll, intervalMs);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [client, intervalMs]);

	return { daemon, error };
}
