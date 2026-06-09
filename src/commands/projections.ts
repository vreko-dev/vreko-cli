/**
 * Projections Command
 *
 * Implements `vreko projections docs {enable|disable|preview|status}`.
 *
 * Purpose: Consent-gated pointer injection into AI tool config files. A single
 * pointer line per file tells agents to read `.vreko/docs/INTELLIGENCE.md`
 * for workspace intelligence from the DocsEmitter.
 *
 * Architecture note: PointerService lives in apps/local-service (service). The
 * CLI implements the same pointer logic inline because:
 * - File system manipulation is simple enough not to require IPC.
 * - The architecture fence prohibits apps/cli from importing apps/local-service.
 * - Pointer operations are workspace-local and safe to run without service.
 *
 * Spec: .vreko-swarm/specs/ext_ambient/01-orchestration-item-6-pointer-amendment.md Phase 2
 *
 * @module commands/projections
 */

import { existsSync } from "node:fs";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as clack from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { print } from "../utils/print.js";

// =============================================================================
// Constants (must stay in sync with apps/local-service/src/services/pointer-service.ts)
// =============================================================================

/** Sentinel line used for detection only. Immediately precedes the pointer line. */
const POINTER_SENTINEL = "<!-- vreko-pointer -->";

/**
 * Pointer line formats per tool (from spec 01 §Phase 2 table).
 * Copy-exact  -  do not paraphrase.
 */
const POINTER_LINES: Record<string, string> = {
	claude: "@.vreko/docs/INTELLIGENCE.md",
	cursor: "See: .vreko/docs/INTELLIGENCE.md",
	copilot: "Read: .vreko/docs/INTELLIGENCE.md",
	universal: "See: .vreko/docs/INTELLIGENCE.md",
	windsurf: "See: .vreko/docs/INTELLIGENCE.md",
};

/**
 * Candidate files per tool, in priority order.
 * First existing file wins for each tool slot.
 */
const TOOL_CANDIDATES: Array<{ tool: string; candidates: string[] }> = [
	{ tool: "claude", candidates: ["CLAUDE.md", ".claude/CLAUDE.md"] },
	{ tool: "cursor", candidates: [".cursor/rules/vreko.mdc", ".cursorrules"] },
	{ tool: "copilot", candidates: [".github/copilot-instructions.md"] },
	{ tool: "universal", candidates: ["AGENTS.md"] },
	{ tool: "windsurf", candidates: [".windsurfrules", ".windsurf/rules/vreko.md"] },
];

// =============================================================================
// Types
// =============================================================================

interface DetectedTarget {
	file: string;
	relFile: string;
	tool: string;
	pointerLine: string;
	alreadyPresent: boolean;
	optedOut: boolean;
}

interface DocsProjectionConfig {
	enabled?: boolean;
	approvedFiles?: string[];
	optedOutFiles?: string[];
	enabledAt?: string;
}

