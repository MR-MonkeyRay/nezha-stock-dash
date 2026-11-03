import { type RefObject, useEffect, useRef } from "react";
import { FLAT_EPSILON } from "./quote-series";

/*
 * 跳价闪烁. With hundreds of servers nearly every price moves on each 2s tick,
 * and starting hundreds of CSS animations per tick saturates the main thread.
 * So the flash is applied imperatively (no extra React render) and only to
 * prices that are on screen.
 *
 * Visibility is checked once per tick, not tracked continuously: an
 * IntersectionObserver over every price would be recomputed on every frame the
 * ticker marquee produces. The check runs two animation frames after the tick,
 * when the browser has already laid out the new DOM, so reading geometry is
 * free; done inside React's commit it would force that layout synchronously
 * and lengthen the tick task. Reads all happen before any write (no layout
 * thrashing). Rows skipped by `content-visibility: auto` are rejected by
 * checkVisibility without forcing their layout; everything else is tested
 * against the viewport. A 16-32ms delay before the flash is imperceptible.
 */

type Direction = "up" | "down";
// Keyed by element: a price queued twice before the flush flashes once.
const pending = new Map<HTMLElement, Direction>();

function afterNextPaint(run: () => void) {
	if (typeof requestAnimationFrame !== "function") {
		setTimeout(run, 0);
		return;
	}
	requestAnimationFrame(() => requestAnimationFrame(run));
}

function flushFlashes() {
	const jobs = [...pending];
	pending.clear();
	const visible = jobs.filter(
		([element]) => element.isConnected && isOnScreen(element),
	);
	for (const [element, direction] of visible) {
		element.dataset.flash = direction;
		element.dataset.flashParity =
			element.dataset.flashParity === "0" ? "1" : "0";
	}
}

function scheduleFlash(element: HTMLElement, direction: Direction) {
	const first = pending.size === 0;
	pending.set(element, direction);
	if (first) afterNextPaint(flushFlashes);
}

export function isOnScreen(element: HTMLElement) {
	if (
		typeof element.checkVisibility === "function" &&
		!element.checkVisibility({ contentVisibilityAuto: true })
	) {
		return false;
	}
	const rect = element.getBoundingClientRect();
	// Nothing measurable (e.g. no layout engine): don't suppress the flash.
	if (rect.width === 0 && rect.height === 0) return true;
	const height = window.innerHeight || document.documentElement.clientHeight;
	const width = window.innerWidth || document.documentElement.clientWidth;
	return (
		rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width
	);
}

/**
 * Returns a ref for the price element. When `value` moves by at least
 * FLAT_EPSILON while the element is on screen, `data-flash` (up/down) is set
 * and `data-flash-parity` flips so the CSS animation restarts. Transitions to
 * or from null never flash.
 */
export function useTickFlash<T extends HTMLElement>(
	value: number | null,
): RefObject<T | null> {
	const ref = useRef<T>(null);
	const previous = useRef(value);

	useEffect(() => {
		const before = previous.current;
		previous.current = value;
		const element = ref.current;
		if (!element || before === null || value === null) return;
		if (Math.abs(value - before) < FLAT_EPSILON) return;
		scheduleFlash(element, value > before ? "up" : "down");
	}, [value]);

	return ref;
}
