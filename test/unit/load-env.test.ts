/**
 * Unit tests for load-env module
 *
 * @module load-env.test
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

// Mock dotenv before importing load-env
vi.mock("dotenv", () => ({
	config: vi.fn(),
}));

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
}));

import { config } from "dotenv";

// Import after mocks are set up
const { isRunningUnderDoppler, loadLocalEnv, validateCriticalVars } = await import("../../src/load-env.js");

describe("load-env", () => {
	describe("isRunningUnderDoppler", () => {
		it("returns true when DOPPLER_ENVIRONMENT is set", () => {
			const originalEnv = process.env.DOPPLER_ENVIRONMENT;
			process.env.DOPPLER_ENVIRONMENT = "dev";

			const result = isRunningUnderDoppler();

			expect(result).toBe(true);

			// Cleanup
			if (originalEnv) {
				process.env.DOPPLER_ENVIRONMENT = originalEnv;
			} else {
				delete process.env.DOPPLER_ENVIRONMENT;
			}
		});

		it("returns false when DOPPLER_ENVIRONMENT is not set", () => {
			const originalEnv = process.env.DOPPLER_ENVIRONMENT;
			delete process.env.DOPPLER_ENVIRONMENT;

			const result = isRunningUnderDoppler();

			expect(result).toBe(false);

			// Cleanup
			if (originalEnv) {
				process.env.DOPPLER_ENVIRONMENT = originalEnv;
			}
		});
	});

	describe("loadLocalEnv", () => {
		it("skips loading when running under Doppler", () => {
			process.env.DOPPLER_ENVIRONMENT = "dev";

			loadLocalEnv();

			expect(config).not.toHaveBeenCalled();

			delete process.env.DOPPLER_ENVIRONMENT;
		});

		it("skips loading when .env.local does not exist", () => {
			delete process.env.DOPPLER_ENVIRONMENT;
			vi.mocked(existsSync).mockReturnValue(false);

			loadLocalEnv();

			expect(config).not.toHaveBeenCalled();
		});

		it("loads .env.local when file exists and not under Doppler", () => {
			delete process.env.DOPPLER_ENVIRONMENT;
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(config).mockReturnValue({ parsed: { REDIS_URL: "redis://localhost" } });

			loadLocalEnv();

			expect(config).toHaveBeenCalledWith({ path: resolve(process.cwd(), ".env.local") });
		});
	});

	describe("validateCriticalVars", () => {
		it("does not warn when REDIS_URL is present", () => {
			const originalRedis = process.env.REDIS_URL;

			process.env.REDIS_URL = "redis://localhost";

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
				/* intentionally empty */
			});

			validateCriticalVars();

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();

			// Cleanup
			if (originalRedis) {
				process.env.REDIS_URL = originalRedis;
			} else {
				delete process.env.REDIS_URL;
			}
		});

		it("warns when REDIS_URL is missing", () => {
			const originalRedis = process.env.REDIS_URL;

			delete process.env.REDIS_URL;

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
				/* intentionally empty */
			});

			validateCriticalVars();

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Missing environment variables"));

			consoleSpy.mockRestore();

			// Cleanup
			if (originalRedis) {
				process.env.REDIS_URL = originalRedis;
			}
		});
	});
});