interface VrekoConfig {
	projections?: {
		docs?: DocsProjectionConfig;
	};
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Walk up from `startDir` to find the workspace root (.vreko directory
 * or .git root). Falls back to `startDir` if nothing found.
 */
function findWorkspaceRoot(startDir: string): string {
	let dir = startDir;
	const root = "/";
	while (dir !== root) {
		if (existsSync(join(dir, ".vreko")) || existsSync(join(dir, ".git"))) {
			return dir;
		}
		dir = join(dir, "..");
	}
	return startDir;
}

/** Return true if the file at `abs` exists. */
async function fileExists(abs: string): Promise<boolean> {
	try {
		await access(abs);
		return true;
	} catch {
		return false;
	}
}

/** Read `.vreko/config.json`. Returns empty object on any failure. */
async function readConfig(workspaceRoot: string): Promise<VrekoConfig> {
	const configPath = join(workspaceRoot, ".vreko", "config.json");
	try {
		const raw = await readFile(configPath, "utf8");
		return JSON.parse(raw) as VrekoConfig;
	} catch {
		return {};
	}
}

/** Atomically write `.vreko/config.json`. */
async function writeConfig(workspaceRoot: string, config: VrekoConfig): Promise<void> {
	const configPath = join(workspaceRoot, ".vreko", "config.json");
	const tmpPath = `${configPath}.vreko-tmp`;
	await writeFile(tmpPath, JSON.stringify(config, null, 2), "utf8");
	await rename(tmpPath, configPath);
}

/** Detect target AI config files in the workspace. */
async function detectTargets(workspaceRoot: string): Promise<DetectedTarget[]> {
	const config = await readConfig(workspaceRoot);
	const optedOutFiles = config.projections?.docs?.optedOutFiles ?? [];

	const targets: DetectedTarget[] = [];

	for (const { tool, candidates } of TOOL_CANDIDATES) {
		for (const candidate of candidates) {
			const abs = join(workspaceRoot, candidate);
			if (await fileExists(abs)) {
				const content = await readFile(abs, "utf8").catch(() => "");
				const alreadyPresent = content.includes(POINTER_SENTINEL);
				const optedOut = optedOutFiles.some((f) => f === candidate || abs.endsWith(f));
				targets.push({
					file: abs,
					relFile: candidate,
					tool,
					pointerLine: POINTER_LINES[tool],
					alreadyPresent,
					optedOut,
				});
				break; // first matching candidate wins for this tool slot
			}
		}
	}

	return targets;
}

/** Inject sentinel + pointer line into file. Idempotent (no double-inject). */
async function injectPointer(filePath: string, pointerLine: string): Promise<void> {
	let content: string;
	try {
		const existing = await readFile(filePath, "utf8");
		if (existing.includes(POINTER_SENTINEL)) {
			return; // Already present  -  idempotent.
		}
		const trimmed = existing.trimEnd();
		content = `${trimmed}\n\n${POINTER_SENTINEL}\n${pointerLine}\n`;
	} catch {
		// File doesn't exist  -  create fresh.
		content = `${POINTER_SENTINEL}\n${pointerLine}\n`;
	}

	const tmpPath = `${filePath}.vreko-tmp`;
	await writeFile(tmpPath, content, "utf8"); // ratchet-ok: MERGE -- injectPointer reads existing file above, appends sentinel
	await rename(tmpPath, filePath);
}

/** Remove sentinel + pointer line from file. Preserves all other content. */
async function removePointer(filePath: string): Promise<void> {
	const raw = await readFile(filePath, "utf8");
	const lines = raw.split("\n");

	const newLines: string[] = [];
	let i = 0;
	while (i < lines.length) {
		if (lines[i] === POINTER_SENTINEL) {
			i += 1; // skip sentinel
			if (i < lines.length) {
				i += 1; // skip pointer line
			}
			continue;
		}
		newLines.push(lines[i]);
		i += 1;
	}

	// Strip trailing blank lines.
	while (newLines.length > 0 && newLines[newLines.length - 1] === "") {
		newLines.pop();
	}

	const cleaned = newLines.join("\n") + (newLines.length > 0 ? "\n" : "");
	const tmpPath = `${filePath}.vreko-tmp`;
	await writeFile(tmpPath, cleaned, "utf8"); // ratchet-ok: MERGE -- removePointer reads existing file above, removes sentinel block
	await rename(tmpPath, filePath);
}

// =============================================================================
// Action implementations
// =============================================================================

async function previewDocs(): Promise<void> {
	const workspaceRoot = findWorkspaceRoot(process.cwd());
	const targets = await detectTargets(workspaceRoot);

	if (targets.length === 0) {
		print("No AI tool config files detected in this workspace.");
		print("Supported files: CLAUDE.md, .cursorrules, .cursor/rules/vreko.mdc,");
		print("  .github/copilot-instructions.md, AGENTS.md, .windsurfrules");
		return;
	}

	print(chalk.bold("Docs projection preview (dry-run  -  no files written):"));
	print();

	for (const target of targets) {
		if (target.optedOut) {
			print(`  ${chalk.gray("○")} ${target.relFile}  -  ${chalk.gray("user-opted-out (skipped)")}`);
		} else if (target.alreadyPresent) {
			print(`  ${chalk.green("✓")} ${target.relFile}  -  pointer already present`);
		} else {
			print(`  ${chalk.cyan("+")} Would add to ${target.relFile}: ${chalk.dim(target.pointerLine)}`);
		}
	}

	print();
	print(`Run ${chalk.bold("vreko projections docs enable")} to inject pointer lines.`);
}

async function enableDocs(options: { force?: boolean }): Promise<void> {
	const workspaceRoot = findWorkspaceRoot(process.cwd());
	const targets = await detectTargets(workspaceRoot);

	if (targets.length === 0) {
		print("No AI tool config files detected in this workspace.");
		return;
	}

	// Filter to files that need injection.
	const eligible = targets.filter((t) => {
		if (t.alreadyPresent) {
			return false;
		}
		if (t.optedOut && !options.force) {
			return false;
		}
		return true;
	});

	const alreadyDone = targets.filter((t) => t.alreadyPresent);

	if (alreadyDone.length > 0) {
		print(chalk.gray(`Already configured: ${alreadyDone.map((t) => t.relFile).join(", ")}`));
	}

	if (eligible.length === 0) {
		print("All detected config files already have pointer injection or are opted out.");
		print(`Use ${chalk.bold("--force")} to re-enable opted-out files.`);
		return;
	}

	print(chalk.bold("Vreko will add a pointer line to the following files:"));
	print();
	for (const t of eligible) {
		print(`  ${t.relFile}: ${chalk.dim(t.pointerLine)}`);
	}
	print();

	// Clack multiselect consent.
	clack.intro("Vreko Docs Projection");

	const choices = eligible.map((t) => ({
		value: t.file,
		label: t.relFile,
		hint: t.pointerLine,
	}));

	const selected = await clack.multiselect<string>({
		message: "Select files to inject pointer lines into:",
		options: choices,
		required: false,
	});

	if (clack.isCancel(selected)) {
		clack.cancel("Cancelled. No changes made.");
		return;
	}

	const selectedPaths = selected as string[];
	if (selectedPaths.length === 0) {
		clack.cancel("No files selected. No changes made.");
		return;
	}

	// Inject into selected files and update approvedFiles in config.
	const config = await readConfig(workspaceRoot);
	config.projections = config.projections ?? {};
	config.projections.docs = config.projections.docs ?? {};
	config.projections.docs.enabled = true;
	config.projections.docs.enabledAt = new Date().toISOString();
	config.projections.docs.approvedFiles = config.projections.docs.approvedFiles ?? [];
	config.projections.docs.optedOutFiles = config.projections.docs.optedOutFiles ?? [];

	let injected = 0;
	for (const filePath of selectedPaths) {
		const target = eligible.find((t) => t.file === filePath);
		if (!target) {
			continue;
		}
		await injectPointer(filePath, target.pointerLine);
		if (!config.projections.docs.approvedFiles.includes(filePath)) {
			config.projections.docs.approvedFiles.push(filePath);
		}
		// Remove from opted-out if previously opted out.
		config.projections.docs.optedOutFiles = config.projections.docs.optedOutFiles.filter(
			(f) => f !== filePath && !filePath.endsWith(f),
		);
		injected++;
	}

	await writeConfig(workspaceRoot, config);

	clack.outro(injected === 1 ? "Added pointer to 1 file." : `Added pointer to ${injected} files.`);
}

async function disableDocs(): Promise<void> {
	const workspaceRoot = findWorkspaceRoot(process.cwd());
	const targets = await detectTargets(workspaceRoot);

	// Filter to files with pointer present.
	const active = targets.filter((t) => t.alreadyPresent);

	if (active.length === 0) {
		print("No active pointer injections found. Nothing to disable.");
		return;
	}

	// Remove pointer from each active file.
	for (const target of active) {
		await removePointer(target.file);
	}

	// Update config: mark disabled, add to optedOutFiles.
	const config = await readConfig(workspaceRoot);
	config.projections = config.projections ?? {};
	config.projections.docs = config.projections.docs ?? {};
	config.projections.docs.enabled = false;
	config.projections.docs.optedOutFiles = config.projections.docs.optedOutFiles ?? [];
	config.projections.docs.approvedFiles = config.projections.docs.approvedFiles ?? [];

	for (const target of active) {
		if (!config.projections.docs.optedOutFiles.includes(target.file)) {
			config.projections.docs.optedOutFiles.push(target.file);
		}
		config.projections.docs.approvedFiles = config.projections.docs.approvedFiles.filter((f) => f !== target.file);
	}

	await writeConfig(workspaceRoot, config);

	const count = active.length;
	print(
		count === 1
			? chalk.green("Removed pointer from 1 file. Docs projection disabled.")
			: chalk.green(`Removed pointer from ${count} files. Docs projection disabled.`),
	);
}

async function statusDocs(): Promise<void> {
	const workspaceRoot = findWorkspaceRoot(process.cwd());
	const targets = await detectTargets(workspaceRoot);

	print(chalk.bold("Docs projection status:"));
	print();

	if (targets.length === 0) {
		print(`  ${chalk.gray("○")} (no AI tool config files detected in this workspace)`);
	}

	for (const target of targets) {
		let icon: string;
		let label: string;

		if (target.alreadyPresent) {
			icon = chalk.green("●");
			label = chalk.green("active");
		} else if (target.optedOut) {
			icon = chalk.gray("○");
			label = chalk.gray("user-opted-out");
		} else {
			icon = chalk.yellow("○");
			label = chalk.yellow("available");
		}

		print(`  ${icon} ${target.relFile.padEnd(40)} ${label}`);
	}

	print();

	const activeCount = targets.filter((t) => t.alreadyPresent).length;
	const config = await readConfig(workspaceRoot);
	const enabled = config.projections?.docs?.enabled === true;

	if (activeCount > 0) {
		print(`  Projection enabled: ${chalk.green("yes")}`);
	} else {
		print(`  Projection enabled: ${enabled ? chalk.green("yes") : chalk.gray("no")} (no active pointers)`);
	}

	if (activeCount === 0 && targets.length > 0) {
		print();
		print(`  Run ${chalk.bold("vreko projections docs enable")} to add pointer lines.`);
	}
}

// =============================================================================
// Command factory
// =============================================================================

/**
 * Create the `projections` command with `docs` sub-commands.
 *
 * @returns Commander Command instance.
 */
export function createProjectionsCommand(): Command {
	const cmd = new Command("projections");
	cmd.description("Manage Vreko intelligence projections");

	const docs = new Command("docs");
	docs.description("Manage .vreko/docs/ pointer injection into AI tool config files");

	docs.command("enable")
		.description("Enable docs projection for this workspace (inject pointer lines)")
		.option("--force", "Re-enable even if previously opted out")
		.action(async (options: { force?: boolean }) => {
			try {
				await enableDocs(options);
			} catch (err) {
				print(chalk.red(`Error: ${String(err)}`));
				process.exit(1);
			}
		});

	docs.command("disable")
		.description("Disable docs projection and remove pointer lines")
		.action(async () => {
			try {
				await disableDocs();
			} catch (err) {
				print(chalk.red(`Error: ${String(err)}`));
				process.exit(1);
			}
		});

	docs.command("preview")
		.description("Preview what would be written without making changes (dry-run)")
		.action(async () => {
			try {
				await previewDocs();
			} catch (err) {
				print(chalk.red(`Error: ${String(err)}`));
				process.exit(1);
			}
		});

	docs.command("status")
		.description("Show current projection state per detected config file")
		.action(async () => {
			try {
				await statusDocs();
			} catch (err) {
				print(chalk.red(`Error: ${String(err)}`));
				process.exit(1);
			}
		});

	cmd.addCommand(docs);
	return cmd;
}
