#!/usr/bin/env node
import { cliState } from './chunk-GRMRYWYS.js';
import { __name } from './chunk-EWOJGXRX.js';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// src/ui/gecko/index.ts
var geckoRenderFn = null;
var geckoClearSeq = null;
var resizeTimer;
process.on("SIGWINCH", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (geckoRenderFn && geckoClearSeq) {
      process.stdout.write(geckoClearSeq);
      process.stdout.write(geckoRenderFn());
    }
  }, 16);
});
function computeClearSequence(output) {
  const lines = output.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[arr.length - 1] !== "");
  const count = lines.length;
  if (count === 0) return "";
  let seq = "";
  for (let i = 0; i < count; i++) {
    seq += "\x1B[2K";
    if (i < count - 1) seq += "\x1B[1A";
  }
  seq += "\r";
  return seq;
}
__name(computeClearSequence, "computeClearSequence");
function detectOverlayCapability() {
  if (!process.stdout.isTTY) return "none";
  if (process.env.CI) return "none";
  if (cliState.renderMode !== "ink") return "none";
  return "unicode";
}
__name(detectOverlayCapability, "detectOverlayCapability");
function renderGeckoArt(capability) {
  if (capability === "none") return "";
  return " \u2584\u2580\u2580\u2580\u2580\u2584  vreko\n(\xB4 \xB7 \xB7`)  protecting your code\n  |  |\n  \u02DA  \u02DA\n";
}
__name(renderGeckoArt, "renderGeckoArt");
function writeGeckoOverlay(renderFn) {
  geckoRenderFn = renderFn;
  const output = renderFn();
  if (!output) return;
  geckoClearSeq = computeClearSequence(output);
  process.stdout.write(output);
}
__name(writeGeckoOverlay, "writeGeckoOverlay");

export { detectOverlayCapability, renderGeckoArt, writeGeckoOverlay };
//# sourceMappingURL=gecko-53ITAGG6.js.map
//# sourceMappingURL=gecko-53ITAGG6.js.map