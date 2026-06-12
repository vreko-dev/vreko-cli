/**
 * Init Command
 *
 * Ecosystem bootstrapper  -  one command to make a workspace fully operational.
 * Detects stack, creates config, registers with service, configures MCP.
 *
 * CANONICAL INSTALL CONTRACT (R-P0-3):
 * `vr init` is the self-sufficient installer. It is the ONLY single action that
 * wires a *complete* workspace, writing BOTH the MCP client config (registering
 * the `vreko` MCP server) AND the `PostToolUse` per-edit hook into
 * `.claude/settings.json` (via installHook). Together these produce a fully
 * wired intelligence pipeline.
 *
 * Plugin-only installation (`/plugin install vreko` without `vr init`) is a
 * KNOWN-INCOMPLETE state, not a supported happy path: the plugin registers the
 * MCP server but installs no PostToolUse hook, so per-edit activity never
 * reaches the daemon and intelligence never updates. `vr status` surfaces a
 * warning when the MCP server is registered but the PostToolUse hook is absent;
 * that warning means "run vr init". See R-SEAM-2 for the assertion and
 * apps/claude-code-plugin/INSTALL.md for the user-facing contract.
 *
 * Follows thin-client pattern: CLI owns all logic, extension delegates via --json.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import * as clack from "@clack/prompts";
// Reuse detection and MCP config from mcp-config package
import { detectAIClients, getVrekoMCPConfig, writeClientConfig } from "@vreko/mcp-config";
import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
import { cliState } from "../../cli-state.js";
import { getServicePidPath } from "../../service-adapter/local-service-adapter";
import { generateClaudeIntegration } from "../../services/claude-integration.js";
// Reuse service client
import { connectToDaemon, getDaemonClient } from "../../services/service-client";
// Workspace utilities
import { findGitRoot } from "../../utils/workspace";
import { installHook } from "../hooks.js";

// =============================================================================
// GROUND TRUTH SKILL CONTENT
// DO NOT summarize or paraphrase  -  skill frontmatter is required for Claude Code activation
// =============================================================================

const GROUND_TRUTH_SKILL_CONTENT = `---
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
3. Synthesize a ≤200-word briefing covering: what this codebase is, what's fragile, what the agent has learned about it, what the user should be aware of before working.
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
  [A1] <command> → <summary of output>
  [A2] <command> → <summary of output>
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
  [V1] <command> → PASS / FAIL
  [V2] <command> → PASS / FAIL
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

**Output format:** Brief prose, no tables. Example: "Pulse check: you're in \`auth/session.ts\`, which was rolled back 4× in the last 90 days. Co-change partner \`auth/middleware.ts\` hasn't been touched yet  -  if you're refactoring session logic, middleware probably needs coordination. No other warnings."

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
  • <item>
  • <item>
\`\`\`

**Anti-pattern:** Do not skip the closing ceremony just because the session was short. Short sessions often have the most valuable learnings.

## How workflows compose

A typical disciplined coding session looks like:

1. User states intent → Claude runs \`ground-truth brief\`.
2. Before significant changes → Claude runs \`ground-truth audit\` on the scope.
3. Mid-session, at file-change boundaries → Claude runs \`ground-truth check\`.
4. After implementation → Claude runs \`ground-truth verify\`.
5. At session end → Claude runs \`ground-truth close\`.

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

// =============================================================================
// TYPES
// =============================================================================

export interface InitJsonResult {
	success: boolean;
	version: string;
	workspace: {
		path: string;
		alreadyInitialized: boolean;
		reinitialized: boolean;
	};
	detection: {
		stack: string[];
		monorepoType: string;
		packageManager: string;
		gitRepo: boolean;
		gitRoot: string | null;
		fileCount: number;
	};
	configuration: {
		configCreated: boolean;
		gitignoreUpdated: boolean;
		ctxStubCreated: boolean;
	};
	service: {
		started: boolean;
		connected: boolean;
		workspaceRegistered: boolean;
		version: string | null;
		skipped: boolean;
		/** undefined = not attempted; true = installed; false = install failed */
		supervisorInstalled?: boolean;
	};
	mcp: {
		clients: Record<string, "configured" | "already_configured" | "not_installed" | "failed">;
		configured: string[];
		skipped: boolean;
	};
	errors: string[];
	error?: string;
}

