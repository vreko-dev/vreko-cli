import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { Box, Text } from "ink";
import { useAnalysis } from "../../../../ui/init/hooks/useAnalysis.js";

interface ScanningProps {
	repoPath: string;
	onComplete: (profile: RecoveryRiskProfile) => void;
	minDisplayMs?: number;
}

export function Scanning({ repoPath, onComplete, minDisplayMs = 0 }: ScanningProps) {
	// Scan delegated to useAnalysis hook (IPC-first with daemon-unavailable fallback).
	// Issue: LIN-0000  -  Wire service IPC topology provider when service's topology/scan endpoint is available.
	const { done, errored } = useAnalysis(repoPath, onComplete, minDisplayMs);

	// Progress display simplified: spinner only until IPC streaming is implemented (LIN-0000)
	const statusLabel = done ? "[██████████] done" : errored ? "[  error  ]" : "[██████░░░░] ...";

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Text>Scanning your development history...</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>Reflog Analysis {statusLabel}</Text>
				<Text>Commit Patterns {statusLabel}</Text>
				<Text>Repo Structure {statusLabel}</Text>
				<Text>Dependency Analysis {statusLabel}</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="green">{"🔒"} Metadata only - file contents are never read</Text>
				<Text dimColor>{"☁"} Baseline comparison: disabled (offline mode)</Text>
			</Box>
		</Box>
	);
}
