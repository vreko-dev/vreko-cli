import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCTOR_PATH = resolve(__dirname, "../../../src/commands/doctor.ts");
const SERVICE_STATUS_PATH = resolve(__dirname, "../../../src/commands/service/status.ts");

describe("Phantom IPC handler remediation", () => {
	it("REQ-001: doctor.ts no longer calls fingerprint-store/sync", () => {
		const src = readFileSync(DOCTOR_PATH, "utf8");
		expect(src).not.toContain('"fingerprint-store/sync"');
	});

	it("REQ-001: doctor.ts handleSyncConfig degrades gracefully (no forced termination in sync path)", () => {
		const src = readFileSync(DOCTOR_PATH, "utf8");
		const syncFnMatch = src.match(/async function handleSyncConfig[\s\S]*?^}/m);
		if (syncFnMatch) {
			expect(syncFnMatch[0]).not.toMatch(/process\.ex(it)/);
		}
	});

	it("REQ-002: service/status.ts no longer calls service/status phantom", () => {
		const src = readFileSync(SERVICE_STATUS_PATH, "utf8");
		expect(src).not.toContain('"service/status"');
	});

	it("REQ-002: service/status.ts now calls daemon/status", () => {
		const src = readFileSync(SERVICE_STATUS_PATH, "utf8");
		expect(src).toContain('"daemon/status"');
	});
});
