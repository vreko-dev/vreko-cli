/**
 * CLI Warnings Suppression E2E Tests
 *
 * Validates that Node.js experimental warnings (specifically SQLite)
 * are properly suppressed when running the CLI executable.
 *
 * Related to: SQLite experimental warning suppression fix
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CLI_BIN = "./apps/cli/dist/index.js";

// Skip E2E tests when CLI hasn't been built (dist doesn't exist)
const distExists = existsSync(CLI_BIN);

describe.skipIf(!distExists)("CLI Warnings Suppression E2E", () => {
	it("should suppress SQLite experimental warnings when running CLI directly", () => {
		// Execute CLI with ./script (uses shebang)
		let stderr = "";
		let stdout = "";

		try {
			const result = execSync(`${CLI_BIN} --version`, {
				encoding: "utf8",
				stdio: "pipe",
			});
			stdout = result;
		} catch (error: any) {
			stderr = error.stderr?.toString() || "";
			stdout = error.stdout?.toString() || "";
		}

		const output = stdout + stderr;

		// Should NOT contain SQLite experimental warning
		expect(output).not.toMatch(/ExperimentalWarning.*SQLite/i);
		expect(output).not.toMatch(/ExperimentalWarning/i);
	});

	it("should suppress ExperimentalWarning when using vreko commands", () => {
		let stderr = "";
		let stdout = "";

		try {
			const result = execSync(`${CLI_BIN} --help`, {
				encoding: "utf8",
				stdio: "pipe",
			});
			stdout = result;
		} catch (error: any) {
			stderr = error.stderr?.toString() || "";
			stdout = error.stdout?.toString() || "";
		}

		const output = stdout + stderr;

		// Should NOT contain any experimental warnings
		expect(output).not.toMatch(/ExperimentalWarning/i);
		expect(output).not.toMatch(/SQLite is an experimental feature/i);
	});

	it("should still show other warnings (not experimental)", () => {
		// This test validates we only suppress ExperimentalWarning
		// Other warnings should still be visible

		// We can't easily trigger other warnings in this test,
		// but we verify the shebang flag is specific
		const { readFileSync } = require("node:fs");
		const distFile = readFileSync(CLI_BIN, "utf8");

		// Check shebang contains the specific flag
		const firstLine = distFile.split("\n")[0];
		expect(firstLine).toMatch(/--no-warnings=ExperimentalWarning/);

		// Should NOT suppress all warnings
		expect(firstLine).not.toMatch(/--no-warnings\s+/);
		expect(firstLine).not.toMatch(/--no-warnings$/);
	});

	it("should properly execute CLI commands despite warning suppression", () => {
		// Validate CLI still works correctly with suppression flag
		let output = "";

		try {
			output = execSync(`${CLI_BIN} --version`, {
				encoding: "utf8",
				stdio: "pipe",
			});
		} catch (error: any) {
			output = error.stdout?.toString() || "";
		}

		// Should contain version information
		expect(output).toMatch(/\d+\.\d+\.\d+/);
	});

	it("should have shebang with correct Node.js flags", () => {
		// Read the built CLI file
		const { readFileSync } = require("node:fs");
		const distContent = readFileSync(CLI_BIN, "utf8");

		// Extract shebang (first line)
		const shebang = distContent.split("\n")[0];

		// Validate shebang structure
		expect(shebang).toMatch(/^#!\/usr\/bin\/env node/);
		expect(shebang).toContain("--no-warnings=ExperimentalWarning");

		// Ensure proper spacing
		expect(shebang).toMatch(/node --no-warnings=ExperimentalWarning$/);
	});
});
