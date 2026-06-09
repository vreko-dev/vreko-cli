// enforce reviewed-by for AI-tagged per policy

import { spawnSync } from "node:child_process";

interface PrePushOptions {
	enforceReviewedBy?: boolean;
}

export async function prepush(options: PrePushOptions = {}): Promise<number> {
	try {
		if (options.enforceReviewedBy) {
			// Check if any AI-tagged commits are being pushed without reviewed-by
			const aiTaggedCommits = getAITaggedCommits();
			if (aiTaggedCommits.length > 0) {
				const unreviewedCommits = aiTaggedCommits.filter((commit) => !hasReviewedBy(commit));

				if (unreviewedCommits.length > 0) {
					for (const _commit of unreviewedCommits) {
						// intentionally empty
					}
					return 1;
				}
			}
		}
		return 0;
	} catch (_error) {
		return 1;
	}
}

function getAITaggedCommits(): CommitInfo[] {
	try {
		// Cross-platform: avoid shell subshell syntax $(...) which doesn't work on Windows
		// Step 1: Get merge base
		const mergeBaseResult = spawnSync("git", ["merge-base", "HEAD", "@{u}"], {
			encoding: "utf-8",
		});

		if (mergeBaseResult.status !== 0 || !mergeBaseResult.stdout.trim()) {
			// No upstream set or other issue - no commits to check
			return [];
		}

		const mergeBase = mergeBaseResult.stdout.trim();

		// Step 2: Get AI-tagged commits in range
		const logResult = spawnSync("git", ["log", "--oneline", "--grep=AI:", `${mergeBase}..HEAD`], {
			encoding: "utf-8",
		});

		if (logResult.status !== 0 || !logResult.stdout.trim()) {
			return [];
		}

		return logResult.stdout
			.split(/\r?\n/) // Cross-platform line endings
			.filter(Boolean)
			.map((line) => {
				const [hash, ...messageParts] = line.split(" ");
				return {
					hash,
					message: messageParts.join(" "),
				};
			});
	} catch (_error) {
		return [];
	}
}

function hasReviewedBy(commit: CommitInfo): boolean {
	try {
		// Cross-platform: use spawnSync with array args instead of string interpolation
		const result = spawnSync("git", ["show", "-s", "--format=%B", commit.hash], {
			encoding: "utf-8",
		});
		if (result.status !== 0) {
			return false;
		}
		return result.stdout.includes("Reviewed-by:");
	} catch (_error) {
		return false;
	}
}

interface CommitInfo {
	hash: string;
	message: string;
}

// CLI entry point
if (import.meta.url === new URL(process.argv[1], "file:").href) {
	const args = process.argv.slice(2);
	const options: PrePushOptions = {};

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--enforce-reviewed-by") {
			options.enforceReviewedBy = true;
		}
	}

	prepush(options)
		.then((exitCode) => {
			process.exit(exitCode);
		})
		.catch((_error) => {
			process.exit(1);
		});
}
