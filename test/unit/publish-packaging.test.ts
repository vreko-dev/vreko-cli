import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CLI_DIR = path.resolve(__dirname, "../..");

function packCliManifest(): string {
	const tempDir = mkdtempSync(path.join(os.tmpdir(), "vreko-cli-pack-"));

	try {
		const result = spawnSync("pnpm", ["pack", "--pack-destination", tempDir], {
			cwd: CLI_DIR,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024,
			env: {
				...process.env,
				npm_config_ignore_scripts: "true",
			},
		});

		if (result.status !== 0) {
			throw new Error(
				[
					"pnpm pack failed for apps/cli",
					result.stdout?.trim() ? `stdout:\n${result.stdout.trim()}` : null,
					result.stderr?.trim() ? `stderr:\n${result.stderr.trim()}` : null,
				]
					.filter(Boolean)
					.join("\n\n"),
			);
		}

		const tarball = readdirSync(tempDir).find((file) => file.endsWith(".tgz"));
		if (!tarball) {
			throw new Error("pnpm pack did not produce a tarball");
		}

		const manifest = spawnSync("tar", ["-xOf", path.join(tempDir, tarball), "package/package.json"], {
			encoding: "utf-8",
			maxBuffer: 1024 * 1024,
		});

		if (manifest.status !== 0) {
			throw new Error(
				[
					"tar could not extract package/package.json from the packed CLI tarball",
					manifest.stdout?.trim() ? `stdout:\n${manifest.stdout.trim()}` : null,
					manifest.stderr?.trim() ? `stderr:\n${manifest.stderr.trim()}` : null,
				]
					.filter(Boolean)
					.join("\n\n"),
			);
		}

		return manifest.stdout;
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
}

describe("publish packaging", () => {
	it("packed CLI manifest does not retain workspace or catalog protocol refs", () => {
		const packedPackageJson = JSON.parse(packCliManifest()) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
			optionalDependencies?: Record<string, string>;
		};

		const serialized = JSON.stringify(packedPackageJson);
		expect(serialized).not.toContain("workspace:");
		expect(serialized).not.toContain("catalog:");
	});
});
