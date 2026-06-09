/**
 * Hooks Command  -  Manage Vreko integration hooks for AI coding tools.
 *
 * Spec: claude-code-pretooluse-hook-v1 (AMBIENT-06)
 *
 * Usage:
 *   vreko hooks install --tool claude-code
 *   vreko hooks uninstall --tool claude-code
 *   vreko hooks status
 */

import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

// Path to the bundled hook script relative to this source file.
// tsup bundles commands into chunks under dist/ (not dist/commands/), so the
// compiled file's dirname is apps/cli/dist/ and scripts live at apps/cli/scripts/.
// The path is therefore one level up from dist/  -  not two.
const HOOK_SCRIPT_SRC = join(dirname(fileURLToPath(import.meta.url)), "../scripts/hooks/pretooluse-fragile-guard.sh");

const VREKO_HOOK_COMMAND = ".claude/hooks/vreko-fragile-guard.sh";
const VREKO_HOOK_MARKER = "vreko-fragile-guard.sh";

// ---------------------------------------------------------------------------
// Hook entry that gets merged into .claude/settings.json
// ---------------------------------------------------------------------------

const HOOK_ENTRY = {
	matcher: "Edit|Write|MultiEdit",
	hooks: [
		{
			type: "command",
			command: VREKO_HOOK_COMMAND,
		},
	],
};

// Path to the bundled PostToolUse hook script relative to this source file.
// Same dist/ layout reasoning as HOOK_SCRIPT_SRC above.
const POST_HOOK_SCRIPT_SRC = join(
	dirname(fileURLToPath(import.meta.url)),
	"../scripts/hooks/posttooluse-file-notify.sh",
);

const POST_HOOK_COMMAND = ".claude/hooks/vreko-file-notify.sh";
const POST_HOOK_MARKER = "vreko-file-notify.sh";

