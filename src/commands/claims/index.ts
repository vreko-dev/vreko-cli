/**
 * Claims Command
 *
 * Parent command for claims ledger operations.
 * Subcommands: honesty, list, stats
 *
 * @module commands/claims
 */

import { Command } from "commander";
import { createHonestyReportCommand } from "./honesty-report.js";

/**
 * Create the claims command with subcommands
 */
export function createClaimsCommand(): Command {
	const claims = new Command("claims");

	claims.description("Claims ledger operations - track and verify agent claims");

	// Add subcommands
	claims.addCommand(createHonestyReportCommand());

	// Future subcommands:
	// claims.addCommand(createClaimsListCommand());
	// claims.addCommand(createClaimsStatsCommand());

	return claims;
}
