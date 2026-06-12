// Environment loader MUST be first import - loads .env.local before other modules
import "./load-env.js";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Sentry must be initialized before any other code runs
import { createSentryConfig, Sentry } from "@vreko/sentry-privacy";

Sentry.init(
	createSentryConfig({
		dsn: process.env.SENTRY_DSN_CLI || process.env.SENTRY_DSN || "",
		surface: "cli",
	}),
);

import { execFileSync } from "node:child_process";
import chalk from "chalk";
import { Command, Option } from "commander";

// =============================================================================
// VERSION  -  inlined at build time by tsup (no filesystem read at startup)
// =============================================================================

declare const __CLI_VERSION__: string;

// Global state for CLI options  -  lives in cli-state.ts to avoid circular imports
import { cliState } from "./cli-state.js";
export { cliState };

// =============================================================================
// COMMANDS
// =============================================================================

import {
	// ACP Server
	acpCommand,
	// Polish commands (Phase 6)
	createAliasCommand,
	// Workspace analysis (daemon-first bootstrap)
	createAnalyzeCommand,
	// Check command (pre-commit risk check)
	createCheckCommand,
	// Claude Code integration
	createClaudeSyncCommand,
	// Shell completions
	createCompletionCommand,
	createConfigCommand,
	// Learning consolidation
	createConsolidateCommand,
	// Intelligence (CLI-UX-005)
	createContextCommand,
	// Diagnostics
	createDiagnosticsCommand,
	createDoctorCommand,
	createFixCommand,
	// Hooks  -  AI tool integration hooks (AMBIENT-06)
	createHooksCommand,
	// Workspace management
	createInitCommand,
	// Interactive wizard
	createInteractiveCommand,
	// Learning
	createLearnCommand,
	// Auth
	createLoginCommand,
	createLogoutCommand,
	// Momentum scoring
	createMetricsCommand,
	createOnboardCommand,
	createPatternsCommand,
	// Projections  -  ambient intelligence pointer injection (AMBIENT-04)
	createProjectionsCommand,
	// Protection
	createProtectCommand,
	// Pulse  -  mid-session intelligence snapshot (AMBIENT-02)
	createPulseCommand,
	createPurgeCommand,
	createRefreshCommand,
	// Risk analysis
	createRiskAnalyzeCommand,
	createSessionCommand,
	createSetKeyCommand,
	createSnapshotCommand,
	createStatsCommand,
	createStatusCommand,
	createSyncCommand,
	// MCP
	createToolsCommand,
	createUndoCommand,
	createUpgradeCommand,
	createValidateCommand,
	createVrStartCommand,
	createVrStopCommand,
	createWatchCommand,
	createWhoamiCommand,
	createWorkspacesCommand,
	// MCP Server
	mcpCommand,
	// Baseline
	registerBaselineCommands,
	// Intel  -  agent harness intelligence commands (Phase 3)
	registerIntelCommand,
	// Service
	registerServiceCommands,
} from "./commands";
// Backward-compat alias stub  -  imported directly to avoid brand-term re-export
import { registerDaemonCommands } from "./commands/daemon";
import { isServiceHealthy } from "./service-adapter/local-service-adapter.js";
import { captureEvent } from "./services/analytics.js";
import { userState } from "./services/state";
import { isVrekoInitialized } from "./services/vreko-dir";
import { displaySmartError, displayUnknownCommandError } from "./ui/errors";
import { getRenderMode } from "./ui/guards.js";

// Branding (re-exported for postinstall script)
export { displayWelcomeMessage } from "./ui/logo";

// =============================================================================
// CLI FACTORY
// =============================================================================

