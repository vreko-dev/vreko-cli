import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { useEffect, useRef, useState } from "react";
import { getDaemonClient, isDaemonConnected } from "../../../services/service-client.js";

export interface UseAnalysisResult {
	done: boolean;
	errored: boolean;
	profile: RecoveryRiskProfile | null;
}

/**
 * Minimal profile returned when daemon scan returns null (cache hit / concurrent scan).
 * Downstream stages handle this gracefully; the daemon has already emitted scan.complete
 * via the event bus. This avoids crashing the TUI when a second concurrent init runs.
 */
const NULL_PROFILE: RecoveryRiskProfile = {
	overallRisk: "low",
	confidence: 0,
	primary: { recoveryRisk: 0, changeVolatility: 0, workflowFragility: 0 },
	secondary: { complexity: 0, collaboration: 0, aiExposure: 0, structuralRisk: 0 },
	topDrivers: [],
	insights: [],
	lockedInsights: [],
	recommendedConfig: {
		protectionLevel: "standard",
		snapshotFrequency: "balanced",
		watchTargets: [],
		enabledFeatures: [],
	},
	topFragileFile: null,
	topFragileFiles: [],
	coChange: [],
	fragility: [],
};

/**
 * Hook that runs the init scan analysis for a given repo path.
 * Extracted from Scanning.tsx for reuse and testability.
 *
 * Scan path:
 * 1. If daemon is connected: call workspace/run-init-scan via IPC (ARCH-01 compliant).
 * 2. If daemon is NOT connected (VIRGIN/NEW_WORKSPACE  -  daemon not yet started during
 *    the Scanning stage): fall back to direct runInitScan as a one-time exception.
 *    This fallback is intentionally isolated to a dynamic import in this hook.
 *
 * ARCH-01-PENDING: Remove direct fallback once the Scanning stage runs post-Activation
 * (tracked as LIN-0000). The fallback path exists solely for the pre-Activation window.
 */
export function useAnalysis(
	repoPath: string,
	onComplete: (profile: RecoveryRiskProfile) => void,
	minDisplayMs = 0,
): UseAnalysisResult {
	const [done, setDone] = useState(false);
	const [errored, setErrored] = useState(false);
	const [profile, setProfile] = useState<RecoveryRiskProfile | null>(null);
	const hasStarted = useRef(false);
	const startTimeRef = useRef(Date.now());

	useEffect(() => {
		if (hasStarted.current) {
			return;
		}
		hasStarted.current = true;

		const runScan = async (): Promise<RecoveryRiskProfile | null> => {
			// Try IPC first  -  preferred path when daemon is already running (COLD_RETURN profile)
			if (isDaemonConnected()) {
				const client = getDaemonClient();
				return client.call<RecoveryRiskProfile | null>("workspace/run-init-scan", {
					workspace: repoPath,
				});
			}

			// ARCH-01-PENDING: fallback for pre-Activation daemon start
			// Daemon is not yet running (VIRGIN/NEW_WORKSPACE). Use direct import as a
			// one-time exception. Dynamic import minimises violation surface area.
			// Remove this branch once Scanning stage is guaranteed to run post-Activation (LIN-0000).
			const { runInitScan } = await import("@vreko/intelligence/init-scan");
			return runInitScan({ repoPath });
		};

		runScan()
			.then((result) => {
				// null = cache hit or concurrent scan in progress; treat as NULL_PROFILE to avoid crash
				const resolved: RecoveryRiskProfile = result ?? NULL_PROFILE;
				setDone(true);
				setProfile(resolved);
				const elapsed = Date.now() - startTimeRef.current;
				const delay = Math.max(500, minDisplayMs - elapsed);
				setTimeout(() => onComplete(resolved), delay);
			})
			.catch(() => setErrored(true));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [repoPath]);

	return { done, errored, profile };
}
