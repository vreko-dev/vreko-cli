/**
 * Service Command Group
 *
 * Commands for managing the Vreko Local Service lifecycle.
 *
 * @module commands/service
 */

import type { Command } from "commander";
import { createInstallCommand } from "./install.js";
import { createLogsCommand } from "./logs.js";
import { createStartCommand } from "./start.js";
import { createStatusCommand } from "./status.js";
import { createStopCommand } from "./stop.js";
import { createUninstallCommand } from "./uninstall.js";

/**
 * Register service commands
 */
export function registerServiceCommands(program: Command): void {
	const service = program.command("service").description("Manage Vreko Local Service (service)");

	service.addCommand(createStartCommand());
	service.addCommand(createStopCommand());
	service.addCommand(createStatusCommand());
	service.addCommand(createLogsCommand());
	service.addCommand(createInstallCommand());
	service.addCommand(createUninstallCommand());
}
