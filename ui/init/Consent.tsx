/**
 * Consent stage for the vreko init TUI (D-14 / G-01)
 *
 * Shows data-collection notice before activation. User must explicitly
 * accept or decline. Decline exits the TUI without initializing.
 */

import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import { BRAND_COLORS } from "../../ui/theme.js";

interface ConsentProps {
	onAccept: () => void;
}

export function Consent({ onAccept }: ConsentProps) {
	const { exit } = useApp();
	const [declined, setDeclined] = useState(false);

	useInput((input, key) => {
		if (key.return || input === "y" || input === "Y") {
			onAccept();
		} else if (input === "n" || input === "N" || key.escape) {
			setDeclined(true);
			setTimeout(() => exit(), 300);
		}
	});

	if (declined) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="yellow">Setup cancelled. No data was collected.</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" borderStyle="round" padding={1} width={78}>
			<Text bold color={BRAND_COLORS.primary}>
				Data Collection Notice
			</Text>

			<Box marginTop={1} flexDirection="column" gap={0}>
				<Text>Vreko collects the following to power its intelligence features:</Text>
				<Box marginTop={1} flexDirection="column">
					<Text>{"  ✓  "}Session metadata (start/end times, file counts, risk scores)</Text>
					<Text>{"  ✓  "}Git commit hashes and change attribution</Text>
					<Text>{"  ✓  "}Rollback events and AI tool attribution</Text>
				</Box>
				<Box marginTop={1} flexDirection="column">
					<Text color="green">{"  ✗  File contents never leave your device"}</Text>
					<Text color="green">{"  ✗  Source code is never read or transmitted"}</Text>
				</Box>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Data stays local by default. Cloud sync (opt-in) transmits metadata only.</Text>
				<Text dimColor>{"Run `vreko purge` at any time to delete all local data."}</Text>
				<Text dimColor>{"Privacy policy: https://vreko.dev/privacy"}</Text>
			</Box>

			<Box marginTop={1}>
				<Text>
					{"Press "}
					<Text bold color="green">
						Y / Enter
					</Text>
					{" to accept  ·  "}
					<Text bold color="red">
						N / ESC
					</Text>
					{" to decline"}
				</Text>
			</Box>
		</Box>
	);
}
