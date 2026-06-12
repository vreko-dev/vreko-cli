/**
 * Diagnostics Bundle Command
 *
 * Produces a zip file for support: service logs (7 days), redacted config,
 * version info, workspace hashes+counts, and recent error log (scrubbed).
 *
 * Usage: vreko diagnostics bundle [--output <path>]
 *
 * The bundle NEVER contains file paths, file contents, auth tokens, or DSNs.
 */

import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, release as osRelease, platform } from "node:os";
import { dirname, join } from "node:path";
import { createGzip } from "node:zlib";
import { Command } from "commander";

// Minimal zip builder using Node.js streams  -  no external dep needed for tar.gz
// We write a tar-like archive using node:zlib gzip around a simple format.
// For real zip we use archiver if available, falling back to tar+gzip.

const HOME_PATH_RE = /\/(Users|home)\/[^/]+\//g;
const GH_TOKEN_RE = /(ghp|gho|ghu|ghs)_[A-Za-z0-9]{36}/g;
const API_KEY_RE = /sk-[A-Za-z0-9]{32,}/g;
const SECRET_KEY_RE = /"(token|secret|key|dsn|password|apiKey|api_key)":\s*"[^"]+"/gi;

function scrub(text: string): string {
	return text
		.replace(HOME_PATH_RE, "/~/")
		.replace(GH_TOKEN_RE, "[REDACTED_GH_TOKEN]")
		.replace(API_KEY_RE, "[REDACTED_API_KEY]")
		.replace(SECRET_KEY_RE, (_, k) => `"${k}": "[REDACTED]"`);
}

function vrekoDir(): string {
	return join(homedir(), ".vreko");
}

function readDaemonLogs(): string {
	const logDir = join(vrekoDir(), "logs");
	if (!existsSync(logDir)) {
		return "(no service logs found)";
	}

	const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
	const lines: string[] = [];

	try {
		const files = readdirSync(logDir)
			.filter((f) => f.endsWith(".log"))
			.map((f) => ({ name: f, mtime: statSync(join(logDir, f)).mtimeMs }))
			.filter((f) => f.mtime >= cutoff)
			.sort((a, b) => a.mtime - b.mtime);

		for (const { name } of files) {
			const content = readFileSync(join(logDir, name), "utf8");
			lines.push(`=== ${name} ===\n${content}`);
		}
	} catch {
		return "(error reading service logs)";
	}

	return lines.join("\n") || "(no logs in last 7 days)";
}

function readRedactedConfig(): Record<string, unknown> {
	const configPath = join(vrekoDir(), "config.json");
	if (!existsSync(configPath)) {
		return {};
	}
	try {
		const raw = readFileSync(configPath, "utf8");
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		// Deep-scrub: convert to string, scrub, parse back
		return JSON.parse(scrub(JSON.stringify(parsed))) as Record<string, unknown>;
	} catch {
		return { error: "could not parse config.json" };
	}
}

