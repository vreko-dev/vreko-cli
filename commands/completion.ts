/**
 * Completion Command
 *
 * Generates shell completion scripts for bash, zsh, and fish.
 * Standard feature expected by senior developers.
 *
 * @example
 * ```bash
 * # Bash - add to ~/.bashrc
 * source <(vr completion bash)
 *
 * # Zsh - add to ~/.zshrc
 * source <(vr completion zsh)
 *
 * # Fish
 * vr completion fish > ~/.config/fish/completions/snap.fish
 * ```
 *
 * @module commands/completion
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { Command } from "commander";
import { print } from "../utils/print.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Load completion script from resources
 */
async function loadCompletionScript(shell: string): Promise<string | null> {
	const resourcesDir = join(__dirname, "../../resources/completions");
	const filename = `snap.${shell}`;

	try {
		return await readFile(join(resourcesDir, filename), "utf-8");
	} catch {
		return null;
	}
}

/**
 * Create the completion command
 */
export function createCompletionCommand(): Command {
	return new Command("completion")
		.description("Generate shell completion scripts")
		.argument("<shell>", "Shell type: bash, zsh, or fish")
		.addHelpText(
			"after",
			`
Examples:
  ${chalk.gray("# Bash (add to ~/.bashrc)")}
  ${chalk.cyan("source <(vr completion bash)")}

  ${chalk.gray("# Zsh (add to ~/.zshrc)")}
  ${chalk.cyan("source <(vr completion zsh)")}

  ${chalk.gray("# Fish")}
  ${chalk.cyan("vr completion fish > ~/.config/fish/completions/vr.fish")}
`,
		)
		.action(async (shell: string) => {
			const shellLower = shell.toLowerCase();
			const validShells = ["bash", "zsh", "fish"];

			if (!validShells.includes(shellLower)) {
				process.exit(1);
			}

			const script = await loadCompletionScript(shellLower);

			if (!script) {
				process.exit(1);
			}

			print(script);
		});
}
