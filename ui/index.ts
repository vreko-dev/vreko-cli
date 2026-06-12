/**
 * UI Module Index
 *
 * Exports all UI components for the CLI.
 *
 * @module ui
 */

// =============================================================================
// BRANDING  -  React/Ink components
// =============================================================================

export { CeremonyFooter, VrekoHeader } from "./brand";

// =============================================================================
// BRANDING  -  string/chalk utilities
// =============================================================================

export {
	displayBrandedHeader,
	displayDivider,
	displaySectionHeader,
	displayStatusHeader,
	displayWelcomeMessage,
	getLogo,
	LOGO_COMPACT,
	LOGO_LARGE,
	LOGO_MINIMAL,
	logoCompact,
	logoLarge,
	logoMinimal,
} from "./logo";

// =============================================================================
// SMART ERRORS
// =============================================================================

export {
	createSmartError,
	displaySmartError,
	displayUnknownCommandError,
	ERROR_SUGGESTIONS,
	type ErrorSuggestion,
	findSimilarCommands,
	levenshteinDistance,
	type SmartError,
	withSmartErrors,
} from "./errors";

// =============================================================================
// TERMINAL HYPERLINKS
// =============================================================================

export {
	commandLink,
	docsLink,
	fileLink,
	hyperlink,
	issueLink,
	labeledLink,
	learnMore,
	link,
	reportIssue,
	supportsHyperlinks,
} from "./links";

// =============================================================================
// THEME & BRAND COLORS
// =============================================================================

export {
	BRAND_COLORS,
	type BrandColor,
	formatCommand,
	formatLabelValue,
	formatSectionHeader,
	formatStep,
	STATUS_ICONS,
	type ThemeColor,
	theme,
} from "./theme";

// =============================================================================
// INTERACTIVE PROMPTS  -  Modern @clack/prompts based
// =============================================================================

export {
	type ClackSelectOption,
	clackConfirm,
	clackConfirm as confirm,
	clackGroup,
	clackInput,
	clackInput as input,
	clackIntro,
	clackLog,
	clackNote,
	clackOutro,
	clackSelect,
	clackSelect as select,
	clackSpinner,
	clackSpinner as spinner,
} from "./prompts-clack";

// Note: SelectOption type available via ClackSelectOption

// Note: status, progressBar, stepProgress moved to theme module
// Note: prompts namespace removed  -  import functions directly

// =============================================================================
// TUI GUARDS
// =============================================================================

export {
	detectCapabilities,
	isInteractive,
	supportsColor,
	TerminalCapabilities,
	termWidth,
	visual,
} from "./guards";

// =============================================================================
// RISK COLORS & SIGNAL ICONS
// =============================================================================

export {
	riskColor,
	riskColors,
	signalColors,
	signalIcons,
} from "./colors";

// =============================================================================
// VIEW CONTRACTS
// =============================================================================

export type {
	GaugeStage as GaugeStageType,
	PulseEvent as PulseEventType,
	StatusViewData as StatusViewDataType,
	WatchEvent as WatchEventType,
} from "./contracts";
export {
	GaugeStage,
	PulseEvent,
	StatusViewData,
	VIEW_DATA_SOURCES,
	WatchEvent,
} from "./contracts";