// PostToolUse hook entry  -  notifies daemon of file changes for fileIndex population
const POST_HOOK_ENTRY = {
	matcher: "Edit|Write|MultiEdit",
	hooks: [
		{
			type: "command",
			command: POST_HOOK_COMMAND,
		},
	],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSettings(settingsPath: string): Record<string, unknown> {
	if (!existsSync(settingsPath)) {
		return {};
	}
	try {
		return JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
	} catch (err) {
		console.error(`[vreko hooks] Failed to parse ${settingsPath}:`, err);
		return {};
	}
}

function writeSettings(settingsPath: string, settings: Record<string, unknown>): void {
	writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

function readVrekoConfig(workspace: string): Record<string, unknown> {
	const configPath = join(workspace, ".vreko", "config.json");
	if (!existsSync(configPath)) {
		return {};
	}
	try {
		return JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
	} catch (err) {
		console.error("[vreko hooks] Failed to parse .vreko/config.json:", err);
		return {};
	}
}

function writeVrekoConfig(workspace: string, config: Record<string, unknown>): void {
	const configDir = join(workspace, ".vreko");
	if (!existsSync(configDir)) {
		mkdirSync(configDir, { recursive: true });
	}
	writeFileSync(join(configDir, "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

function isVrekoHookPresent(preToolUseArray: unknown[]): boolean {
	return preToolUseArray.some((entry) => {
		if (typeof entry !== "object" || entry === null) {
			return false;
		}
		const e = entry as Record<string, unknown>;
		const hooks = e.hooks;
		if (!Array.isArray(hooks)) {
			return false;
		}
		return hooks.some((h) => {
			if (typeof h !== "object" || h === null) {
				return false;
			}
			const hook = h as Record<string, unknown>;
			return typeof hook.command === "string" && hook.command.includes(VREKO_HOOK_MARKER);
		});
	});
}

function isVrekoPostHookPresent(postToolUseArray: unknown[]): boolean {
	return postToolUseArray.some((entry) => {
		if (typeof entry !== "object" || entry === null) {
			return false;
		}
		const e = entry as Record<string, unknown>;
		const hooks = e.hooks;
		if (!Array.isArray(hooks)) {
			return false;
		}
		return hooks.some((h) => {
			if (typeof h !== "object" || h === null) {
				return false;
			}
			const hook = h as Record<string, unknown>;
			return typeof hook.command === "string" && hook.command.includes(POST_HOOK_MARKER);
		});
	});
}

// ---------------------------------------------------------------------------
// Core install / uninstall logic (exported for use in configure-tools.ts)
// ---------------------------------------------------------------------------

function copyHookScripts(cwd: string): { hookDest: string; postHookDest: string } {
	const hooksDir = join(cwd, ".claude", "hooks");
	const hookDest = join(cwd, VREKO_HOOK_COMMAND);
	const postHookDest = join(cwd, POST_HOOK_COMMAND);

	if (!existsSync(HOOK_SCRIPT_SRC)) {
		// Throw instead of process.exit so callers (e.g. init-core's try-catch) can
		// handle gracefully without killing the whole init process.
		throw new Error(`Hook script not found at ${HOOK_SCRIPT_SRC}`);
	}
	if (!existsSync(hooksDir)) {
		mkdirSync(hooksDir, { recursive: true });
	}
	copyFileSync(HOOK_SCRIPT_SRC, hookDest);
	chmodSync(hookDest, 0o755);

	if (existsSync(POST_HOOK_SCRIPT_SRC)) {
		copyFileSync(POST_HOOK_SCRIPT_SRC, postHookDest);
		chmodSync(postHookDest, 0o755);
	} else {
		console.error(`[vreko hooks] PostToolUse hook script not found at ${POST_HOOK_SCRIPT_SRC}`);
	}
	return { hookDest, postHookDest };
}

function mergeHookEntries(settingsPath: string): void {
	const settings = readSettings(settingsPath);
	const hooks = (settings.hooks ?? {}) as Record<string, unknown>;
	const preToolUse = Array.isArray(hooks.PreToolUse) ? (hooks.PreToolUse as unknown[]) : [];
	const postToolUse = Array.isArray(hooks.PostToolUse) ? (hooks.PostToolUse as unknown[]) : [];
	if (!isVrekoHookPresent(preToolUse)) preToolUse.push(HOOK_ENTRY);
	if (!isVrekoPostHookPresent(postToolUse)) postToolUse.push(POST_HOOK_ENTRY);
	hooks.PreToolUse = preToolUse;
	hooks.PostToolUse = postToolUse;
	settings.hooks = hooks;
	writeSettings(settingsPath, settings);
}

function writeVrekoConfigHooks(cwd: string): void {
	const config = readVrekoConfig(cwd);
	const cfgHooks = (config.hooks ?? {}) as Record<string, unknown>;
	cfgHooks["claude-code"] = {
		installed: true,
		mode: "advisory",
		fragileThreshold: 2,
		installedAt: new Date().toISOString(),
		postToolUseInstalled: true,
	};
	config.hooks = cfgHooks;
	writeVrekoConfig(cwd, config);
}

export async function installHook(tool: string, workspace?: string): Promise<void> {
	if (tool !== "claude-code") {
		throw new Error(`Hook install for '${tool}' is not yet supported. Only 'claude-code' is supported.`);
	}

	const cwd = workspace ?? process.cwd();
	const settingsPath = join(cwd, ".claude", "settings.json");
	const { hookDest, postHookDest } = copyHookScripts(cwd);
	mergeHookEntries(settingsPath);
	writeVrekoConfigHooks(cwd);

	console.log("Vreko hooks installed for Claude Code");
	console.log(`  PreToolUse hook: ${hookDest}`);
	console.log(`  Settings:        ${settingsPath}`);
}

export async function uninstallHook(tool: string, workspace?: string): Promise<void> {
	if (tool !== "claude-code") {
		console.error(`[vreko hooks] Hook uninstall for '${tool}' is not yet supported.`);
		process.exit(1);
	}

	const cwd = workspace ?? process.cwd();
	const settingsPath = join(cwd, ".claude", "settings.json");
	const hookDest = join(cwd, VREKO_HOOK_COMMAND);

	// 1. Remove hook entries from settings.json
	if (existsSync(settingsPath)) {
		try {
			const settings = readSettings(settingsPath);
			const hooks = (settings.hooks ?? {}) as Record<string, unknown>;
			if (Array.isArray(hooks.PreToolUse)) {
				hooks.PreToolUse = (hooks.PreToolUse as unknown[]).filter((entry) => {
					if (typeof entry !== "object" || entry === null) {
						return true;
					}
					const e = entry as Record<string, unknown>;
					const entryHooks = e.hooks;
					if (!Array.isArray(entryHooks)) {
						return true;
					}
					return !entryHooks.some((h) => {
						if (typeof h !== "object" || h === null) {
							return false;
						}
						const hook = h as Record<string, unknown>;
						return typeof hook.command === "string" && hook.command.includes(VREKO_HOOK_MARKER);
					});
				});
			}
			if (Array.isArray(hooks.PostToolUse)) {
				hooks.PostToolUse = (hooks.PostToolUse as unknown[]).filter((entry) => {
					if (typeof entry !== "object" || entry === null) {
						return true;
					}
					const e = entry as Record<string, unknown>;
					const entryHooks = e.hooks;
					if (!Array.isArray(entryHooks)) {
						return true;
					}
					return !entryHooks.some((h) => {
						if (typeof h !== "object" || h === null) {
							return false;
						}
						const hook = h as Record<string, unknown>;
						return typeof hook.command === "string" && hook.command.includes(POST_HOOK_MARKER);
					});
				});
			}
			settings.hooks = hooks;
			writeSettings(settingsPath, settings);
		} catch (err) {
			console.error("[vreko hooks] Failed to update settings.json:", err);
		}
	}

	// 2. Delete hook scripts
	if (existsSync(hookDest)) {
		try {
			rmSync(hookDest);
		} catch (err) {
			console.error("[vreko hooks] Failed to remove PreToolUse hook script:", err);
		}
	}
	const postHookDest = join(cwd, POST_HOOK_COMMAND);
	if (existsSync(postHookDest)) {
		try {
			rmSync(postHookDest);
		} catch (err) {
			console.error("[vreko hooks] Failed to remove PostToolUse hook script:", err);
		}
	}

	// 3. Update .vreko/config.json
	const config = readVrekoConfig(cwd);
	const cfgHooks = (config.hooks ?? {}) as Record<string, unknown>;
	const claudeCodeCfg = (cfgHooks["claude-code"] ?? {}) as Record<string, unknown>;
	claudeCodeCfg.installed = false;
	cfgHooks["claude-code"] = claudeCodeCfg;
	config.hooks = cfgHooks;
	writeVrekoConfig(cwd, config);

	console.log("Vreko hook removed");
}

export async function hookStatus(workspace?: string): Promise<void> {
	const cwd = workspace ?? process.cwd();
	const settingsPath = join(cwd, ".claude", "settings.json");
	const hookDest = join(cwd, VREKO_HOOK_COMMAND);

	// Check config
	const config = readVrekoConfig(cwd);
	const cfgHooks = (config.hooks ?? {}) as Record<string, unknown>;
	const claudeCodeCfg = (cfgHooks["claude-code"] ?? {}) as Record<string, unknown>;
	const configInstalled = claudeCodeCfg.installed === true;

	// Check hook script
	const scriptExists = existsSync(hookDest);

	// Check settings.json entries (PreToolUse and PostToolUse)
	const settings = readSettings(settingsPath);
	const hooks = (settings.hooks ?? {}) as Record<string, unknown>;
	const preToolUse = Array.isArray(hooks.PreToolUse) ? (hooks.PreToolUse as unknown[]) : [];
	const postToolUse = Array.isArray(hooks.PostToolUse) ? (hooks.PostToolUse as unknown[]) : [];
	const settingsHasEntry = isVrekoHookPresent(preToolUse);
	const settingsHasPostEntry = isVrekoPostHookPresent(postToolUse);
	const postHookDest = join(cwd, POST_HOOK_COMMAND);
	const postScriptExists = existsSync(postHookDest);

	console.log("Vreko hooks status:");
	console.log(`  Config installed flag:      ${configInstalled ? "✅ true" : "❌ false"}`);
	console.log(
		`  PreToolUse:                 script ${scriptExists ? "✅" : "❌"}, settings ${settingsHasEntry ? "✅" : "❌"}`,
	);
	console.log(
		`  PostToolUse:                script ${postScriptExists ? "✅" : "❌"}, settings ${settingsHasPostEntry ? "✅" : "❌"}`,
	);

	const fullyInstalled =
		configInstalled && scriptExists && settingsHasEntry && postScriptExists && settingsHasPostEntry;
	const notInstalled =
		!configInstalled && !scriptExists && !settingsHasEntry && !postScriptExists && !settingsHasPostEntry;

	if (fullyInstalled) {
		console.log("\n✅ All hooks fully installed and active");
		if (claudeCodeCfg.mode) {
			console.log(`   Mode: ${claudeCodeCfg.mode}`);
		}
	} else if (notInstalled) {
		console.log("\n  Not installed. Run: vreko hooks install --tool claude-code");
	} else {
		console.log("\n⚠️  Partial install detected. Run uninstall then reinstall to fix.");
	}
}

// ---------------------------------------------------------------------------
// Commander command factory
// ---------------------------------------------------------------------------

export function createHooksCommand(): Command {
	const hooks = new Command("hooks")
		.description("Manage Vreko integration hooks for AI coding tools")
		.addHelpText("after", "\nExamples:\n  vreko hooks install --tool claude-code\n  vreko hooks status\n");

	hooks
		.command("install")
		.description("Install the Vreko PreToolUse hook for the specified AI tool")
		.requiredOption("--tool <tool>", "AI tool to install hook for (e.g. claude-code)")
		.option("--workspace <path>", "Workspace directory (default: cwd)")
		.action(async (opts: { tool: string; workspace?: string }) => {
			try {
				await installHook(opts.tool, opts.workspace);
			} catch (err) {
				console.error("[vreko hooks] Install failed:", err);
				process.exit(1);
			}
		});

	hooks
		.command("uninstall")
		.description("Remove the Vreko PreToolUse hook for the specified AI tool")
		.requiredOption("--tool <tool>", "AI tool to uninstall hook for (e.g. claude-code)")
		.option("--workspace <path>", "Workspace directory (default: cwd)")
		.action(async (opts: { tool: string; workspace?: string }) => {
			try {
				await uninstallHook(opts.tool, opts.workspace);
			} catch (err) {
				console.error("[vreko hooks] Uninstall failed:", err);
				process.exit(1);
			}
		});

	hooks
		.command("status")
		.description("Show current hook installation status")
		.option("--workspace <path>", "Workspace directory (default: cwd)")
		.action(async (opts: { workspace?: string }) => {
			try {
				await hookStatus(opts.workspace);
			} catch (err) {
				console.error("[vreko hooks] Status check failed:", err);
				process.exit(1);
			}
		});

	return hooks;
}
