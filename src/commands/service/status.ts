/**
 * Service Status Command
 *
 * Display the status of the Vreko local service.
 *
 * @module commands/service/status
 */

import { Command } from "commander";
import {
	connectServiceClient,
	createServiceClient,
	formatBytes,
	formatDuration,
	getServiceSocketPath,
	isServiceHealthy,
	readServicePid,
} from "../../service-adapter/local-service-adapter.js";

export function createStatusCommand(): Command {
	return new Command("status")
		.description("Show Vreko local service status")
		.option("-j, --json", "Output as JSON")
		.action(async (options) => {
			if (!(await isServiceHealthy())) {
				if (options.json) {
					console.log(JSON.stringify({ running: false }));
				} else {
					console.log("Service is not running");
				}
				return;
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				const status = await client.call<{
					pid: number;
					version: string;
					uptime: number;
					startedAt: string;
					workspaces: number;
					connections: number;
					memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
					idleTimeout: number;
				}>("daemon/status", {});

				if (options.json) {
					console.log(JSON.stringify({ running: true, ...status }));
				} else {
					console.log("Service Status:");
					console.log("  Status:       ✓ Running");
					console.log(`  PID:          ${readServicePid()}`);
					console.log(`  Version:      ${status.version}`);
					console.log(`  Uptime:       ${formatDuration(status.uptime)}`);
					console.log(`  Started:      ${status.startedAt}`);
					console.log(`  Workspaces:   ${status.workspaces}`);
					console.log(`  Connections:  ${status.connections}`);
					console.log(`  Memory:       ${formatBytes(status.memoryUsage.heapUsed)}`);
					console.log(`  Socket:       ${getServiceSocketPath()}`);
				}
			} catch (err) {
				if (options.json) {
					console.log(
						JSON.stringify({ running: true, error: err instanceof Error ? err.message : String(err) }),
					);
				} else {
					console.error("✗ Failed to get status:", err instanceof Error ? err.message : String(err));
				}
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});
}
