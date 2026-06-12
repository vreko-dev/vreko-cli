/**
 * Alias Command
 *
 * Create custom shortcuts for frequently used commands.
 * Similar to: git alias, gh alias
 *
 * @module commands/alias
 */

import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { Command } from "commander";

// =============================================================================
// TYPES
// =============================================================================

interface AliasConfig {
	aliases: Record<string, AliasDefinition>;
}

interface AliasDefinition {
	command: string;
	description?: string;
	createdAt: string;
}

// =============================================================================
// ALIAS STORAGE
// =============================================================================

function getAliasPath(): string {
	const homeDir = process.env.HOME || process.env.USERPROFILE || "";
	return path.join(homeDir, ".vreko", "aliases.json");
}

function loadAliases(): AliasConfig {
	try {
		const aliasPath = getAliasPath();
		if (fs.existsSync(aliasPath)) {
			return JSON.parse(fs.readFileSync(aliasPath, "utf-8"));
		}
	} catch {
		// Ignore errors
	}
	return { aliases: {} };
}

function saveAliases(config: AliasConfig): void {
	const aliasPath = getAliasPath();
	const dir = path.dirname(aliasPath);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(aliasPath, JSON.stringify(config, null, 2));
}

// =============================================================================
// ALIAS OPERATIONS
// =============================================================================

/**
 * Set an alias
 */
function setAlias(name: string, command: string, description?: string): void {
	const config = loadAliases();

	// Validate alias name
	if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
		console.log(
			chalk.red(
				"Invalid alias name. Must start with a letter and contain only letters, numbers, hyphens, and underscores.",
			),
		);
		return;
	}

	// Check for reserved names
	const reserved = ["login", "logout", "init", "status", "doctor", "help", "alias"];
	if (reserved.includes(name)) {
		console.log(chalk.red(`Cannot use "${name}" as an alias - it's a reserved command name.`));
		return;
	}

	const isUpdate = name in config.aliases;

	config.aliases[name] = {
		command,
		description,
		createdAt: new Date().toISOString(),
	};

	saveAliases(config);

	if (isUpdate) {
		console.log(chalk.yellow(`Updated alias "${name}"`));
	} else {
		console.log(chalk.green(`Created alias "${name}"`));
	}

	console.log(chalk.gray(`  vr ${name} → vr ${command}`));
}

/**
 * Delete an alias
 */
function deleteAlias(name: string): void {
	const config = loadAliases();

	if (!(name in config.aliases)) {
		console.log(chalk.yellow(`Alias "${name}" not found`));
		return;
	}

	delete config.aliases[name];
	saveAliases(config);

	console.log(chalk.green(`Deleted alias "${name}"`));
}

/**
 * List all aliases
 */
function listAliases(): void {
	const config = loadAliases();
	const aliases = Object.entries(config.aliases);

	if (aliases.length === 0) {
		console.log(chalk.yellow("No aliases configured"));
		console.log(chalk.gray("\nCreate one with: vr alias set <name> <command>"));
		return;
	}

	console.log(chalk.cyan.bold("\nConfigured Aliases:\n"));

	for (const [name, def] of aliases) {
		console.log(`${chalk.cyan(name)} → ${chalk.white(def.command)}`);
		if (def.description) {
			console.log(chalk.gray(`  ${def.description}`));
		}
	}

	console.log();
}

/**
 * Expand an alias if it exists
 */
export function expandAlias(args: string[]): string[] {
	if (args.length === 0) {
		return args;
	}

	const config = loadAliases();
	const alias = config.aliases[args[0]];

	if (!alias) {
		return args;
	}

	// Parse the alias command and append any additional args
	const aliasArgs = alias.command.split(/\s+/);
	return [...aliasArgs, ...args.slice(1)];
}

// =============================================================================
// BUILT-IN ALIASES (suggestions)
// =============================================================================

const SUGGESTED_ALIASES = [
	{ name: "st", command: "status", description: "Quick status check" },
	{ name: "ss", command: "snapshot", description: "Create snapshot" },
	{ name: "sl", command: "list", description: "List snapshots" },
	{ name: "ctx", command: "context", description: "Get context for task" },
	{ name: "val", command: "validate", description: "Validate code" },
	{ name: "dr", command: "doctor", description: "Run diagnostics" },
];

function showSuggestions(): void {
	console.log(chalk.cyan.bold("\n💡 Suggested Aliases:\n"));

	const lines: string[] = [];
	for (const { name, command, description } of SUGGESTED_ALIASES) {
		lines.push(`vr alias set ${name} "${command}"`);
		lines.push(chalk.gray(`  # ${description}`));
	}

	console.log(lines.join("\n"));
}

// =============================================================================
// COMMAND EXPORT
// =============================================================================

export function createAliasCommand(): Command {
	const cmd = new Command("alias").description("Create shortcuts for common commands");

	// vr alias list
	cmd.command("list")
		.description("List all configured aliases")
		.action(() => {
			listAliases();
		});

	// vr alias set <name> <command>
	cmd.command("set <name> <command>")
		.description("Create or update an alias")
		.option("-d, --description <desc>", "Add a description")
		.action((name, command, options) => {
			setAlias(name, command, options.description);
		});

	// vr alias delete <name>
	cmd.command("delete <name>")
		.description("Delete an alias")
		.action((name) => {
			deleteAlias(name);
		});

	// vr alias suggest
	cmd.command("suggest")
		.description("Show suggested aliases")
		.action(() => {
			showSuggestions();
		});

	// Default action: list aliases
	cmd.action(() => {
		listAliases();
	});

	return cmd;
}
