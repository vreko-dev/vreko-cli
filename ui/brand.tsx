import { Box, Text } from "ink";

const BRAND_GREEN = "#4ADE80"; // brand-color-allowed
const DARK = "#0F172A"; // brand-color-allowed
const WHITE = "#F8FAFC"; // brand-color-allowed
const SUBTLE = "#64748B"; // brand-color-allowed
const DIM_GREEN = "#22C55E"; // brand-color-allowed

function GeckoGlyph() {
	return (
		<Text>
			<Text color={BRAND_GREEN}>▰</Text>
			<Text color={DARK} backgroundColor={BRAND_GREEN}>
				●
			</Text>
			<Text color={BRAND_GREEN}>▸</Text>
		</Text>
	);
}

interface HeaderProps {
	version: string;
	variant?: "default" | "ceremony";
	subtitle?: string;
}

export function VrekoHeader({ version, variant = "default", subtitle = "developer intelligence" }: HeaderProps) {
	if (variant === "ceremony") {
		return (
			<Box flexDirection="column" marginBottom={1}>
				<Text>
					<GeckoGlyph />
					<Text color={WHITE}> vreko</Text>
					<Text color={SUBTLE}> v{version}</Text>
				</Text>
				<Text>
					<Text color={SUBTLE}> {subtitle}</Text>
				</Text>
			</Box>
		);
	}
	return (
		<Box marginBottom={1}>
			<GeckoGlyph />
			<Text color={WHITE}> vreko</Text>
			<Text color={SUBTLE}> v{version}</Text>
		</Box>
	);
}

interface CeremonyFooterProps {
	patternsLearned: number;
	pitfallsAvoided: number;
	smarterPercent?: number;
}

export function CeremonyFooter({ patternsLearned, pitfallsAvoided, smarterPercent }: CeremonyFooterProps) {
	return (
		<Box flexDirection="column" marginTop={1}>
			<Text>
				<GeckoGlyph />
				<Text color={BRAND_GREEN}>
					{" "}
					{patternsLearned} patterns learned · {pitfallsAvoided} pitfalls avoided
				</Text>
			</Text>
			{typeof smarterPercent === "number" && (
				<Text color={DIM_GREEN}>
					{"     "}Codebase intelligence +{smarterPercent}%
				</Text>
			)}
		</Box>
	);
}
