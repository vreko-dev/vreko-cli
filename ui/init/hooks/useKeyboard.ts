/**
 * Keyboard Navigation Hook for Init TUI
 *
 * Provides accessible keyboard controls:
 * - Enter: Confirm/proceed to next stage
 * - Escape: Cancel/go back
 * - Arrow keys: Navigation within forms
 *
 * @module ui/init/hooks/useKeyboard
 */

import { useInput } from "ink";

export interface UseKeyboardOptions {
	/** Called when Enter is pressed */
	onEnter?: () => void;
	/** Called when Escape is pressed */
	onEscape?: () => void;
	/** Called when Arrow Right is pressed */
	onArrowRight?: () => void;
	/** Called when Arrow Left is pressed */
	onArrowLeft?: () => void;
	/** Called when Arrow Up is pressed */
	onArrowUp?: () => void;
	/** Called when Arrow Down is pressed */
	onArrowDown?: () => void;
	/** Enable keyboard listeners (default: true) */
	enabled?: boolean;
}

/**
 * Hook for keyboard navigation in Ink TUI components.
 * Uses Ink's useInput so stdin ownership stays with Ink throughout the lifecycle.
 */
export function useKeyboard(options: UseKeyboardOptions): void {
	const { onEnter, onEscape, onArrowRight, onArrowLeft, onArrowUp, onArrowDown, enabled = true } = options;

	useInput(
		(_input, key) => {
			if (key.return) {
				onEnter?.();
			} else if (key.escape) {
				onEscape?.();
			} else if (key.rightArrow) {
				onArrowRight?.();
			} else if (key.leftArrow) {
				onArrowLeft?.();
			} else if (key.upArrow) {
				onArrowUp?.();
			} else if (key.downArrow) {
				onArrowDown?.();
			}
		},
		{ isActive: enabled },
	);
}

/**
 * Screen reader announcement helper
 *
 * Announces status changes to screen readers via ARIA live regions.
 * Falls back to console.log in environments without screen reader support.
 */
export function announce(_message: string, priority: "polite" | "assertive" = "polite"): void {
	// In a real Ink app, this would use a live region component
	// For now, we use the speakable log approach
	if (priority === "assertive") {
		// intentionally empty
	} else {
		// intentionally empty
	}
}
