/**
 * Learn Command
 *
 * Implements vr learn - Record learnings for future reference.
 * Primary store: service IPC → knowledge.db (same store as MCP vreko_learn)
 * Fallback store: .vreko/learnings/user-learnings.jsonl (service unavailable)
 *
 * Report card v2 fix: CLI and MCP now write to the same learning store
 * by routing through service IPC when available.
 *
 * @see implementation_plan.md Section 1.2
 */

import chalk from "chalk";
import { Command } from "commander";
import { connectToDaemon, isDaemonAvailable } from "../services/service-client";
import {
	generateId,
	getLearnings,
	isVrekoInitialized,
	type LearningEntry,
	recordLearning,
} from "../services/vreko-dir";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the learn command
 */
export function createLearnCommand(): Command {
	const learn = new Command("learn")
		.description("Record learnings for future reference")
		.argument("<trigger>", "When to apply this learning (keyword or situation)")
		.argument("<action>", "What to do when triggered")
		.option("-t, --type <type>", "Learning type: pattern, pitfall, efficiency, discovery, workflow", "pattern")
		.option("-s, --source <source>", "Where this learning came from", "cli")
		.action(async (trigger: string, action: string, options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("🦎 Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				// Validate type
				const validTypes = ["pattern", "pitfall", "efficiency", "discovery", "workflow"];
				if (!validTypes.includes(options.type)) {
					console.log(chalk.red(`Invalid type: ${options.type}`));
					console.log(chalk.gray(`Valid types: ${validTypes.join(", ")}`));
					process.exit(1);
				}

				// Credit estimate: learning capture persists to knowledge base (1 credit when synced).
				console.log(
					chalk.gray(
						"  Credit estimate: ~1 credit (memory_sync). Learning stored locally first, synced on next vr sync.",
					),
				);

				// Create learning entry
				const learning: LearningEntry = {
					id: generateId("L"),
					type: options.type as LearningEntry["type"],
					trigger,
					action,
					source: options.source,
					createdAt: new Date().toISOString(),
				};

				// Report card v2 fix: try service first (writes to knowledge.db = same store as MCP)
				// Fall back to local JSONL if service unavailable
				let storedViaDaemon = false;
				if (await isDaemonAvailable()) {
					try {
						const client = await connectToDaemon();
						await client.learning.add({
							workspace: cwd,
							type: learning.type,
							trigger: learning.trigger,
							action: learning.action,
							source: learning.source ?? "cli",
						});
						storedViaDaemon = true;
					} catch {
						// Daemon write failed  -  fall through to local JSONL
					}
				}

				if (!storedViaDaemon) {
					// Fallback: write to local JSONL (service unavailable or write failed)
					await recordLearning(learning, cwd);
				}
				console.log(chalk.green("✓"), "Learning recorded:", chalk.cyan(trigger), "→", action);
				console.log();
				console.log(`  ${chalk.cyan("Type:")}    ${formatType(learning.type)}`);
				console.log(`  ${chalk.cyan("Trigger:")} ${trigger}`);
				console.log(`  ${chalk.cyan("Action:")}  ${action}`);
				console.log();
				if (!storedViaDaemon) {
					// BUG 4 fix: distinguish "service not running" from "service IPC method failed"
					const daemonRunning = await isDaemonAvailable();
					if (daemonRunning) {
						console.log(
							chalk.yellow(
								"   (Stored locally  -  service IPC error: storage will sync on next session)",
							),
						);
					} else {
						console.log(chalk.gray("   (Stored locally  -  start service for unified storage)"));
						console.log(chalk.gray("   Start with: vr service start --detach"));
					}
					console.log();
				}
				console.log(chalk.gray(`Query with: vr learn list --keyword "${trigger.split(" ")[0]}"`));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	// Add list subcommand
	learn
		.command("list")
		.description("List recorded learnings")
		.option("-t, --type <type>", "Filter by type")
		.option("-k, --keyword <keyword>", "Search by keyword in trigger")
		.option("-n, --number <count>", "Number of learnings to show", "20")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("🦎 Vreko not initialized"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				let learnings = await getLearnings(cwd);

				// Filter by type
				if (options.type) {
					learnings = learnings.filter((l) => l.type === options.type);
				}

				// Filter by keyword
				if (options.keyword) {
					const keyword = options.keyword.toLowerCase();
					learnings = learnings.filter(
						(l) => l.trigger.toLowerCase().includes(keyword) || l.action.toLowerCase().includes(keyword),
					);
				}

				// Limit
				const count = Number.parseInt(options.number, 10);
				const recent = learnings.slice(-count).reverse();

				if (options.json) {
					console.log(JSON.stringify(recent, null, 2));
					return;
				}

				if (recent.length === 0) {
					console.log(chalk.yellow("No learnings found"));
					console.log(chalk.gray('Record with: vr learn "trigger" "action"'));
					return;
				}

				console.log(chalk.cyan(`Learnings (${recent.length}):`));
				console.log();

				for (const learning of recent) {
					console.log(formatType(learning.type), chalk.bold(learning.trigger));
					console.log(`  → ${learning.action}`);
					console.log(chalk.gray(`  ${learning.createdAt} • ${learning.source}`));
					console.log();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	return learn;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format learning type with emoji
 */
function formatType(type: LearningEntry["type"]): string {
	const formats: Record<LearningEntry["type"], string> = {
		pattern: chalk.blue("📋 pattern"),
		pitfall: chalk.red("⚠️  pitfall"),
		efficiency: chalk.green("⚡ efficiency"),
		discovery: chalk.yellow("💡 discovery"),
		workflow: chalk.magenta("🔄 workflow"),
	};

	return formats[type] || type;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { formatType };
