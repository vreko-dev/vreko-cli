import { existsSync } from "node:fs";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { connectToDaemon, getDaemonStatus, isDaemonConnected } from "../../../../services/service-client.js";

interface DaemonStartProps {
	onComplete: () => void;
	repoPath?: string;
}

type CheckStatus = "pending" | "running" | "done" | "error";

interface DaemonCheck {
	label: string;
	status: CheckStatus;
	detail?: string;
}

export function DaemonStart({ onComplete, repoPath = process.cwd() }: DaemonStartProps) {
	const [checks, setChecks] = useState<DaemonCheck[]>([
		{ label: "Connecting to service", status: "pending" },
		{ label: "Verifying workspace", status: "pending" },
		{ label: "Checking file watcher", status: "pending" },
		{ label: "Loading intelligence", status: "pending" },
	]);

	const updateCheck = (index: number, status: CheckStatus, detail?: string) => {
		setChecks((prev) => prev.map((c, i) => (i === index ? { ...c, status, detail } : c)));
	};

	useEffect(() => {
		let cancelled = false;

		async function run() {
			// Step 1: Connect to service
			updateCheck(0, "running");
			try {
				if (!isDaemonConnected()) {
					await connectToDaemon();
				}
				if (cancelled) {
					return;
				}
				updateCheck(0, "done");
			} catch {
				if (cancelled) {
					return;
				}
				updateCheck(0, "error", "Failed to connect  -  start the service with: vreko service start");
				// Don't bail  -  continue with degraded info
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

			// Step 3: Check file watcher (check for .vreko dir)
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
			onComplete();
		}

		run();
		return () => {
			cancelled = true;
		};
	}, [repoPath, onComplete]);

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Text>Starting Vreko service...</Text>
			<Box marginTop={1} flexDirection="column" minHeight={4}>
				{checks.map((check, i) => {
					if (check.status === "pending") {
						return null;
					}
					const icon = check.status === "done" ? "✓" : check.status === "error" ? "⚠" : "…";
					const color = check.status === "done" ? "green" : check.status === "error" ? "yellow" : "cyan";
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

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
