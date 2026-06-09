import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { BRAND_COLORS } from "../theme.js";

interface DetectionProps {
	repoPath?: string;
	onReady: () => void;
}

function detectRepoInfo(repoPath: string): string[] {
	const checks: string[] = [];

	// Git detection
	if (existsSync(join(repoPath, ".git"))) {
		checks.push("✓ Git repository found");
	} else {
		checks.push("⚠ No git repository found  -  some features unavailable");
	}

	// Package manager / monorepo detection
	if (existsSync(join(repoPath, "pnpm-workspace.yaml"))) {
		const pkgCount = readdirSync(repoPath, { withFileTypes: true })
			.filter((d) => d.isDirectory() && (d.name === "packages" || d.name === "apps"))
			.reduce((acc) => {
				try {
					return (
						acc +
						readdirSync(join(repoPath, "packages"), { withFileTypes: true }).filter((d) => d.isDirectory())
							.length +
						readdirSync(join(repoPath, "apps"), { withFileTypes: true }).filter((d) => d.isDirectory())
							.length
					);
				} catch {
					return acc;
				}
			}, 0);
		checks.push(`✓ pnpm workspace monorepo${pkgCount > 0 ? ` (${pkgCount} packages)` : ""}`);
	} else if (existsSync(join(repoPath, "yarn.lock"))) {
		checks.push("✓ Yarn workspace detected");
	} else if (existsSync(join(repoPath, "package.json"))) {
		checks.push("✓ Node.js project detected");
	}

	// Framework detection
	if (existsSync(join(repoPath, "turbo.json"))) {
		checks.push("✓ Turborepo build system");
	} else if (existsSync(join(repoPath, "nx.json"))) {
		checks.push("✓ Nx workspace");
	}

	if (existsSync(join(repoPath, "next.config.js")) || existsSync(join(repoPath, "next.config.ts"))) {
		checks.push("✓ Next.js application");
	}

	// AI tool detection  -  use statSync to confirm directory (not just existence)
	const aiTools: string[] = [];
	const aiDirCandidates: Array<{ path: string; name: string }> = [
		{ path: join(repoPath, ".cursor"), name: "Cursor" },
		{ path: join(repoPath, ".github", "copilot"), name: "GitHub Copilot" },
		{ path: join(repoPath, ".claude"), name: "Claude Code" },
		{ path: join(repoPath, ".windsurf"), name: "Windsurf" },
	];
	for (const { path, name } of aiDirCandidates) {
		try {
			if (existsSync(path) && statSync(path).isDirectory()) {
				aiTools.push(name);
			}
		} catch {
			/* non-critical */
		}
	}
	if (aiTools.length > 0) {
		checks.push(`✓ AI tools detected: ${aiTools.join(", ")}`);
	}

	// Commit count (rough indicator of repo maturity)
	try {
		const count = execSync("git rev-list --count HEAD", {
			cwd: repoPath,
			encoding: "utf-8",
			timeout: 3000,
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();
		if (count) {
			checks.push(`✓ ${count} commits in history`);
		}
	} catch {
		/* non-critical */
	}

	return checks.slice(0, 5); // Show at most 5 checks
}

export function Detection({ repoPath = process.cwd(), onReady }: DetectionProps) {
	const [checks, setChecks] = useState<string[]>([]);

	// Trigger scanning on ENTER
	useInput((_input, key) => {
		if (key.return) {
			onReady();
		}
	});

	useEffect(() => {
		const detected = detectRepoInfo(repoPath);
		detected.forEach((check, index) => {
			setTimeout(
				() => {
					setChecks((prev) => [...prev, check]);
				},
				(index + 1) * 200,
			);
		});
	}, [repoPath]);

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Box marginTop={1} flexDirection="column">
				<Text>Detecting repository...</Text>
				<Box marginTop={1} flexDirection="column" minHeight={4}>
					{checks.map((msg, i) => (
						<Text key={i} color={msg.startsWith("⚠") ? "yellow" : undefined}>
							{msg.startsWith("⚠") ? (
								msg
							) : (
								<>
									<Text color={BRAND_COLORS.primary}>✓</Text>
									{msg.slice(1)}
								</>
							)}
						</Text>
					))}
				</Box>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Analyzing behavioral patterns - no code will be read.</Text>
			</Box>
			<Box marginTop={1}>
				<Text color={BRAND_COLORS.primary}>Press [ENTER] to scan your repository →</Text>
			</Box>
		</Box>
	);
}
