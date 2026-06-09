/**
 * CLI Analytics Service
 *
 * Lightweight analytics for CLI environments.
 * Sends events to Vreko API for tracking.
 *
 * @module analytics
 */

// Analytics configuration
const ANALYTICS_ENABLED = process.env.VREKO_ANALYTICS !== "false";
const API_URL = process.env.VREKO_API_URL || "https://api.vreko.dev";
const DEBUG = process.env.VREKO_DEBUG === "true";

/**
 * Event properties for benchmark opt-in
 */
export interface BenchmarkOptInEvent {
	/** Whether user opted in to sharing benchmarks */
	optedIn: boolean;
	/** ISO timestamp of the decision */
	timestamp: string;
}

/**
 * Capture a benchmark opt-in event
 *
 * Sends the event to the Vreko API for tracking.
 * Non-blocking - failures are logged but don't interrupt flow.
 *
 * @param optedIn - Whether user opted in
 */
export async function captureBenchmarkOptIn(optedIn: boolean): Promise<void> {
	if (!ANALYTICS_ENABLED) {
		if (DEBUG) {
			// intentionally empty
		}
		return;
	}

	const event = {
		event: "benchmark_opt_in",
		properties: {
			optedIn,
			timestamp: new Date().toISOString(),
			source: "cli_init",
		},
	};

	try {
		// Send to API (fire-and-forget)
		fetch(`${API_URL}/v1/analytics/events`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(event),
		}).catch((_error) => {
			// Silently fail - analytics should never block user flow
			if (DEBUG) {
				// intentionally empty
			}
		});

		if (DEBUG) {
			// intentionally empty
		}
	} catch (_error) {
		// Non-blocking - don't interrupt user flow for analytics
		if (DEBUG) {
			// intentionally empty
		}
	}
}

/**
 * Generic event capture for future use
 *
 * @param eventName - Name of the event
 * @param properties - Event properties
 */
export async function captureEvent(eventName: string, properties: Record<string, unknown>): Promise<void> {
	if (!ANALYTICS_ENABLED) {
		return;
	}

	try {
		fetch(`${API_URL}/v1/analytics/events`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				event: eventName,
				properties: {
					...properties,
					timestamp: new Date().toISOString(),
				},
			}),
		}).catch(() => {
			// Silently fail
		});
	} catch {
		// Non-blocking
	}
}
