import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { BootProfileType } from "@vreko/contracts/local-service";
import { Command } from "commander";

declare const __CLI_VERSION__: string | undefined;

/**
 * Derive the correct BootProfileType from filesystem state.
 * VIRGIN: no .vreko/config.json  -  first-time init, Detection frame must render.
 * WARM_RETURN: config exists  -  already initialized; InitApp exits via its guard.
 * WARM_RETURN rendering path is deferred (P2-Medium post-launch work).
 */
function deriveInitProfile(pathArg: string | undefined): BootProfileType {
	const workspacePath = resolve(pathArg || process.cwd());
	return existsSync(join(workspacePath, ".vreko", "config.json")) ? "WARM_RETURN" : "VIRGIN";
}

// Export the command maker
export function createInitCommand(): Command {
	return new Command("init")
		.description("Bootstrap Vreko for a repository")
		.argument("[path]", "Workspace path (default: current directory)")
		.option("-y, --yes", "Skip confirmation prompts")
		.option("--non-interactive", "Run without prompts")
		.option("--json", "Output structured JSON summary")
		.option("--force", "Re-initialize even if already set up")
		.option("--dry-run", "Show what would be configured")
		.option("--skip-mcp", "Skip MCP configuration")
		.option("--skip-service", "Skip service registration")
		.option("--api-key <key>", "API key for Pro features")
		.option("--dev", "Use local dev mode for MCP")
		.option("--npm", "Use npm/npx mode for MCP")
		.option("-q, --quiet", "Suppress informational output")
		.option("-v, --verbose", "Show detailed detection reasoning")
		.action(async (pathArg: string | undefined, options) => {
			// Guard: if non-TTY, --json, or --non-interactive, delegate to core init
			// The TUI requires a TTY with raw mode support and crashes without one.
			if (options.json || options.nonInteractive || !process.stdin.isTTY) {
				const { createInitCommand: createCoreInit } = await import("./init-core.js");
				const coreCmd = createCoreInit();
				// Build argv array for commander parsing
				const argv = ["node", "init"];
				if (pathArg) {
					argv.push(pathArg);
				}
				if (options.json) {
					argv.push("--json");
				}
				if (options.nonInteractive) {
					argv.push("--non-interactive");
				}
				if (options.yes) {
					argv.push("--yes");
				}
				if (options.force) {
					argv.push("--force");
				}
				if (options.dryRun) {
					argv.push("--dry-run");
				}
				if (options.skipMcp) {
					argv.push("--skip-mcp");
				}
				if (options.skipService) {
					argv.push("--skip-service");
				}
				if (options.quiet) {
					argv.push("--quiet");
				}
				if (options.verbose) {
					argv.push("--verbose");
				}
				if (options.dev) {
					argv.push("--dev");
				}
				if (options.npm) {
					argv.push("--npm");
				}
				if (options.apiKey) {
					argv.push("--api-key", options.apiKey);
				}
				await coreCmd.parseAsync(argv, { from: "node" });
				return;
			}

			// TTY mode: render the TUI with the correct boot profile.
			const { render } = await import("ink");
			const React = await import("react");
			const { InitApp: App } = await import("../../ui/init/InitApp.js");
			// Always VIRGIN in TUI  -  WARM_RETURN skips scan so profile state stays
			// null and activation never renders. Re-init runs the full flow instead.
			const initProfile = "VIRGIN" as const;
			const { waitUntilExit } = render(React.createElement(App, { pathArg, options, initProfile }));
			await waitUntilExit();
		});
}
