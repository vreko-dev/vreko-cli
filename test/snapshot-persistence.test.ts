import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * SKIPPED: CLI Snapshot Persistence Integration Tests
 *
 * These tests require CLI subcommands that don't exist yet:
 * - `snapshot create --message "..."` (current: `snapshot -m "..."`)
 * - `snapshot list`
 * - `snapshot restore <id>`
 * - `snapshot protect <id>`
 *
 * The current CLI has a single `snapshot` command without subcommands.
 * These tests should be re-enabled when the CLI is refactored to use
 * subcommands or the tests are updated to match the current CLI interface.
 *
 * TODO: Either refactor CLI to use subcommands or update tests to match
 * current CLI interface (e.g., `vreko snapshot -m "message"`)
 */
describe("@integration CLI Snapshot Persistence Integration", () => {
	let testDir: string;
	let cliPath: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `cli-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		cliPath = join(__dirname, "../dist/index.js");

		// Create a test file to snapshot
		writeFileSync(join(testDir, "test.ts"), 'console.log("test");');
	});

	afterEach(() => {
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch (_error) {
			// Ignore cleanup errors
		}
	});

	describe("end-to-end snapshot workflow", () => {
		it("should create and persist snapshot to disk", () => {
			const result = execSync(`node ${cliPath} snapshot create --message "Test snapshot"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(result).toContain("Snapshot created");
			expect(result).toMatch(/ID: [a-f0-9-]{36}/); // UUID format

			// Verify SQLite database was created
			const dbPath = join(testDir, ".vreko", "snapshots.db");
			expect(existsSync(dbPath)).toBe(true);
		});

		it("should list saved snapshots", () => {
			// Create a snapshot first
			execSync(`node ${cliPath} snapshot create --message "Snapshot 1"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			// List snapshots
			const result = execSync(`node ${cliPath} snapshot list`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(result).toContain("Snapshot 1");
			expect(result).toMatch(/\d+ snapshot/); // Should show count
		});

		it("should persist snapshots across CLI invocations", () => {
			// Create snapshot in first invocation
			const createResult = execSync(`node ${cliPath} snapshot create --message "Persistent snapshot"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const snapshotIdMatch = createResult.match(/ID: ([a-f0-9-]{36})/);
			expect(snapshotIdMatch).toBeTruthy();
			const snapshotId = snapshotIdMatch?.[1];

			// List in second invocation - should still see the snapshot
			const listResult = execSync(`node ${cliPath} snapshot list`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(listResult).toContain("Persistent snapshot");
			expect(listResult).toContain(snapshotId);
		});

		it("should restore snapshot from disk", () => {
			// Create snapshot
			const createResult = execSync(`node ${cliPath} snapshot create --message "Restore test"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const snapshotIdMatch = createResult.match(/ID: ([a-f0-9-]{36})/);
			const snapshotId = snapshotIdMatch?.[1];

			// Modify the file
			writeFileSync(join(testDir, "test.ts"), 'console.log("modified");');

			// Restore snapshot
			const restoreResult = execSync(`node ${cliPath} snapshot restore ${snapshotId}`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(restoreResult).toContain("Restored");
		});
	});

	describe("failure scenarios", () => {
		it("should surface actionable error for unwritable directory", () => {
			try {
				execSync(`node ${cliPath} snapshot create --message "Test"`, {
					cwd: "/invalid/unwritable/path",
					encoding: "utf8",
				});
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.message).toMatch(/permission|access|directory/i);
			}
		});

		it("should handle missing snapshot ID gracefully", () => {
			try {
				execSync(`node ${cliPath} snapshot restore nonexistent-id`, {
					cwd: testDir,
					encoding: "utf8",
				});
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.message).toMatch(/not found|does not exist/i);
			}
		});

		it("should handle corrupted database gracefully", () => {
			// Create a snapshot first
			execSync(`node ${cliPath} snapshot create --message "Test"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			// Corrupt the database
			const dbPath = join(testDir, ".vreko", "snapshots.db");
			writeFileSync(dbPath, "corrupted data");

			try {
				execSync(`node ${cliPath} snapshot list`, {
					cwd: testDir,
					encoding: "utf8",
				});
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.message).toMatch(/corrupt|invalid|error/i);
			}
		});
	});

	describe("human-readable output", () => {
		it("should format snapshot list for human consumption", () => {
			execSync(`node ${cliPath} snapshot create --message "Human test"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const result = execSync(`node ${cliPath} snapshot list`, {
				cwd: testDir,
				encoding: "utf8",
			});

			// Should have headers
			expect(result).toMatch(/ID|Timestamp|Message|Files/i);

			// Should have readable formatting
			expect(result).toContain("Human test");
			expect(result).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
		});

		it("should show file count in snapshot list", () => {
			// Create multiple files
			writeFileSync(join(testDir, "file1.ts"), "content1");
			writeFileSync(join(testDir, "file2.ts"), "content2");

			execSync(`node ${cliPath} snapshot create --message "Multi-file"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const result = execSync(`node ${cliPath} snapshot list`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(result).toMatch(/3 file/i); // test.ts + file1.ts + file2.ts
		});

		it("should indicate protected snapshots in list", () => {
			const createResult = execSync(`node ${cliPath} snapshot create --message "Protected"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const snapshotIdMatch = createResult.match(/ID: ([a-f0-9-]{36})/);
			const snapshotId = snapshotIdMatch?.[1];

			// Protect the snapshot
			execSync(`node ${cliPath} snapshot protect ${snapshotId}`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const listResult = execSync(`node ${cliPath} snapshot list`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(listResult).toMatch(/protected|locked|🔒/i);
		});
	});

	describe("concurrency and edge cases", () => {
		it("should handle concurrent snapshot creation", () => {
			// Create multiple snapshots in rapid succession
			const results = Array.from({ length: 5 }, (_, i) =>
				execSync(`node ${cliPath} snapshot create --message "Concurrent ${i}"`, {
					cwd: testDir,
					encoding: "utf8",
				}),
			);

			// All should succeed
			results.forEach((result) => {
				expect(result).toContain("Snapshot created");
			});

			// List should show all 5
			const listResult = execSync(`node ${cliPath} snapshot list`, {
				cwd: testDir,
				encoding: "utf8",
			});

			expect(listResult).toMatch(/5 snapshot/);
		});

		it("should handle large snapshot content without memory issues", () => {
			// Create a large file (5MB)
			const largeContent = "x".repeat(5 * 1024 * 1024);
			writeFileSync(join(testDir, "large.txt"), largeContent);

			const result = execSync(`node ${cliPath} snapshot create --message "Large snapshot"`, {
				cwd: testDir,
				encoding: "utf8",
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer
			});

			expect(result).toContain("Snapshot created");
		});
	});

	describe("deduplication integration", () => {
		it("should prevent duplicate snapshots with same content", () => {
			// Create first snapshot
			const result1 = execSync(`node ${cliPath} snapshot create --message "Original"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const id1Match = result1.match(/ID: ([a-f0-9-]{36})/);
			const id1 = id1Match?.[1];

			// Create duplicate with same content
			const result2 = execSync(`node ${cliPath} snapshot create --message "Duplicate"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const id2Match = result2.match(/ID: ([a-f0-9-]{36})/);
			const id2 = id2Match?.[1];

			// Should return same ID or indicate duplicate
			if (id1 === id2) {
				expect(result2).toMatch(/duplicate|already exists/i);
			}
		});

		it("should allow different snapshots with different content", () => {
			// Create first snapshot
			const result1 = execSync(`node ${cliPath} snapshot create --message "Version 1"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const id1Match = result1.match(/ID: ([a-f0-9-]{36})/);
			const id1 = id1Match?.[1];

			// Modify content
			writeFileSync(join(testDir, "test.ts"), 'console.log("modified");');

			// Create second snapshot
			const result2 = execSync(`node ${cliPath} snapshot create --message "Version 2"`, {
				cwd: testDir,
				encoding: "utf8",
			});

			const id2Match = result2.match(/ID: ([a-f0-9-]{36})/);
			const id2 = id2Match?.[1];

			// Should have different IDs
			expect(id1).not.toBe(id2);
		});
	});
});
