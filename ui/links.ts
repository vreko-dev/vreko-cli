/**
 * Terminal Hyperlinks Module
 *
 * Add clickable links to terminal output.
 * Supports terminals that implement the OSC 8 hyperlink escape sequence.
 *
 * @see https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
 * @module ui/links
 */

import chalk from "chalk";

// =============================================================================
// TYPES
// =============================================================================

export interface TerminalLinkOptions {
	fallback?: boolean;
}

// =============================================================================
// TERMINAL DETECTION
// =============================================================================

/**
 * Check if terminal supports hyperlinks (OSC 8)
 */
export function supportsHyperlinks(): boolean {
	// Check environment variables
	const forceHyperlinks = process.env.FORCE_HYPERLINK;
	if (forceHyperlinks === "0") {
		return false;
	}
	if (forceHyperlinks === "1") {
		return true;
	}

	// Check for known supported terminals
	const { TERM_PROGRAM, VTE_VERSION, COLORTERM, CI } = process.env;

	// CI environments typically don't support hyperlinks
	if (CI) {
		return false;
	}

	// iTerm2 3.1+
	if (TERM_PROGRAM === "iTerm.app") {
		return true;
	}

	// VTE-based terminals (GNOME Terminal, Tilix, etc.) version 0.50+
	if (VTE_VERSION) {
		const version = Number.parseInt(VTE_VERSION, 10);
		if (version >= 5000) {
			return true;
		}
	}

	// Windows Terminal
	if (process.env.WT_SESSION) {
		return true;
	}

	// VSCode integrated terminal
	if (TERM_PROGRAM === "vscode") {
		return true;
	}

	// Kitty
	if (process.env.KITTY_WINDOW_ID) {
		return true;
	}

	// Hyper
	if (COLORTERM === "truecolor" && TERM_PROGRAM === "Hyper") {
		return true;
	}

	// Alacritty
	if (TERM_PROGRAM === "Alacritty") {
		return true;
	}

	// WezTerm
	if (process.env.WEZTERM_PANE) {
		return true;
	}

	return false;
}

// =============================================================================
// HYPERLINK CREATION
// =============================================================================

/**
 * Create a clickable terminal hyperlink
 */
export function link(text: string, url: string, options: TerminalLinkOptions = {}): string {
	const { fallback = true } = options;

	if (supportsHyperlinks()) {
		// OSC 8 hyperlink sequence: \x1B]8;;URL\x07TEXT\x1B]8;;\x07
		return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
	}

	if (fallback) {
		// Fallback: show text with URL in parentheses
		return `${text} (${chalk.gray(url)})`;
	}

	return text;
}

/**
 * Create a file:// link that opens in editor
 */
export function fileLink(filePath: string, line?: number): string {
	const displayPath = filePath.replace(process.cwd(), ".");
	let url = `file://${filePath}`;

	if (line !== undefined) {
		url += `:${line}`;
	}

	return link(displayPath, url);
}

/**
 * Create a Vreko documentation link
 */
export function docsLink(path: string, text?: string): string {
	const url = `https://docs.vreko.dev/${path}`;
	return link(text || path, url);
}

/**
 * Create a GitHub issue link
 */
export function issueLink(issueNumber: number): string {
	const url = `https://github.com/vreko-dev/vreko/issues/${issueNumber}`;
	return link(`#${issueNumber}`, url);
}

/**
 * Create a command link (for suggestion output)
 */
export function commandLink(command: string): string {
	// Some terminals support running commands via hyperlinks
	// For now, just style it distinctively
	return chalk.cyan(`$ ${command}`);
}

// =============================================================================
// STYLED OUTPUT HELPERS
// =============================================================================

/**
 * Output a row with a label and linked value
 */
export function labeledLink(label: string, text: string, url: string): string {
	return `${chalk.gray(label)}: ${link(text, url)}`;
}

/**
 * Create a "Learn more" link
 */
export function learnMore(url: string): string {
	return chalk.gray(`Learn more: ${link(url, url)}`);
}

/**
 * Create a "Report issue" link
 */
export function reportIssue(): string {
	const url = "https://github.com/vreko-dev/vreko/issues/new";
	return chalk.gray(`If this persists, ${link("report an issue", url)}`);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const hyperlink = {
	create: link,
	file: fileLink,
	docs: docsLink,
	issue: issueLink,
	command: commandLink,
	labeled: labeledLink,
	learnMore,
	reportIssue,
	supportsHyperlinks,
};