export async function createCLI() {
	const program = new Command();

	program
		.name("vreko")
		.description("Intelligence-driven development  -  observe, learn, and surface warnings before the next mistake")
		.version(__CLI_VERSION__, "-v, --version", "Display version number")
		.helpOption("-h, --help", "Display help for command")
		.addOption(
			new Option("--verbose", "Enable verbose output")
				.env("VREKO_VERBOSE")
				.default(process.env.VREKO_VERBOSE ?? false), // 90-day compat
		)
		.addOption(new Option("-q, --quiet", "Suppress non-essential output").default(false))
		.addOption(new Option("--no-color", "Disable colored output").env("NO_COLOR").default(false))
		.addOption(
			new Option("--debug", "Enable debug mode with detailed logging")
				.env("VREKO_DEBUG")
				.default(process.env.VREKO_DEBUG ?? false), // 90-day compat
		)
		.addOption(
			new Option("--json", "Output in JSON format for LLM consumption")
				.env("VREKO_JSON")
				.default(process.env.VREKO_JSON ?? false), // 90-day compat
		)
		.addOption(
			new Option("--plain", "Disable TUI; output JSON for scripts and CI (same as VREKO_PLAIN=1)")
				.env("VREKO_PLAIN")
				.default(process.env.VREKO_PLAIN ?? false),
		)
		.addOption(new Option("-y, --yes", "Skip confirmation prompts (for CI/automation)").default(false))
		.hook("preAction", (thisCommand) => {
			const opts = thisCommand.opts();
			cliState.verbose = opts.verbose || false;
			cliState.quiet = opts.quiet || false;
			cliState.debug = opts.debug || false;
			cliState.noColor = opts.color === false;
			cliState.json = opts.json || false;
			cliState.yes = opts.yes || false;
			if (opts.plain) {
				process.env.VREKO_PLAIN = "1";
			}
			cliState.renderMode = getRenderMode();

			// Respect NO_COLOR (https://no-color.org) and FORCE_COLOR (https://force-color.org)
			// FORCE_COLOR overrides NO_COLOR, which overrides auto-detection
			if (process.env.FORCE_COLOR) {
				chalk.level = (Number(process.env.FORCE_COLOR) as 0 | 1 | 2 | 3) || 1;
			} else if (cliState.noColor || cliState.json) {
				chalk.level = 0;
			}

			// Debug mode implies verbose
			if (cliState.debug) {
				cliState.verbose = true;
			}
		})
		.addHelpText(
			"after",
			`
Workflows:
  First time setup:  vreko init → vreko analyze → vreko sync → vreko metrics
  Daily protection:  vreko status → vreko check → vreko snapshot -m "before work"
  After AI session:  vreko validate --all → vreko learn → vreko patterns
  Debug/restore:     vreko doctor → vreko undo → vreko snapshot --list

Agent Workflows (--json flag enables structured output on all commands):
  Assess workspace:  vreko status --json && vreko metrics --json
  Before editing:    vreko context "<task>" --json
  Validate changes:  vreko validate --all --json
  Score a file:      vreko metrics <path> --json
  Run diagnostics:   vreko doctor --json

Common Examples:
  $ vreko init                Initialize Vreko in current directory (or: vr init)
  $ vreko status              Show workspace health and status (or: vr status)
  $ vreko check               Check staged files for risky changes (or: vr check)
  $ vreko snapshot -m "backup"  Create a named snapshot (or: vr snapshot)
  $ vreko sync && vreko metrics  Collect signals then show critical (or: vr sync)
  $ vreko doctor              Run diagnostic checks (or: vr doctor)

Environment Variables:
  VREKO_VERBOSE    Enable verbose output (same as --verbose)
  VREKO_DEBUG      Enable debug mode (same as --debug)
  VREKO_JSON       Output in JSON format for LLM consumption (same as --json)
  VREKO_PLAIN      Disable TUI, output JSON for scripts/CI (same as --plain)
  VREKO_API_URL    Override API endpoint (default: https://api.vreko.dev)
  NO_COLOR            Disable colored output (https://no-color.org)
  FORCE_COLOR         Force colored output even when piped (https://force-color.org)

Configuration:
  Global config:    ~/.vreko/config.json
  Workspace config: .vreko/config.json

Documentation:
  https://docs.vreko.dev
  https://github.com/vreko-dev/vreko-cli
  https://vreko.dev/llms.txt  (machine-readable docs for LLM agents)
`,
		)
		.enablePositionalOptions()
		.passThroughOptions()
		.configureHelp({
			helpWidth: 80,
			sortSubcommands: true,
			sortOptions: true,
		})
		.showSuggestionAfterError()
		.showHelpAfterError("(run vreko --help for available commands)");

	// =========================================================================
	// AUTH COMMANDS
	// =========================================================================

	program.addCommand(createLoginCommand(), { hidden: true });
	program.addCommand(createLogoutCommand(), { hidden: true });
	program.addCommand(createSetKeyCommand(), { hidden: true });
	program.addCommand(createWhoamiCommand(), { hidden: true });
	program.addCommand(createWorkspacesCommand(), { hidden: true });

	// =========================================================================
	// WORKSPACE MANAGEMENT COMMANDS
	// =========================================================================

	program.addCommand(createInitCommand());
	program.addCommand(createPurgeCommand(), { hidden: true });
	program.addCommand(createOnboardCommand(), { hidden: true });
	program.addCommand(createClaudeSyncCommand(), { hidden: true });
	program.addCommand(createAnalyzeCommand(), { hidden: true });
	program.addCommand(createStatusCommand());
	program.addCommand(createFixCommand(), { hidden: true });

	// =========================================================================
	// MCP / ACP COMMANDS
	// =========================================================================

	program.addCommand(createToolsCommand(), { hidden: true });
	program.addCommand(mcpCommand, { hidden: true });
	program.addCommand(acpCommand, { hidden: true });

	// =========================================================================
	// PROTECTION COMMANDS
	// =========================================================================

	program.addCommand(createProtectCommand(), { hidden: true });
	program.addCommand(createSessionCommand());
	program.addCommand(createSnapshotCommand());

	// =========================================================================
	// INTELLIGENCE COMMANDS
	// =========================================================================

	program.addCommand(createContextCommand(), { hidden: true });
	program.addCommand(createValidateCommand(), { hidden: true });
	program.addCommand(createStatsCommand(), { hidden: true });
	program.addCommand(createPulseCommand(), { hidden: true });
	program.addCommand(createProjectionsCommand(), { hidden: true });
	program.addCommand(createHooksCommand(), { hidden: true });

	// Intel  -  agent harness intelligence snapshot (Phase 3)
	registerIntelCommand(program);

	// =========================================================================
	// MOMENTUM SCORING COMMANDS
	// =========================================================================

	program.addCommand(createSyncCommand(), { hidden: true });
	program.addCommand(createMetricsCommand(), { hidden: true });
	program.addCommand(createRefreshCommand(), { hidden: true });

	// =========================================================================
	// LEARNING COMMANDS
	// =========================================================================

	program.addCommand(createLearnCommand(), { hidden: true });
	program.addCommand(createPatternsCommand(), { hidden: true });
	program.addCommand(createConsolidateCommand(), { hidden: true });

	// =========================================================================
	// FILE ANALYSIS COMMANDS
	// =========================================================================

	program.addCommand(createCheckCommand(), { hidden: true });
	program.addCommand(createRiskAnalyzeCommand(), { hidden: true });
	program.addCommand(createWatchCommand(), { hidden: true });

	// =========================================================================
	// TOP-LEVEL LIFECYCLE COMMANDS
	// =========================================================================

	program.addCommand(createVrStartCommand());
	program.addCommand(createVrStopCommand());

	// =========================================================================
	// INTERACTIVE / GUIDED COMMANDS
	// =========================================================================

	program.addCommand(createInteractiveCommand(), { hidden: true });

	// =========================================================================
	// POLISH COMMANDS (Phase 6)
	// =========================================================================

	program.addCommand(createConfigCommand(), { hidden: true });
	program.addCommand(createDoctorCommand(), { hidden: true });
	program.addCommand(createDiagnosticsCommand(), { hidden: true });
	program.addCommand(createUpgradeCommand(), { hidden: true });
	program.addCommand(createUndoCommand(), { hidden: true });
	program.addCommand(createAliasCommand(), { hidden: true });
	program.addCommand(createCompletionCommand(), { hidden: true });

	// =========================================================================
	// DAEMON COMMANDS
	// =========================================================================

	registerDaemonCommands(program);

	// =========================================================================
	// SERVICE COMMANDS
	// =========================================================================

	registerServiceCommands(program);

	// =========================================================================
	// BASELINE COMMANDS (Phase 5)
	// =========================================================================

	registerBaselineCommands(program);

	// =========================================================================
	// UNKNOWN COMMAND HANDLER (Smart Error Suggestions)
	// =========================================================================

	program.on("command:*", (unknownCommand: string[]) => {
		const cmd = unknownCommand[0];
		displayUnknownCommandError(cmd);
		Sentry.captureException(new Error(`Unknown command: ${String(cmd).slice(0, 200)}`));
		void captureEvent("cli.unknown_command", { command: String(cmd).slice(0, 200) });
		process.exit(1);
	});

	return program;
}

