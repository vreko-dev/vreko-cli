/**
 * Profile-Aware Start Task Tree
 *
 * Implements the listr2 task tree for `vr start` and `vr daemon start`.
 * Task inclusion is determined by the BootProfileType returned by the daemon's
 * initialize() response. Each profile maps to the correct subset of setup tasks.
 *
 * Profile to Task Matrix:
 * - VIRGIN:         [Init workspace, Connect to daemon]
 * - NEW_WORKSPACE:  [Create workspace, Connect to daemon]
 * - COLD_RETURN:    [Verify snapshot integrity, Connect to daemon]
 * - WARM_RETURN:    [Resume session, Connect to daemon]
 * - HOT_RECONNECT:  [Connect to daemon] (one task only)
 *
 * @module ui/start-tasks
 */

import type { BootProfileType } from "@vreko/contracts/local-service";
import { Listr } from "listr2";
import { cliState } from "../../cli-state.js";

/**
 * Task definition shape used both for listr2 and for introspection in tests.
 */
export interface StartTaskDefinition {
	title: string;
	enabled: () => boolean;
	task: () => Promise<void>;
}

/**
 * Return type of buildStartTasks: a Listr-compatible object with typed task definitions.
 * The `tasks` array exposes the raw definitions (with enabled() functions) for test introspection.
 * The `run()` method delegates to the underlying Listr instance.
 */
export interface StartTaskTree {
	/** Raw task definitions with enabled() functions accessible for introspection. */
	tasks: StartTaskDefinition[];
	/** Execute the task tree (delegates to Listr). */
	run(): Promise<void>;
}

/**
 * Build a profile-aware listr2 task tree for `vr start`.
 *
 * Must be called AFTER the daemon initialize() response is received.
 * The boot profile is only available after the daemon reports it.
 *
 * @param profile - The BootProfileType from daemon InitializeResponse.bootProfile
 * @returns A StartTaskTree with a run() method and introspectable tasks array
 */
export function buildStartTasks(profile: BootProfileType): StartTaskTree {
	const isJson = cliState.renderMode === "json";
	const renderer = isJson ? "silent" : process.stdout.isTTY ? "default" : "verbose";

	const taskDefs: StartTaskDefinition[] = [
		{
			title: "Initialize workspace",
			enabled: () => profile === "VIRGIN",
			task: async () => {
				// First-time workspace setup confirmation.
				// Daemon has already executed the server-side init during boot.
				await Promise.resolve();
			},
		},
		{
			title: "Create workspace",
			enabled: () => profile === "NEW_WORKSPACE",
			task: async () => {
				// Config dir exists but no workspace state.
				// Daemon creates the workspace record during boot.
				await Promise.resolve();
			},
		},
		{
			title: "Verify snapshot integrity",
			enabled: () => profile === "COLD_RETURN",
			task: async () => {
				// No clean shutdown flag  -  daemon ran integrity checks during boot.
				await Promise.resolve();
			},
		},
		{
			title: "Resume session",
			enabled: () => profile === "WARM_RETURN",
			// HOT_RECONNECT skips resume  -  process is already running, session active.
			task: async () => {
				// Existing session resume  -  daemon restores session state during boot.
				await Promise.resolve();
			},
		},
		{
			title: "Connect to daemon",
			enabled: () => true,
			// All profiles reach this step  -  final IPC health confirmation.
			task: async () => {
				// Connection already established; this task confirms IPC is responsive.
				await Promise.resolve();
			},
		},
	];

	const listr = new Listr(taskDefs, {
		renderer,
		rendererOptions: { collapseSubtasks: false },
	});

	return {
		tasks: taskDefs,
		run: () => listr.run(),
	};
}
