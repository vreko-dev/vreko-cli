#!/usr/bin/env node
export { TuiApp } from './chunk-W5B4GTXR.js';
import { Sentry } from './chunk-YPTTIXKC.js';
import { cliState } from './chunk-GRMRYWYS.js';
import { createServiceClient, connectServiceClient } from './chunk-IXUUBQB4.js';
import './chunk-DMXC2JTC.js';
import './chunk-AHZGBIQG.js';
import { __name } from './chunk-EWOJGXRX.js';
import { readFile, writeFile, unlink } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';
import { render } from 'ink';
import React from 'react';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var PID_FILE = join(homedir(), ".vreko", "tui.pid");
var isShuttingDown = false;
var inkInstance = null;
async function acquirePidLock() {
  try {
    const existing = await readFile(PID_FILE, "utf-8");
    const pid = Number.parseInt(existing.trim(), 10);
    try {
      process.kill(pid, 0);
      console.error(`A Vreko TUI session is already running (PID ${pid}). Run \`vr stop\` first.`);
      process.exit(1);
    } catch {
    }
  } catch {
  }
  await writeFile(PID_FILE, String(process.pid), "utf-8");
}
__name(acquirePidLock, "acquirePidLock");
async function releasePidLock() {
  try {
    await unlink(PID_FILE);
  } catch {
  }
}
__name(releasePidLock, "releasePidLock");
function shutdown(code) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (inkInstance) {
    inkInstance.unmount();
  }
  process.stdout.write("\x1B[?25h");
  process.stdout.write("\x1B[0m\n");
  releasePidLock().finally(() => process.exit(code));
}
__name(shutdown, "shutdown");
async function launchTui(panelOrOptions = "dashboard") {
  if (cliState.renderMode !== "ink") {
    return;
  }
  await acquirePidLock();
  for (const sig of [
    "SIGINT",
    "SIGTERM"
  ]) {
    process.on(sig, () => shutdown(0));
  }
  process.on("uncaughtException", (err) => {
    Sentry.captureException(err);
    shutdown(1);
  });
  process.on("unhandledRejection", (reason) => {
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
    shutdown(1);
  });
  const opts = typeof panelOrOptions === "string" ? {
    panel: panelOrOptions
  } : panelOrOptions;
  const panel = opts.panel ?? opts.initialPanel ?? "dashboard";
  const statusFocus = opts.statusFocus ?? false;
  const client = createServiceClient();
  try {
    await connectServiceClient(client);
  } catch (err) {
    console.error(chalk.red("Failed to connect to Vreko service:"), err instanceof Error ? err.message : String(err));
    console.log(chalk.gray("Start the service with: vr service start"));
    await releasePidLock();
    process.exit(1);
  }
  const { detectOverlayCapability, writeGeckoOverlay, renderGeckoArt } = await import('./gecko-53ITAGG6.js');
  const capability = detectOverlayCapability();
  if (capability !== "none") {
    writeGeckoOverlay(() => renderGeckoArt(capability));
  }
  const { TuiApp: TuiApp2 } = await import('./TuiApp-FX23XQBK.js');
  const instance = render(React.createElement(TuiApp2, {
    client,
    initialPanel: panel,
    statusFocus
  }), {
    exitOnCtrlC: false
  });
  inkInstance = instance;
  try {
    await instance.waitUntilExit();
  } finally {
    inkInstance = null;
    await releasePidLock();
  }
}
__name(launchTui, "launchTui");

export { launchTui };
//# sourceMappingURL=tui-PFFYLIOW.js.map
//# sourceMappingURL=tui-PFFYLIOW.js.map