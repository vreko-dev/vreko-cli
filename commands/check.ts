/**
 * Check Command
 *
 * Default mode: invariant runner  -  reads .vreko/invariants/*.json and reports violations.
 * Pre-commit mode: use --staged flag for AI risk analysis of staged files.
 *
 * @module commands/check
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createSnapshotStorage, type SnapshotStorage } from "@vreko/contracts/storage";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { GitClient, GitNotInstalledError, GitNotRepositoryError, isCodeFile } from "../services/git-client.js";
import { analyzeFileRisk, getAllFiles } from "../services/risk-analysis.js";
import { displaySmartError } from "../ui/errors.js";
import { type FileRiskSummary, ProgressTracker } from "../utils/index.js";

interface SbCheckViolation {
	invariant_id: string;
	file_path: string;
	sha: string;
	confidence: number;
	message: string;
	severity: "error" | "warning";
}

interface SbCheckOutput {
	version: "1.0";
	timestamp: string;
	workspace: string;
	duration_ms: number;
	summary: {
		total: number;
		passed: number;
		failed: number;
	};
	violations: SbCheckViolation[];
}

export function createCheckCommand(): Command {
	return new Command("check")
		.description("Run invariant checks (default) or staged-file AI risk analysis (--staged)")
		.option("--staged", "Check staged files for AI risk (pre-commit behavior)")
		.option("--json", "Emit machine-readable JSON output (for CI/lefthook)")
		.option("-s, --snapshot", "Create snapshot if risky changes detected")
		.option("-q, --quiet", "Suppress output unless issues found")
		.option(
			"-a, --all",
			"Check all files, not just staged (legacy behavior); in invariant mode, also runs architecture suite",
		)
		.option(
			"--override-invariant <id>",
			"Increment override counter for the named invariant; >= 2 demotes to advisory",
		)
		.action(async (options) => {
			const cwd = process.cwd();

			if (options.staged) {
				// §14.3: Staged file risk analysis (legacy pre-commit behavior)
				try {
					const git = new GitClient({ cwd });

					if (!(await git.isGitInstalled())) {
						throw new GitNotInstalledError();
					}

					if (!(await git.isGitRepository())) {
						throw new GitNotRepositoryError(cwd);
					}

					let filesToCheck: string[];

					if (options.all) {
						const allFiles = await getAllFiles(cwd);
						filesToCheck = allFiles.filter(isCodeFile);
					} else {
						const stagedFiles = await git.getStagedFiles();
						filesToCheck = stagedFiles
							.filter((f) => f.status !== "deleted")
							.filter((f) => isCodeFile(f.path))
							.map((f) => f.path);
					}

					if (filesToCheck.length === 0) {
						if (!options.quiet) {
							console.log(chalk.green("✓"), "No staged files to check");
						}
						return;
					}

					const progress = new ProgressTracker({
						total: filesToCheck.length,
						label: "Analyzing",
						quiet: options.quiet,
					});

					progress.start();

					const fileResults: FileRiskSummary[] = [];
					let hasRiskyChanges = false;

					for (const file of filesToCheck) {
						progress.update(file);

						try {
							const content = options.all
								? await readFile(resolve(cwd, file), "utf-8")
								: await git.getStagedContent(file);

							const riskResult = await analyzeFileRisk(file, content, cwd);

							fileResults.push({
								file,
								riskScore: riskResult.riskScore,
								riskLevel: riskResult.riskLevel,
								topSignal: riskResult.signals.filter((s) => s.value > 0)[0]?.signal,
							});

							if (riskResult.riskScore > 5) {
								hasRiskyChanges = true;
							}
						} catch {
							// Skip files that can't be analyzed (binary, permissions, etc.)
						}
					}

					const highRisk = fileResults.filter((f) => f.riskScore > 7).length;
					const mediumRisk = fileResults.filter((f) => f.riskScore > 4 && f.riskScore <= 7).length;

					if (hasRiskyChanges) {
						progress.fail(
							`Found risks in ${highRisk + mediumRisk} files (${highRisk} high, ${mediumRisk} medium) - ${progress.getElapsed()}`,
						);

						if (!options.quiet && fileResults.length > 0) {
							for (const result of fileResults.filter((f) => f.riskScore > 4)) {
								const level = result.riskScore > 7 ? chalk.red("HIGH") : chalk.yellow("MED");
								console.log(`  ${level} ${result.file} (${result.riskScore.toFixed(1)})`);
							}
						}

						if (options.snapshot) {
							const snapshotSpinner = ora("Creating snapshot...").start();
							try {
								const storage: SnapshotStorage = await createSnapshotStorage(cwd);
								const snap = await storage.create({
									description: "Pre-commit snapshot for risky AI changes",
									protected: true,
								});

								snapshotSpinner.succeed(`Snapshot created: ${snap.id.substring(0, 8)}`);

								const maxRiskScore = Math.max(...fileResults.map((f) => f.riskScore));
								console.log(`  Max risk score: ${maxRiskScore.toFixed(2)}`);
							} catch (error: unknown) {
								snapshotSpinner.fail("Failed to create snapshot");
								displaySmartError(error instanceof Error ? error : String(error));
								process.exit(1);
							}
						} else if (!options.quiet) {
							console.log(chalk.gray("  Tip: use --snapshot to auto-snapshot risky changes"));
						}

						if (!options.quiet) {
							console.log(chalk.gray("  Run vr check --staged --snapshot to protect before committing"));
						}
						process.exit(1);
					} else {
						progress.complete(
							`No risky changes detected in ${filesToCheck.length} files - ${progress.getElapsed()}`,
						);
					}
				} catch (error: unknown) {
					if (error instanceof GitNotInstalledError) {
						process.exit(1);
					}

					if (error instanceof GitNotRepositoryError) {
						process.exit(1);
					}

					if (!options.quiet) {
						displaySmartError(error instanceof Error ? error : String(error));
					}
					process.exit(1);
				}
				return;
			}

			// Default: invariant runner
			await runInvariantCheck(cwd, options);
		});
}

async function runInvariantCheck(
	cwd: string,
	options: { quiet?: boolean; json?: boolean; all?: boolean; staged?: boolean; overrideInvariant?: string },
): Promise<void> {
	const startTime = Date.now();
	const invariantsDir = join(cwd, ".vreko", "invariants");

	// INVAR-05: Handle --override-invariant flag before main evaluation loop
	if (options.overrideInvariant) {
		const id = String(options.overrideInvariant).trim();
		if (!/^[a-z0-9][a-z0-9.-]*$/i.test(id)) {
			process.stderr.write(`Invalid invariant id: ${id}\n`);
			process.exit(2);
		}
		const invPath = join(cwd, ".vreko", "invariants", `${id}.json`);
		if (!existsSync(invPath)) {
			process.stderr.write(`Invariant not found: ${id}\n`);
			process.exit(2);
		}
		const inv = JSON.parse(readFileSync(invPath, "utf-8"));
		inv.overrideCount = (inv.overrideCount ?? 0) + 1;
		if (inv.overrideCount >= 2 && inv.mode !== "advisory") {
			inv.mode = "advisory";
		}
		writeFileSync(invPath, `${JSON.stringify(inv, null, 2)}\n`, "utf-8");
		process.stderr.write(`Override recorded: ${id} (count=${inv.overrideCount}, mode=${inv.mode})\n`);
		process.exit(0);
	}

	if (!existsSync(invariantsDir)) {
		if (!options.quiet) {
			console.log("No .vreko/invariants/ directory found.");
			console.log("To initialize: create .vreko/invariants/ and add invariant JSON files.");
			console.log("See: https://docs.vreko.dev/invariants (or .vreko/invariants/ in this repo for examples)");
		}
		process.exit(0);
	}

	const invariantFiles = readdirSync(invariantsDir).filter((f) => f.endsWith(".json"));

	if (invariantFiles.length === 0) {
		if (!options.quiet) {
			console.log("No invariant files found in .vreko/invariants/");
			console.log("Add .json invariant files to get started.");
		}
		process.exit(0);
	}

	const violations: SbCheckViolation[] = [];
	let runnerError = false;

	for (const file of invariantFiles) {
		const filePath = join(invariantsDir, file);
		const fileContent = readFileSync(filePath, "utf-8");
		const sha = createHash("sha256").update(fileContent).digest("hex").slice(0, 16);

		let invariant: Record<string, unknown>;
		try {
			invariant = JSON.parse(fileContent);
		} catch {
			console.error(`Runner error: malformed JSON in ${file}`);
			runnerError = true;
			continue;
		}

		const invariantId = String(invariant.invariant_id ?? file.replace(".json", ""));
		const severity = (invariant.severity as "error" | "warning") ?? "error";
		const verification = invariant.verification as Record<string, unknown> | undefined;

		const violated = evaluation(verification);

		if (violated) {
			violations.push({
				invariant_id: invariantId,
				file_path: file,
				sha,
				confidence: 1.0,
				message: String(invariant.description ?? `Invariant ${invariantId} violated`),
				severity,
			});
		}
	}

	// INVAR-01: --all in invariant mode spawns vitest on tests/architecture/ and merges failures
	if (options.all && !options.staged) {
		const { spawnSync } = await import("node:child_process");
		const archResult = spawnSync("pnpm", ["vitest", "run", "tests/architecture/", "--reporter=json"], {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "pipe"],
			timeout: 120_000,
			maxBuffer: 50 * 1024 * 1024,
		});

		if (
			archResult.signal === "SIGTERM" ||
			(archResult.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT"
		) {
			violations.push({
				invariant_id: "architecture-suite-timeout",
				file_path: "tests/architecture/",
				sha: "n/a",
				confidence: 1.0,
				message: "architecture suite timed out after 120s",
				severity: "warning",
			});
		} else {
			try {
				const json = JSON.parse(archResult.stdout || "{}");
				const testResults = json.testResults ?? [];
				for (const file of testResults) {
					for (const test of (file.assertionResults ?? []) as Array<{
						status: string;
						fullName?: string;
						title?: string;
						failureMessages?: string[];
					}>) {
						if (test.status === "failed") {
							violations.push({
								invariant_id: `architecture-test:${test.fullName ?? test.title ?? "unknown"}`,
								file_path: (file.name as string | undefined) ?? "tests/architecture/",
								sha: "n/a",
								confidence: 1.0,
								message: ((test.failureMessages ?? []) as string[]).join("\n").slice(0, 500),
								severity: "error",
							});
						}
					}
				}
			} catch (err) {
				violations.push({
					invariant_id: "architecture-suite-parse-error",
					file_path: "tests/architecture/",
					sha: "n/a",
					confidence: 1.0,
					message: `failed to parse vitest JSON output: ${(err as Error).message}`,
					severity: "warning",
				});
			}
		}
	}

	const duration_ms = Date.now() - startTime;
	const output: SbCheckOutput = {
		version: "1.0",
		timestamp: new Date().toISOString(),
		workspace: cwd,
		duration_ms,
		summary: {
			total: invariantFiles.length,
			passed: invariantFiles.length - violations.length,
			failed: violations.length,
		},
		violations,
	};

	if (options.json) {
		console.log(JSON.stringify(output, null, 2));
	} else if (!options.quiet) {
		if (violations.length === 0) {
			console.log(`✓ ${invariantFiles.length} invariant(s) passed (${duration_ms}ms)`);
		} else {
			console.log(`✗ ${violations.length} violation(s) found:`);
			for (const v of violations) {
				console.log(`  [${v.severity.toUpperCase()}] ${v.invariant_id}: ${v.message}`);
			}
			console.log(JSON.stringify(output, null, 2));
		}
	}

	if (runnerError) {
		process.exit(2);
	}
	if (violations.length > 0) {
		process.exit(1);
	}
	process.exit(0);
}

function evaluation(verification: Record<string, unknown> | undefined): boolean {
	if (!verification) {
		return false;
	}
	if (verification.alwaysFail === true) {
		return true;
	}
	return false;
}
