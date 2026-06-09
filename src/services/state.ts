/**
 * CLI-UX-006: State Persistence
 *
 * Manages persistent state for Pioneer Program (points, achievements, streaks)
 * and user preferences across CLI sessions.
 *
 * @see ../resources/cli_ux_implementation/06-state-persistence.md
 */

import Conf from "conf";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
// Spec Reference: ../resources/cli_ux_implementation/06-state-persistence.md

export interface PioneerStats {
	snapshotsCreated: number;
	restoresPerformed: number;
	risksDetected: number;
	filesAnalyzed: number;
	highRiskAverted: number;
	currentStreak: number;
	longestStreak: number;
	totalDaysActive: number;
	sharesGenerated: number;
	shareClicks: number;
}

export interface UnlockedAchievement {
	id: string;
	unlockedAt: string;
}

export interface PioneerState {
	pioneerNumber: number;
	level: "bronze" | "silver" | "gold" | "platinum";
	totalPoints: number;
	unlockedAchievements: UnlockedAchievement[];
	stats: PioneerStats;
	currentStreak: number;
	lastActiveDate: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface UserPreferences {
	verbosity: "quiet" | "normal" | "verbose";
	colorScheme: "auto" | "light" | "dark" | "none";
	showAchievements: boolean;
	showProgress: boolean;
	defaultSnapshot: {
		includeNodeModules: boolean;
		includeGitIgnored: boolean;
	};
}

export interface VrekoState {
	version: number;
	pioneer: PioneerState;
	preferences: UserPreferences;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_STATS: PioneerStats = {
	snapshotsCreated: 0,
	restoresPerformed: 0,
	risksDetected: 0,
	filesAnalyzed: 0,
	highRiskAverted: 0,
	currentStreak: 0,
	longestStreak: 0,
	totalDaysActive: 0,
	sharesGenerated: 0,
	shareClicks: 0,
};

const DEFAULT_PREFERENCES: UserPreferences = {
	verbosity: "normal",
	colorScheme: "auto",
	showAchievements: true,
	showProgress: true,
	defaultSnapshot: {
		includeNodeModules: false,
		includeGitIgnored: false,
	},
};

function createDefaultPioneerState(): PioneerState {
	return {
		pioneerNumber: generatePioneerNumber(),
		level: "bronze",
		totalPoints: 0,
		unlockedAchievements: [],
		stats: { ...DEFAULT_STATS },
		currentStreak: 0,
		lastActiveDate: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}

function generatePioneerNumber(): number {
	const base = Date.now() % 10000;
	const rand = Math.floor(Math.random() * 1000);
	return base + rand;
}

// =============================================================================
// SCHEMA FOR VALIDATION
// =============================================================================

const SCHEMA = {
	// Schema validation handled by Conf library defaults
} as const;

// =============================================================================
// STATE MANAGER CLASS
// =============================================================================

class StateManager {
	private conf: Conf<VrekoState>;
	private cache: VrekoState | null = null;

	constructor() {
		this.conf = new Conf<VrekoState>({
			projectName: "vreko",
			projectVersion: "1.0.0",
			// biome-ignore lint/suspicious/noExplicitAny: Conf<T> schema type is too narrow for Zod-inferred schema
			schema: SCHEMA as any,
			defaults: {
				version: 1,
				pioneer: createDefaultPioneerState(),
				preferences: DEFAULT_PREFERENCES,
			},
			migrations: {
				// Future migrations go here
			},
		});
	}

	/**
	 * Get Pioneer state
	 */
	getPioneerState(): PioneerState {
		if (!this.cache) {
			this.cache = this.conf.store;
		}
		return { ...this.cache.pioneer };
	}

	/**
	 * Save Pioneer state
	 */
	savePioneerState(state: PioneerState): void {
		state.updatedAt = new Date().toISOString();
		this.conf.set("pioneer", state);
		if (this.cache) {
			this.cache.pioneer = state;
		}
	}

	/**
	 * Get user preferences
	 */
	getPreferences(): UserPreferences {
		return { ...this.conf.get("preferences") };
	}

	/**
	 * Update user preferences
	 */
	setPreferences(prefs: Partial<UserPreferences>): void {
		const current = this.getPreferences();
		this.conf.set("preferences", { ...current, ...prefs });
	}

	/**
	 * Reset all state (for testing/debugging)
	 */
	reset(): void {
		this.conf.clear();
		this.cache = null;
	}

	/**
	 * Get storage file path (for debugging)
	 */
	getPath(): string {
		return this.conf.path;
	}

	/**
	 * Check if this is a fresh installation
	 */
	isFirstRun(): boolean {
		const pioneer = this.getPioneerState();
		return (
			pioneer.stats.snapshotsCreated === 0 &&
			pioneer.stats.filesAnalyzed === 0 &&
			pioneer.unlockedAchievements.length === 0
		);
	}

	/**
	 * Export state for backup
	 */
	export(): VrekoState {
		return JSON.parse(JSON.stringify(this.conf.store));
	}

	/**
	 * Import state from backup
	 */
	import(state: VrekoState): void {
		if (state.version !== this.conf.get("version")) {
			throw new Error("State version mismatch");
		}
		this.conf.store = state;
		this.cache = null;
	}
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const userState = new StateManager();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get effective verbosity from preferences and CLI flags
 */
export function getEffectiveVerbosity(options: { quiet?: boolean; verbose?: boolean }): "quiet" | "normal" | "verbose" {
	if (options.quiet) {
		return "quiet";
	}
	if (options.verbose) {
		return "verbose";
	}
	return userState.getPreferences().verbosity;
}

/**
 * Check if achievements should be displayed
 */
export function shouldShowAchievements(options: { quiet?: boolean }): boolean {
	if (options.quiet) {
		return false;
	}
	return userState.getPreferences().showAchievements;
}

/**
 * Check if progress should be displayed
 */
export function shouldShowProgress(options: { quiet?: boolean }): boolean {
	if (options.quiet) {
		return false;
	}
	return userState.getPreferences().showProgress;
}
