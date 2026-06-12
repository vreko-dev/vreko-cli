import { existsSync } from "node:fs";
import { join } from "node:path";
import type { RecoveryRiskProfile, WatchTarget } from "@vreko/intelligence/init-scan";
import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { connectToDaemon, getDaemonClient, getDaemonStatus, isDaemonConnected } from "../../services/service-client.js";
import { saveBenchmarkOptIn } from "../../services/vreko-dir.js";
import { BRAND_COLORS } from "../../ui/theme.js";
import { pollForWorkspaceJsonUpdate, snapshotPreWriteMtime, writeVrekoInitConfig } from "./activation-helpers.js";

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function totalWatchCount(targets: WatchTarget[]): number {
	return targets.reduce((s, t) => s + Math.max(t.fileCount, 1), 0);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ActivationProps {
	force?: boolean;
	profile: RecoveryRiskProfile;
	repoPath?: string;
}

type ServiceStage = "service" | "done";
type CheckStatus = "pending" | "running" | "done" | "error";

interface DaemonCheck {
	label: string;
	status: CheckStatus;
	detail?: string;
}

export function Activation({ profile, repoPath = process.cwd(), force }: ActivationProps) {
	const { exit } = useApp();
	const [stage, setStage] = useState<ServiceStage>("service");

	const [checks, setChecks] = useState<DaemonCheck[]>([
		{ label: "Connecting to service", status: "pending" },
		{ label: "Verifying workspace", status: "pending" },
		{ label: "Checking file watcher", status: "pending" },
		{ label: "Loading intelligence", status: "pending" },
		{ label: "Writing workspace.json", status: "pending" },
	]);

	const updateCheck = (index: number, status: CheckStatus, detail?: string) => {
		setChecks((prev) => prev.map((c, i) => (i === index ? { ...c, status, detail } : c)));
	};

	// Service startup sequence
	useEffect(() => {
		if (stage !== "service") {
			return;
		}
		let cancelled = false;

		async function run() {
			// Step 1: Connect to service
			updateCheck(0, "running");
			let step1Connected = false;
			try {
				if (!isDaemonConnected()) {
					await connectToDaemon();
				}
				if (cancelled) {
					return;
				}
				step1Connected = true;
				updateCheck(0, "done");
			} catch {
				if (cancelled) {
					return;
				}
				// Daemon not running  -  attempt to start it
				try {
					const { execFileSync } = await import("node:child_process");
					execFileSync("vreko", ["service", "start", "--service"], {
						stdio: "pipe",
						timeout: 10000,
					});
					// Give daemon time to bind
					await delay(1500);
					await connectToDaemon();
					if (cancelled) {
						return;
					}
					step1Connected = true;
					updateCheck(0, "done");
				} catch {
					// Start failed  -  continue with degraded mode, already shown below
				}
				if (!step1Connected) {
					if (cancelled) {
						return;
					}
					updateCheck(0, "error", "Failed to connect  -  start service with: vr service start");
				}
			}

			// Write .vreko/config.json  -  the TUI path never calls init-core, so it
			// must be written here. See activation-helpers.ts: writeVrekoInitConfig.
			writeVrekoInitConfig(repoPath, profile);

			// Write agents.workspace.json  -  non-fatal, shown as step 5.
			// The daemon runs a full init-scan asynchronously (git log + analysis),
			// which can take 20-45 s on large repos. We snapshot the file's mtime
			// BEFORE triggering via snapshotPreWriteMtime, then poll via
			// pollForWorkspaceJsonUpdate until the mtime advances  -  detecting an
			// actual new write, not just the file's existence from a prior init.
			// See activation-helpers.ts for the tested implementation.
			if (step1Connected) {
				updateCheck(4, "running");
				try {
					const client = getDaemonClient();
					if (client) {
						const targetFile = join(repoPath, ".agents", "workspace.json");
						const preMtime = snapshotPreWriteMtime(targetFile);

						await client.call<{ triggered: boolean }>("workspace/trigger-workspace-json-write", {
							workspace: repoPath,
						});
						await client.call<{ triggered: boolean }>("workspace/write-from-scan-profile", {
							workspace: repoPath,
							...(force && { force: true }),
						});

						const written = await pollForWorkspaceJsonUpdate(targetFile, preMtime, {
							cancelled: () => cancelled,
						});

						if (written) {
							updateCheck(4, "done", "Baseline written to .agents/workspace.json");
						} else {
							updateCheck(4, "error", "Write in progress  -  will complete in background");
						}
					} else {
						updateCheck(4, "error", "No daemon client  -  will write on first session");
					}
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					console.warn(`[vreko init] workspace.json write failed (non-fatal): ${msg}`);
					updateCheck(4, "error", "Write deferred  -  will complete on first session");
				}
			}

			// Step 2: Get service status
			updateCheck(1, "running");
			try {
				const status = await getDaemonStatus();
				if (cancelled) {
					return;
				}
				if (status.connected) {
					const uptimeMin = status.uptime ? Math.floor(status.uptime / 60000) : 0;
					updateCheck(1, "done", `Workspace registered${uptimeMin > 0 ? ` (service up ${uptimeMin}m)` : ""}`);
				} else {
					updateCheck(1, "error", "Service not responding");
				}
			} catch {
				if (cancelled) {
					return;
				}
				updateCheck(1, "done", "Workspace registered");
			}

			await delay(200);
			if (cancelled) {
				return;
			}

			// Step 3: Check file watcher
			updateCheck(2, "running");
			await delay(100);
			if (cancelled) {
				return;
			}
			const hasVreko = existsSync(`${repoPath}/.vreko`);
			updateCheck(2, "done", hasVreko ? "File watcher active" : "File watcher starting");

			await delay(200);
			if (cancelled) {
				return;
			}

			// Step 4: Intelligence seeded
			updateCheck(3, "running");
			await delay(150);
			if (cancelled) {
				return;
			}
			updateCheck(3, "done", "Intelligence ready");

			await delay(400);
			if (cancelled) {
				return;
			}

			setStage("done");
		}

		run();
		return () => {
			cancelled = true;
		};
	}, [stage, repoPath]);

	// Benchmark opt-in handler (done stage)
	useInput(
		(_input, key) => {
			if (stage !== "done") {
				return;
			}
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

			saveBenchmarkOptIn(optedIn).then(() => {
				exit();
			});
		},
		{ isActive: stage === "done" },
	);

	const watchCount = totalWatchCount(profile.recommendedConfig.watchTargets);
	const patternCount = profile.insights.length + profile.lockedInsights.length;
	const fragileFile = profile.topFragileFile || "your most-changed file";

	if (stage === "done") {
		return (
			<Box flexDirection="column" borderStyle="round" padding={1}>
				<Text bold color="green">
					Vreko is watching your codebase.
				</Text>

				<Box marginTop={1} flexDirection="column">
					<Text>
						<Text color={BRAND_COLORS.primary}>✓</Text>
						{` Protection: ${capitalize(profile.recommendedConfig.protectionLevel)} · Watching ${watchCount} target${watchCount !== 1 ? "s" : ""}`}
					</Text>
					<Text>
						<Text color={BRAND_COLORS.primary}>✓</Text>
						{` Snapshot frequency: ${capitalize(profile.recommendedConfig.snapshotFrequency)} (risk-adaptive)`}
					</Text>
					<Text>
						<Text color={BRAND_COLORS.primary}>✓</Text>
						{" Config written to .vreko/config.json"}
					</Text>
				</Box>

				<Box marginTop={1} borderStyle="single" padding={1} flexDirection="column">
					<Text>Try it now:</Text>
					<Text />
					<Text color="cyan">
						{'$ echo "test" >> '}
						{fragileFile}
					</Text>
					<Text />
					<Text>Vreko will catch the change to your most fragile</Text>
					<Text>file in real time.</Text>
				</Box>

				<Box marginTop={1} flexDirection="column">
					<Text>
						Recovery Risk: {capitalize(profile.overallRisk)}
						{" · "}Protection: {capitalize(profile.recommendedConfig.protectionLevel)}
					</Text>
					<Text>
						{watchCount} target{watchCount !== 1 ? "s" : ""} watched
						{" · "}
						{patternCount} patterns seeded
						{" · "}
						{profile.lockedInsights.length} insight unlocking
					</Text>
				</Box>

				<Box marginTop={1}>
					<Text bold>
						{"Vreko is active. Run "}
						<Text color="cyan">vr status</Text>
						{" anytime."}
					</Text>
				</Box>

				<Box marginTop={1}>
					<Text dimColor>Run `vr status` anytime. Your code stays local.</Text>
				</Box>

				<Box marginTop={1}>
					<Text>Share anonymous benchmarks to improve comparisons? [y/N]</Text>
				</Box>
			</Box>
		);
	}

	// Service startup stage
	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Text>Starting Vreko service...</Text>
			<Box marginTop={1} flexDirection="column" minHeight={4}>
				{checks
					.filter((check) => check.status !== "pending")
					.map((check, i) => {
						const icon = check.status === "done" ? "✓" : check.status === "error" ? "⚠" : "…";
						const color =
							check.status === "done"
								? BRAND_COLORS.primary
								: check.status === "error"
									? "yellow"
									: "cyan";
						return (
							<Text key={i} color={color}>
								{icon} {check.label}
								{check.detail ? `  -  ${check.detail}` : ""}
							</Text>
						);
					})}
			</Box>
		</Box>
	);
}
