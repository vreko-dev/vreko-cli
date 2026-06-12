#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// src/ui/ceremony.ts
var LABEL_WIDTH = 21;
var VALUE_WIDTH = 15;
function renderCeremony(record) {
  if (!record) {
    return [
      "## Vreko Session Summary",
      "",
      "Service not connected  -  ceremony data unavailable.",
      "",
      "Run `vreko session end` with a live service to see full summary."
    ].join("\n");
  }
  const row = /* @__PURE__ */ __name((label, val) => `| ${label.padEnd(LABEL_WIDTH)}| ${String(val).padEnd(VALUE_WIDTH)}|`, "row");
  const workspaceShort = record.workspacePath ? record.workspacePath.slice(-12) : "unknown";
  const durationMin = record.duration != null ? `${Math.round(record.duration / 6e4)} min` : " - ";
  const fragilityDisplay = record.fragilityExposure != null ? record.fragilityExposure.toFixed(1) : " - ";
  return [
    "## Vreko Session Summary",
    "",
    "| Metric              | Value         |",
    "|---------------------|---------------|",
    row("Duration", durationMin),
    row("Learnings captured", record.learningsCaptured ?? 0),
    row("Patterns surfaced", record.signalMetrics?.protectionDecisions ?? 0),
    row("Pitfalls avoided", record.pitfallsAvoided ?? 0),
    row("Fragility exposure", fragilityDisplay),
    row("Snapshots created", record.checkpointsCreated ?? 0),
    row("Token savings", `~${record.tokensSaved ?? 0}`),
    "",
    `Session ID: ${record.sessionId ?? "unknown"}`,
    `Workspace:  ${workspaceShort}`,
    `Generated:  ${(/* @__PURE__ */ new Date()).toISOString()}`
  ].join("\n");
}
__name(renderCeremony, "renderCeremony");

export { renderCeremony };
//# sourceMappingURL=ceremony-M7CXVBVA.js.map
//# sourceMappingURL=ceremony-M7CXVBVA.js.map