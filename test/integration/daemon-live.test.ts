/**
 * Live Daemon CLI Integration Tests
 *
 * Tests the real CLI → daemon IPC connectivity using the actual
 * connectToDaemon service (not mocked). Validates that the CLI can
 * connect to a running vrekod daemon and perform a health/ping round-trip.
 *
 * Guard: Only runs when VREKO_TEST_DAEMON=1 is set  -  matching the convention
 * already established in init-daemon.test.ts.
 *
 * Run: VREKO_TEST_DAEMON=1 pnpm exec vitest run test/integration/daemon-live.test.ts
 *
 * Prerequisites:
 *   - apps/local-service must be built (dist/main.js must exist)
 *   - No other vrekod process using the same socket path
 */

import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Guard: matches the convention from init-daemon.test.ts
const LIVE = Boolean(process.env.VREKO_TEST_DAEMON);

/**
 * Poll until the socket is accepting connections or the deadline is reached.
 */
async function waitForSocket(socketPath: string, timeoutMs = 10_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let lastError: Error | null = null;

	while (Date.now() < deadline) {
		try {
			await new Promise<void>((resolve, reject) => {
				const sock = createConnection(socketPath, () => {
					sock.end();
					resolve();
				});
				sock.on("error", reject);
				setTimeout(() => {
					sock.destroy();
					reject(new Error("connection timeout"));
				}, 500);
			});
			return; // Socket is ready
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			await new Promise((r) => setTimeout(r, 200));
		}
	}

	throw new Error(`Daemon socket did not become ready within ${timeoutMs}ms: ${lastError?.message ?? "unknown"}`);
}

describe.skipIf(!LIVE)("@live-daemon CLI → daemon health/ping", () => {
	const testDir = join(tmpdir(), `cli-daemon-live-${Date.now()}`);
	const socketPath = join(testDir, "test.sock");
	const daemonBin = join(__dirname, "../../../../apps/local-service/dist/main.js");

	let serverProcess: ChildProcess;

	beforeAll(async () => {
		// Verify daemon binary exists before attempting to spawn
		if (!existsSync(daemonBin)) {
			throw new Error(
				`Daemon binary not found at ${daemonBin}. Run 'pnpm build --filter=@vreko/local-service' first.`,
			);
		}

		await mkdir(testDir, { recursive: true });

		// Spawn the local-service daemon subprocess
		serverProcess = spawn("node", [daemonBin, "--socket", socketPath], {
			stdio: "pipe",
		});

		// Wait for the daemon socket to be ready using a polling loop
		await waitForSocket(socketPath);
	}, 30_000);

	afterAll(async () => {
		if (serverProcess) {
			serverProcess.kill();
		}
		await rm(testDir, { recursive: true, force: true });
	});

	it("health/ping returns { status: 'ok' }", async () => {
		// Use the real connectToDaemon from CLI's service-client service (not mocked)
		const { connectToDaemon, disconnectFromDaemon } = await import("../../src/services/service-client.js");

		const client = await connectToDaemon({ socketPath, timeout: 5000 });
		try {
			const result = await client.call("health/ping", {});
			expect(result).toEqual({ status: "ok" });
		} finally {
			disconnectFromDaemon();
		}
	});

	it("health/check returns { status: 'healthy' }", async () => {
		const { connectToDaemon, disconnectFromDaemon } = await import("../../src/services/service-client.js");

		const client = await connectToDaemon({ socketPath, timeout: 5000 });
		try {
			const result = (await client.call("health/check", {})) as { status: string; uptime: number };
			expect(result).toHaveProperty("status", "healthy");
		} finally {
			disconnectFromDaemon();
		}
	});
});
