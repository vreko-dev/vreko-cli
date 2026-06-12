import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";

interface WelcomeProps {
	repoPath?: string;
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

	return checks.slice(0, 4); // Show at most 4 checks
}

export function Welcome({ repoPath = process.cwd() }: WelcomeProps) {
	const [checks, setChecks] = useState<string[]>([]);

	useEffect(() => {
		// Detect real repo info synchronously (fast operations)
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
			<Text color="cyan">
				{`  ███╗░░██╗░█████╗░░█████╗░██╗░░██╗░█████╗░
  ████╗░██║██╔══██╗██╔══██╗██║░░██║██╔══██╗
  ██╔██╗██║███████║███████║██████╔╝███████║
  ██║╚████║██╔══██║██╔══██║██╔══██╗██╔══██║
  ██║░╚███║██║░░██║██║░░██║██║░░██║██║░░██║
  ╚═╝░░╚══╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝`}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>Detecting repository...</Text>
				<Box marginTop={1} flexDirection="column" minHeight={4}>
					{checks.map((msg, i) => (
						<Text key={i} color={msg.startsWith("⚠") ? "yellow" : "green"}>
							{msg}
						</Text>
					))}
				</Box>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Analyzing behavioral patterns - no code will be read.</Text>
			</Box>
		</Box>
	);
}
