/**
 * Vreko Logo Component
 *
 * React-based Ink component for rendering the brand logo
 * with gradient colors and responsive sizing.
 *
 * @module components/VrekoLogo
 */

import { Box, Text } from "ink";
import InkGradient from "ink-gradient";
import type React from "react";

// =============================================================================
// BRAND COLORS
// =============================================================================

const BRAND_COLORS = {
	primary: ["#22C55E", "#10B981", "#14B8A6"], // Green to Teal
	warm: ["#F59E0B", "#84CC16", "#22C55E"], // Amber to Green
	cool: ["#3B82F6", "#06B6D4", "#14B8A6"], // Blue to Teal
};

// =============================================================================
// LOGO ASCII ART
// =============================================================================

const LOGO_LARGE = `██╗   ██╗██████╗ ███████╗██╗  ██╗ ██████╗
██║   ██║██╔══██╗██╔════╝██║ ██╔╝██╔═══██╗
██║   ██║██████╔╝█████╗  █████╔╝ ██║   ██║
╚██╗ ██╔╝██╔══██╗██╔══╝  ██╔═██╗ ██║   ██║
 ╚████╔╝ ██║  ██║███████╗██║  ██╗╚██████╔╝
  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝`;

const LOGO_COMPACT = `
    🦎
   ╱{S}╲
  ╱─────╲
Vreko CLI`;

const LOGO_MINIMAL = "🦎{S} Vreko";

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface VrekoLogoProps {
	/** Logo size variant */
	size?: "large" | "compact" | "minimal" | "auto";
	/** Gradient color scheme */
	variant?: "primary" | "warm" | "cool" | "none";
	/** Show tagline below logo */
	showTagline?: boolean;
	/** Custom tagline text */
	tagline?: string;
	/** Show version number */
	version?: string;
	/** Center the logo */
	center?: boolean;
	/** Maximum width for auto sizing */
	maxWidth?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Vreko Logo Component
 *
 * Renders the brand logo with gradient colors and optional tagline.
 *
 * @example
 * ```tsx
 * <VrekoLogo size="large" variant="primary" showTagline />
 * ```
 */
export function VrekoLogo({
	size = "auto",
	variant = "primary",
	showTagline = true,
	tagline = "Code Protection for AI-Native Development",
	version,
	center = false,
	maxWidth = 80,
}: VrekoLogoProps): React.ReactElement {
	// Determine logo content based on size
	const logoContent = getLogoContent(size, maxWidth);

	// Get gradient colors
	const colors = variant === "none" ? null : BRAND_COLORS[variant];

	// Render logo with or without gradient
	const LogoElement = colors ? (
		<InkGradient colors={colors}>
			<Text>{logoContent}</Text>
		</InkGradient>
	) : (
		<Text color="green">{logoContent}</Text>
	);

	// Build the complete output
	return (
		<Box flexDirection="column" alignItems={center ? "center" : "flex-start"} padding={1}>
			{LogoElement}

			{showTagline && (
				<Box marginTop={1}>
					<Text color="cyan" bold>
						🦎 {tagline}
					</Text>
				</Box>
			)}

			{version && (
				<Box marginTop={1}>
					<Text color="gray">v{version}</Text>
				</Box>
			)}
		</Box>
	);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get appropriate logo content based on size setting
 */
function getLogoContent(size: VrekoLogoProps["size"], maxWidth: number): string {
	// Auto-detect based on terminal width
	if (size === "auto") {
		const width = process.stdout.columns ?? 80;
		if (width >= 72 && width <= maxWidth) {
			return LOGO_LARGE;
		}
		if (width >= 40) {
			return LOGO_COMPACT;
		}
		return LOGO_MINIMAL;
	}

	// Explicit size selection
	switch (size) {
		case "large":
			return LOGO_LARGE;
		case "compact":
			return LOGO_COMPACT;
		case "minimal":
			return LOGO_MINIMAL;
		default:
			return LOGO_COMPACT;
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export default VrekoLogo;
