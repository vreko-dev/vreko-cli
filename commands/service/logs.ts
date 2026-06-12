/**
 * Service Logs Command
 *
 * View Vreko local service logs.
 *
 * @module commands/service/logs
 */

import { existsSync, readFileSync, statSync, watchFile } from "node:fs";
import { Command } from "commander";
import { getLogPath } from "../../service-adapter/local-service-adapter.js";

export function createLogsCommand(): Command {
	return new Command("logs")
		.description("View Vreko local service logs")
		.option("-f, --follow", "Follow log output (like tail -f)")
		.option("-n, --lines <number>", "Number of lines to show", "50")
		.action(async (options) => {
			const logPath = getLogPath();

			if (!existsSync(logPath)) {
				return;
			}

			const lines = Number.parseInt(options.lines, 10);

			if (options.follow) {
				// Show initial content
				displayLastLines(logPath, lines);

				// Track last position
				let lastSize = statSync(logPath).size;

				// Watch for changes
				watchFile(logPath, { interval: 500 }, (curr) => {
					const currentSize = curr.size;

					// Only read if file grew
					if (currentSize > lastSize) {
						const content = readFileSync(logPath, "utf-8");
						const _newContent = content.slice(lastSize);
						lastSize = currentSize;
					} else if (currentSize < lastSize) {
						displayLastLines(logPath, lines);
						lastSize = currentSize;
					}
				});

				// Keep process running indefinitely
				await new Promise(() => {
					// Intentionally empty - waits forever
				});
			} else {
				// Static mode - just show last N lines
				displayLastLines(logPath, lines);
			}
		});
}

/**
 * Display the last N lines of a log file
 */
function displayLastLines(filePath: string, lineCount: number): void {
	try {
		const content = readFileSync(filePath, "utf-8");
		const lines = content.split("\n");
		const _lastLines = lines.slice(-lineCount).join("\n");
	} catch {
		/* intentionally empty */
	}
}
