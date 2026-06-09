import { createLedger } from "@vreko/claims-ledger";
import { isRegisteredClaimant } from "@vreko/contracts/claims";
import { Command } from "commander";

/**
 * Honesty Report Command
 *
 * vreko claims honesty [--claimant=urn] [--since=7d]
 *
 * Prints:
 *   Claimant: urn:claimant:subagent-stop-hook
 *   Window:   last 7 days
 *   ────────────────────────────────────────
 *   Claims:   42
 *   Verified: 38  (90.5%)
 *   Refuted:   4  ( 9.5%)
 *   Expired:   0  ( 0.0%)
 *
 *   Honesty rate: 90.5%
 */
export function createHonestyReportCommand(): Command {
	const cmd = new Command("honesty");

	cmd.description("Show honesty rate for a claimant");
	cmd.option("-c, --claimant <urn>", "Claimant URN", "urn:claimant:subagent-stop-hook");
	cmd.option("-s, --since <duration>", "Time window (e.g., 7d, 24h, 30d)", "7d");

	cmd.action(async (options) => {
		// Validate claimant
		if (!isRegisteredClaimant(options.claimant)) {
			console.error(`Error: Unknown claimant: ${options.claimant}`);
			console.error("Run 'vreko claims list' to see registered claimants.");
			process.exit(1);
		}

		// Parse duration
		const sinceMs = parseDuration(options.since);
		const since = Date.now() - sinceMs;

		// Query ledger
		const ledger = createLedger();
		const rate = await ledger.query.honestyRate(options.claimant, { since });

		// Format output
		const windowStr = formatDuration(sinceMs);

		console.log(`Claimant: ${options.claimant}`);
		console.log(`Window:   last ${windowStr}`);
		console.log("────────────────────────────────────────");
		console.log(`Claims:   ${rate.total}`);
		console.log(`Verified: ${String(rate.verified).padStart(3)}  (${formatPercent(rate.verified, rate.total)})`);
		console.log(`Refuted:  ${String(rate.refuted).padStart(3)}  (${formatPercent(rate.refuted, rate.total)})`);
		console.log(`Expired:  ${String(rate.expired).padStart(3)}  (${formatPercent(rate.expired, rate.total)})`);
		console.log("");
		console.log(`Honesty rate: ${(rate.rate * 100).toFixed(1)}%`);
	});

	return cmd;
}

/**
 * Parse duration string (e.g., "7d", "24h", "30m") to milliseconds.
 */
function parseDuration(duration: string): number {
	const match = duration.match(/^(\d+)([dhm])$/i);
	if (!match) {
		throw new Error(`Invalid duration: ${duration}. Use format like 7d, 24h, 30m`);
	}

	const value = Number.parseInt(match[1], 10);
	const unit = match[2].toLowerCase();

	switch (unit) {
		case "d":
			return value * 24 * 60 * 60 * 1000;
		case "h":
			return value * 60 * 60 * 1000;
		case "m":
			return value * 60 * 1000;
		default:
			throw new Error(`Unknown time unit: ${unit}`);
	}
}

/**
 * Format milliseconds as human-readable duration.
 */
function formatDuration(ms: number): string {
	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	if (days > 0) {
		return `${days} days`;
	}

	const hours = Math.floor(ms / (60 * 60 * 1000));
	if (hours > 0) {
		return `${hours} hours`;
	}

	const minutes = Math.floor(ms / (60 * 1000));
	return `${minutes} minutes`;
}

/**
 * Format percentage.
 */
function formatPercent(part: number, total: number): string {
	if (total === 0) {
		return "0.0%";
	}
	return `${((part / total) * 100).toFixed(1)}%`.padStart(5);
}
