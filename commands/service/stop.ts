/**
 * Service Stop Command
 *
 * Stop the running Vreko local service.
 *
 * @module commands/service/stop
 */

import { Command } from "commander";
import {
	connectServiceClient,
	createServiceClient,
	isServiceHealthy,
	readServicePid,
} from "../../service-adapter/local-service-adapter.js";

export function createStopCommand(): Command {
	return new Command("stop").description("Stop the Vreko local service").action(async () => {
		if (!(await isServiceHealthy())) {
			console.log("Service is not running");
			return;
		}

		console.log("Stopping service...");
		const client = createServiceClient();
		try {
			await connectServiceClient(client);
			await client.daemon.shutdown();
			console.log("✓ Service stopped");
		} catch (_err) {
			try {
				const pid = readServicePid();
				if (pid) {
					process.kill(pid, "SIGTERM");
					console.log("✓ Service stopped (SIGTERM)");
				}
			} catch (killErr) {
				console.error(
					"✗ Failed to stop service:",
					killErr instanceof Error ? killErr.message : String(killErr),
				);
				process.exitCode = 1;
			}
		} finally {
			client.close();
		}
	});
}
