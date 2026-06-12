/**
 * Pioneer Event Emitter  -  CLI
 *
 * Fire-and-forget POST to /v1/analytics/events.
 * Never throws. Never awaits on the critical path. Never retries.
 * Never initializes PostHog  -  events go to the Vreko API endpoint.
 *
 * @module analytics/emit
 */

import { PIONEER_EVENTS, type PioneerEvent } from "@vreko/contracts/pioneer";

const ENDPOINT = process.env.VREKO_API_URL ?? "https://api.vreko.dev";

export { PIONEER_EVENTS };
export type { PioneerEvent };

/**
 * Emit a pioneer lifecycle event to the Vreko analytics API.
 *
 * This is deliberately fire-and-forget:
 * - Does NOT await the fetch (returns void synchronously after scheduling)
 * - NEVER throws on failure  -  analytics must not block or crash the CLI
 * - NEVER retries failed requests
 * - NEVER includes PII  -  only anonymous workspace fingerprints and event names
 *
 * @param name    - One of the PIONEER_EVENTS constant values
 * @param properties - Optional anonymous properties (no PII)
 */
export function emitPioneerEvent(name: PioneerEvent, properties?: Record<string, unknown>): void {
	// Fire-and-forget. Never throw. Never block.
	fetch(`${ENDPOINT}/v1/analytics/events`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ event: name, properties }),
	}).catch(() => {
		// Silently discard  -  analytics failures must never surface to the user.
		// Use VREKO_DEBUG=true to enable diagnostic output.
		if (process.env.VREKO_DEBUG === "true") {
			process.stderr.write(`[vreko:analytics] failed to emit event: ${name}\n`);
		}
	});
}
