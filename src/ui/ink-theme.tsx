/**
 * @inkjs/ui Theme Provider  -  Vreko Brand
 *
 * Extends the @inkjs/ui defaultTheme with Vreko brand colors (#4ADE80). // brand-color-allowed
 * All Ink views should be wrapped in <VrekoTheme> to get consistent styling.
 *
 * IMPORTANT: Colors must flow through theme.ts → ink-theme.tsx.
 * Never hardcode hex values in component files  -  use BRAND_COLORS from theme.ts.
 *
 * @module ui/ink-theme
 */

import { defaultTheme, extendTheme, ThemeProvider } from "@inkjs/ui";
import type { BoxProps, TextProps } from "ink";
import type React from "react";
import { BRAND_COLORS } from "./theme.js";

/** Vreko-branded @inkjs/ui theme */
export const vrekoTheme = extendTheme(defaultTheme, {
	components: {
		Spinner: {
			styles: {
				frame: (): TextProps => ({ color: BRAND_COLORS.primary }),
			},
		},
		Badge: {
			styles: {
				container: ({ color }: { color: string }): BoxProps => ({
					borderColor: color === "green" ? BRAND_COLORS.primary : undefined,
				}),
			},
		},
		ProgressBar: {
			styles: {
				filled: (): TextProps => ({ color: BRAND_COLORS.primary }),
			},
		},
	},
});

/** Wrap any Ink view in this component to apply the Vreko brand theme. */
export function VrekoTheme({ children }: { children: React.ReactNode }) {
	return <ThemeProvider theme={vrekoTheme}>{children}</ThemeProvider>;
}