// =============================================================================
// SMART ROUTER  -  Intelligent no-args behavior
// =============================================================================

/**
 * Smart router for `vreko` with no arguments.
 * Routes based on CLI state:
 * - Daemon not running → start it, then dashboard
 * - Not initialized → vr init flow, then dashboard
 * - Not logged in → show dashboard anyway, [l] login prominent
 * - Initialized + daemon running → dashboard
 *
 * @returns true if handled (caller should exit), false to continue normal parsing
 */
async function smartRouter(): Promise<boolean> {
	// Only trigger for `vreko` with no args (node, vreko = 2 args)
	if (process.argv.length > 2) {
		return false;
	}

	const cwd = process.cwd();

	try {
		const isFirstRun = userState.isFirstRun();
		const initialized = await isVrekoInitialized(cwd);

		// Spawn sub-commands via the currently-running CLI binary, not a
		// globally-installed "vreko" shim which may resolve paths incorrectly.
		const runSelf = (args: string[]) =>
			execFileSync(process.execPath, [process.argv[1], ...args], { stdio: "inherit" });

		// Check if service is running, start it if not
		if (!(await isServiceHealthy())) {
			process.stdout.write(`${chalk.gray("Starting service...")}\n`);
			runSelf(["service", "start"]);
		}

		if (isFirstRun) {
			// First run: launch init for setup
			runSelf(["init"]);
			// After init, show dashboard
		}

		if (!initialized) {
			// Not initialized: run init flow
			runSelf(["init"]);
		}

		// Show TUI dashboard (new multi-panel TUI  -  Phase 21)
		const { launchTui } = await import("./ui/tui/index.js");
		await launchTui("dashboard");
		return true;
	} catch {
		// On any error, fall through to normal CLI behavior
		return false;
	}
}

