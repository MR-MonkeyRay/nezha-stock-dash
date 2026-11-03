import type { MouseEvent } from "react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { saveMainPageScrollPosition } from "@/lib/navigation";
import { withViewTransition } from "@/lib/view-transition";

/** Left click without modifiers: anything else keeps native link behavior. */
export function isPlainClick(event: MouseEvent) {
	return (
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey &&
		!event.defaultPrevented
	);
}

/**
 * Opens a server's quote page. When `source` (a row, card or ticker item) holds
 * an element marked `data-vt-name`, that name morphs into the detail header.
 */
export function useOpenServer() {
	const navigate = useNavigate();
	return useCallback(
		(id: number, source?: Element | null) => {
			saveMainPageScrollPosition();
			const shared = source?.matches("[data-vt-name]")
				? source
				: (source?.querySelector("[data-vt-name]") ?? null);
			withViewTransition(() => navigate(`/server/${id}`), "nav", {
				shared,
				// Wait for the detail header so the clicked name can morph into it.
				waitFor: () => document.querySelector(".vt-server-name") !== null,
			});
		},
		[navigate],
	);
}

/** onClick for a server <Link>: plain clicks go through the view transition. */
export function useServerLinkClick() {
	const open = useOpenServer();
	return useCallback(
		(id: number, event: MouseEvent<HTMLElement>, source?: Element | null) => {
			if (!isPlainClick(event)) {
				saveMainPageScrollPosition();
				return;
			}
			event.preventDefault();
			open(id, source ?? event.currentTarget);
		},
		[open],
	);
}
