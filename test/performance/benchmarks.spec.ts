/**
 * CLI Performance Benchmarks
 *
 * Measures performance of all CLI commands against budgets from CLAUDE.md:
 * - Snapshot creation: <200ms
 * - Risk analysis: <200ms
 * - List operations: <100ms
 */

import { exec } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execAsync = promisify(exec);

describe("CLI Performance Benchmarks", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create temporary directory for tests
		testDir = await mkdtemp(join(tmpdir(), "vreko-cli-bench-"));
	});

	afterEach(async () => {
		// Cleanup
		await rm(testDir, { recursive: true, force: true });
	});

	describe("analyze command", () => {
		it("bench-cli-001: should analyze file in <200ms (quick mode)", async () => {
			// Create test file
			const testFile = join(testDir, "test.ts");
			await writeFile(
				testFile,
				`
				function hello() {
					console.log("Hello world");
					return 42;
				}
			`,
			);

			const start = performance.now();
			const result = await execAsync(`node dist/index.js analyze ${testFile}`, {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(result.stdout).toBeDefined();
			expect(duration).toBeLessThan(200);
		});

		it("bench-cli-002: should analyze file in <500ms (AST mode)", async () => {
			// Create test file with more complex code
			const testFile = join(testDir, "complex.ts");
			await writeFile(
				testFile,
				`
				class Calculator {
					add(a: number, b: number): number {
						return a + b;
					}

					multiply(a: number, b: number): number {
						return a * b;
					}
				}

				const calc = new Calculator();
				console.log(calc.add(2, 3));
			`,
			);

			const start = performance.now();
			const result = await execAsync(`node dist/index.js analyze ${testFile} --ast`, {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(result.stdout).toBeDefined();
			expect(duration).toBeLessThan(500); // AST analysis has higher budget
		});

		it("bench-cli-003: should detect risks in <200ms", async () => {
			// Create risky file
			const testFile = join(testDir, "risky.ts");
			await writeFile(
				testFile,
				`
				const userInput = getUserInput();
				eval(userInput); // Risky!
			`,
			);

			const start = performance.now();
			const result = await execAsync(`node dist/index.js analyze ${testFile}`, {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(result.stdout).toContain("Risk");
			expect(duration).toBeLessThan(200);
		});
	});

	describe("snapshot command", () => {
		it("bench-cli-004: should create snapshot in <200ms", async () => {
			// Create test file
			const testFile = join(testDir, "snapshot-test.ts");
			await writeFile(testFile, "console.log('test');");

			const start = performance.now();
			await execAsync(`node dist/index.js snapshot -f ${testFile} -m "Bench test"`, {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(200);
		});

		it("bench-cli-005: should create multi-file snapshot in <300ms", async () => {
			// Create multiple test files
			const files = [];
			for (let i = 0; i < 5; i++) {
				const file = join(testDir, `file${i}.ts`);
				await writeFile(file, `console.log('File ${i}');`);
				files.push(file);
			}

			const start = performance.now();
			await execAsync(`node dist/index.js snapshot -f ${files.join(" ")} -m "Multi-file bench"`, {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(300);
		});
	});

	describe("list command", () => {
		it("bench-cli-006: should list snapshots in <100ms", async () => {
			const start = performance.now();
			const result = await execAsync("node dist/index.js list", {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(result.stdout).toBeDefined();
			expect(duration).toBeLessThan(100);
		});
	});

	describe("check command", () => {
		it("bench-cli-007: should run pre-commit check in <300ms", async () => {
			// Create test file
			const testFile = join(testDir, "commit-test.ts");
			await writeFile(testFile, "console.log('commit');");

			// Mock git diff output
			process.env.VREKO_TEST_MODE = "true";

			const start = performance.now();
			const result = await execAsync(`node dist/index.js check ${testFile}`, {
				cwd: process.cwd(),
			});
			const duration = performance.now() - start;

			expect(result.stdout).toBeDefined();
			expect(duration).toBeLessThan(300);

			delete process.env.VREKO_TEST_MODE;
		});
	});

	describe("End-to-End Performance", () => {
		it("bench-cli-008: should complete full workflow in <1000ms", async () => {
			const testFile = join(testDir, "workflow.ts");
			await writeFile(testFile, "const x = 1 + 2;");

			const start = performance.now();

			// Analyze
			await execAsync(`node dist/index.js analyze ${testFile}`);

			// Create snapshot
			await execAsync(`node dist/index.js snapshot -f ${testFile} -m "Workflow test"`);

			// List
			await execAsync("node dist/index.js list");

			const duration = performance.now() - start;

			expect(duration).toBeLessThan(1000);
		});
	});
});
