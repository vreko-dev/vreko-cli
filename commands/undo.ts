/**
 * Undo Command
 *
 * Undo the most recent destructive operation.
 * Maintains history of operations for safety.
 *
 * @module commands/undo
 */

import chalk from "chalk";
import { Command } from "commander";
import { getRecentOperations, undoLastOperation } from "../utils/safe-ops";

export function createUndoCommand(): Command {
	const cmd = new Command("undo")
		.description("Undo the last destructive operation")
		.option("--list", "List recent undoable operations")
		.action(async (options) => {
			if (options.list) {
				const operations = getRecentOperations(10);

				if (operations.length === 0) {
					console.log("No recent operations to undo");
					return;
				}

				for (let i = 0; i < operations.length; i++) {
					const op = operations[i];
					const status = op.canUndo ? chalk.green("●") : chalk.gray("○");
					const time = new Date(op.timestamp).toLocaleString();
					console.log(`  ${status} [${i + 1}] ${op.description}  -  ${time}`);
				}
				return;
			}

			await undoLastOperation();
		});

	return cmd;
}
