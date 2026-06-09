// DTS disabled: tsup DTS generation conflicts with composite TypeScript project setup.
// Type declarations are generated separately via `tsc --build tsconfig.build.json --emitDeclarationOnly`

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "esbuild";
import { defineConfig } from "tsup";

// Read version from package.json at build time
// This ensures the version is correctly inlined regardless of bundle output location
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8")) as { version: string };

// NOTE: node:sqlite regex hack removed. Node 22+ has native node:sqlite support.
// Target upgraded from node20 to node22 to properly handle node: prefixed imports.

/**
 * Esbuild plugin to fix CJS/ESM interop for CommonJS modules
 * that don't support named exports in ESM.
 */
const cjsInteropPlugin: Plugin = {
	name: "cjs-interop",
	setup(build) {
		build.onEnd((result) => {
			for (const output of result.outputFiles || []) {
				if (output.path.endsWith(".js")) {
					let text = output.text;
					// Fix CJS named imports by converting them to default import + destructuring
					// NOTE: minimatch uses named exports only in modern versions, don't convert it
					// e.g., import { minimatch } from 'minimatch'; -> import minimatch from 'minimatch';
					// (skipped for minimatch since it doesn't have a default export)
					// text = text.replace(
					// 	/import\s*\{\s*minimatch\s*\}\s*from\s*['"]minimatch['"];?/g,
					// 	"import minimatch from 'minimatch';",
					// );
					// p-retry: AbortError is a named export but p-retry ships CJS.
					// If pRetry default is already imported in this chunk, use const destructure to avoid
					// duplicate import declarations. Otherwise replace with a default import.
					if (/import pRetry from ['"]p-retry['"]/.test(text)) {
						text = text.replace(
							/import\s*\{\s*AbortError\s*\}\s*from\s*['"]p-retry['"];?/g,
							"const { AbortError } = pRetry;",
						);
					} else {
						text = text.replace(
							/import\s*\{\s*AbortError\s*\}\s*from\s*['"]p-retry['"];?/g,
							"import pRetry from 'p-retry';",
						);
					}
					text = text.replace(
						/import\s*QuickLRU\s*,\s*\{[^}]*\}\s*from\s*['"]quick-lru['"];?/g,
						"import QuickLRU from 'quick-lru';",
					);
					if (text !== output.text) {
						output.contents = new TextEncoder().encode(text);
					}
				}
			}
		});
	},
};

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"deprecated-snap": "src/deprecated-snap.ts",
	},
	format: ["esm"],
	dts: false,
	clean: true,
	sourcemap: true,
	outDir: "dist",
	splitting: true,
	treeshake: true,
	target: "node22",
	// Handle CommonJS modules properly
	platform: "node",
	// Inline version at build time - fixes runtime package.json resolution issue
	// The __CLI_VERSION__ constant is replaced with the actual version string during bundling
	define: {
		__CLI_VERSION__: JSON.stringify(pkg.version),
	},
	// Add shebang for CLI executable
	// Also set VREKO_CLI=true BEFORE any imports to skip env validation
	banner: {
		js: "#!/usr/bin/env node\nprocess.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';",
	},
	// Bundle all @vreko workspace packages into the CLI except local-service  -
	// the daemon must stay as a separate spawnable Node process, not inlined.
	noExternal: [/^@vreko\/(?!local-service$)/, /^@vreko-oss\//],
	// Keep node: prefixed modules and the daemon external (installed deps, not bundled)
	external: [/^node:/, "node:sqlite", "sqlite", "better-sqlite3", "@vreko/local-service"],
	// Skip bundling node_modules - they'll be installed as dependencies
	skipNodeModulesBundle: true,
	// Esbuild plugins
	esbuildPlugins: [cjsInteropPlugin],
	esbuildOptions(options) {
		options.jsx = "automatic";
	},
	// emitDecoratorMetadata:true in tsconfig.base.json causes tsup to use SWC
	// for transpilation instead of esbuild. Without explicit React config, SWC
	// defaults to the classic JSX transform (React.createElement) without
	// injecting "import React from 'react'", which crashes at runtime when
	// code-split chunks execute without React in scope.
	swc: {
		jsc: {
			transform: {
				react: {
					runtime: "automatic",
				},
			},
		},
	},
	// Scope chokidar to src/ only when in watch mode — without this, tsup --watch
	// walks the entire monorepo tree and exceeds chokidar's file-handle ceiling.
	// process.argv check prevents plain `tsup` (pnpm build) from entering watch mode.
	...(process.argv.includes("--watch") && {
		watch: ["src"],
		watchOptions: { ignored: ["**/dist/**", "**/node_modules/**", "**/.git/**"] },
	}),
});