// =============================================================================
// DEPRECATION CHECK
// =============================================================================

/**
 * Check if invoked via deprecated 'snap' binary and print warning
 */
function checkDeprecatedBinary(): void {
	// "snap" binary is deprecated; this hook is kept as a detection point
	// for when a deprecation warning is re-added.
}

// =============================================================================
// VERSION MISMATCH CHECK
// =============================================================================

/**
 * Check if running global install vs local workspace version
 * Warns user when they might be using outdated global install
 */
function checkVersionMismatch(): void {
	// Version mismatch detection kept as a hook; warning display removed until
	// the UX for this is decided.
}

// =============================================================================
// ENTRYPOINT
// =============================================================================

// Only execute the CLI if this file is run directly.
// Resolve symlinks on both sides  -  process.argv[1] may be a symlink (e.g. a
// globally linked bin), while import.meta.url always reflects the real file.
const _argv1Real = (() => {
	try {
		return realpathSync(process.argv[1]);
	} catch {
		return process.argv[1];
	}
})();
if (_argv1Real === fileURLToPath(import.meta.url)) {
	(async () => {
		try {
			// Check for deprecated binary name before any processing
			checkDeprecatedBinary();
			checkVersionMismatch();

			if (await smartRouter()) {
				process.exit(0);
			}

			const program = await createCLI();
			await program.parseAsync(process.argv);
		} catch (error: unknown) {
			Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
			void captureEvent("cli.unhandled_error", {
				message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
			});
			displaySmartError(error instanceof Error ? error : String(error));
			await Sentry.close(2000);
			process.exit(1);
		} finally {
			await Sentry.close(2000);
		}
	})();
}
