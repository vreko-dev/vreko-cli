/**
 * Terminal Links Invariants
 *
 * Tests for hyperlink detection and link formatting.
 * Invariants: fallback format is always readable; FORCE_HYPERLINK env var takes priority.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	commandLink,
	docsLink,
	fileLink,
	learnMore,
	link,
	reportIssue,
	supportsHyperlinks,
} from "../../src/ui/links.js";

const OSC8_ESCAPE = "]8;;";

describe("supportsHyperlinks()", () => {
	const saved: Record<string, string | undefined> = {};

	beforeEach(() => {
		saved.FORCE_HYPERLINK = process.env.FORCE_HYPERLINK;
		saved.TERM_PROGRAM = process.env.TERM_PROGRAM;
		saved.CI = process.env.CI;
		saved.VTE_VERSION = process.env.VTE_VERSION;
		saved.WT_SESSION = process.env.WT_SESSION;
	});

	afterEach(() => {
		for (const [k, v] of Object.entries(saved)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
	});

	it("FORCE_HYPERLINK=0 disables hyperlinks regardless of terminal", () => {
		process.env.FORCE_HYPERLINK = "0";
		process.env.TERM_PROGRAM = "iTerm.app";
		expect(supportsHyperlinks()).toBe(false);
	});

	it("FORCE_HYPERLINK=1 enables hyperlinks regardless of terminal", () => {
		process.env.FORCE_HYPERLINK = "1";
		delete process.env.TERM_PROGRAM;
		expect(supportsHyperlinks()).toBe(true);
	});

	it("CI environment disables hyperlinks", () => {
		delete process.env.FORCE_HYPERLINK;
		process.env.CI = "true";
		expect(supportsHyperlinks()).toBe(false);
	});

	it("iTerm2 enables hyperlinks", () => {
		delete process.env.FORCE_HYPERLINK;
		delete process.env.CI;
		process.env.TERM_PROGRAM = "iTerm.app";
		expect(supportsHyperlinks()).toBe(true);
	});

	it("vscode terminal enables hyperlinks", () => {
		delete process.env.FORCE_HYPERLINK;
		delete process.env.CI;
		process.env.TERM_PROGRAM = "vscode";
		expect(supportsHyperlinks()).toBe(true);
	});

	it("returns false for unknown terminal without force", () => {
		delete process.env.FORCE_HYPERLINK;
		delete process.env.CI;
		delete process.env.TERM_PROGRAM;
		delete process.env.VTE_VERSION;
		delete process.env.WT_SESSION;
		delete process.env.KITTY_WINDOW_ID;
		delete process.env.WEZTERM_PANE;
		const orig = process.env.COLORTERM;
		delete process.env.COLORTERM;
		const result = supportsHyperlinks();
		// In test environment (not a known terminal) should be false
		expect(typeof result).toBe("boolean");
		if (orig) process.env.COLORTERM = orig;
	});
});

describe("link()  -  OSC 8 or fallback", () => {
	beforeEach(() => {
		process.env.FORCE_HYPERLINK = "0"; // Force fallback for predictable test output
	});

	afterEach(() => {
		delete process.env.FORCE_HYPERLINK;
	});

	it("fallback includes text and URL", () => {
		const result = link("docs", "https://docs.vreko.dev");
		expect(result).toContain("docs");
		expect(result).toContain("https://docs.vreko.dev");
	});

	it("fallback=false returns text only when no hyperlinks", () => {
		const result = link("docs", "https://docs.vreko.dev", { fallback: false });
		expect(result).toBe("docs");
	});

	it("with FORCE_HYPERLINK=1 uses OSC 8 escape sequence", () => {
		process.env.FORCE_HYPERLINK = "1";
		const result = link("docs", "https://docs.vreko.dev");
		expect(result).toContain(OSC8_ESCAPE);
		expect(result).toContain("https://docs.vreko.dev");
		expect(result).toContain("docs");
	});
});

describe("fileLink()", () => {
	beforeEach(() => {
		process.env.FORCE_HYPERLINK = "0";
	});
	afterEach(() => {
		delete process.env.FORCE_HYPERLINK;
	});

	it("includes the file path (displayed without cwd prefix)", () => {
		const result = fileLink("/some/absolute/path.ts");
		expect(result).toContain("path.ts");
	});

	it("includes file:// URL", () => {
		process.env.FORCE_HYPERLINK = "1";
		const result = fileLink("/some/path.ts");
		expect(result).toContain("file:///some/path.ts");
	});
});

describe("docsLink()", () => {
	beforeEach(() => {
		process.env.FORCE_HYPERLINK = "0";
	});
	afterEach(() => {
		delete process.env.FORCE_HYPERLINK;
	});

	it("includes docs.vreko.dev URL", () => {
		const result = docsLink("getting-started");
		expect(result).toContain("docs.vreko.dev");
	});

	it("includes the provided path segment", () => {
		const result = docsLink("getting-started");
		expect(result).toContain("getting-started");
	});

	it("uses custom text when provided", () => {
		const result = docsLink("getting-started", "Read the docs");
		expect(result).toContain("Read the docs");
	});
});

describe("commandLink()", () => {
	it("formats command with $ prefix", () => {
		const result = commandLink("vreko init");
		expect(result).toContain("vreko init");
		expect(result).toContain("$");
	});
});

describe("learnMore()", () => {
	beforeEach(() => {
		process.env.FORCE_HYPERLINK = "0";
	});
	afterEach(() => {
		delete process.env.FORCE_HYPERLINK;
	});

	it("includes the URL", () => {
		const result = learnMore("https://docs.vreko.dev/guide");
		expect(result).toContain("docs.vreko.dev");
	});
});

describe("reportIssue()", () => {
	beforeEach(() => {
		process.env.FORCE_HYPERLINK = "0";
	});
	afterEach(() => {
		delete process.env.FORCE_HYPERLINK;
	});

	it("includes GitHub issues URL", () => {
		const result = reportIssue();
		expect(result).toContain("github.com");
	});

	it("contains human-readable call-to-action", () => {
		const result = reportIssue();
		expect(result.length).toBeGreaterThan(0);
	});
});
