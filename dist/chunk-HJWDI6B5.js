#!/usr/bin/env node
import { VrekoLocalClient, isServiceHealthy } from './chunk-6NHWBL7P.js';
import { __name } from './chunk-EWOJGXRX.js';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// src/ui/degraded-state.ts
function renderDegradedState(opts) {
  const reason = opts.reason ?? "unreachable";
  const messages = {
    unreachable: "Vreko daemon is not running or not reachable.",
    timeout: "Vreko daemon did not respond in time.",
    "version-mismatch": "Vreko daemon version does not match CLI version.",
    "not-started": "Vreko daemon has not been started."
  };
  const fixes = {
    unreachable: "vr daemon start",
    timeout: "vr daemon restart",
    "version-mismatch": "vr upgrade",
    "not-started": "vr daemon start"
  };
  const lines = [
    `[ERROR] ${messages[reason]}`,
    `  Command '${opts.command}' requires the daemon.`,
    `  Run: ${fixes[reason]}`,
    "  Commands that work offline: vr learn, vr check, vr session status",
    "  Diagnostics: vr doctor"
  ];
  process.stderr.write(`${lines.join("\n")}
`);
}
__name(renderDegradedState, "renderDegradedState");

// src/services/service-client.ts
var version = "0.0.0";
{
  version = "3.1.5";
}
var client = null;
var connectionPromise = null;
function getDaemonClient(options = {}) {
  if (!client) {
    client = new VrekoLocalClient({
      socketPath: options.socketPath,
      // DAEMON-06: No timeout forwarded. IpcConnection hardcodes its own 5s connect
      // timeout (client.ts:140). Per-request RPC timeout defaults to 30s from
      // VrekoLocalClient constructor - unverified against large-repo cold-start
      // (workspace/analyze on next.js/shadcn). If hero-capture runs hit this ceiling,
      // VrekoLocalClient.call() needs a per-request timeout override.
      autoReconnect: options.autoReconnect ?? true
    });
  }
  return client;
}
__name(getDaemonClient, "getDaemonClient");
async function connectToDaemon(options = {}) {
  const daemonClient = getDaemonClient(options);
  if (connectionPromise) {
    await connectionPromise;
    return daemonClient;
  }
  if (daemonClient.isConnected()) {
    return daemonClient;
  }
  connectionPromise = (async () => {
    await daemonClient.connect();
    await daemonClient.initialize({
      protocolVersion: "1.0.0",
      clientInfo: {
        name: "@vreko/cli",
        version
      }
    });
  })();
  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
  return daemonClient;
}
__name(connectToDaemon, "connectToDaemon");
function isDaemonConnected() {
  return client?.isConnected() ?? false;
}
__name(isDaemonConnected, "isDaemonConnected");
async function isDaemonAvailable() {
  try {
    await connectToDaemon();
    return true;
  } catch {
    return false;
  }
}
__name(isDaemonAvailable, "isDaemonAvailable");
async function getDaemonStatus() {
  if (!isDaemonConnected()) {
    return {
      connected: false
    };
  }
  try {
    const daemonClient = getDaemonClient();
    const health = await daemonClient.health.check();
    return {
      connected: true,
      version: health.version,
      uptime: health.uptime
    };
  } catch {
    return {
      connected: false
    };
  }
}
__name(getDaemonStatus, "getDaemonStatus");
function disconnectFromDaemon() {
  if (client) {
    client.close();
    client = null;
  }
}
__name(disconnectFromDaemon, "disconnectFromDaemon");
async function withDaemon(command, fn, opts) {
  const healthy = await isServiceHealthy();
  if (!healthy) {
    renderDegradedState({
      command,
      reason: opts?.reason ?? "unreachable"
    });
    process.exit(1);
  }
  let client2 = null;
  try {
    client2 = await connectToDaemon();
    await client2.health.check();
  } catch {
    renderDegradedState({
      command,
      reason: opts?.reason ?? "unreachable"
    });
    process.exit(1);
  }
  return fn(client2);
}
__name(withDaemon, "withDaemon");
async function withDaemonOptional(command, fn) {
  let client2 = null;
  try {
    client2 = await connectToDaemon();
    await client2.health.check();
  } catch (_error) {
    client2 = null;
  }
  return fn(client2);
}
__name(withDaemonOptional, "withDaemonOptional");

export { connectToDaemon, disconnectFromDaemon, getDaemonClient, getDaemonStatus, isDaemonAvailable, isDaemonConnected, withDaemon, withDaemonOptional };
//# sourceMappingURL=chunk-HJWDI6B5.js.map
//# sourceMappingURL=chunk-HJWDI6B5.js.map