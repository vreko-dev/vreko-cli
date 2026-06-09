/**
 * Risk-Level Color System & Signal Icons
 *
 * Extends the brand colors in theme.ts with risk-specific palette and signal type icons.
 * All components and views should use these instead of raw chalk colors.
 *
 * @module ui/colors
 */

import chalk from "chalk";
import { BRAND_COLORS } from "./theme.js";

// =============================================================================
// RISK COLORS
// =============================================================================

/** Risk-level chalk colors  -  mapped to visual severity spectrum */
export const riskColors = {
	safe: chalk.hex(BRAND_COLORS.success), // #34D399  -  green
	low: chalk.cyan,
	medium: chalk.hex(BRAND_COLORS.warning), // #FF6B35  -  orange
	high: chalk.red,
	critical: chalk.bgRed.white,
} as const;

// =============================================================================
// SIGNAL COLORS
// =============================================================================

/** Signal type chalk colors for the event feed */
export const signalColors = {
	learning: chalk.hex("#A78BFA"), // purple
	pattern: chalk.hex("#60A5FA"), // blue
	risk: chalk.hex("#F59E0B"), // amber
	ai: chalk.magenta,
	mcp: chalk.hex("#34D399"), // emerald
} as const;

// =============================================================================
// SIGNAL ICONS
// =============================================================================

/** Unicode icons for each signal type, used in event feeds and status lines */
export const signalIcons = {
	fragile: "⚡",
	cochange: "🔗",
	learning: "📚",
	risk: "🛡",
	pattern: "🧠",
	save: "✓",
	warning: "⚠",
	mcp: "◆",
} as const;

// =============================================================================
// RISK COLOR FUNCTION
// =============================================================================

/**
 * Returns the appropriate chalk color for a 0–1 risk score.
 *
 * @example
 * const colored = riskColor(0.75)(String(score));
 */
export function riskColor(score: number): chalk.Chalk {
	if (score < 0.3) {
		return riskColors.safe;
	}
	if (score < 0.5) {
		return riskColors.low;
	}
	if (score < 0.7) {
		return riskColors.medium;
	}
	if (score < 0.9) {
		return riskColors.high;
	}
	return riskColors.critical;
}
