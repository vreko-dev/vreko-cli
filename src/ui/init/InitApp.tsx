import { existsSync } from "node:fs";
import { join } from "node:path";
import type { BootProfileType } from "@vreko/contracts/local-service";
import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { Box, Text } from "ink";
import { useCallback, useEffect, useState } from "react";
import { Activation } from "./Activation.js";
import { Consent } from "./Consent.js";
import { Detection } from "./Detection.js";
import { useAnalysis } from "./hooks/useAnalysis.js";
import { announce, useKeyboard } from "./hooks/useKeyboard.js";
import { Insights } from "./Insights.js";
import { Logo } from "./Logo.js";
import { Profile } from "./Profile.js";

/** Minimum time to show the scanning frame so it doesn't flash. */
export const MIN_SCAN_DISPLAY_MS = 4000;

export type FrameStage = "detection" | "scanning" | "profile" | "insights" | "consent" | "activation";

interface ScanningFrameProps {
	repoPath: string;
	onComplete: (profile: RecoveryRiskProfile) => void;
}

/** Inner component that owns the scan side-effect via useAnalysis hook. */
function ScanningFrame({ repoPath, onComplete }: ScanningFrameProps) {
	const { done, errored } = useAnalysis(repoPath, onComplete, MIN_SCAN_DISPLAY_MS);
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

export interface InitAppOptions {
	force?: boolean;
	[key: string]: unknown;
}

// =============================================================================
// PROFILE-AWARE FRAME SKIP TABLE (spec §D)
// =============================================================================

const FRAME_ENABLED_MAP: Record<BootProfileType, Record<FrameStage, boolean>> = {
	VIRGIN: { detection: true, scanning: true, profile: true, insights: true, consent: true, activation: true },
	NEW_WORKSPACE: { detection: false, scanning: true, profile: true, insights: true, consent: true, activation: true },
	COLD_RETURN: { detection: false, scanning: true, profile: true, insights: true, consent: false, activation: true },
	WARM_RETURN: {
		detection: false,
		scanning: false,
		profile: true,
		insights: false,
		consent: false,
		activation: true,
	},
	HOT_RECONNECT: {
		detection: false,
		scanning: false,
		profile: false,
		insights: false,
		consent: false,
		activation: true,
	},
};

/**
 * Returns true if the given frame stage is enabled for the given boot profile.
 * Defaults to COLD_RETURN when profile is undefined (safe default, §J).
 */
export function isFrameEnabled(frame: FrameStage, profile: BootProfileType = "COLD_RETURN"): boolean {
	return FRAME_ENABLED_MAP[profile]?.[frame] ?? true;
}

export function InitApp({
	pathArg,
	options,
	initProfile,
}: {
	pathArg?: string;
	options: InitAppOptions;
	initProfile?: BootProfileType; // undefined → COLD_RETURN as safe default (spec §J)
}) {
	const [stage, setStage] = useState<FrameStage>("detection");
	const [profile, setProfile] = useState<RecoveryRiskProfile | null>(null);

	const repoPath = (typeof pathArg === "string" && pathArg) || process.cwd();

	// Keyboard navigation handler
	const handleNextStage = useCallback(() => {
		const allStages: FrameStage[] = ["detection", "scanning", "profile", "insights", "consent", "activation"];
		const profile = initProfile ?? "COLD_RETURN";
		const enabledStages = allStages.filter((s) => isFrameEnabled(s, profile));
		const currentIndex = enabledStages.indexOf(stage);
		if (currentIndex < enabledStages.length - 1) {
			const nextStage = enabledStages[currentIndex + 1];
			setStage(nextStage);
			announce(`Proceeding to ${nextStage} stage`, "polite");
		}
	}, [stage, initProfile]);

	const handlePrevStage = useCallback(() => {
		const allStages: FrameStage[] = ["detection", "scanning", "profile", "insights", "consent", "activation"];
		const profile = initProfile ?? "COLD_RETURN";
		const enabledStages = allStages.filter((s) => isFrameEnabled(s, profile));
		const currentIndex = enabledStages.indexOf(stage);
		if (currentIndex > 0) {
			const prevStage = enabledStages[currentIndex - 1];
			setStage(prevStage);
			announce(`Returning to ${prevStage} stage`, "polite");
		}
	}, [stage, initProfile]);

	// Enable keyboard navigation on interactive stages
	useKeyboard({
		onEnter: handleNextStage,
		onEscape: () => {
			announce("Cancelling initialization", "assertive");
			process.exit(0);
		},
		onArrowRight: handleNextStage,
		onArrowLeft: handlePrevStage,
		enabled: stage === "profile" || stage === "insights" || stage === "activation",
		// consent stage manages its own keyboard input via Consent component
	});

	// Announce stage changes for screen readers
	useEffect(() => {
		announce(`Vreko initialization: ${stage} stage`, "polite");
	}, [stage]);

	// Guard: not a git repository
	const isGitRepo = existsSync(join(repoPath, ".git"));
	if (!isGitRepo) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>Vreko requires a Git repository.</Text>
				<Box marginTop={1} flexDirection="column">
					<Text>
						{"Initialize one with: "}
						<Text color="cyan">git init</Text>
					</Text>
					<Text>
						{"Then run: "}
						<Text color="cyan">vr init</Text>
					</Text>
				</Box>
			</Box>
		);
	}

	const handleScanComplete = useCallback((p: RecoveryRiskProfile) => {
		setProfile(p);
		setStage("profile");
		announce("Scan complete. Risk profile generated.", "polite");
	}, []);

	return (
		<Box flexDirection="column" padding={1} width={80}>
			{/* Logo shown on detection and scanning stages */}
			{(stage === "detection" || stage === "scanning") && <Logo />}

			{stage === "detection" && isFrameEnabled("detection", initProfile ?? "COLD_RETURN") && (
				<Detection repoPath={repoPath} onReady={() => setStage("scanning")} />
			)}

			{stage === "scanning" && isFrameEnabled("scanning", initProfile ?? "COLD_RETURN") && (
				<ScanningFrame repoPath={repoPath} onComplete={handleScanComplete} />
			)}

			{stage === "profile" && profile && isFrameEnabled("profile", initProfile ?? "COLD_RETURN") && (
				<Profile profile={profile} onContinue={() => setStage("insights")} />
			)}

			{stage === "insights" && profile && isFrameEnabled("insights", initProfile ?? "COLD_RETURN") && (
				<Insights profile={profile} onContinue={() => setStage("consent")} />
			)}

			{stage === "consent" && isFrameEnabled("consent", initProfile ?? "COLD_RETURN") && (
				<Consent onAccept={() => setStage("activation")} />
			)}

			{stage === "activation" && profile && isFrameEnabled("activation", initProfile ?? "COLD_RETURN") && (
				<Activation profile={profile} repoPath={repoPath} force={options.force} />
			)}

			{/* Keyboard hints for accessibility */}
			{(stage === "profile" || stage === "insights" || stage === "activation") && (
				<Box marginTop={1} flexDirection="column">
					<Text dimColor>Press Enter or → to continue | ← to go back | ESC to cancel</Text>
				</Box>
			)}
		</Box>
	);
}
