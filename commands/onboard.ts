/**
 * Onboard Command
 *
 * New-user onboarding wizard. After vr init, closes three production gaps:
 * 1. Auth token check - warns if no API key is present (sync silently skips without one).
 * 2. MCP client detection + link - configures detected AI clients via stdio transport.
 * 3. --skip-mcp flag - lets users bypass MCP link step.
 *
 * Auth token resolution order matches local-service sync.ts:
 *   VREKO_SERVICE_TOKEN -> VREKO_API_KEY -> ~/.vreko/auth.json
 *
 * Spec: .vreko-swarm/specs/onboarding-selfheal-wiring.md Phase 3
 * @module commands/onboard
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { formatLinkResult, linkMcpClient, scanMcpClients } from "../services/mcp-service.js";

// Auth token resolution  -  mirrors sync.ts resolution order
interface AuthStatus {
	hasToken: boolean;
	source: "env-service" | "env-api" | "auth-file" | "none";
}

function checkAuthToken(): AuthStatus {
	if (process.env.VREKO_SERVICE_TOKEN) return { hasToken: true, source: "env-service" };
	if (process.env.VREKO_API_KEY) return { hasToken: true, source: "env-api" };
	try {
		const authPath = join(homedir(), ".vreko", "auth.json");
		if (existsSync(authPath)) {
			const auth = JSON.parse(readFileSync(authPath, "utf-8")) as { token?: string };
			if (auth.token) return { hasToken: true, source: "auth-file" };
		}
	} catch {
		// auth.json absent or unreadable - no token found
	}
	return { hasToken: false, source: "none" };
}

export function createOnboardCommand(): Command {
	return new Command("onboard")
		.description("New-user onboarding wizard -- runs vr init then configures AI tools")
		.option("--dry-run", "Show what would happen without writing any files")
		.option("--skip-mcp", "Skip MCP client detection and link step")
		.option("--apply-all", "Link all detected AI clients without prompting")
		.option("-q, --quiet", "Suppress informational output")
		.action(async (options: { dryRun?: boolean; skipMcp?: boolean; applyAll?: boolean; quiet?: boolean }) => {
			const dryRun = !!options.dryRun;
			const skipMcp = !!options.skipMcp;
			const applyAll = !!options.applyAll;
			const quiet = !!options.quiet;

			if (!quiet) console.log(chalk.bold("\nVreko Onboarding\n"));

			// Step 1: Core init (workspace, daemon, git hooks, Claude integration)
			try {
				const { createInitCommand } = await import("./init/init-command.js");
				const initCmd = createInitCommand();
				const argv: string[] = ["node", "init"];
				if (dryRun) argv.push("--dry-run");
				// Always skip MCP in init  -  onboard handles MCP detection below
				argv.push("--skip-mcp");
				await initCmd.parseAsync(argv, { from: "node" });
			} catch (err) {
				console.error(chalk.red("Init step failed:", err instanceof Error ? err.message : String(err)));
				process.exit(1);
			}

			// Step 2: Auth token check
			// Sync silently skips every POST when no auth token is present.
			const authStatus = checkAuthToken();
			if (!authStatus.hasToken) {
				console.warn(
					chalk.yellow(
						"\nWarning: Sync is configured but no API key was found.\n" +
							"  Workspace metadata will not sync to the intelligence platform.\n" +
							"  Run `vr login` or set VREKO_API_KEY.\n",
					),
				);
			} else if (!quiet) {
				console.log(chalk.green(`Auth token found (${authStatus.source})`));
			}

			// Step 3: MCP client detection and link
			if (skipMcp) {
				if (!quiet) console.log(chalk.gray("MCP link step skipped (--skip-mcp)"));
				return;
			}

			let scan: Awaited<ReturnType<typeof scanMcpClients>>;
			try {
				scan = await scanMcpClients();
			} catch (err) {
				console.warn(
					chalk.yellow(
						"MCP client detection failed (non-fatal):",
						err instanceof Error ? err.message : String(err),
					),
				);
				return;
			}

			// If no clients need setup, skip silently (normal in CI/server environments)
			if (scan.needsSetup.length === 0) {
				if (!quiet && scan.detected.length > 0) {
					console.log(chalk.green("All detected AI clients are already configured."));
				}
				return;
			}

			if (!quiet) {
				console.log(chalk.bold("\nDetected AI clients needing Vreko MCP configuration:"));
				for (const client of scan.needsSetup) console.log(`  ${chalk.cyan(client.displayName)}`);
				console.log("");
			}

			if (dryRun) {
				for (const client of scan.needsSetup) {
					console.log(chalk.gray(`would link: ${client.displayName}`));
				}
				return;
			}

			// Determine which clients to link
			let clientsToLink = scan.needsSetup;
			if (!applyAll && process.stdin.isTTY) {
				const { createInterface } = await import("node:readline");
				const rl = createInterface({ input: process.stdin, output: process.stdout });
				const confirmed: typeof scan.needsSetup = [];
				for (const client of scan.needsSetup) {
					await new Promise<void>((resolve) => {
						rl.question(
							chalk.cyan(`  Link Vreko MCP to ${client.displayName}? [Y/n] `),
							(answer: string) => {
								const t = answer.trim().toLowerCase();
								if (t === "" || t === "y" || t === "yes") confirmed.push(client);
								resolve();
							},
						);
					});
				}
				rl.close();
				clientsToLink = confirmed;
			}

			if (clientsToLink.length === 0) {
				if (!quiet) console.log(chalk.gray("No clients selected for MCP link."));
				return;
			}

			// Link each selected client via stdio transport
			for (const client of clientsToLink) {
				if (!quiet) process.stdout.write(`  Linking ${client.displayName}... `);
				try {
					const result = await linkMcpClient({
						client: client.format,
						localCliPath: process.argv[1],
					});
					if (!quiet) {
						if (result.success) {
							console.log(chalk.green("done"));
							console.log(formatLinkResult(result));
						} else {
							console.log(chalk.red(`failed: ${result.error ?? "unknown error"}`));
						}
					}
				} catch (err) {
					console.warn(
						chalk.yellow(
							"  Link failed for " +
								client.displayName +
								": " +
								(err instanceof Error ? err.message : String(err)),
						),
					);
				}
			}

			if (!quiet) console.log(chalk.bold("\nOnboarding complete."));
		});
}
