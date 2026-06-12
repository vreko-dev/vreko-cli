/**
 * Risk Analyze Command
 *
 * Analyze a single file for AI-change risk signals.
 * Alias: ra
 *
 * @module commands/risk-analyze
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { analyzeFileRisk } from "../services/risk-analysis.js";
import { displaySmartError } from "../ui/errors.js";

export function createRiskAnalyzeCommand(): Command {
	return new Command("risk-analyze")
		.alias("ra")
		.description("Analyze a single file for risk (alias: ra)")
		.argument("<file>", "File path to analyze")
		.option("-i, --interactive", "Interactive mode with detailed analysis")
		.action(async (file: string) => {
			try {
				const fullPath = resolve(process.cwd(), file);
				const text = await readFile(fullPath, "utf-8");

				const spinner = ora("Analyzing file...").start();
				const riskData = await analyzeFileRisk(file, text, process.cwd());
				spinner.succeed("Analysis complete");

				if (riskData.signals && riskData.signals.length > 0) {
					console.log(chalk.bold("\nRisk Signals:"));
					for (const signal of riskData.signals) {
						console.log(`  ${chalk.yellow("•")} ${signal}`);
					}
				}

				if (riskData.riskScore > 7) {
					console.log(chalk.red(`\n⚠ High risk score: ${riskData.riskScore}/10`));
				} else if (riskData.riskScore > 4) {
					console.log(chalk.yellow(`\n⚡ Moderate risk score: ${riskData.riskScore}/10`));
				}
			} catch (error: unknown) {
				displaySmartError(error instanceof Error ? error : String(error));
				process.exit(1);
			}
		});
}
