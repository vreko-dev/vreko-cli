import { Box, Text, useStdout } from "ink";
import { BRAND_COLORS } from "../theme.js";

const LOGO_FULL = `██╗   ██╗██████╗ ███████╗██╗  ██╗ ██████╗ 
██║   ██║██╔══██╗██╔════╝██║ ██╔╝██╔═══██╗
██║   ██║██████╔╝█████╗  █████╔╝ ██║   ██║
╚██╗ ██╔╝██╔══██╗██╔══╝  ██╔═██╗ ██║   ██║
 ╚████╔╝ ██║  ██║███████╗██║  ██╗╚██████╔╝
  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ `;

/**
 * Responsive Vreko logo.
 * - Wide (>=80 cols): full block-letter logo in brand green #4ADE80 // brand-color-allowed
 * - Narrow (<80 cols): compact text fallback
 */
export function Logo() {
	const { stdout } = useStdout();
	const columns = stdout.columns ?? 80;

	if (columns >= 80) {
		return (
			<Box flexDirection="column">
				<Text color={BRAND_COLORS.primary}>{LOGO_FULL}</Text>
			</Box>
		);
	}

	return (
		<Box>
			<Text bold color={BRAND_COLORS.primary}>
				{"━━ VREKO ━━"}
			</Text>
		</Box>
	);
}
