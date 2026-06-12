#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { z } from 'zod';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function isInteractive() {
  return Boolean(process.stdout.isTTY) && !process.env.CI && !process.env.VREKO_PLAIN;
}
__name(isInteractive, "isInteractive");
function termWidth() {
  return process.stdout.columns || 80;
}
__name(termWidth, "termWidth");
function supportsColor() {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}
__name(supportsColor, "supportsColor");
function visual(interactive, fallback) {
  return isInteractive() ? interactive() : fallback();
}
__name(visual, "visual");
var TerminalCapabilities = z.object({
  isTTY: z.boolean(),
  isCI: z.boolean(),
  width: z.number().int().min(40),
  supportsColor: z.boolean()
});
function detectCapabilities() {
  return {
    isTTY: Boolean(process.stdout.isTTY),
    isCI: Boolean(process.env.CI),
    width: termWidth(),
    supportsColor: supportsColor()
  };
}
__name(detectCapabilities, "detectCapabilities");
function getRenderMode() {
  if (process.env.VREKO_JSON === "1" || process.env.VREKO_JSON === "true") {
    return "json";
  }
  if (process.env.VREKO_PLAIN === "1" || !process.stdout.isTTY || process.env.CI) {
    return "plain";
  }
  return "ink";
}
__name(getRenderMode, "getRenderMode");

export { TerminalCapabilities, detectCapabilities, getRenderMode, isInteractive, supportsColor, termWidth, visual };
//# sourceMappingURL=chunk-H7773ONB.js.map
//# sourceMappingURL=chunk-H7773ONB.js.map