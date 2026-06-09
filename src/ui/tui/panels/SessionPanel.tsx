/**
 * SessionPanel  -  session lifecycle view.
 *
 * Shows current session ID, start time, duration.
 * Actions: start session, end session (via daemon IPC).
 *
 * RESILIENCE (A3): If session IPC is unavailable, shows
 * "Session management available via MCP tools"  -  no crash.
 *
 * Pattern: commands/init/tui/frames/DaemonStart.tsx (step-sequenced async)
 *
 * @module ui/tui/panels/SessionPanel
 */

import { Alert, Select, Spinner } from "@inkjs/ui";
import type { VrekoLocalClient } from "@vreko/local-service-client";
import { Box, Text } from "ink";
import { useEffect, useRef, useState } from "react";
import { BRAND_COLORS } from "../../theme.js";

// =============================================================================
// TYPES
// =============================================================================

interface SessionInfo {
	id: string;
	startedAt: string;
}

type SessionViewMode = "overview" | "working";

interface SessionPanelProps {
	client: VrekoLocalClient;
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatSessionDuration(startedAt: string): string {
	const diffMs = Date.now() - new Date(startedAt).getTime();
	const mins = Math.floor(diffMs / 60000);
	const hours = Math.floor(mins / 60);
	if (hours > 0) {
		return `${hours}h ${mins % 60}m`;
	}
	return `${mins}m`;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SessionCardProps {
	session: SessionInfo;
}

function SessionCard({ session }: SessionCardProps) {
	return (
		<Box flexDirection="column" borderStyle="round" paddingX={1} marginBottom={1}>
			<Text>
				ID <Text bold>{session.id.slice(0, 20)}...</Text>
			</Text>
			<Text>
				Duration <Text color={BRAND_COLORS.primary}>{formatSessionDuration(session.startedAt)}</Text>
				{/* brand-color-allowed */}
			</Text>
			<Text>
				Started <Text dimColor>{new Date(session.startedAt).toLocaleTimeString()}</Text>
			</Text>
		</Box>
	);
}

interface SessionUnavailableNoticeProps {
	show: boolean;
}

function SessionUnavailableNotice({ show }: SessionUnavailableNoticeProps) {
	if (!show) {
		return null;
	}
	return (
		<Box marginTop={1} flexDirection="column">
			<Text dimColor>Session management is available via MCP tools:</Text>
			<Text dimColor> vreko_begin vreko_end vreko_pulse</Text>
			<Text dimColor>In-TUI session control arriving in a future release.</Text>
		</Box>
	);
}

// =============================================================================
// HOOK: useSessionLoader  -  loads session status on mount
// =============================================================================

interface SessionLoaderResult {
	session: SessionInfo | null;
	setSession: (s: SessionInfo | null) => void;
	isLoading: boolean;
	error: string | null;
	setError: (e: string | null) => void;
	sessionUnavailable: boolean;
}

function useSessionLoader(client: VrekoLocalClient, cwd: string): SessionLoaderResult {
	const [session, setSession] = useState<SessionInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sessionUnavailable, setSessionUnavailable] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setIsLoading(true);
			try {
				const response = await client.session.current({ workspacePath: cwd });
				if (cancelled) {
					return;
				}
				// Handle both response formats: { session: ... } and direct session object
				const currentSession =
					response && typeof response === "object" && "session" in response
						? (response as { session?: SessionInfo }).session
						: response;
				if (currentSession) {
					setSession({
						id: currentSession.id,
						startedAt: currentSession.startedAt,
					});
				} else {
					setSession(null);
				}
			} catch (err) {
				if (cancelled) {
					return;
				}
				const msg = err instanceof Error ? err.message : String(err);
				// Graceful degradation: method not found = session IPC not yet available (A3)
				if (msg.includes("not found") || msg.includes("not implemented") || msg.includes("method")) {
					setSessionUnavailable(true);
				} else {
					setError(msg);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [client, cwd]);

	return { session, setSession, isLoading, error, setError, sessionUnavailable };
}

// =============================================================================
// HOOK: useSessionActions  -  start/end session via IPC
// =============================================================================

interface SessionActionsResult {
	viewMode: SessionViewMode;
	statusMessage: string | null;
	handleAction: (action: string) => Promise<void>;
}

function useSessionActions(
	client: VrekoLocalClient,
	cwd: string,
	session: SessionInfo | null,
	setSession: (s: SessionInfo | null) => void,
	setError: (e: string | null) => void,
): SessionActionsResult {
	const [viewMode, setViewMode] = useState<SessionViewMode>("overview");
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const handleAction = async (action: string) => {
		if (action === "back") {
			setViewMode("overview");
			return;
		}
		setViewMode("working");
		if (action === "start") {
			try {
				const result = await client.session.start({ workspacePath: cwd });
				if (!isMountedRef.current) {
					return;
				}
				if (result?.id) {
					setSession({ id: result.id, startedAt: result.startedAt });
					setStatusMessage("Session started.");
				}
			} catch (err) {
				if (!isMountedRef.current) {
					return;
				}
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (isMountedRef.current) {
					setViewMode("overview");
				}
			}
		}
		if (action === "end" && session) {
			try {
				await client.session.end({ sessionId: session.id });
				if (!isMountedRef.current) {
					return;
				}
				setSession(null);
				setStatusMessage("Session ended. Ceremony written to .vreko/docs/last-ceremony.md.");
			} catch (err) {
				if (!isMountedRef.current) {
					return;
				}
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (isMountedRef.current) {
					setViewMode("overview");
				}
			}
		}
	};

	return { viewMode, statusMessage, handleAction };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SessionPanel({ client }: SessionPanelProps) {
	const cwd = process.cwd();
	const { session, setSession, isLoading, error, setError, sessionUnavailable } = useSessionLoader(client, cwd);
	const { viewMode, statusMessage, handleAction } = useSessionActions(client, cwd, session, setSession, setError);

	const sessionActions = session
		? [
				{ label: "End session (save & ceremony)", value: "end" },
				{ label: "<- Cancel", value: "back" },
			]
		: [
				{ label: "Start new session", value: "start" },
				{ label: "<- Cancel", value: "back" },
			];

	return (
		<Box flexDirection="column" paddingX={1}>
			<Text bold>Session</Text>

			{isLoading && <Spinner label="Loading session..." />}

			<SessionUnavailableNotice show={sessionUnavailable} />

			{error && (
				<Box marginTop={1}>
					<Alert variant="error">{error}</Alert>
				</Box>
			)}

			{statusMessage && !error && (
				<Box marginTop={1}>
					<Alert variant="success">{statusMessage}</Alert>
				</Box>
			)}

			{!isLoading && !sessionUnavailable && (
				<Box flexDirection="column" marginTop={1}>
					{session ? (
						<SessionCard session={session} />
					) : (
						<Box marginBottom={1}>
							<Text dimColor>No active session.</Text>
						</Box>
					)}
					{viewMode === "working" ? (
						<Spinner label="Working..." />
					) : (
						<Select options={sessionActions} onChange={handleAction} />
					)}
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>1-4:panels q:quit</Text>
			</Box>
		</Box>
	);
}
