#!/usr/bin/env node
import { cliState } from './chunk-GRMRYWYS.js';
import { getDaemonClient, connectToDaemon } from './chunk-PMJIMMYS.js';
import { getServicePidPath } from './chunk-IXUUBQB4.js';
import { resolveVrekoBinaryPath, detectAIClients, getVrekoMCPConfig, writeClientConfig } from './chunk-MJVY2XUN.js';
import { __name, __require } from './chunk-EWOJGXRX.js';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, lstatSync, copyFileSync, chmodSync, rmSync, statSync, appendFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname, normalize, resolve, basename, extname } from 'path';
import * as clack from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function generateClaudeIntegration(config, baseline) {
  const { workspacePath, overwrite = false } = config;
  const result = {
    filesWritten: [],
    filesSkipped: [],
    intelligenceAvailable: false,
    fragileFilesIncluded: 0,
    coChangePatternsIncluded: 0,
    globalSettingsUpdated: false
  };
  const fragileFiles = (baseline?.fragileFiles ?? []).filter((f) => f.compositeScore >= 30).sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 15).map((f) => ({
    path: f.path,
    score: f.compositeScore / 100,
    level: f.compositeScore >= 80 ? "critical" : f.compositeScore >= 60 ? "fragile" : "moderate"
  }));
  const coChangePairs = (baseline?.coChangeClusters ?? []).filter((c) => c.files.length >= 2 && c.coOccurrenceRate >= 0.5).sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate).slice(0, 10).map((c) => ({
    fileA: c.files[0],
    fileB: c.files[1],
    frequency: c.coOccurrenceRate
  }));
  result.intelligenceAvailable = fragileFiles.length > 0 || coChangePairs.length > 0;
  result.fragileFilesIncluded = fragileFiles.length;
  result.coChangePatternsIncluded = coChangePairs.length;
  const files = [
    {
      relativePath: ".mcp.json",
      content: buildMcpJson(config)
    },
    {
      relativePath: ".claude/agents/vreko-preflight.md",
      content: buildPreflightAgent(fragileFiles, coChangePairs)
    },
    {
      relativePath: ".claude/agents/vreko-session.md",
      content: VREKO_SESSION_AGENT
    },
    {
      relativePath: ".claude/commands/snap-check.md",
      content: SNAP_CHECK_COMMAND
    }
  ];
  for (const file of files) {
    const fullPath = join(workspacePath, file.relativePath);
    const dir = join(fullPath, "..");
    if (existsSync(fullPath) && !overwrite) {
      const existing = readFileSync(fullPath, "utf-8");
      const existingHash = createHash("sha256").update(existing).digest("hex");
      const newHash = createHash("sha256").update(file.content).digest("hex");
      const suffix = existingHash !== newHash ? " (modified, use --force to update)" : "";
      result.filesSkipped.push(`${file.relativePath}${suffix}`);
      continue;
    }
    mkdirSync(dir, {
      recursive: true
    });
    writeFileSync(fullPath, file.content, "utf-8");
    result.filesWritten.push(file.relativePath);
  }
  result.globalSettingsUpdated = writeVrekoToClaudeCodeGlobalSettings();
  return result;
}
__name(generateClaudeIntegration, "generateClaudeIntegration");
function buildMcpJson(config) {
  const { command, args: cmdArgs } = resolveMcpCommand(config.workspacePath);
  const servers = {
    vreko: {
      type: "stdio",
      command,
      args: cmdArgs,
      instructions: "Vreko provides codebase intelligence. Use vreko_pulse to check risk before modifying files. Use vreko_learn to record patterns. Use vreko_end to close sessions."
    }
  };
  if (config.includeChannel === true) {
    const channelArgs = [
      ...cmdArgs
    ];
    channelArgs.push("--channel");
    servers["vreko-channel"] = {
      type: "stdio",
      command,
      args: channelArgs,
      instructions: "Vreko intelligence channel. Pushes real-time warnings about fragile files and risk spikes. Requires: claude --channels vreko-channel"
    };
  }
  return `${JSON.stringify({
    mcpServers: servers
  }, null, 2)}
`;
}
__name(buildMcpJson, "buildMcpJson");
function resolveMcpCommand(workspacePath) {
  return {
    command: resolveVrekoBinaryPath(),
    args: [
      "mcp",
      "--stdio",
      "--workspace",
      workspacePath
    ]
  };
}
__name(resolveMcpCommand, "resolveMcpCommand");
function writeVrekoToClaudeCodeGlobalSettings() {
  const settingsPath = join(homedir(), ".claude", "settings.json");
  if (!existsSync(settingsPath)) {
    return false;
  }
  let settings = {};
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return false;
  }
  const mcpServers = settings.mcpServers ?? {};
  const command = resolveVrekoBinaryPath();
  const existing = mcpServers.vreko;
  if (existing?.command === command) {
    return false;
  }
  mcpServers.vreko = {
    command,
    args: [
      "mcp",
      "--stdio"
    ]
  };
  settings.mcpServers = mcpServers;
  try {
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
`, "utf-8");
    return true;
  } catch {
    return false;
  }
}
__name(writeVrekoToClaudeCodeGlobalSettings, "writeVrekoToClaudeCodeGlobalSettings");
function buildPreflightAgent(fragileFiles, coChangePairs) {
  let fragileSection;
  if (fragileFiles.length > 0) {
    const lines = fragileFiles.map((f) => `- \`${f.path}\`  -  fragility: ${f.level} (score: ${f.score.toFixed(2)})`).join("\n");
    fragileSection = `## Known Fragile Files in This Codebase

The following files have high rollback rates or frequent issues:

${lines}

If the task involves any of these files, always recommend creating
a snapshot before modification.`;
  } else {
    fragileSection = `## Codebase Intelligence

Vreko is still learning about this codebase. Use vreko_pulse
to get real-time risk assessment for any files being modified.
Intelligence will improve as more sessions are tracked.`;
  }
  let coChangeSection = "";
  if (coChangePairs.length > 0) {
    const lines = coChangePairs.map((p) => `- \`${p.fileA}\` \u2194 \`${p.fileB}\` (${(p.frequency * 100).toFixed(0)}% co-change rate)`).join("\n");
    coChangeSection = `

## Co-Change Patterns

These files historically change together. If modifying one,
check whether the others also need updates:

${lines}`;
  }
  return `---
name: vreko-preflight
description: >
  Run before implementing changes that touch multiple files
  or modify config/infrastructure. Queries Vreko for risk
  context and known fragile patterns in this codebase.
tools:
  - Read
  - Grep
  - Glob
  - mcp__vreko__vreko_pulse
---

You are a preflight check agent for this codebase. Vreko has
accumulated intelligence about which files are risky and which
files always change together.

Before the parent agent modifies files, you:

1. Call vreko_pulse with the workspace path and list of files about to change
2. Check the risk assessment in the response
3. Flag any files with HIGH or CRITICAL fragility
4. Surface co-change patterns (files that must change together)
5. Return a structured summary to the parent agent:
   - Files safe to modify in parallel
   - Files requiring sequential, careful changes
   - Known pitfalls from codebase history
   - Whether a snapshot is recommended before proceeding

Do NOT modify any files. Read-only analysis only.

${fragileSection}${coChangeSection}
`;
}
__name(buildPreflightAgent, "buildPreflightAgent");
var VREKO_SESSION_AGENT = `---
name: vreko-session
description: >
  Manage Vreko session lifecycle. Use at the start and
  end of significant implementation work to capture context
  and trigger intelligence collection.
tools:
  - mcp__vreko__vreko
  - mcp__vreko__vreko_learn
  - mcp__vreko__vreko_end
---

You manage Vreko sessions for this codebase.

When starting work:
- Call vreko to begin a session with a descriptive task name
- Note the session context for the parent agent

When completing work:
- Call vreko_learn with any patterns discovered during implementation:
  - Files that needed to change together (co-change pattern)
  - Config that was fragile or surprising (fragile pattern)
  - Dependencies that weren't obvious (dependency pattern)
  - Conventions the codebase follows (convention pattern)
- Call vreko_end to close the session

Capture learnings in this format:
- Pattern type: co-change | fragile | dependency | convention
- Affected files: list of file paths
- Description: what the implementing agent discovered

The more patterns captured, the better Vreko's intelligence
becomes for future sessions.
`;
var SNAP_CHECK_COMMAND = `---
description: Check Vreko risk context for files you're about to change
argument-hint: <file paths or description of planned changes>
---

Query Vreko intelligence for the specified files or task.

1. Call the vreko_pulse MCP tool with the provided context
2. Display risk scores, fragile file warnings, and relevant history
3. If any file has fragility level "fragile" or "critical", warn explicitly
4. List co-change groups  -  files that should be modified together
5. Recommend whether to create a manual snapshot before proceeding
6. If fragile files are involved, suggest the vreko-preflight agent
   for more detailed analysis
`;
function validateWorkspacePath(workspacePath) {
  try {
    const normalizedPath = normalize(workspacePath);
    const absolutePath = resolve(normalizedPath);
    if (!absolutePath.startsWith(process.cwd()) && !absolutePath.startsWith("/")) {
      return {
        valid: false,
        root: "",
        error: "Invalid workspace path"
      };
    }
    const hasGit = existsSync(resolve(absolutePath, ".git"));
    const hasPackageJson = existsSync(resolve(absolutePath, "package.json"));
    const hasVreko = existsSync(resolve(absolutePath, ".vreko"));
    if (!hasGit && !hasPackageJson && !hasVreko) {
      return {
        valid: false,
        root: absolutePath,
        error: "Workspace must contain at least one marker: .git, package.json, or .vreko"
      };
    }
    try {
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        return {
          valid: false,
          root: absolutePath,
          error: "Workspace path cannot be a symbolic link"
        };
      }
    } catch {
      return {
        valid: false,
        root: absolutePath,
        error: "Cannot access workspace path"
      };
    }
    return {
      valid: true,
      root: absolutePath
    };
  } catch (error) {
    return {
      valid: false,
      root: "",
      error: error instanceof Error ? error.message : "Unknown error validating workspace"
    };
  }
}
__name(validateWorkspacePath, "validateWorkspacePath");
function resolveWorkspaceRoot(explicitPath) {
  if (explicitPath) {
    const validation = validateWorkspacePath(explicitPath);
    if (validation.valid) {
      return validation;
    }
  }
  let currentPath = resolve(process.cwd());
  const maxIterations = 50;
  for (let i = 0; i < maxIterations; i++) {
    const hasMarker = existsSync(resolve(currentPath, ".git")) || existsSync(resolve(currentPath, "package.json")) || existsSync(resolve(currentPath, ".vreko"));
    if (hasMarker) {
      return validateWorkspacePath(currentPath);
    }
    const parent = resolve(currentPath, "..");
    if (parent === currentPath) {
      break;
    }
    currentPath = parent;
  }
  return validateWorkspacePath(process.cwd());
}
__name(resolveWorkspaceRoot, "resolveWorkspaceRoot");
function findWorkspaceRoot(cwd) {
  let dir = cwd;
  while (dir !== "/") {
    if (existsSync(join(dir, ".vreko"))) {
      return dir;
    }
    const parent = join(dir, "..");
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}
__name(findWorkspaceRoot, "findWorkspaceRoot");
function findGitRoot(cwd) {
  try {
    const { execSync } = __require("child_process");
    return execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf-8",
      stdio: [
        "pipe",
        "pipe",
        "pipe"
      ]
    }).trim();
  } catch {
    return null;
  }
}
__name(findGitRoot, "findGitRoot");
var HOOK_SCRIPT_SRC = join(dirname(fileURLToPath(import.meta.url)), "../scripts/hooks/pretooluse-fragile-guard.sh");
var VREKO_HOOK_COMMAND = ".claude/hooks/vreko-fragile-guard.sh";
var VREKO_HOOK_MARKER = "vreko-fragile-guard.sh";
var HOOK_ENTRY = {
  matcher: "Edit|Write|MultiEdit",
  hooks: [
    {
      type: "command",
      command: VREKO_HOOK_COMMAND
    }
  ]
};
var POST_HOOK_SCRIPT_SRC = join(dirname(fileURLToPath(import.meta.url)), "../scripts/hooks/posttooluse-file-notify.sh");
var POST_HOOK_COMMAND = ".claude/hooks/vreko-file-notify.sh";
var POST_HOOK_MARKER = "vreko-file-notify.sh";
var POST_HOOK_ENTRY = {
  matcher: "Edit|Write|MultiEdit",
  hooks: [
    {
      type: "command",
      command: POST_HOOK_COMMAND
    }
  ]
};
function readSettings(settingsPath) {
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch (err) {
    console.error(`[vreko hooks] Failed to parse ${settingsPath}:`, err);
    return {};
  }
}
__name(readSettings, "readSettings");
function writeSettings(settingsPath, settings) {
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
`, "utf-8");
}
__name(writeSettings, "writeSettings");
function readVrekoConfig(workspace) {
  const configPath = join(workspace, ".vreko", "config.json");
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("[vreko hooks] Failed to parse .vreko/config.json:", err);
    return {};
  }
}
__name(readVrekoConfig, "readVrekoConfig");
function writeVrekoConfig(workspace, config) {
  const configDir = join(workspace, ".vreko");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, {
      recursive: true
    });
  }
  writeFileSync(join(configDir, "config.json"), `${JSON.stringify(config, null, 2)}
`, "utf-8");
}
__name(writeVrekoConfig, "writeVrekoConfig");
function isVrekoHookPresent(preToolUseArray) {
  return preToolUseArray.some((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const e = entry;
    const hooks = e.hooks;
    if (!Array.isArray(hooks)) {
      return false;
    }
    return hooks.some((h) => {
      if (typeof h !== "object" || h === null) {
        return false;
      }
      const hook = h;
      return typeof hook.command === "string" && hook.command.includes(VREKO_HOOK_MARKER);
    });
  });
}
__name(isVrekoHookPresent, "isVrekoHookPresent");
function isVrekoPostHookPresent(postToolUseArray) {
  return postToolUseArray.some((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const e = entry;
    const hooks = e.hooks;
    if (!Array.isArray(hooks)) {
      return false;
    }
    return hooks.some((h) => {
      if (typeof h !== "object" || h === null) {
        return false;
      }
      const hook = h;
      return typeof hook.command === "string" && hook.command.includes(POST_HOOK_MARKER);
    });
  });
}
__name(isVrekoPostHookPresent, "isVrekoPostHookPresent");
function copyHookScripts(cwd) {
  const hooksDir = join(cwd, ".claude", "hooks");
  const hookDest = join(cwd, VREKO_HOOK_COMMAND);
  const postHookDest = join(cwd, POST_HOOK_COMMAND);
  if (!existsSync(HOOK_SCRIPT_SRC)) {
    throw new Error(`Hook script not found at ${HOOK_SCRIPT_SRC}`);
  }
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, {
      recursive: true
    });
  }
  copyFileSync(HOOK_SCRIPT_SRC, hookDest);
  chmodSync(hookDest, 493);
  if (existsSync(POST_HOOK_SCRIPT_SRC)) {
    copyFileSync(POST_HOOK_SCRIPT_SRC, postHookDest);
    chmodSync(postHookDest, 493);
  } else {
    console.error(`[vreko hooks] PostToolUse hook script not found at ${POST_HOOK_SCRIPT_SRC}`);
  }
  return {
    hookDest,
    postHookDest
  };
}
__name(copyHookScripts, "copyHookScripts");
function mergeHookEntries(settingsPath) {
  const settings = readSettings(settingsPath);
  const hooks = settings.hooks ?? {};
  const preToolUse = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse : [];
  const postToolUse = Array.isArray(hooks.PostToolUse) ? hooks.PostToolUse : [];
  if (!isVrekoHookPresent(preToolUse)) preToolUse.push(HOOK_ENTRY);
  if (!isVrekoPostHookPresent(postToolUse)) postToolUse.push(POST_HOOK_ENTRY);
  hooks.PreToolUse = preToolUse;
  hooks.PostToolUse = postToolUse;
  settings.hooks = hooks;
  writeSettings(settingsPath, settings);
}
__name(mergeHookEntries, "mergeHookEntries");
function writeVrekoConfigHooks(cwd) {
  const config = readVrekoConfig(cwd);
  const cfgHooks = config.hooks ?? {};
  cfgHooks["claude-code"] = {
    installed: true,
    mode: "advisory",
    fragileThreshold: 2,
    installedAt: (/* @__PURE__ */ new Date()).toISOString(),
    postToolUseInstalled: true
  };
  config.hooks = cfgHooks;
  writeVrekoConfig(cwd, config);
}
__name(writeVrekoConfigHooks, "writeVrekoConfigHooks");
async function installHook(tool, workspace) {
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
__name(installHook, "installHook");
async function uninstallHook(tool, workspace) {
  if (tool !== "claude-code") {
    console.error(`[vreko hooks] Hook uninstall for '${tool}' is not yet supported.`);
    process.exit(1);
  }
  const cwd = workspace ?? process.cwd();
  const settingsPath = join(cwd, ".claude", "settings.json");
  const hookDest = join(cwd, VREKO_HOOK_COMMAND);
  if (existsSync(settingsPath)) {
    try {
      const settings = readSettings(settingsPath);
      const hooks = settings.hooks ?? {};
      if (Array.isArray(hooks.PreToolUse)) {
        hooks.PreToolUse = hooks.PreToolUse.filter((entry) => {
          if (typeof entry !== "object" || entry === null) {
            return true;
          }
          const e = entry;
          const entryHooks = e.hooks;
          if (!Array.isArray(entryHooks)) {
            return true;
          }
          return !entryHooks.some((h) => {
            if (typeof h !== "object" || h === null) {
              return false;
            }
            const hook = h;
            return typeof hook.command === "string" && hook.command.includes(VREKO_HOOK_MARKER);
          });
        });
      }
      if (Array.isArray(hooks.PostToolUse)) {
        hooks.PostToolUse = hooks.PostToolUse.filter((entry) => {
          if (typeof entry !== "object" || entry === null) {
            return true;
          }
          const e = entry;
          const entryHooks = e.hooks;
          if (!Array.isArray(entryHooks)) {
            return true;
          }
          return !entryHooks.some((h) => {
            if (typeof h !== "object" || h === null) {
              return false;
            }
            const hook = h;
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
  const config = readVrekoConfig(cwd);
  const cfgHooks = config.hooks ?? {};
  const claudeCodeCfg = cfgHooks["claude-code"] ?? {};
  claudeCodeCfg.installed = false;
  cfgHooks["claude-code"] = claudeCodeCfg;
  config.hooks = cfgHooks;
  writeVrekoConfig(cwd, config);
  console.log("Vreko hook removed");
}
__name(uninstallHook, "uninstallHook");
async function hookStatus(workspace) {
  const cwd = workspace ?? process.cwd();
  const settingsPath = join(cwd, ".claude", "settings.json");
  const hookDest = join(cwd, VREKO_HOOK_COMMAND);
  const config = readVrekoConfig(cwd);
  const cfgHooks = config.hooks ?? {};
  const claudeCodeCfg = cfgHooks["claude-code"] ?? {};
  const configInstalled = claudeCodeCfg.installed === true;
  const scriptExists = existsSync(hookDest);
  const settings = readSettings(settingsPath);
  const hooks = settings.hooks ?? {};
  const preToolUse = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse : [];
  const postToolUse = Array.isArray(hooks.PostToolUse) ? hooks.PostToolUse : [];
  const settingsHasEntry = isVrekoHookPresent(preToolUse);
  const settingsHasPostEntry = isVrekoPostHookPresent(postToolUse);
  const postHookDest = join(cwd, POST_HOOK_COMMAND);
  const postScriptExists = existsSync(postHookDest);
  console.log("Vreko hooks status:");
  console.log(`  Config installed flag:      ${configInstalled ? "\u2705 true" : "\u274C false"}`);
  console.log(`  PreToolUse:                 script ${scriptExists ? "\u2705" : "\u274C"}, settings ${settingsHasEntry ? "\u2705" : "\u274C"}`);
  console.log(`  PostToolUse:                script ${postScriptExists ? "\u2705" : "\u274C"}, settings ${settingsHasPostEntry ? "\u2705" : "\u274C"}`);
  const fullyInstalled = configInstalled && scriptExists && settingsHasEntry && postScriptExists && settingsHasPostEntry;
  const notInstalled = !configInstalled && !scriptExists && !settingsHasEntry && !postScriptExists && !settingsHasPostEntry;
  if (fullyInstalled) {
    console.log("\n\u2705 All hooks fully installed and active");
    if (claudeCodeCfg.mode) {
      console.log(`   Mode: ${claudeCodeCfg.mode}`);
    }
  } else if (notInstalled) {
    console.log("\n  Not installed. Run: vreko hooks install --tool claude-code");
  } else {
    console.log("\n\u26A0\uFE0F  Partial install detected. Run uninstall then reinstall to fix.");
  }
}
__name(hookStatus, "hookStatus");
function createHooksCommand() {
  const hooks = new Command("hooks").description("Manage Vreko integration hooks for AI coding tools").addHelpText("after", "\nExamples:\n  vreko hooks install --tool claude-code\n  vreko hooks status\n");
  hooks.command("install").description("Install the Vreko PreToolUse hook for the specified AI tool").requiredOption("--tool <tool>", "AI tool to install hook for (e.g. claude-code)").option("--workspace <path>", "Workspace directory (default: cwd)").action(async (opts) => {
    try {
      await installHook(opts.tool, opts.workspace);
    } catch (err) {
      console.error("[vreko hooks] Install failed:", err);
      process.exit(1);
    }
  });
  hooks.command("uninstall").description("Remove the Vreko PreToolUse hook for the specified AI tool").requiredOption("--tool <tool>", "AI tool to uninstall hook for (e.g. claude-code)").option("--workspace <path>", "Workspace directory (default: cwd)").action(async (opts) => {
    try {
      await uninstallHook(opts.tool, opts.workspace);
    } catch (err) {
      console.error("[vreko hooks] Uninstall failed:", err);
      process.exit(1);
    }
  });
  hooks.command("status").description("Show current hook installation status").option("--workspace <path>", "Workspace directory (default: cwd)").action(async (opts) => {
    try {
      await hookStatus(opts.workspace);
    } catch (err) {
      console.error("[vreko hooks] Status check failed:", err);
      process.exit(1);
    }
  });
  return hooks;
}
__name(createHooksCommand, "createHooksCommand");

// src/commands/init/init-core.ts
var GROUND_TRUTH_SKILL_CONTENT = `---
name: ground-truth
description: Disciplined methodology for AI-assisted coding that keeps Claude anchored to what the codebase actually says instead of what Claude assumes. Use this skill for any non-trivial coding task  -  refactors, multi-file changes, bug fixes, feature implementation, spec work, or anything touching more than a single function. Also use when the user mentions "refactor," "implement," "add a feature," "fix this bug," "migrate," "clean up," "audit," or anything that implies structured work on a real codebase. Especially use when working inside a git repository or when the user references files, modules, or prior work. Do not skip for tasks that seem simple on the surface; small changes in real codebases frequently have non-obvious ripple effects, and Ground Truth is built to catch those before they ship. The skill also responds to the user phrases "run ground truth," "ground truth audit," "brief me," "verify this," "close the session," and "pulse check."
---

# Ground Truth

A methodology for disciplined coding work in real codebases, powered by Vreko behavioral intelligence.

## The core principle

Ground truth is what the codebase actually says  -  the imports that actually exist, the functions that are actually called, the types that are actually exported, the tests that actually pass. Everything else is assumption. LLMs produce code that looks right more easily than they produce code that is right in the specific context of the codebase in front of them. The gap between those two things is where regressions live.

Ground Truth closes that gap with four disciplines and five workflows. The disciplines are the mindset; the workflows are the verbs the user invokes.

## Pre-flight (run once per session, first)

Before any workflow, check the capability surface:

\`\`\`bash
# Is Vreko installed and running?
vreko --version 2>/dev/null && vreko service status 2>/dev/null
\`\`\`

If the command fails with "command not found", explain to the user in one sentence what Vreko does and offer to install it:

> Vreko is a local service that tracks changes to this codebase, attributes them to AI tools, and surfaces codebase-specific intelligence as you work. Want me to install it? (\`npm install -g @vreko/cli && vreko init\`)

Do not install without approval. If the user approves, run the install, then \`vreko init\`, then continue with the requested workflow. If the user declines, Ground Truth degrades gracefully  -  the methodology still applies, the Vreko-specific MCP calls are skipped.

If the workspace has \`.vreko/docs/\` present, read \`INTELLIGENCE.md\` before any workflow. That file contains the capability declaration, current session context, and intelligence summary. Treat it as authoritative for this codebase.

## Workflow 1: \`ground-truth brief\`

**Trigger phrases:** "brief me," "what do I need to know," "give me context," "start a session"

**What it does:** Opens a Vreko session, reads the ambient docs, synthesizes a short briefing for the user.

**Steps:**
1. Call MCP tool \`vreko\` with a task description derived from the user's request.
2. Read \`.vreko/docs/INTELLIGENCE.md\` and \`.vreko/docs/current-session.md\` if they exist.
3. Synthesize a \u2264200-word briefing covering: what this codebase is, what's fragile, what the agent has learned about it, what the user should be aware of before working.
4. Present the briefing inline; do not create a file.

**Output format:**
\`\`\`
Session: <session-id>
Codebase: <brief description>
Fragile files in scope: <list or "none identified">
Recent patterns: <brief summary>
Watch for: <1-2 specific risks>
\`\`\`

**Anti-pattern:** Do not paraphrase the entire docs folder. Extract the two or three items relevant to what the user is about to do.

## Workflow 2: \`ground-truth audit\`

**Trigger phrases:** "run ground truth audit," "audit this," "verify the current state," "check the real state"

**What it does:** Runs a grep-based audit of the current codebase state to establish ground truth before proceeding. Pairs with \`vreko_pulse\` to fold in live intelligence.

**Steps:**
1. Identify the claim or scope to audit (ask if unclear).
2. Generate 4-8 \`rg\` / \`grep\` commands that would verify the claim.
3. Execute each command; capture output verbatim.
4. Call \`vreko_pulse\` to pull live warnings and fragile-file data.
5. Synthesize a report: what the audit found, what the pulse flagged, where they agree, where they disagree.
6. If the user had assumptions going in, call out explicitly which were confirmed and which were contradicted.

**Output format:**
\`\`\`
Claim: <what was being verified>

Audit results:
  [A1] <command> \u2192 <summary of output>
  [A2] <command> \u2192 <summary of output>
  ...

Pulse:
  Active warnings: <list>
  Fragile files in scope: <list>
  Missing co-change partners: <list>

Synthesis:
  Confirmed: <list>
  Contradicted: <list>
  Unknown: <list>
\`\`\`

**Anti-pattern:** Do not let the audit exceed 8 commands. If more depth is needed, split into two audits with distinct scopes.

## Workflow 3: \`ground-truth verify\`

**Trigger phrases:** "verify this," "run verification," "check the work," "gate this"

**What it does:** Runs the verification protocol for work that was just completed  -  tests, grep gates, lint. Records outcome as a learning.

**Steps:**
1. Identify the verification targets (which tests, which grep gates, which build commands).
2. Run each in sequence. Capture exit codes and summary output.
3. If all pass, call \`vreko_learn\` with a terse outcome record: \`{ insight: "<what was verified>: passed", severity: "info" }\`.
4. If any fail, call \`vreko_learn\` with the failure: \`{ insight: "<what failed and why>", severity: "warn" }\`, then present the failure to the user; do not mark the work complete.
5. Report pass/fail summary to the user.

**Output format:**
\`\`\`
Verification gates:
  [V1] <command> \u2192 PASS / FAIL
  [V2] <command> \u2192 PASS / FAIL
  ...

Overall: PASS / FAIL
Learning recorded: <learning-id>
\`\`\`

**Anti-pattern:** Do not call work "done" without running verification. Do not skip verification because tests are slow; offer to run a subset if full suite is impractical.

## Workflow 4: \`ground-truth check\`

**Trigger phrases:** "pulse check," "quick check," "how are we doing," "anything I'm missing"

**What it does:** Lightweight mid-session check. Pulls \`vreko_pulse\` and annotates for the user what to be aware of for the next several turns.

**Steps:**
1. Call \`vreko_pulse\`.
2. Read the \`LLM_HINT\` section of the response (see spec 03).
3. Summarize in 2-3 sentences what the user should be aware of right now.
4. If pulse returns warnings the user hasn't acknowledged, surface them.

**Output format:** Brief prose, no tables. Example: "Pulse check: you're in \`auth/session.ts\`, which was rolled back 4\xD7 in the last 90 days. Co-change partner \`auth/middleware.ts\` hasn't been touched yet  -  if you're refactoring session logic, middleware probably needs coordination. No other warnings."

**Anti-pattern:** Do not repeat the same warning on consecutive checks. Track what was surfaced and only re-surface if state has changed.

## Workflow 5: \`ground-truth close\`

**Trigger phrases:** "close the session," "we're done here," "wrap up," "ceremony"

**What it does:** Closes the Vreko session, reads the closing ceremony, presents the summary.

**Steps:**
1. Call \`vreko_end\` with a one-sentence outcome summary of what was accomplished.
2. Parse the ceremony response: learnings captured, pitfalls avoided, estimated token savings, session coherence score, carry-forward items.
3. Present the summary to the user in a compact format.
4. If there are carry-forward items, explicitly flag them for the next session.

**Output format:**
\`\`\`
Session closed: <session-id>
Outcome: <one sentence>

Ceremony summary:
  Learnings captured: <n>
  Pitfalls avoided: <n>
  Token savings (est): ~<n>
  Coherence score: <n>%

Carry forward to next session:
  \u2022 <item>
  \u2022 <item>
\`\`\`

**Anti-pattern:** Do not skip the closing ceremony just because the session was short. Short sessions often have the most valuable learnings.

## How workflows compose

A typical disciplined coding session looks like:

1. User states intent \u2192 Claude runs \`ground-truth brief\`.
2. Before significant changes \u2192 Claude runs \`ground-truth audit\` on the scope.
3. Mid-session, at file-change boundaries \u2192 Claude runs \`ground-truth check\`.
4. After implementation \u2192 Claude runs \`ground-truth verify\`.
5. At session end \u2192 Claude runs \`ground-truth close\`.

The user doesn't need to type these verbatim. The skill recognizes intent from natural phrasing.

## What this skill does NOT do

- Does not replace the user's judgment. If verification passes but something still feels wrong, stop and investigate.
- Does not auto-install Vreko. Always asks.
- Does not expose MCP tools directly to the user. The user asks for ground truth; the skill orchestrates the tools.
- Does not write to \`.vreko/docs/\` directly. That's the service's job.

## Integration with other Vreko skills

- \`vreko-ground-truth-audit\` (published)  -  generates grep-based audit commands; Ground Truth's \`audit\` workflow uses its patterns.
- \`vreko-brand-voice\` (published)  -  use when Ground Truth output will surface in external communication.
- \`vreko-spec-writer\` (published)  -  use when Ground Truth discovers work that warrants a spec.

## Installation

\`\`\`bash
# Users install the skill file into their Claude Code skills directory:
mkdir -p ~/.claude/skills/ground-truth
curl -o ~/.claude/skills/ground-truth/SKILL.md \\
  https://skills.vreko.dev/ground-truth/SKILL.md
\`\`\`

Or, bundled: Ground Truth ships as the headline skill inside \`@vreko/skills\` npm package, which \`vreko init\` installs into the appropriate directory per detected AI tool.

---

**Version:** 1.0.0
**Author:** Vreko / Marcelle Labs
**License:** MIT (methodology); skill file free to distribute
**Canonical URL:** https://vreko.dev/ground-truth
`;
var cliVersion = "3.1.6" ;
function createInitCommand() {
  return new Command("init").description("Bootstrap Vreko for a repository").argument("[path]", "Workspace path (default: current directory)").option("-y, --yes", "Skip confirmation prompts").option("--non-interactive", "Run without prompts (extension/automation)").option("--json", "Output structured JSON result").option("--dry-run", "Show what would be configured").option("--force", "Re-initialize even if already set up").option("--skip-mcp", "Skip MCP configuration").option("--skip-service", "Skip service registration").option("--api-key <key>", "API key for Pro features").option("--dev", "Use local dev mode for MCP").option("--npm", "Use npm/npx mode for MCP").option("-q, --quiet", "Suppress informational output").option("-v, --verbose", "Show detailed detection reasoning").action(async (path, options) => {
    const result = await runInit(path, options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    }
    if (!result.success) {
      process.exit(1);
    }
  });
}
__name(createInitCommand, "createInitCommand");
async function runInit(pathArg, options) {
  const jsonMode = !!options.json;
  const skipPrompts = !!options.yes || !!options.nonInteractive || cliState.yes;
  const quiet = !!options.quiet;
  const verbose = !!options.verbose;
  const result = {
    success: true,
    version: cliVersion,
    workspace: {
      path: "",
      alreadyInitialized: false,
      reinitialized: false
    },
    detection: {
      stack: [],
      monorepoType: "none",
      packageManager: "npm",
      gitRepo: false,
      gitRoot: null,
      fileCount: 0
    },
    configuration: {
      configCreated: false,
      gitignoreUpdated: false,
      ctxStubCreated: false
    },
    service: {
      started: false,
      connected: false,
      workspaceRegistered: false,
      version: null,
      skipped: !!options.skipService
    },
    mcp: {
      clients: {},
      configured: [],
      skipped: !!options.skipMcp
    },
    errors: []
  };
  try {
    const spinner = jsonMode ? null : ora("Detecting workspace...").start();
    const workspacePath = resolve(pathArg || process.cwd());
    result.workspace.path = workspacePath;
    if (!existsSync(workspacePath)) {
      fail(spinner, result, `Path does not exist: ${workspacePath}`);
      return result;
    }
    if (!statSync(workspacePath).isDirectory()) {
      fail(spinner, result, `Path is not a directory: ${workspacePath}`);
      return result;
    }
    const vrekoDir = join(workspacePath, ".vreko");
    const configPath = join(vrekoDir, "config.json");
    const alreadyInitialized = existsSync(configPath);
    result.workspace.alreadyInitialized = alreadyInitialized;
    if (alreadyInitialized && options.force) {
      result.workspace.reinitialized = true;
    }
    const detected = detectStack(workspacePath, verbose && !jsonMode);
    result.detection = {
      ...detected,
      fileCount: 0
    };
    if (spinner) {
      spinner.succeed("Workspace detected");
    }
    if (!jsonMode && !quiet) {
      if (detected.stack.length > 0) {
      }
      if (detected.monorepoType !== "none") {
      }
    }
    if (!jsonMode && !options.dryRun) {
      if (options.nonInteractive) {
        process.stderr.write([
          "",
          "Vreko data notice:",
          "  \u2022 Session metadata (timing, file counts, risk scores) is collected locally.",
          "  \u2022 No file contents or source code ever leave your device.",
          "  \u2022 Cloud sync is opt-in and syncs metadata only.",
          "  \u2022 Run `vreko purge` at any time to delete all local data.",
          "  \u2022 Privacy policy: https://vreko.dev/privacy",
          ""
        ].join("\n"));
      } else if (!skipPrompts) {
        const consentResult = await clack.confirm({
          message: "Vreko collects session metadata (timing, file counts, risk scores) locally. No file contents leave your device. Agree to continue?",
          initialValue: true
        });
        if (clack.isCancel(consentResult)) {
          clack.cancel("Cancelled.");
          return result;
        }
        if (!consentResult) {
          clack.cancel("Setup cancelled. No data was collected.");
          return result;
        }
      }
    }
    if (!skipPrompts && !options.dryRun) {
      const proceedResult = await clack.confirm({
        message: `Initialize Vreko for ${basename(workspacePath)}?`,
        initialValue: true
      });
      if (clack.isCancel(proceedResult)) {
        clack.cancel("Cancelled.");
        return result;
      }
      if (!proceedResult) {
        return result;
      }
    }
    const configSpinner = jsonMode ? null : ora("Configuring workspace...").start();
    if (!options.dryRun) {
      mkdirSync(vrekoDir, {
        recursive: true
      });
      if (!alreadyInitialized || options.force) {
        const config = buildWorkspaceConfig(workspacePath, detected);
        writeFileSync(configPath, `${JSON.stringify(config, null, 2)}
`);
        result.configuration.configCreated = true;
      }
      if (configSpinner) {
        configSpinner.succeed("Created .vreko/config.json");
      }
      if (detected.gitRepo) {
        const gitignoreUpdated = ensureGitignore(workspacePath);
        result.configuration.gitignoreUpdated = gitignoreUpdated;
        if (!jsonMode && gitignoreUpdated) {
          ora().succeed("Updated .gitignore");
        }
      }
      const ctxPath = join(vrekoDir, ".ctx");
      if (!existsSync(ctxPath)) {
        writeFileSync(ctxPath, "# Vreko compiled context  -  auto-generated\n");
        result.configuration.ctxStubCreated = true;
        if (!jsonMode) {
          ora().succeed("Created .vreko/.ctx");
        }
      }
    } else {
      if (configSpinner) {
        configSpinner.info("Would create .vreko/config.json");
      }
      if (detected.gitRepo && !jsonMode) {
        ora().info("Would update .gitignore");
      }
      if (!jsonMode) {
        ora().info("Would create .vreko/.ctx");
      }
    }
    if (!jsonMode) {
    }
    if (!options.skipService) {
      const daemonSpinner = jsonMode ? null : ora("Connecting to service...").start();
      if (!options.dryRun) {
        const daemonResult = await registerWithDaemon(workspacePath, daemonSpinner, jsonMode);
        result.service = {
          ...result.service,
          ...daemonResult
        };
        if (!daemonResult.connected) {
          const daemonErrorMsg = "\u26A0 Service could not be reached  -  Vreko is initialized but workspace sync is disabled. Run `vr service start` to enable syncing." + (daemonResult.errorMessage ? ` ${daemonResult.errorMessage}` : "");
          if (!jsonMode) {
            console.warn(daemonErrorMsg);
          }
          result.errors.push("Service connection failed  -  init completed without service registration");
        } else {
          try {
            const client = getDaemonClient();
            if (client) {
              const seedResult = await client.call("workspace/seed-knowledge", {
                workspace: workspacePath
              });
              if (!jsonMode && seedResult.seeded > 0) {
                ora().succeed(`Seeded ${seedResult.seeded} intelligence patterns into workspace`);
              }
              try {
                await client.call("workspace/trigger-workspace-json-write", {
                  workspace: workspacePath
                });
              } catch (error) {
                console.warn("init-core: workspace/trigger-workspace-json-write failed (non-fatal)", {
                  error
                });
              }
              try {
                await client.call("workspace/write-from-scan-profile", {
                  workspace: workspacePath,
                  ...options.force && {
                    force: true
                  }
                });
              } catch (error) {
                console.warn("init-core: workspace/write-from-scan-profile failed (non-fatal)", {
                  error
                });
              }
            }
          } catch (error) {
            console.warn("init-core: knowledge seeding failed (non-fatal)", {
              error
            });
          }
        }
      } else {
        if (daemonSpinner) {
          daemonSpinner.info("Would register workspace with service");
        }
      }
      if (!jsonMode) {
      }
    }
    if (!options.skipMcp) {
      const mcpSpinner = jsonMode ? null : ora("Configuring AI tools...").start();
      if (!options.dryRun) {
        const mcpResult = await configureMCP(workspacePath, options.apiKey, options.dev, options.npm, skipPrompts, jsonMode, mcpSpinner);
        result.mcp = {
          ...result.mcp,
          ...mcpResult
        };
      } else {
        if (mcpSpinner) {
          mcpSpinner.info("Would configure detected AI tools");
        }
      }
      if (!jsonMode) {
      }
    }
    if (!options.dryRun) {
      const claudeSpinner = jsonMode ? null : ora("Generating Claude Code integration...").start();
      try {
        let baselineData;
        if (result.service.connected) {
          try {
            const client = getDaemonClient();
            const record = await client.call("baseline/get", {
              workspace: workspacePath
            });
            if (record?.fragileFiles !== void 0 || record?.coChangeClusters !== void 0) {
              baselineData = {
                fragileFiles: record.fragileFiles,
                coChangeClusters: record.coChangeClusters
              };
            }
          } catch {
          }
        }
        const claudeResult = generateClaudeIntegration({
          workspacePath,
          overwrite: false,
          includeChannel: false
        }, baselineData);
        if (claudeResult.filesWritten.length > 0) {
          if (claudeSpinner) {
            claudeSpinner.succeed(`Generated Claude Code integration (${claudeResult.filesWritten.length} files)`);
          }
          if (!jsonMode && !quiet) {
            for (const _f of claudeResult.filesWritten) {
            }
          }
        } else {
          if (claudeSpinner) {
            claudeSpinner.info("Claude Code integration already present");
          }
        }
      } catch {
        if (claudeSpinner) {
          claudeSpinner.warn("Claude Code integration skipped (non-fatal)");
        }
      }
      if (!jsonMode) {
      }
    }
    if (!options.dryRun && !skipPrompts) {
      const claudeDir = join(homedir(), ".claude");
      const hasClaudeCode = existsSync(claudeDir);
      if (hasClaudeCode) {
        try {
          const skillDir = join(homedir(), ".claude", "skills", "ground-truth");
          const skillPath = join(skillDir, "SKILL.md");
          if (existsSync(skillPath)) {
            if (!jsonMode) {
              ora().info("Ground Truth skill already installed");
            }
          } else {
            const installSkill = await clack.confirm({
              message: "Install the Ground Truth skill for Claude Code? (Recommended  -  helps Claude work effectively in this codebase)",
              initialValue: true
            });
            if (!clack.isCancel(installSkill) && installSkill === true) {
              mkdirSync(skillDir, {
                recursive: true
              });
              writeFileSync(skillPath, GROUND_TRUTH_SKILL_CONTENT, "utf8");
              if (!jsonMode) {
                ora().succeed(`Ground Truth skill installed at ${skillPath}`);
              }
            }
          }
        } catch (skillError) {
          const skillMessage = skillError instanceof Error ? skillError.message : String(skillError);
          if (!jsonMode) {
            ora().warn(`Ground Truth skill install failed (non-fatal): ${skillMessage}`);
          }
        }
      }
    }
    if (!options.dryRun) {
      try {
        await installHook("claude-code", workspacePath);
      } catch (err) {
        if (!jsonMode && !quiet) {
          console.warn(`[vr init] Hook installation skipped: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    if (!options.dryRun) {
      const fileCount = await countSourceFiles(workspacePath);
      result.detection.fileCount = fileCount;
      if (!jsonMode && !quiet) {
        const configuredTools = result.mcp.configured;
        const toolList = configuredTools.length > 0 ? configuredTools.join(", ") : null;
        const supervisorOk = result.service.supervisorInstalled !== false;
        console.log();
        console.log(chalk.green("  \u2713 Workspace registered"));
        if (supervisorOk) {
          console.log(chalk.green("  \u2713 Daemon running (supervised)"));
        } else {
          console.log(chalk.yellow("  \u26A0 Supervisor not installed (you may need to run vreko service install)"));
          console.log(chalk.green("  \u2713 Daemon running (this session only  -  will not restart on crash)"));
        }
        if (toolList) {
          console.log(chalk.green(`  \u2713 MCP config written to ${toolList}`));
        }
        console.log();
        console.log(chalk.cyan("  \u2192 Restart Claude Desktop once to load vreko."));
        console.log(chalk.cyan("     You won't need to do this again."));
        console.log();
        if (supervisorOk) {
          console.log(chalk.white("  vreko is now ready. Try asking your AI agent about this codebase."));
        } else {
          console.log(chalk.yellow("  vreko is running but unsupervised. Run `vr doctor` if you hit issues."));
        }
        console.log();
      }
    }
    const authStatus = checkAuthToken();
    if (!authStatus.hasToken && !jsonMode) {
      console.warn("\n\u26A0\uFE0F  Sync is configured but no API key was found.");
      console.warn("   Workspace metadata will not sync to the intelligence platform.");
      console.warn("   Run `vreko login` or set VREKO_API_KEY.\n");
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.success = false;
    result.error = message;
    return result;
  }
}
__name(runInit, "runInit");
function detectStack(workspacePath, verbose) {
  const stack = [];
  const result = {
    stack,
    monorepoType: "none",
    packageManager: "npm",
    gitRepo: false,
    gitRoot: null
  };
  const gitRoot = findGitRoot(workspacePath);
  if (gitRoot) {
    result.gitRepo = true;
    result.gitRoot = gitRoot;
  }
  const lockfiles = [
    [
      "pnpm-lock.yaml",
      "pnpm"
    ],
    [
      "bun.lockb",
      "bun"
    ],
    [
      "yarn.lock",
      "yarn"
    ],
    [
      "package-lock.json",
      "npm"
    ]
  ];
  for (const [file, pm] of lockfiles) {
    if (existsSync(join(workspacePath, file))) {
      result.packageManager = pm;
      break;
    }
  }
  const signals = [
    // [file/pattern, stack label, verbose detail]
    [
      "next.config.js",
      "Next.js"
    ],
    [
      "next.config.ts",
      "Next.js"
    ],
    [
      "next.config.mjs",
      "Next.js"
    ],
    [
      "nuxt.config.ts",
      "Nuxt"
    ],
    [
      "svelte.config.js",
      "SvelteKit"
    ],
    [
      "astro.config.mjs",
      "Astro"
    ],
    [
      "remix.config.js",
      "Remix"
    ],
    [
      "tsconfig.json",
      "TypeScript"
    ],
    [
      "Cargo.toml",
      "Rust"
    ],
    [
      "go.mod",
      "Go"
    ],
    [
      "pyproject.toml",
      "Python"
    ],
    [
      "requirements.txt",
      "Python"
    ],
    [
      "Gemfile",
      "Ruby"
    ],
    [
      "composer.json",
      "PHP"
    ],
    [
      "Package.swift",
      "Swift"
    ],
    [
      ".env",
      "env-config"
    ]
  ];
  const seen = /* @__PURE__ */ new Set();
  for (const [file, label] of signals) {
    if (!seen.has(label) && existsSync(join(workspacePath, file))) {
      stack.push(label);
      seen.add(label);
    }
  }
  const pkgPath = join(workspacePath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...pkg.dependencies || {},
        ...pkg.devDependencies || {}
      };
      const depSignals = [
        [
          "drizzle-orm",
          "Drizzle"
        ],
        [
          "prisma",
          "Prisma"
        ],
        [
          "pg",
          "PostgreSQL"
        ],
        [
          "mysql2",
          "MySQL"
        ],
        [
          "better-sqlite3",
          "SQLite"
        ],
        [
          "mongoose",
          "MongoDB"
        ],
        [
          "redis",
          "Redis"
        ],
        [
          "tailwindcss",
          "Tailwind"
        ],
        [
          "@trpc/server",
          "tRPC"
        ],
        [
          "express",
          "Express"
        ],
        [
          "fastify",
          "Fastify"
        ],
        [
          "hono",
          "Hono"
        ]
      ];
      for (const [dep, label] of depSignals) {
        if (!seen.has(label) && allDeps[dep]) {
          stack.push(label);
          seen.add(label);
        }
      }
    } catch {
    }
  }
  if (existsSync(join(workspacePath, "turbo.json"))) {
    result.monorepoType = "turborepo";
  } else if (existsSync(join(workspacePath, "nx.json"))) {
    result.monorepoType = "nx";
  } else if (existsSync(join(workspacePath, "lerna.json"))) {
    result.monorepoType = "lerna";
  } else if (existsSync(join(workspacePath, "pnpm-workspace.yaml"))) {
    result.monorepoType = "pnpm";
  }
  return result;
}
__name(detectStack, "detectStack");
function buildWorkspaceConfig(workspacePath, detected) {
  return {
    version: 1,
    workspace: {
      path: workspacePath,
      name: basename(workspacePath),
      stack: detected.stack,
      monorepoType: detected.monorepoType,
      packageManager: detected.packageManager
    },
    protection: {
      mode: "auto",
      level: "standard"
    },
    intelligence: {
      enabled: true
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    cliVersion
  };
}
__name(buildWorkspaceConfig, "buildWorkspaceConfig");
function ensureGitignore(workspacePath) {
  const gitignorePath = join(workspacePath, ".gitignore");
  const entry = ".vreko/";
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((l) => l.trim());
    if (lines.includes(entry) || lines.includes(".vreko")) {
      return false;
    }
    const suffix = content.endsWith("\n") ? "" : "\n";
    appendFileSync(gitignorePath, `${suffix}
# Vreko local data
${entry}
`);
    return true;
  }
  writeFileSync(gitignorePath, `# Vreko local data
${entry}
`);
  return true;
}
__name(ensureGitignore, "ensureGitignore");
async function startAndConnectDaemon(result, spinner) {
  try {
    const client = await connectToDaemon();
    const health = await client.health.check();
    result.version = health?.version ?? null;
    if (health?.supervisorMode === "extension") {
      try {
        execFileSync("vreko", [
          "service",
          "install"
        ], {
          stdio: "pipe",
          timeout: 15e3
        });
        result.supervisorInstalled = true;
      } catch {
        result.supervisorInstalled = false;
      }
    }
    return {
      connected: true
    };
  } catch {
    if (spinner) spinner.text = "Starting service...";
    try {
      execFileSync("vreko", [
        "service",
        "start",
        "-d"
      ], {
        stdio: "pipe",
        timeout: 1e4
      });
      result.started = true;
      const maxWait = 5e3;
      const interval = 200;
      let waited = 0;
      while (waited < maxWait) {
        try {
          const client = await connectToDaemon();
          const health = await client.health.check();
          result.version = health?.version ?? null;
          return {
            connected: true
          };
        } catch {
          await sleep(interval);
          waited += interval;
        }
      }
      return {
        connected: false
      };
    } catch (_startError) {
      result.errorMessage = _startError instanceof Error ? _startError.message : String(_startError);
      if (spinner) spinner.warn("Could not start service (init will continue without it)");
      return {
        connected: false
      };
    }
  }
}
__name(startAndConnectDaemon, "startAndConnectDaemon");
async function registerWorkspaceWithDaemon(workspacePath, spinner, jsonMode, result) {
  try {
    const client = getDaemonClient();
    if (client) {
      await client.call("workspace/init", {
        workspace: workspacePath
      });
      result.workspaceRegistered = true;
      if (!jsonMode && spinner) ora().succeed("Workspace registered");
    }
  } catch (_regError) {
    result.workspaceRegistered = false;
    if (!jsonMode) ora().warn("Workspace registration failed (service may need restart)");
  }
}
__name(registerWorkspaceWithDaemon, "registerWorkspaceWithDaemon");
async function registerWithDaemon(_workspacePath, spinner, jsonMode) {
  const result = {
    started: false,
    connected: false,
    workspaceRegistered: false,
    version: null
  };
  try {
    const { connected } = await startAndConnectDaemon(result, spinner);
    if (!connected) {
      if (!result.errorMessage) {
        result.errorMessage = "Service did not respond after start";
        if (spinner) spinner.warn("Service did not respond (init will continue without it)");
      }
      return result;
    }
    result.connected = true;
    if (spinner) {
      spinner.succeed(`Service running (v${result.version ?? "unknown"}, pid ${await getDaemonPid()})`);
    }
    await registerWorkspaceWithDaemon(_workspacePath, spinner, jsonMode, result);
    return result;
  } catch (_error) {
    result.errorMessage = _error instanceof Error ? _error.message : String(_error);
    if (spinner) spinner.warn("Service connection failed");
    return result;
  }
}
__name(registerWithDaemon, "registerWithDaemon");
async function getDaemonPid() {
  const pidPath = getServicePidPath();
  try {
    return readFileSync(pidPath, "utf-8").trim();
  } catch {
    return "?";
  }
}
__name(getDaemonPid, "getDaemonPid");
async function configureMCP(workspacePath, apiKey, devMode, npmMode, _skipPrompts, jsonMode, spinner) {
  const result = {
    clients: {},
    configured: []
  };
  try {
    const detection = detectAIClients({
      cwd: workspacePath
    });
    if (detection.detected.length === 0) {
      if (spinner) {
        spinner.info("No AI tools detected (MCP configuration skipped)");
      }
      return result;
    }
    if (spinner) {
      spinner.stop();
    }
    for (const client of detection.needsSetup) {
      const clientSpinner = jsonMode ? null : ora(`  ${client.displayName}...`).start();
      if (client.hasVreko) {
        result.clients[client.name] = "already_configured";
        if (clientSpinner) {
          clientSpinner.succeed(`${client.displayName} already configured`);
        }
        continue;
      }
      try {
        const mcpConfig = getVrekoMCPConfig({
          apiKey,
          useNpx: !!npmMode,
          useLocalDev: !!devMode,
          workspaceRoot: workspacePath,
          client: client.format
        });
        const writeResult = writeClientConfig(client, mcpConfig);
        if (writeResult.success) {
          result.clients[client.name] = "configured";
          result.configured.push(client.name);
          if (clientSpinner) {
            clientSpinner.succeed(`${client.displayName} configured`);
          }
        } else {
          result.clients[client.name] = "failed";
          if (clientSpinner) {
            clientSpinner.fail(`${client.displayName} failed: ${writeResult.error}`);
          }
        }
      } catch (_error) {
        result.clients[client.name] = "failed";
        if (clientSpinner) {
          clientSpinner.fail(`${client.displayName} failed`);
        }
      }
    }
    for (const client of detection.clients) {
      if (!client.exists && !jsonMode) {
        result.clients[client.name] = "not_installed";
      }
    }
    return result;
  } catch (_error) {
    if (spinner) {
      spinner.warn("MCP configuration failed (non-fatal)");
    }
    return result;
  }
}
__name(configureMCP, "configureMCP");
async function countSourceFiles(workspacePath) {
  const extensions = /* @__PURE__ */ new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".rs",
    ".go",
    ".rb",
    ".php",
    ".swift",
    ".java",
    ".kt",
    ".vue",
    ".svelte"
  ]);
  const skip = /* @__PURE__ */ new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".vreko",
    "target",
    "__pycache__"
  ]);
  let count = 0;
  async function walk(dir) {
    try {
      const entries = await readdir(dir, {
        withFileTypes: true
      });
      for (const e of entries) {
        if (skip.has(e.name)) {
          continue;
        }
        if (e.isDirectory()) {
          await walk(join(dir, e.name));
        } else if (extensions.has(extname(e.name))) {
          count++;
        }
      }
    } catch {
    }
  }
  __name(walk, "walk");
  await walk(workspacePath);
  return count;
}
__name(countSourceFiles, "countSourceFiles");
function sleep(ms) {
  return new Promise((resolve3) => setTimeout(resolve3, ms));
}
__name(sleep, "sleep");
function checkAuthToken() {
  if (process.env.VREKO_SERVICE_TOKEN) {
    return {
      hasToken: true,
      source: "env-service"
    };
  }
  if (process.env.VREKO_API_KEY) {
    return {
      hasToken: true,
      source: "env-api"
    };
  }
  try {
    const authPath = join(homedir(), ".vreko", "auth.json");
    if (existsSync(authPath)) {
      const authContent = readFileSync(authPath, "utf-8");
      const auth = JSON.parse(authContent);
      if (auth.token) {
        return {
          hasToken: true,
          source: "auth-file"
        };
      }
    }
  } catch {
  }
  return {
    hasToken: false,
    source: "none"
  };
}
__name(checkAuthToken, "checkAuthToken");
function fail(spinner, result, message) {
  result.success = false;
  result.error = message;
  if (spinner) {
    spinner.fail(message);
  }
}
__name(fail, "fail");

export { createHooksCommand, createInitCommand, findWorkspaceRoot, generateClaudeIntegration, resolveWorkspaceRoot };
//# sourceMappingURL=chunk-AWWND52L.js.map
//# sourceMappingURL=chunk-AWWND52L.js.map