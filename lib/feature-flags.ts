/**
 * CLI Feature Flag Support
 *
 * Minimal implementation for remote feature gating in CLI.
 * Uses API-based flag check - no heavy PostHog SDK.
 *
 * 2026 Best Practices:
 * - Evaluate where the data lives (API server)
 * - Cache results locally
 * - Graceful fallback on network failure
 *
 * @module cli/lib/feature-flags
 */

// Simple file-based cache for CLI
interface CacheEntry {
	value: boolean;
	expiresAt: number;
}

const flagCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60000; // 60 seconds for CLI (longer than web)

// API endpoint for feature flags
const FLAGS_API_URL = process.env.VREKO_API_URL || "https://api.vreko.dev";

/**
 * Check if a feature is enabled for CLI
 * Uses API-based evaluation with local caching
 */
export async function isFeatureEnabled(flag: string): Promise<boolean> {
	const userId = await getUserId();
	const cacheKey = `${userId ?? "anonymous"}:${flag}`;

	// Check cache first
	const cached = flagCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.value;
	}

	try {
		// Fetch from API
		const response = await fetch(`${FLAGS_API_URL}/v1/feature-flags?flag=${encodeURIComponent(flag)}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				// Include auth token if available
				...(await getAuthHeaders()),
			},
			// Short timeout for CLI responsiveness
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		const value = Boolean(data.enabled);

		// Cache the result
		flagCache.set(cacheKey, {
			value,
			expiresAt: Date.now() + CACHE_TTL_MS,
		});

		return value;
	} catch (error) {
		// Graceful fallback: disable feature on error (safe default)
		// biome-ignore lint/suspicious/noConsole: CLI user-facing warning on flag fetch failure
		console.warn(
			`[feature-flags] check failed for ${flag}, defaulting to false:`,
			error instanceof Error ? error.message : String(error),
		);

		// Cache the fallback to avoid repeated failures
		flagCache.set(cacheKey, {
			value: false,
			expiresAt: Date.now() + 10000, // Short TTL for fallback
		});

		return false;
	}
}

/**
 * Get all feature flags for CLI
 * Useful for showing enabled features in status/help
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
	try {
		const response = await fetch(`${FLAGS_API_URL}/v1/feature-flags`, {
			headers: {
				"Content-Type": "application/json",
				...(await getAuthHeaders()),
			},
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		const flags: Record<string, boolean> = {};

		for (const [key, value] of Object.entries(data.flags ?? {})) {
			flags[key] = Boolean(value);
		}

		return flags;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: CLI user-facing warning on flag fetch failure
		console.warn(
			"[feature-flags] failed to fetch, using defaults:",
			error instanceof Error ? error.message : String(error),
		);
		return {};
	}
}

/**
 * Clear feature flag cache
 * Useful for testing or after auth state changes
 */
export function clearFeatureFlagCache(): void {
	flagCache.clear();
}

/**
 * Get current user ID from CLI config
 */
async function getUserId(): Promise<string | undefined> {
	return process.env.VREKO_USER_ID;
}

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
	const token = process.env.VREKO_API_TOKEN;
	if (token) {
		return { Authorization: `Bearer ${token}` };
	}
	return {};
}

/**
 * Wrap a function with feature flag check
 * Executes the function only if the feature is enabled
 */
export async function withFeatureFlag<T>(
	flag: string,
	fn: () => Promise<T>,
	fallback?: () => Promise<T>,
): Promise<T | undefined> {
	const enabled = await isFeatureEnabled(flag);

	if (enabled) {
		return fn();
	}

	if (fallback) {
		return fallback();
	}

	return undefined;
}
