/**
 * Tier Resolution Utilities
 *
 * CLI-specific tier resolution from environment and flags.
 * Complements @vreko/auth/lib/tier-utils which handles API key metadata.
 *
 * @module utils/tier
 */

/**
 * Resolve user tier from multiple sources with priority:
 * 1. Explicit CLI flag (--tier)
 * 2. VREKO_TIER environment variable
 * 3. VREKO_API_KEY presence (implies pro)
 * 4. Default to free
 *
 * @param cliTier - Optional tier from CLI --tier flag
 * @returns Resolved tier (free | pro | enterprise)
 */
export function resolveTier(cliTier?: string): "free" | "pro" | "enterprise" {
	if (cliTier && ["free", "pro", "enterprise"].includes(cliTier)) {
		return cliTier as "free" | "pro" | "enterprise";
	}

	const envTier = process.env.VREKO_TIER;
	if (envTier && ["free", "pro", "enterprise"].includes(envTier)) {
		return envTier as "free" | "pro" | "enterprise";
	}

	if (process.env.VREKO_API_KEY) {
		return "pro";
	}

	return "free";
}
