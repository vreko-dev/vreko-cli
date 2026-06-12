/**
 * InkErrorBoundary  -  per-panel React error boundary for the Vreko TUI.
 *
 * Each TUI panel is wrapped in this boundary so a single panel crash never
 * propagates to sibling panels or root. Ink does not provide error boundaries
 * natively  -  the React class component pattern is required.
 *
 * On error: renders a red inline message and captures to Sentry.
 * Pattern: spec §G  -  per-panel error boundaries
 *
 * @module ui/tui/InkErrorBoundary
 */
import * as Sentry from "@sentry/node";
import { Box, Text } from "ink";
import React from "react";
import type { PanelId } from "./TuiApp.js";

interface Props {
	panel: PanelId;
	children: React.ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class InkErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		Sentry.captureException(error, {
			extra: { componentStack: info.componentStack, panel: this.props.panel },
		});
	}

	render() {
		if (this.state.hasError) {
			return (
				<Box>
					<Text color="red">
						{"⚠"} {this.props.panel} panel error - data unavailable
					</Text>
				</Box>
			);
		}
		return this.props.children;
	}
}