interface DetectedStack {
	stack: string[];
	monorepoType: string;
	packageManager: string;
	gitRepo: boolean;
	gitRoot: string | null;
}

// Version resolution (same pattern as other commands)
declare const __CLI_VERSION__: string | undefined;
const cliVersion =
	typeof __CLI_VERSION__ !== "undefined"
		? __CLI_VERSION__
		: (() => {
				try {
					return (require("../../package.json") as { version: string }).version ?? "0.0.0";
				} catch {
					return "0.0.0-dev";
				}
			})();

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

export function createInitCommand(): Command {
	return new Command("init")
		.description("Bootstrap Vreko for a repository")
		.argument("[path]", "Workspace path (default: current directory)")
		.option("-y, --yes", "Skip confirmation prompts")
		.option("--non-interactive", "Run without prompts (extension/automation)")
		.option("--json", "Output structured JSON result")
		.option("--dry-run", "Show what would be configured")
		.option("--force", "Re-initialize even if already set up")
		.option("--skip-mcp", "Skip MCP configuration")
		.option("--skip-service", "Skip service registration")
		.option("--api-key <key>", "API key for Pro features")
		.option("--dev", "Use local dev mode for MCP")
		.option("--npm", "Use npm/npx mode for MCP")
		.option("-q, --quiet", "Suppress informational output")
		.option("-v, --verbose", "Show detailed detection reasoning")
		.action(async (path: string | undefined, options) => {
			const result = await runInit(path, options);
			if (options.json) {
				console.log(JSON.stringify(result, null, 2));
			}
			if (!result.success) {
				process.exit(1);
			}
		});
}

// =============================================================================
// CORE INIT LOGIC
// =============================================================================

