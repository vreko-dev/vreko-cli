import { useStdout } from "ink";

export interface TerminalLayout {
	/** True when the terminal is wide enough to use side-by-side layout (>=120 cols) */
	isWide: boolean;
	/** True when the terminal can show the full block-letter logo (>=80 cols) */
	canShowFullLogo: boolean;
	columns: number;
	rows: number;
}

/**
 * Returns responsive layout flags based on terminal dimensions.
 * - isWide: >=120 cols → side-by-side layout
 * - canShowFullLogo: >=80 cols → full ASCII logo
 */
export function useTerminalLayout(): TerminalLayout {
	const { stdout } = useStdout();
	const columns = stdout.columns ?? 80;
	const rows = stdout.rows ?? 24;

	return {
		isWide: columns >= 120,
		canShowFullLogo: columns >= 80,
		columns,
		rows,
	};
}