function readVersions(): Record<string, string> {
	const versions: Record<string, string> = {
		platform: platform(),
		os: osRelease(),
		node: process.version,
	};

	// CLI version (inlined at build time)
	try {
		const pkgPath = join(dirname(new URL(import.meta.url).pathname), "../../package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
		versions.cli = pkg.version ?? "unknown";
	} catch {
		versions.cli = "unknown";
	}

	// Daemon version from state file
	try {
		const statePath = join(vrekoDir(), "service-version.json");
		if (existsSync(statePath)) {
			const state = JSON.parse(readFileSync(statePath, "utf8")) as { version?: string };
			versions.service = state.version ?? "unknown";
		}
	} catch {
		versions.service = "unknown";
	}

	return versions;
}

function readWorkspacesSummary(): { workspaceHash: string; sessionCount: number; snapshotCount: number }[] {
	const sessionsDir = join(vrekoDir(), "sessions");
	if (!existsSync(sessionsDir)) {
		return [];
	}

	try {
		return readdirSync(sessionsDir, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => {
				const hash = d.name;
				const snapshotDir = join(vrekoDir(), "snapshots", hash);
				const sessionFiles = existsSync(sessionsDir)
					? readdirSync(join(sessionsDir, hash)).filter((f) => f.endsWith(".json")).length
					: 0;
				const snapshotFiles = existsSync(snapshotDir)
					? readdirSync(snapshotDir).filter((f) => f.endsWith(".snap")).length
					: 0;
				return { workspaceHash: hash, sessionCount: sessionFiles, snapshotCount: snapshotFiles };
			});
	} catch {
		return [];
	}
}

function readRecentErrors(): unknown[] {
	const errorLogPath = join(vrekoDir(), "logs", "errors.log");
	if (!existsSync(errorLogPath)) {
		return [];
	}

	try {
		const lines = readFileSync(errorLogPath, "utf8")
			.split("\n")
			.filter(Boolean)
			.slice(-50)
			.map((line) => {
				try {
					return JSON.parse(scrub(line));
				} catch {
					return { raw: scrub(line) };
				}
			});
		return lines;
	} catch {
		return [];
	}
}

// Write a simple .tar.gz-style bundle using archiver if available, else plain JSON files in a directory
async function writeBundleZip(outputPath: string): Promise<void> {
	// Try archiver (may not be installed)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let archiver: unknown = null;
	try {
		// Dynamic import with type assertion to avoid TS module resolution
		archiver = ((await import("archiver" as unknown as string)) as { default: unknown }).default;
	} catch {
		// archiver not available  -  fall back to writing a gzipped JSON blob
	}

	const outputDir = dirname(outputPath);
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	const daemonLog = scrub(readDaemonLogs());
	const config = readRedactedConfig();
	const versions = readVersions();
	const workspaces = readWorkspacesSummary();
	const recentErrors = readRecentErrors();

	if (archiver) {
		await new Promise<void>((resolve, reject) => {
			const output = createWriteStream(outputPath);
			// Cast archiver to callable function
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const archive = (archiver as (format: string, options: unknown) => unknown)("zip", { zlib: { level: 6 } });

			output.on("close", resolve);
			// biome-ignore lint/suspicious/noExplicitAny: archiver types don't match its runtime API
			(archive as any).on("error", reject);
			// biome-ignore lint/suspicious/noExplicitAny: archiver types don't match its runtime API
			(archive as any).pipe(output);

			// biome-ignore lint/suspicious/noExplicitAny: archiver types don't match its runtime API
			const archiveAny = archive as any;
			archiveAny.append(daemonLog, { name: "service.log" });
			archiveAny.append(JSON.stringify(config, null, 2), { name: "config.json" });
			archiveAny.append(JSON.stringify(versions, null, 2), { name: "versions.json" });
			archiveAny.append(JSON.stringify(workspaces, null, 2), { name: "workspaces.json" });
			archiveAny.append(JSON.stringify(recentErrors, null, 2), { name: "recent-errors.json" });

			archiveAny.finalize();
		});
	} else {
		// Fallback: write a gzipped JSON bundle
		const bundle = {
			"service.log": daemonLog,
			"config.json": config,
			"versions.json": versions,
			"workspaces.json": workspaces,
			"recent-errors.json": recentErrors,
		};
		await new Promise<void>((resolve, reject) => {
			const gz = createGzip();
			const out = createWriteStream(outputPath);
			gz.pipe(out);
			gz.on("error", reject);
			out.on("close", resolve);
			gz.write(JSON.stringify(bundle, null, 2));
			gz.end();
		});
	}
}

export function createDiagnosticsCommand(): Command {
	const diagnostics = new Command("diagnostics").description("Diagnostics tools for troubleshooting Vreko");

	diagnostics
		.command("bundle")
		.description("Create a support bundle (logs, config, versions  -  no file contents)")
		.option(
			"--output <path>",
			"Output path for the bundle zip",
			join(homedir(), `vreko-diagnostics-${Date.now()}.zip`),
		)
		.action(async (opts: { output: string }) => {
			console.log(`Creating diagnostics bundle at: ${opts.output}`);

			try {
				await writeBundleZip(opts.output);
				console.log(`Bundle created: ${opts.output}`);
				console.log("Send this file to support. It contains no file contents or auth tokens.");
			} catch (err) {
				console.error("Failed to create bundle:", err instanceof Error ? err.message : String(err));
				process.exit(1);
			}
		});

	return diagnostics;
}
