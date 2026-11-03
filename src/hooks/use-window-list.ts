import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** Lists shorter than this render every item: their DOM is cheap, and
 * browser find (Ctrl+F) keeps working on typical dashboards. */
export const VIRTUALIZE_FROM = 60;

const neverAdjust = () => false;

export interface WindowList<E extends Element> {
	/** Attach to the element whose children are the items. */
	ref: (element: E | null) => void;
	/** Item indices to render, in order. */
	indices: number[];
	/** Space to reserve before / after the rendered items, in pixels. */
	paddingTop: number;
	paddingBottom: number;
	/** Attach to each item (with `data-index`) to measure its real height. */
	measure: ((element: Element | null) => void) | undefined;
}

/**
 * Window-scrolled virtualization for long server lists. Only items near the
 * viewport are rendered, so a websocket tick reconciles and lays out a few
 * dozen rows instead of every server. Heights are measured, so rows with
 * billing badges may be taller than `estimateSize`.
 */
export function useWindowList<E extends Element>({
	count,
	estimateSize,
	getKey,
	enabled = count >= VIRTUALIZE_FROM,
}: {
	count: number;
	estimateSize: number;
	getKey: (index: number) => number | string;
	/** Defaults to `count >= VIRTUALIZE_FROM`. */
	enabled?: boolean;
}): WindowList<E> {
	const listRef = useRef<E | null>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	// The list's document offset moves when panels above it open or close.
	// Measure after every commit; React bails out when it is unchanged.
	useLayoutEffect(() => {
		if (!enabled || !listRef.current) return;
		const top = listRef.current.getBoundingClientRect().top + window.scrollY;
		setScrollMargin(Math.round(top));
	});

	const virtualizer = useWindowVirtualizer({
		enabled,
		// Start from the page's current position: the default (0) would make
		// the virtualizer scroll the window to the top whenever a list mounts,
		// undoing scroll restoration on the way back from a detail page.
		initialOffset: () => window.scrollY,
		count: enabled ? count : 0,
		estimateSize: () => estimateSize,
		getItemKey: getKey,
		// A zero height (hidden or not laid out yet) would make every item fit
		// the viewport and render the whole list; keep the estimate instead.
		measureElement: (element) =>
			element.getBoundingClientRect().height || estimateSize,
		overscan: 6,
		scrollMargin,
	});
	// Re-measured rows above the viewport must not scroll the window: the
	// correction cancels smooth scrolling and wheel momentum mid-flight.
	// Native CSS scroll anchoring already keeps the visible rows still.
	virtualizer.shouldAdjustScrollPositionOnItemSizeChange = neverAdjust;

	const ref = useCallback((element: E | null) => {
		listRef.current = element;
	}, []);

	if (!enabled) {
		return {
			ref,
			indices: Array.from({ length: count }, (_, index) => index),
			paddingTop: 0,
			paddingBottom: 0,
			measure: undefined,
		};
	}

	const items = virtualizer.getVirtualItems();
	const first = items[0];
	const last = items[items.length - 1];
	return {
		ref,
		indices: items.map((item) => item.index),
		paddingTop: first ? Math.max(0, first.start - scrollMargin) : 0,
		paddingBottom: last
			? Math.max(0, virtualizer.getTotalSize() - (last.end - scrollMargin))
			: 0,
		measure: virtualizer.measureElement,
	};
}
