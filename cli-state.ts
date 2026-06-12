/**
 * Global CLI state  -  mutable flags populated by the Commander preAction hook.
 * Extracted into its own module so ui/errors.ts can read cliState.json
 * without creating a circular dependency with index.ts.
 */
import type { RenderMode } from "./ui/guards.js";

export const cliState = {
	verbose: false,
	quiet: false,
	debug: false,
	noColor: false,
	json: false, // LLM-ready structured output
	yes: false, // skip confirmation prompts (CI/automation)
	renderMode: "plain" as RenderMode, // set in Commander preAction hook; safe default before hook fires
};
