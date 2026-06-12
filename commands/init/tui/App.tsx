import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { Box, useInput } from "ink";
import { useCallback, useState } from "react";
import { DaemonStart } from "./frames/DaemonStart.js";
import { ExperientialProof } from "./frames/ExperientialProof.js";
import { InsightsProtection } from "./frames/InsightsProtection.js";
import { ProfileReveal } from "./frames/ProfileReveal.js";
import { Scanning } from "./frames/Scanning.js";
import { Welcome } from "./frames/Welcome.js";

type FrameStage = "welcome" | "scanning" | "profile" | "insights" | "service" | "proof";

export const MIN_SCAN_DISPLAY_MS = 4000; // 4 seconds minimum display time

export function App({ pathArg, options: _options }: { pathArg?: string; options: Record<string, unknown> }) {
	const [stage, setStage] = useState<FrameStage>("welcome");
	const [profile, setProfile] = useState<RecoveryRiskProfile | null>(null);

	const repoPath = (typeof pathArg === "string" && pathArg) || process.cwd();

	// Frame 1: Welcome  -  wait for ENTER key before proceeding
	useInput((_input, key) => {
		if (stage === "welcome" && key.return) {
			setStage("scanning");
		}
	});

	const handleScanComplete = useCallback((p: RecoveryRiskProfile) => {
		setProfile(p);
		setStage("profile");
	}, []);

	return (
		<Box flexDirection="column" padding={1}>
			{stage === "welcome" && <Welcome />}
			{stage === "scanning" && (
				<Scanning repoPath={repoPath} onComplete={handleScanComplete} minDisplayMs={MIN_SCAN_DISPLAY_MS} />
			)}
			{stage === "profile" && profile && (
				<ProfileReveal profile={profile} onContinue={() => setStage("insights")} />
			)}
			{stage === "insights" && profile && (
				<InsightsProtection profile={profile} onContinue={() => setStage("service")} />
			)}
			{stage === "service" && <DaemonStart onComplete={() => setStage("proof")} />}
			{stage === "proof" && profile && <ExperientialProof profile={profile} />}
		</Box>
	);
}
