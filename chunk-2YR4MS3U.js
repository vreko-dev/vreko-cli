#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import 'fs';
import 'path';
import { Command } from 'commander';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function createInitCommand() {
  return new Command("init").description("Bootstrap Vreko for a repository").argument("[path]", "Workspace path (default: current directory)").option("-y, --yes", "Skip confirmation prompts").option("--non-interactive", "Run without prompts").option("--json", "Output structured JSON summary").option("--force", "Re-initialize even if already set up").option("--dry-run", "Show what would be configured").option("--skip-mcp", "Skip MCP configuration").option("--skip-service", "Skip service registration").option("--api-key <key>", "API key for Pro features").option("--dev", "Use local dev mode for MCP").option("--npm", "Use npm/npx mode for MCP").option("-q, --quiet", "Suppress informational output").option("-v, --verbose", "Show detailed detection reasoning").action(async (pathArg, options) => {
    if (options.json || options.nonInteractive || !process.stdin.isTTY) {
      const { createInitCommand: createCoreInit } = await import('./init-core-ZRQY4AXW.js');
      const coreCmd = createCoreInit();
      const argv = [
        "node",
        "init"
      ];
      if (pathArg) {
        argv.push(pathArg);
      }
      if (options.json) {
        argv.push("--json");
      }
      if (options.nonInteractive) {
        argv.push("--non-interactive");
      }
      if (options.yes) {
        argv.push("--yes");
      }
      if (options.force) {
        argv.push("--force");
      }
      if (options.dryRun) {
        argv.push("--dry-run");
      }
      if (options.skipMcp) {
        argv.push("--skip-mcp");
      }
      if (options.skipService) {
        argv.push("--skip-service");
      }
      if (options.quiet) {
        argv.push("--quiet");
      }
      if (options.verbose) {
        argv.push("--verbose");
      }
      if (options.dev) {
        argv.push("--dev");
      }
      if (options.npm) {
        argv.push("--npm");
      }
      if (options.apiKey) {
        argv.push("--api-key", options.apiKey);
      }
      await coreCmd.parseAsync(argv, {
        from: "node"
      });
      return;
    }
    const { render } = await import('ink');
    const React = await import('react');
    const { InitApp: App } = await import('./InitApp-FBNONCVR.js');
    const initProfile = "VIRGIN";
    const { waitUntilExit } = render(React.createElement(App, {
      pathArg,
      options,
      initProfile
    }));
    await waitUntilExit();
  });
}
__name(createInitCommand, "createInitCommand");

export { createInitCommand };
//# sourceMappingURL=chunk-2YR4MS3U.js.map
//# sourceMappingURL=chunk-2YR4MS3U.js.map