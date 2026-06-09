import { resolve } from "node:path";
import { mergeConfigs, nodeConfig } from "@vreko/vitest-config";
import { defineProject } from "vitest/config";

/**
 * Vitest configuration for apps/cli
 * Uses shared nodeConfig preset from @vreko/vitest-config
 */
export default defineProject(
	mergeConfigs(nodeConfig, {
		define: {
			// tsup replaces this at build time; provide a stub matching major version for test runs
			__CLI_VERSION__: JSON.stringify("3.0.0-test"),
		},
		resolve: {
			alias: {
				"@cli": resolve(__dirname, "./src"),
				"@vreko/intelligence/init-scan": resolve(
					__dirname,
					"../../packages/intelligence/src/init-scan/index.ts",
				),
			},
		},
		test: {
			name: "@vreko/cli",
			testTimeout: 15000,
			include: ["test/**/*.test.ts", "src/**/__tests__/**/*.test.tsx", "src/**/__tests__/**/*.test.ts"],
			exclude: [
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-601
				// Reason: Requires live vrekod process, git repo with hooks, or network
				// EXPIRES: 2026-06-30
				"test/e2e/warn-mode.e2e.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-602
				// Reason: Requires live git repo with hooks configured
				// EXPIRES: 2026-06-30
				"test/integration/git-hooks.integration.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-603
				// Reason: Requires live vrekod process and network
				// EXPIRES: 2026-06-30
				"test/integration/warn-mode.integration.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-604
				// Reason: Requires live daemon init and socket handshake
				// EXPIRES: 2026-06-30
				"test/integration/init-daemon.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-605
				// Reason: Requires persisted vreko session fixture on disk
				// EXPIRES: 2026-06-30
				"test/snapshot-persistence.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-606
				// Reason: Imports @vreko/intelligence which has broken internal logger path
				// EXPIRES: 2026-06-30
				"test/daemon/sync-integration.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-607
				// Reason: Requires full ACP stack with storage broker running
				// EXPIRES: 2026-06-30
				"test/acp/tools.test.ts",
				// EXCLUDED: 2026-03-30 | owner: cli-team | ticket: SB-608
				// Reason: Requires specific env vars (DATABASE_URL, BETTER_AUTH_SECRET, REDIS_URL)
				// EXPIRES: 2026-06-30
				"test/unit/load-env.test.ts",
			],
		},
	}),
);
