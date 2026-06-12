/**
 * intel command  -  expose IntelligenceSnapshot via CLI.
 *
 * Usage:
 *   vr intel snapshot [--workspace <path>] [--json]
 *
 * In JSON mode emits a versioned JSON payload suitable for agent harnesses.
 *
 * Spec: intelligence-projection-architecture.md §5.1
 * @module commands/intel
 */

import type { Command } from "commander";
import { renderJson, renderJsonError } from "../output/JsonRenderer.js";
import { detectOutputMode } from "../output/OutputMode.js";
import { connectToDaemon, getDaemonClient } from "../services/service-client.js";

/** Classify connection/daemon errors to exit codes (spec §5.1). */
function classifyError(err: unknown): number {
	const msg = String(err);
	if (msg.includes("ENOENT") || msg.includes("connect") || msg.includes("daemon")) return 3;
	if (msg.includes("auth") || msg.includes("workspace")) return 4;
	return 1;
}

export function registerIntelCommand(program: Command): void {
	const intel = program.command("intel", { hidden: true }).description("Access workspace intelligence data");

	intel
		.command("snapshot")
		.description("Get the full IntelligenceSnapshot for the current workspace")
		.option("--workspace <path>", "Target workspace path (default: cwd)", process.cwd())
		.option("--json", "Emit machine-readable JSON output")
		.option("--quiet", "Suppress stderr in JSON mode")
		.action(async (opts: { workspace: string; json?: boolean; quiet?: boolean }) => {
			const mode = detectOutputMode(opts);
			const quiet = opts.quiet ?? false;

			try {
				await connectToDaemon();
				const client = getDaemonClient();
				if (!client) {
					if (mode === "json") {
						renderJsonError(3, "daemon unavailable", quiet);
					} else {
						console.error("Error: daemon unavailable  -  run `vr daemon start`");
					}
					process.exit(3);
				}

				const snap = await client.intelligence.snapshot({ workspace: opts.workspace });

				if (mode === "json") {
					renderJson("intel", snap);
					process.exit(0);
				} else {
					console.log(JSON.stringify(snap, null, 2));
					process.exit(0);
				}
			} catch (err) {
				const code = classifyError(err);
				if (mode === "json") {
					renderJsonError(code, String(err), quiet);
				} else {
					console.error("Error:", String(err));
				}
				process.exit(code);
			}
		});
}
