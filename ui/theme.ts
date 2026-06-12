/**
 * CLI Theme & Branding Constants
 *
 * Single source of truth for CLI colors, ensuring brand consistency
 * across all terminal output.
 *
 * BRAND COLORS (from brand/colors.json):
 * - Primary: Green (#4ADE80) - Main brand color
 * - Green Dark: #22C55E - Hover states
 * - Green Light: #6EE7A7 - Highlights
 *
 * IMPORTANT: Blue/cyan are NOT Vreko brand colors.
 * The 🦎 emoji is blue due to Unicode limitations, not brand choice.
 *
 * @module ui/theme
 */

import chalk from "chalk";

// =============================================================================
// BRAND COLORS (Hex values from brand/colors.json)
// =============================================================================

export const BRAND_COLORS = {
	/** Primary brand green - main color for headers, highlights */
	primary: "#4ADE80",
	/** Darker green for secondary elements */
	primaryDark: "#22C55E",
	/** Light green for subtle highlights */
	primaryLight: "#6EE7A7",

	/** Semantic colors */
	success: "#34D399",
	warning: "#FF6B35",
	error: "#EF4444",
	info: "#3B82F6", // Blue is ONLY for semantic info, not branding

	/** Neutral colors */
	muted: "#71717A",
	text: "#FAFAFA",
} as const;

// =============================================================================
// CHALK THEME - Use these instead of chalk.cyan/blue
// =============================================================================

/**
 * Brand-consistent chalk colors for CLI output.
 *
 * Use `theme.brand` instead of `chalk.cyan` or `chalk.blue`
 * Use `theme.brandBold` instead of `chalk.cyan.bold` or `chalk.blue.bold`
 *
 * @example
 * // ❌ WRONG - off-brand
 * print(...));
 *
 * // ✅ CORRECT - brand-consistent
 * print(...));
 */
export const theme = {
	/** Primary brand color - use for headers, highlights, commands */
	brand: chalk.hex(BRAND_COLORS.primary),
	/** Primary brand color bold - use for section headers */
	brandBold: chalk.hex(BRAND_COLORS.primary).bold,
	/** Darker brand color - use for secondary emphasis */
	brandDark: chalk.hex(BRAND_COLORS.primaryDark),

	/** Success messages */
	success: chalk.hex(BRAND_COLORS.success),
	/** Warning messages */
	warning: chalk.hex(BRAND_COLORS.warning),
	/** Error messages */
	error: chalk.hex(BRAND_COLORS.error),
	/** Informational (semantic blue - use sparingly) */
	info: chalk.hex(BRAND_COLORS.info),

	/** Muted/secondary text */
	muted: chalk.gray,
	/** Dimmed text */
	dim: chalk.dim,
	/** Bold text */
	bold: chalk.bold,
	/** White text */
	white: chalk.white,

	/** Table headers - use brand color */
	tableHeader: chalk.hex(BRAND_COLORS.primary),
} as const;

// =============================================================================
// SEMANTIC HELPERS
// =============================================================================

/**
 * Format a command for display
 * @example formatCommand("vr init") // "$ vr init" in brand green
 */
export function formatCommand(command: string): string {
	return theme.brand(`$ ${command}`);
}

/**
 * Format a section header
 * @example formatSectionHeader("Workspace Status")
 */
export function formatSectionHeader(title: string): string {
	return theme.brandBold(title);
}

/**
 * Format a label-value pair
 * @example formatLabelValue("Email", "user@example.com")
 */
export function formatLabelValue(label: string, value: string): string {
	return `${theme.brand(`${label}:`)} ${value}`;
}

/**
 * Format a step indicator
 * @example formatStep("1", "Connect your account")
 */
export function formatStep(number: string, description: string): string {
	return `${theme.muted(`${number}.`)} ${theme.brand(description)}`;
}

// =============================================================================
// STATUS ICONS
// =============================================================================

export const STATUS_ICONS = {
	success: chalk.green("✓"),
	error: chalk.red("✗"),
	warning: chalk.yellow("⚠"),
	info: theme.brand("ℹ"),
	step: theme.brand("›"),
	bullet: theme.brand("•"),
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ThemeColor = keyof typeof theme;
export type BrandColor = keyof typeof BRAND_COLORS;
