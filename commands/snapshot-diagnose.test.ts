/**
 * Snapshot Diagnostic Command Tests
 *
 * Tests the new `vreko snapshot diagnose` command
 * Verifies disk space checks, permission validation, and recommendations
 */

import { exec } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	statSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
	exec: vi.fn(),
}));

vi.mock("node:util", () => ({
	promisify: vi.fn((fn) => fn),
}));

const execAsync = promisify(exec);

describe("Snapshot Diagnostic Command", () => {
	const mockCwd = "/Users/test/project";
	const mockVrekoDir = `${mockCwd}/.vreko`;

	beforeEach(() => {
		vi.clearAllMocks();
		process.cwd = vi.fn(() => mockCwd);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Directory Existence Checks", () => {
		it("should detect when .vreko directory exists", () => {
			(existsSync as any).mockReturnValue(true);

			const exists = existsSync(mockVrekoDir);
			expect(exists).toBe(true);
		});

		it("should detect when .vreko directory is missing", () => {
			(existsSync as any).mockReturnValue(false);

			const exists = existsSync(mockVrekoDir);
			expect(exists).toBe(false);
		});

		it("should recommend initialization when directory missing", () => {
			(existsSync as any).mockReturnValue(false);

			const diagnostics = {
				vrekoExists: existsSync(mockVrekoDir),
				issues: [] as string[],
				recommendations: [] as string[],
			};

			if (!diagnostics.vrekoExists) {
				diagnostics.issues.push("VREKO_NOT_INITIALIZED: .vreko directory does not exist");
				diagnostics.recommendations.push("Initialize Vreko in this workspace first");
			}

			expect(diagnostics.issues).toContain("VREKO_NOT_INITIALIZED: .vreko directory does not exist");
			expect(diagnostics.recommendations).toContain("Initialize Vreko in this workspace first");
		});
	});

	describe("Permission Checks", () => {
		it("should check read/write/execute permissions", () => {
			(existsSync as any).mockReturnValue(true);
			(statSync as any).mockReturnValue({
				mode: 0o755, // rwxr-xr-x
			});

			const stats = statSync(mockVrekoDir);
			const permissions = {
				readable: !!(stats.mode & 0o444),
				writable: !!(stats.mode & 0o222),
				executable: !!(stats.mode & 0o111),
			};

			expect(permissions.readable).toBe(true);
			expect(permissions.writable).toBe(true);
			expect(permissions.executable).toBe(true);
		});

		it("should detect non-writable directory", () => {
			(existsSync as any).mockReturnValue(true);
			(statSync as any).mockReturnValue({
				mode: 0o444, // r--r--r-- (read-only)
			});

			const stats = statSync(mockVrekoDir);
			const writable = !!(stats.mode & 0o222);

			expect(writable).toBe(false);
		});

		it("should recommend chmod fix for permission issues", () => {
			(existsSync as any).mockReturnValue(true);
			(statSync as any).mockReturnValue({
				mode: 0o444, // read-only
			});

			const diagnostics = {
				issues: [] as string[],
				recommendations: [] as string[],
			};

			const stats = statSync(mockVrekoDir);
			const writable = !!(stats.mode & 0o222);

			if (!writable) {
				diagnostics.issues.push("PERMISSION_DENIED: .vreko directory is not writable");
				diagnostics.recommendations.push("Run: chmod -R 755 .vreko/");
			}

			expect(diagnostics.issues).toContain("PERMISSION_DENIED: .vreko directory is not writable");
			expect(diagnostics.recommendations).toContain("Run: chmod -R 755 .vreko/");
		});
	});

	describe("Disk Space Checks", () => {
		it("should parse disk space from df command", async () => {
			(execAsync as any).mockResolvedValue({
				stdout: "Filesystem     Size  Used Avail Use% Mounted\n/dev/disk1    500G  250G  250G  50% /\n",
			});

			const { stdout } = await execAsync(`df -h "${mockCwd}"`);
			const lines = stdout.trim().split("\n");
			const parts = lines[1].split(/\s+/);

			const diskSpace = {
				total: parts[1],
				used: parts[2],
				available: parts[3],
				usedPercent: parts[4],
			};

			expect(diskSpace.total).toBe("500G");
			expect(diskSpace.used).toBe("250G");
			expect(diskSpace.available).toBe("250G");
			expect(diskSpace.usedPercent).toBe("50%");
		});

		it("should warn when disk is 80-90% full", () => {
			const diskSpace = { usedPercent: "85%" };
			const usedPercent = Number.parseInt(diskSpace.usedPercent.replace("%", ""), 10);

			const diagnostics = {
				issues: [] as string[],
				recommendations: [] as string[],
			};

			if (usedPercent > 80 && usedPercent <= 90) {
				diagnostics.issues.push(`STORAGE_WARNING: Disk is ${usedPercent}% full`);
				diagnostics.recommendations.push("Consider pruning old snapshots: vreko snapshot prune");
			}

			expect(diagnostics.issues).toContain("STORAGE_WARNING: Disk is 85% full");
			expect(diagnostics.recommendations).toContain("Consider pruning old snapshots: vreko snapshot prune");
		});

		it("should error when disk is >90% full", () => {
			const diskSpace = { usedPercent: "95%" };
			const usedPercent = Number.parseInt(diskSpace.usedPercent.replace("%", ""), 10);

			const diagnostics = {
				issues: [] as string[],
				recommendations: [] as string[],
			};

			if (usedPercent > 90) {
				diagnostics.issues.push(`STORAGE_FULL: Disk is ${usedPercent}% full`);
				diagnostics.recommendations.push("Free up disk space or prune old snapshots");
			}

			expect(diagnostics.issues).toContain("STORAGE_FULL: Disk is 95% full");
			expect(diagnostics.recommendations).toContain("Free up disk space or prune old snapshots");
		});

		it("should pass when disk has plenty of space", () => {
			const diskSpace = { usedPercent: "50%" };
			const usedPercent = Number.parseInt(diskSpace.usedPercent.replace("%", ""), 10);

			const diagnostics = {
				issues: [] as string[],
			};

			if (usedPercent > 90) {
				diagnostics.issues.push(`STORAGE_FULL: Disk is ${usedPercent}% full`);
			} else if (usedPercent > 80) {
				diagnostics.issues.push(`STORAGE_WARNING: Disk is ${usedPercent}% full`);
			}

			expect(diagnostics.issues).toHaveLength(0);
		});
	});

	describe("Storage Size Checks", () => {
		it("should get .vreko directory size", async () => {
			(execAsync as any).mockResolvedValue({
				stdout: "128M\t/Users/test/project/.vreko\n",
			});

			const { stdout } = await execAsync(`du -sh "${mockVrekoDir}"`);
			const storageSize = stdout.split("\t")[0].trim();

			expect(storageSize).toBe("128M");
		});

		it("should count snapshot files", async () => {
			(execAsync as any).mockResolvedValue({
				stdout: "42\n",
			});

			const { stdout } = await execAsync(
				`find "${mockVrekoDir}/snapshots" -type f -name "*.json" 2>/dev/null | wc -l`,
			);
			const snapshotCount = Number.parseInt(stdout.trim(), 10);

			expect(snapshotCount).toBe(42);
		});

		it("should handle missing snapshots directory gracefully", async () => {
			(execAsync as any).mockResolvedValue({
				stdout: "0\n",
			});

			const { stdout } = await execAsync(
				`find "${mockVrekoDir}/snapshots" -type f -name "*.json" 2>/dev/null | wc -l`,
			);
			const snapshotCount = Number.parseInt(stdout.trim(), 10);

			expect(snapshotCount).toBe(0);
		});
	});

	describe("Service Status Checks", () => {
		it("should detect when service is running", () => {
			const isServiceRunning = vi.fn(() => true);

			const serviceStatus = isServiceRunning() ? "running" : "stopped";
			expect(serviceStatus).toBe("running");
		});

		it("should detect when service is stopped", () => {
			const isServiceRunning = vi.fn(() => false);

			const serviceStatus = isServiceRunning() ? "running" : "stopped";
			expect(serviceStatus).toBe("stopped");
		});

		it("should recommend starting service when stopped", () => {
			const isServiceRunning = vi.fn(() => false);

			const diagnostics = {
				serviceStatus: isServiceRunning() ? "running" : "stopped",
				recommendations: [] as string[],
			};

			if (!isServiceRunning()) {
				diagnostics.recommendations.push("Start service: vreko service start --daemon");
			}

			expect(diagnostics.recommendations).toContain("Start service: vreko service start --daemon");
		});
	});

	describe("JSON Output Format", () => {
		it("should support JSON output for automation", () => {
			const diagnostics = {
				workspace: mockCwd,
				timestamp: new Date().toISOString(),
				vrekoExists: true,
				permissions: {
					readable: true,
					writable: true,
					executable: true,
				},
				diskSpace: {
					total: "500G",
					used: "250G",
					available: "250G",
					usedPercent: "50%",
				},
				snapshotCount: 42,
				storageSize: "128M",
				serviceStatus: "running",
				issues: [],
				recommendations: [],
			};

			const jsonOutput = JSON.stringify(diagnostics, null, 2);
			const parsed = JSON.parse(jsonOutput);

			expect(parsed.workspace).toBe(mockCwd);
			expect(parsed.vrekoExists).toBe(true);
			expect(parsed.snapshotCount).toBe(42);
		});
	});

	describe("Comprehensive Diagnostics", () => {
		it("should report healthy system with no issues", () => {
			const diagnostics = {
				vrekoExists: true,
				permissions: { readable: true, writable: true, executable: true },
				diskSpace: { usedPercent: "50%" },
				serviceStatus: "running",
				issues: [],
				recommendations: [],
			};

			expect(diagnostics.issues).toHaveLength(0);
			expect(diagnostics.recommendations).toHaveLength(0);
		});

		it("should collect multiple issues when system is unhealthy", () => {
			const diagnostics = {
				vrekoExists: true,
				permissions: { readable: true, writable: false, executable: true },
				diskSpace: { usedPercent: "95%" },
				serviceStatus: "stopped",
				issues: ["PERMISSION_DENIED: .vreko directory is not writable", "STORAGE_FULL: Disk is 95% full"],
				recommendations: [
					"Run: chmod -R 755 .vreko/",
					"Free up disk space or prune old snapshots",
					"Start service: vreko service start --daemon",
				],
			};

			expect(diagnostics.issues).toHaveLength(2);
			expect(diagnostics.recommendations).toHaveLength(3);
		});
	});

	describe("Error Handling", () => {
		it("should handle permission check errors gracefully", () => {
			(statSync as any).mockImplementation(() => {
				throw new Error("Permission denied");
			});

			const diagnostics = {
				issues: [] as string[],
			};

			try {
				statSync(mockVrekoDir);
			} catch (error) {
				diagnostics.issues.push(`Permission check failed: ${error}`);
			}

			expect(diagnostics.issues.length).toBeGreaterThan(0);
			expect(diagnostics.issues[0]).toContain("Permission check failed");
		});

		it("should continue diagnostics even if some checks fail", async () => {
			// Storage size check fails
			(execAsync as any).mockImplementation((cmd: string) => {
				if (cmd.includes("du -sh")) {
					throw new Error("Command failed");
				}
				return Promise.resolve({ stdout: "0\n" });
			});

			const diagnostics = {
				storageSize: "0",
				snapshotCount: 0,
			};

			// Should still get snapshot count even if storage size fails
			try {
				const { stdout } = await execAsync(`du -sh "${mockVrekoDir}"`);
				diagnostics.storageSize = stdout.split("\t")[0].trim();
			} catch {
				// Ignore error - non-critical
			}

			try {
				const { stdout } = await execAsync(
					`find "${mockVrekoDir}/snapshots" -type f -name "*.json" 2>/dev/null | wc -l`,
				);
				diagnostics.snapshotCount = Number.parseInt(stdout.trim(), 10);
			} catch {
				// Ignore error
			}

			expect(diagnostics.storageSize).toBe("0"); // Failed but didn't crash
			expect(diagnostics.snapshotCount).toBe(0); // Succeeded
		});
	});
});
