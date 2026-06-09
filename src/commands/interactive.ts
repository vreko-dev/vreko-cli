/**
 * Interactive Command
 *
 * Opens the Vreko TUI dashboard. All commands collapse into the TUI  -  wizard
 * actions (analyze, snapshot, list) are available as discrete CLI commands.
 *
 * Machine mode (renderMode !== "ink"): falls through without output.
 * The stdin ownership conflict with clack wizards inside Ink is resolved by
 * removing wizard code entirely (spec §A, §N).
 *
 * @module commands/interactive
 */
import { Command } from "commander";
import { cliState } from "../cli-state.js";

export function createInteractiveCommand(): Command {
	return new Command("interactive").description("Open the interactive TUI dashboard").action(async () => {
		if (cliState.renderMode === "ink") {
			const { launchTui } = await import("../ui/tui/index.js");
			await launchTui({ initialPanel: "dashboard" });
		}
		// Machine mode: fall through  -  caller handles output or help
	});
}
