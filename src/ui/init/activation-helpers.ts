/**
 * Testable helpers extracted from the Activation component.
 *
 * These functions contain the core imperative logic that historically lived
 * inside the useEffect `run()` closure  -  inaccessible to unit tests. By
 * isolating them here we can write deterministic tests against the exact
 * code paths that run during `vr init`, preventing the class of bugs where
 * the TUI reports success but the files on disk tell a different story.
 *
 * Covered failure modes:
 *   - Poll exits on existsSync (file pre-exists) → mtime-based poll instead
 *   - config.json never written in TUI path → writeVrekoInitConfig
 *   - Poll timeout too short for large repos → configurable, default 45 s
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PollOptions {
	/** Milliseconds between stat() calls. Default 500. */
	intervalMs?: number;
	/** Total milliseconds before giving up. Default 45 000 (init-scan on large repos). */
	timeoutMs?: number;
	/** Return true to abort the poll early (e.g. React cleanup). */
	cancelled?: () => boolean;
}

// ── Snapshot ───────────────────────────────────────────────────────────────

/**
 * Read the current mtime of `targetFile` before triggering an async write.
 * Returns `null` if the file does not yet exist (first init).
 *
 * Call this BEFORE firing any IPC that will cause the file to be written so
 * the subsequent poll can distinguish "file appeared" from "file was updated".
 */
export function snapshotPreWriteMtime(targetFile: string): number | null {
	try {
		return statSync(targetFile).mtimeMs;
	} catch {
		return null; // file doesn't exist yet  -  first init
	}
}

// ── Poll ───────────────────────────────────────────────────────────────────

/**
 * Poll `targetFile` until its mtime advances past `preMtime`.
 *
 * Returns `true` when a new write is detected, `false` on timeout or
 * cancellation. Uses `statSync`  -  NOT `existsSync`  -  so a pre-existing file
 * from a prior init is correctly treated as "not yet written" until the daemon
 * updates it.
 *
 * This is the regression guard for the existsSync bug: if a caller replaces
 * this function with an existsSync check, the unit tests in
 * activation-helpers.test.ts will fail immediately.
 */
export async function pollForWorkspaceJsonUpdate(
	targetFile: string,
	preMtime: number | null,
	options: PollOptions = {},
): Promise<boolean> {
	const { intervalMs = 500, timeoutMs = 45_000, cancelled = () => false } = options;
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if (cancelled()) return false;
		try {
			const mtime = statSync(targetFile).mtimeMs;
			// preMtime null  → file is new (first init), any read counts as written
			// preMtime set   → file existed; only accept a strictly newer mtime
			if (preMtime === null || mtime > preMtime) {
				return true;
			}
		} catch {
			// File not yet written  -  keep polling
		}
		await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
	}
	return false;
}

// ── Config write ───────────────────────────────────────────────────────────

/**
 * Write `.vreko/config.json` from the scan profile.
 *
 * The TUI path (interactive `vr init`) skips `init-core.ts` entirely, so
 * without this function the config file is never created. The function is
 * idempotent: if the file already exists it is left untouched so a re-init
 * does not overwrite user edits.
 *
 * This is the regression guard for the "Config written to .vreko/config.json"
 * TUI claim that was previously a hardcoded lie.
 */
export function writeVrekoInitConfig(repoPath: string, profile: RecoveryRiskProfile): void {
	const vrekoDir = join(repoPath, ".vreko");
	const configPath = join(vrekoDir, "config.json");

	// Idempotent  -  respect any existing config (user may have customised it).
	if (existsSync(configPath)) {
		return;
	}

	try {
		mkdirSync(vrekoDir, { recursive: true });
		const config = {
			protectionLevel: profile.recommendedConfig.protectionLevel,
			snapshotFrequency: profile.recommendedConfig.snapshotFrequency,
			projections: { docs: { approvedFiles: [] } },
		};
		writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
	} catch {
		// Non-fatal  -  `vr doctor` can self-heal on the next run.
	}
}
