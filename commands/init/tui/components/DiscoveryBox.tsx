import type { DiscoveryEmitter, EarlyDiscovery } from "@vreko/intelligence/init-scan";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";

/**
 * DiscoveryBox renders live EarlyDiscovery items from the emitter.
 * - 2-second minimum display per discovery
 * - Max 3 shown
 * Per jaw_drop_onboard spec section 2.3 Frame 2.
 */
export function DiscoveryBox({ emitter }: { emitter: DiscoveryEmitter | null }) {
	const [discoveries, setDiscoveries] = useState<EarlyDiscovery[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		if (!emitter) {
			return;
		}

		const handler = (d: EarlyDiscovery) => {
			setDiscoveries((prev) => {
				if (prev.length >= 3) {
					return prev;
				}
				return [...prev, d];
			});
		};

		emitter.on("discovery", handler);

		return () => {
			emitter.removeListener("discovery", handler);
		};
	}, [emitter]);

	useEffect(() => {
		if (discoveries.length <= 1) {
			return;
		}
		const timer = setInterval(() => {
			setCurrentIndex((prev) => Math.min(prev + 1, discoveries.length - 1));
		}, 2000);
		return () => clearInterval(timer);
	}, [discoveries.length]);

	const current = discoveries[currentIndex];

	if (!current) {
		return (
			<Box borderStyle="single" padding={1}>
				<Text dimColor>Analyzing patterns...</Text>
			</Box>
		);
	}

	return (
		<Box borderStyle="single" padding={1} flexDirection="column">
			<Text color="yellow">Found: {current.message}</Text>
			<Text dimColor>{current.detailMessage}</Text>
		</Box>
	);
}