async function runInit(
	pathArg: string | undefined,
	options: {
		yes?: boolean;
		nonInteractive?: boolean;
		json?: boolean;
		dryRun?: boolean;
		force?: boolean;
		skipMcp?: boolean;
		skipService?: boolean;
		apiKey?: string;
		dev?: boolean;
		npm?: boolean;
		quiet?: boolean;
		verbose?: boolean;
	},
): Promise<InitJsonResult> {
	const jsonMode = !!options.json;
	const skipPrompts = !!options.yes || !!options.nonInteractive || cliState.yes;
	const quiet = !!options.quiet;
	const verbose = !!options.verbose;

	const result: InitJsonResult = {
		success: true,
		version: cliVersion,
		workspace: { path: "", alreadyInitialized: false, reinitialized: false },
		detection: {
			stack: [],
			monorepoType: "none",
			packageManager: "npm",
			gitRepo: false,
			gitRoot: null,
			fileCount: 0,
		},
		configuration: { configCreated: false, gitignoreUpdated: false, ctxStubCreated: false },
		service: {
			started: false,
			connected: false,
			workspaceRegistered: false,
			version: null,
			skipped: !!options.skipService,
		},
		mcp: { clients: {}, configured: [], skipped: !!options.skipMcp },
		errors: [],
	};

	try {
		// =========================================================================
		// PHASE 1: WORKSPACE DETECTION
		// =========================================================================
		const spinner = jsonMode ? null : ora("Detecting workspace...").start();

		const workspacePath = resolve(pathArg || process.cwd());
		result.workspace.path = workspacePath;

		// Validate path exists and is a directory
		if (!existsSync(workspacePath)) {
			fail(spinner, result, `Path does not exist: ${workspacePath}`);
			return result;
		}
		if (!statSync(workspacePath).isDirectory()) {
			fail(spinner, result, `Path is not a directory: ${workspacePath}`);
			return result;
		}

		// Check if already initialized
		const vrekoDir = join(workspacePath, ".vreko");
		const configPath = join(vrekoDir, "config.json");
		const alreadyInitialized = existsSync(configPath);
		result.workspace.alreadyInitialized = alreadyInitialized;

		if (alreadyInitialized && options.force) {
			result.workspace.reinitialized = true;
		}

		// Detect stack
		const detected = detectStack(workspacePath, verbose && !jsonMode);
		result.detection = { ...detected, fileCount: 0 };

		if (spinner) {
			spinner.succeed("Workspace detected");
		}

		if (!jsonMode && !quiet) {
			if (detected.stack.length > 0) {
				// intentionally empty
			}
			if (detected.monorepoType !== "none") {
				// intentionally empty
			}
		}

		// Data-collection consent (D-14 / G-01)
		if (!jsonMode && !options.dryRun) {
			if (options.nonInteractive) {
				// Non-interactive: print consent notice to stderr so it doesn't pollute JSON
				process.stderr.write(
					[
						"",
						"Vreko data notice:",
						"  • Session metadata (timing, file counts, risk scores) is collected locally.",
						"  • No file contents or source code ever leave your device.",
						"  • Cloud sync is opt-in and syncs metadata only.",
						"  • Run `vreko purge` at any time to delete all local data.",
						"  • Privacy policy: https://vreko.dev/privacy",
						"",
					].join("\n"),
				);
			} else if (!skipPrompts) {
				// Interactive: clack consent confirm before the proceed question
				const consentResult = await clack.confirm({
					message:
						"Vreko collects session metadata (timing, file counts, risk scores) locally. No file contents leave your device. Agree to continue?",
					initialValue: true,
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

		// Interactive confirmation
		if (!skipPrompts && !options.dryRun) {
			const proceedResult = await clack.confirm({
				message: `Initialize Vreko for ${basename(workspacePath)}?`,
				initialValue: true,
			});
			if (clack.isCancel(proceedResult)) {
				clack.cancel("Cancelled.");
				return result;
			}
			if (!proceedResult) {
				return result;
			}
		}

		// =========================================================================
		// PHASE 2: CONFIGURATION
		// =========================================================================
		const configSpinner = jsonMode ? null : ora("Configuring workspace...").start();

		if (!options.dryRun) {
			// Create .vreko/ directory
			mkdirSync(vrekoDir, { recursive: true });

			// Write config.json; skip on subsequent runs unless --force is passed
			if (!alreadyInitialized || options.force) {
				const config = buildWorkspaceConfig(workspacePath, detected);
				writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
				result.configuration.configCreated = true;
			}
			if (configSpinner) {
				configSpinner.succeed("Created .vreko/config.json");
			}

			// Update .gitignore
			if (detected.gitRepo) {
				const gitignoreUpdated = ensureGitignore(workspacePath);
				result.configuration.gitignoreUpdated = gitignoreUpdated;
				if (!jsonMode && gitignoreUpdated) {
					ora().succeed("Updated .gitignore");
				}
			}

			// Create .ctx stub
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
			// intentionally empty
		}

		// =========================================================================
		// PHASE 3: DAEMON REGISTRATION
		// =========================================================================
		if (!options.skipService) {
			const daemonSpinner = jsonMode ? null : ora("Connecting to service...").start();

			if (!options.dryRun) {
				const daemonResult = await registerWithDaemon(workspacePath, daemonSpinner, jsonMode);
				result.service = { ...result.service, ...daemonResult };

				if (!daemonResult.connected) {
					const daemonErrorMsg =
						"⚠ Service could not be reached  -  Vreko is initialized but workspace sync is disabled. Run `vr service start` to enable syncing." +
						(daemonResult.errorMessage ? ` ${daemonResult.errorMessage}` : "");
					if (!jsonMode) {
						console.warn(daemonErrorMsg);
					}
					result.errors.push("Service connection failed  -  init completed without service registration");
				} else {
					// Seed knowledge.db chunks from global template into workspace DB.
					// Non-fatal  -  workspace is still usable if seeding fails.
					try {
						const client = getDaemonClient();
						if (client) {
							const seedResult = await client.call<{ seeded: number; alreadyPresent: number }>(
								"workspace/seed-knowledge",
								{ workspace: workspacePath },
							);
							if (!jsonMode && seedResult.seeded > 0) {
								ora().succeed(`Seeded ${seedResult.seeded} intelligence patterns into workspace`);
							}

							// Trigger immediate workspace.json write to ensure it exists after init.
							// Emits a synthetic workspace.initialized event to bypass the 5-minute debounce.
							try {
								await client.call<{ triggered: boolean }>("workspace/trigger-workspace-json-write", {
									workspace: workspacePath,
								});
							} catch (error) {
								console.warn("init-core: workspace/trigger-workspace-json-write failed (non-fatal)", {
									error,
								});
							}

							// Trigger bootstrap write with service-side scan intelligence.
							// Default: additive merge (preserves live observations, overlays scan data).
							// With --force: full reset to BOOTSTRAP state.
							// Non-fatal: falls back to empty workspace.json written by trigger-workspace-json-write above.
							try {
								await client.call<{ triggered: boolean }>("workspace/write-from-scan-profile", {
									workspace: workspacePath,
									...(options.force && { force: true }),
								});
							} catch (error) {
								console.warn("init-core: workspace/write-from-scan-profile failed (non-fatal)", {
									error,
								});
							}
						}
					} catch (error) {
						console.warn("init-core: knowledge seeding failed (non-fatal)", { error });
					}
				}
			} else {
				if (daemonSpinner) {
					daemonSpinner.info("Would register workspace with service");
				}
			}

			if (!jsonMode) {
				// intentionally empty
			}
		}

		// =========================================================================
		// PHASE 4: MCP CONFIGURATION
		// =========================================================================
		if (!options.skipMcp) {
			const mcpSpinner = jsonMode ? null : ora("Configuring AI tools...").start();

			if (!options.dryRun) {
				const mcpResult = await configureMCP(
					workspacePath,
					options.apiKey,
					options.dev,
					options.npm,
					skipPrompts,
					jsonMode,
					mcpSpinner,
				);
				result.mcp = { ...result.mcp, ...mcpResult };
			} else {
				if (mcpSpinner) {
					mcpSpinner.info("Would configure detected AI tools");
				}
			}

			if (!jsonMode) {
				// intentionally empty
			}
		}

		// =========================================================================
		// PHASE 4.5: CLAUDE CODE INTEGRATION
		// =========================================================================
		if (!options.dryRun) {
			const claudeSpinner = jsonMode ? null : ora("Generating Claude Code integration...").start();

			try {
				// Fetch baseline data for intelligence enrichment (non-blocking)
				let baselineData:
					| {
							fragileFiles?: Array<{ path: string; compositeScore: number }>;
							coChangeClusters?: Array<{ files: string[]; coOccurrenceRate: number }>;
					  }
					| undefined;

				if (result.service.connected) {
					try {
						const client = getDaemonClient();
						const record = await client.call<{
							fragileFiles?: Array<{ path: string; compositeScore: number }>;
							coChangeClusters?: Array<{ files: string[]; coOccurrenceRate: number }>;
						}>("baseline/get", { workspace: workspacePath });

						if (record?.fragileFiles !== undefined || record?.coChangeClusters !== undefined) {
							baselineData = {
								fragileFiles: record.fragileFiles,
								coChangeClusters: record.coChangeClusters,
							};
						}
					} catch {
						// Non-fatal  -  baseline may not exist yet for a fresh workspace
					}
				}

				const claudeResult = generateClaudeIntegration(
					{ workspacePath, overwrite: false, includeChannel: false },
					baselineData,
				);

				if (claudeResult.filesWritten.length > 0) {
					if (claudeSpinner) {
						claudeSpinner.succeed(
							`Generated Claude Code integration (${claudeResult.filesWritten.length} files)`,
						);
					}
					if (!jsonMode && !quiet) {
						for (const _f of claudeResult.filesWritten) {
							// intentionally empty
						}
					}
				} else {
					if (claudeSpinner) {
						claudeSpinner.info("Claude Code integration already present");
					}
				}
			} catch {
				// Non-fatal  -  init succeeds even if Claude integration generation fails
				if (claudeSpinner) {
					claudeSpinner.warn("Claude Code integration skipped (non-fatal)");
				}
			}

			if (!jsonMode) {
				// intentionally empty
			}
		}

		// =========================================================================
		// PHASE 4.75: GROUND TRUTH SKILL INSTALLATION (Claude Code users only)
		// =========================================================================
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
							message:
								"Install the Ground Truth skill for Claude Code? (Recommended  -  helps Claude work effectively in this codebase)",
							initialValue: true,
						});

						if (!clack.isCancel(installSkill) && installSkill === true) {
							mkdirSync(skillDir, { recursive: true });
							writeFileSync(skillPath, GROUND_TRUTH_SKILL_CONTENT, "utf8");
							if (!jsonMode) {
								ora().succeed(`Ground Truth skill installed at ${skillPath}`);
							}
						}
					}
				} catch (skillError) {
					// Non-fatal  -  log warning and continue init
					const skillMessage = skillError instanceof Error ? skillError.message : String(skillError);
					if (!jsonMode) {
						ora().warn(`Ground Truth skill install failed (non-fatal): ${skillMessage}`);
					}
				}
			}
		}

		// =========================================================================
		// PHASE 4.9: CLAUDE CODE HOOK INSTALLATION
		// =========================================================================
		if (!options.dryRun) {
			try {
				await installHook("claude-code", workspacePath);
			} catch (err) {
				// Non-fatal  -  hook install failure must not block workspace init
				if (!jsonMode && !quiet) {
					console.warn(
						`[vr init] Hook installation skipped: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			}
		}

		// =========================================================================
		// PHASE 5: VERIFICATION & SUMMARY
		// =========================================================================
		if (!options.dryRun) {
			const fileCount = await countSourceFiles(workspacePath);
			result.detection.fileCount = fileCount;

			if (!jsonMode && !quiet) {
				// R6.1 / R6.2  -  Final activation summary
				const configuredTools = result.mcp.configured;
				const toolList = configuredTools.length > 0 ? configuredTools.join(", ") : null;
				const supervisorOk = result.service.supervisorInstalled !== false;

				console.log();
				console.log(chalk.green("  ✓ Workspace registered"));
				if (supervisorOk) {
					console.log(chalk.green("  ✓ Daemon running (supervised)"));
				} else {
					console.log(
						chalk.yellow("  ⚠ Supervisor not installed (you may need to run vreko service install)"),
					);
					console.log(chalk.green("  ✓ Daemon running (this session only  -  will not restart on crash)"));
				}
				if (toolList) {
					console.log(chalk.green(`  ✓ MCP config written to ${toolList}`));
				}
				console.log();
				console.log(chalk.cyan("  → Restart Claude Desktop once to load vreko."));
				console.log(chalk.cyan("     You won't need to do this again."));
				console.log();
				if (supervisorOk) {
					console.log(chalk.white("  vreko is now ready. Try asking your AI agent about this codebase."));
				} else {
					console.log(
						chalk.yellow("  vreko is running but unsupervised. Run `vr doctor` if you hit issues."),
					);
				}
				console.log();
			}
		}

		// =========================================================================
		// PHASE 5.5: AUTH TOKEN CHECK
		// =========================================================================
		const authStatus = checkAuthToken();
		if (!authStatus.hasToken && !jsonMode) {
			console.warn("\n⚠️  Sync is configured but no API key was found.");
			console.warn("   Workspace metadata will not sync to the intelligence platform.");
			console.warn("   Run `vreko login` or set VREKO_API_KEY.\n");
		}

		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		result.success = false;
		result.error = message;
		if (!jsonMode) {
			// intentionally empty
		}
		return result;
	}
}

// =============================================================================
// STACK DETECTION
// =============================================================================

function detectStack(workspacePath: string, verbose: boolean): DetectedStack {
	const stack: string[] = [];
	const result: DetectedStack = {
		stack,
		monorepoType: "none",
		packageManager: "npm",
		gitRepo: false,
		gitRoot: null,
	};

	// Git detection using utility
	const gitRoot = findGitRoot(workspacePath);
	if (gitRoot) {
		result.gitRepo = true;
		result.gitRoot = gitRoot;
		if (verbose) {
			// intentionally empty
		}
	}

	// Package manager detection (check lockfiles in priority order)
	const lockfiles: [string, string][] = [
		["pnpm-lock.yaml", "pnpm"],
		["bun.lockb", "bun"],
		["yarn.lock", "yarn"],
		["package-lock.json", "npm"],
	];
	for (const [file, pm] of lockfiles) {
		if (existsSync(join(workspacePath, file))) {
			result.packageManager = pm;
			if (verbose) {
				// intentionally empty
			}
			break;
		}
	}

	// Stack detection via file presence
	const signals: [string, string, string?][] = [
		// [file/pattern, stack label, verbose detail]
		["next.config.js", "Next.js"],
		["next.config.ts", "Next.js"],
		["next.config.mjs", "Next.js"],
		["nuxt.config.ts", "Nuxt"],
		["svelte.config.js", "SvelteKit"],
		["astro.config.mjs", "Astro"],
		["remix.config.js", "Remix"],
		["tsconfig.json", "TypeScript"],
		["Cargo.toml", "Rust"],
		["go.mod", "Go"],
		["pyproject.toml", "Python"],
		["requirements.txt", "Python"],
		["Gemfile", "Ruby"],
		["composer.json", "PHP"],
		["Package.swift", "Swift"],
		[".env", "env-config"],
	];

	const seen = new Set<string>();
	for (const [file, label] of signals) {
		if (!seen.has(label) && existsSync(join(workspacePath, file))) {
			stack.push(label);
			seen.add(label);
		}
	}

	// Database detection from package.json dependencies
	const pkgPath = join(workspacePath, "package.json");
	if (existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			const allDeps = {
				...(pkg.dependencies || {}),
				...(pkg.devDependencies || {}),
			};

			const depSignals: [string, string][] = [
				["drizzle-orm", "Drizzle"],
				["prisma", "Prisma"],
				["pg", "PostgreSQL"],
				["mysql2", "MySQL"],
				["better-sqlite3", "SQLite"],
				["mongoose", "MongoDB"],
				["redis", "Redis"],
				["tailwindcss", "Tailwind"],
				["@trpc/server", "tRPC"],
				["express", "Express"],
				["fastify", "Fastify"],
				["hono", "Hono"],
			];

			for (const [dep, label] of depSignals) {
				if (!seen.has(label) && allDeps[dep]) {
					stack.push(label);
					seen.add(label);
				}
			}
		} catch {
			// Invalid package.json  -  skip dependency detection
		}
	}

	// Monorepo detection
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
// =============================================================================
// WORKSPACE CONFIG
// =============================================================================

interface WorkspaceConfig {
	version: 1;
	workspace: {
		path: string;
		name: string;
		stack: string[];
		monorepoType: string;
		packageManager: string;
	};
	protection: {
		mode: "auto";
		level: "standard";
	};
	intelligence: {
		enabled: true;
	};
	createdAt: string;
	cliVersion: string;
}

function buildWorkspaceConfig(workspacePath: string, detected: DetectedStack): WorkspaceConfig {
	return {
		version: 1,
		workspace: {
			path: workspacePath,
			name: basename(workspacePath),
			stack: detected.stack,
			monorepoType: detected.monorepoType,
			packageManager: detected.packageManager,
		},
		protection: {
			mode: "auto",
			level: "standard",
		},
		intelligence: {
			enabled: true,
		},
		createdAt: new Date().toISOString(),
		cliVersion,
	};
}

// =============================================================================
// GITIGNORE MANAGEMENT
// =============================================================================

function ensureGitignore(workspacePath: string): boolean {
	const gitignorePath = join(workspacePath, ".gitignore");
	const entry = ".vreko/";

	if (existsSync(gitignorePath)) {
		const content = readFileSync(gitignorePath, "utf-8");
		// Check if .vreko/ is already ignored (exact line match)
		const lines = content.split("\n").map((l) => l.trim());
		if (lines.includes(entry) || lines.includes(".vreko")) {
			return false; // already present
		}
		// Append with section comment
		const suffix = content.endsWith("\n") ? "" : "\n";
		appendFileSync(gitignorePath, `${suffix}\n# Vreko local data\n${entry}\n`);
		return true;
	}
	// Create .gitignore with vreko entry
	writeFileSync(gitignorePath, `# Vreko local data\n${entry}\n`);
	return true;
}

// =============================================================================
// DAEMON REGISTRATION
// =============================================================================

interface DaemonRegistrationResult {
	started: boolean;
	connected: boolean;
	workspaceRegistered: boolean;
	version: string | null;
	errorMessage?: string;
	/** true if supervisor was installed during this init run; false if already present or install failed */
	supervisorInstalled?: boolean;
}

async function startAndConnectDaemon(
	result: DaemonRegistrationResult,
	spinner: Ora | null,
): Promise<{ connected: boolean }> {
	try {
		const client = await connectToDaemon();
		const health = await client.health.check();
		result.version = health?.version ?? null;
		// R2.3: If no OS supervisor detected, attempt to install one.
		// Handles --ignore-scripts, pnpm global, or manual plist deletion.
		// Non-fatal: init continues regardless of supervisor install result.
		if (health?.supervisorMode === "extension") {
			try {
				execFileSync("vreko", ["service", "install"], { stdio: "pipe", timeout: 15000 });
				result.supervisorInstalled = true;
			} catch {
				// Supervisor install failed  -  non-fatal, continue init
				result.supervisorInstalled = false;
			}
		}
		return { connected: true };
	} catch {
		// Daemon not running  -  attempt to start it
		if (spinner) spinner.text = "Starting service...";
		try {
			execFileSync("vreko", ["service", "start", "-d"], { stdio: "pipe", timeout: 10000 });
			result.started = true;
			// Poll until ready
			const maxWait = 5000;
			const interval = 200;
			let waited = 0;
			while (waited < maxWait) {
				try {
					const client = await connectToDaemon();
					const health = await client.health.check();
					result.version = health?.version ?? null;
					return { connected: true };
				} catch {
					await sleep(interval);
					waited += interval;
				}
			}
			return { connected: false };
		} catch (_startError) {
			result.errorMessage = _startError instanceof Error ? _startError.message : String(_startError);
			if (spinner) spinner.warn("Could not start service (init will continue without it)");
			return { connected: false };
		}
	}
}

async function registerWorkspaceWithDaemon(
	workspacePath: string,
	spinner: Ora | null,
	jsonMode: boolean,
	result: DaemonRegistrationResult,
): Promise<void> {
	try {
		const client = getDaemonClient();
		if (client) {
			await client.call<{ initialized: boolean }>("workspace/init", { workspace: workspacePath });
			result.workspaceRegistered = true;
			if (!jsonMode && spinner) ora().succeed("Workspace registered");
		}
	} catch (_regError) {
		result.workspaceRegistered = false;
		if (!jsonMode) ora().warn("Workspace registration failed (service may need restart)");
	}
}

async function registerWithDaemon(
	_workspacePath: string,
	spinner: Ora | null,
	jsonMode: boolean,
): Promise<DaemonRegistrationResult> {
	const result: DaemonRegistrationResult = {
		started: false,
		connected: false,
		workspaceRegistered: false,
		version: null,
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

async function getDaemonPid(): Promise<string> {
	const pidPath = getServicePidPath();
	try {
		return readFileSync(pidPath, "utf-8").trim();
	} catch {
		return "?";
	}
}

// =============================================================================
// MCP CONFIGURATION (delegates to mcp-config package)
// =============================================================================

interface MCPConfigResult {
	clients: Record<string, "configured" | "already_configured" | "not_installed" | "failed">;
	configured: string[];
}

async function configureMCP(
	workspacePath: string,
	apiKey: string | undefined,
	devMode: boolean | undefined,
	npmMode: boolean | undefined,
	_skipPrompts: boolean,
	jsonMode: boolean,
	spinner: Ora | null,
): Promise<MCPConfigResult> {
	const result: MCPConfigResult = { clients: {}, configured: [] };

	try {
		const detection = detectAIClients({ cwd: workspacePath });

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
					client: client.format,
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

		// Show not-installed clients in verbose
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

// =============================================================================
// UTILITIES
// =============================================================================

async function countSourceFiles(workspacePath: string): Promise<number> {
	const extensions = new Set([
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
		".svelte",
	]);
	const skip = new Set(["node_modules", ".git", "dist", "build", ".vreko", "target", "__pycache__"]);
	let count = 0;
	async function walk(dir: string): Promise<void> {
		try {
			const entries = await readdir(dir, { withFileTypes: true });
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
			// Unreadable directory  -  skip silently
		}
	}
	await walk(workspacePath);
	return count;
}

function _capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// AUTH TOKEN CHECK
// =============================================================================

interface AuthStatus {
	hasToken: boolean;
	source: "env-service" | "env-api" | "auth-file" | "none";
}

/**
 * Check for auth token in environment or auth.json file.
 * Resolution order: VREKO_SERVICE_TOKEN -> VREKO_API_KEY -> ~/.vreko/auth.json
 */
function checkAuthToken(): AuthStatus {
	// Check environment variables first
	if (process.env.VREKO_SERVICE_TOKEN) {
		return { hasToken: true, source: "env-service" };
	}
	if (process.env.VREKO_API_KEY) {
		return { hasToken: true, source: "env-api" };
	}

	// Check auth.json file
	try {
		const authPath = join(homedir(), ".vreko", "auth.json");
		if (existsSync(authPath)) {
			const authContent = readFileSync(authPath, "utf-8");
			const auth = JSON.parse(authContent) as { token?: string };
			if (auth.token) {
				return { hasToken: true, source: "auth-file" };
			}
		}
	} catch {
		// File doesn't exist or is invalid  -  no token
	}

	return { hasToken: false, source: "none" };
}

function fail(spinner: Ora | null, result: InitJsonResult, message: string): void {
	result.success = false;
	result.error = message;
	if (spinner) {
		spinner.fail(message);
	}
}
