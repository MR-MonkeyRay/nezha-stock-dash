import { flushSync } from "react-dom";

/**
 * View Transitions (Chromium, Safari 18+). Each kind maps to CSS under
 * `html[data-vt="…"]` in index.css:
 * - nav:   page change; one shared element (the clicked server name) morphs
 *          into the detail header, the rest of the page fades.
 * - theme: the new theme is revealed in a circle from the toggle button.
 * - fade:  short crossfade (price color convention).
 * Unsupported browsers and reduced-motion users get the update instantly.
 */
export type ViewTransitionKind = "nav" | "theme" | "fade";

type StartViewTransition = (update: () => void | Promise<void>) => {
	finished: Promise<void>;
};

/** Name shared by the clicked server name and the detail page header. */
export const SERVER_NAME_VT = "server-name";

function startFn(): StartViewTransition | undefined {
	if (typeof document === "undefined") return undefined;
	const start = (document as Document & { startViewTransition?: unknown })
		.startViewTransition;
	if (typeof start !== "function") return undefined;
	if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
		return undefined;
	return (start as StartViewTransition).bind(document);
}

export function supportsViewTransition() {
	return startFn() !== undefined;
}

/**
 * Runs a React state update inside a view transition. `update` is wrapped in
 * flushSync so the DOM (and synchronous passive effects of the sync lane, e.g.
 * the theme class) is final when the browser captures the new snapshot.
 */
export function withViewTransition(
	update: () => void,
	kind: ViewTransitionKind,
	options: {
		origin?: { x: number; y: number };
		shared?: Element | null;
		/**
		 * Some updates commit asynchronously (React Router wraps navigations in
		 * startTransition, which flushSync cannot force). The new snapshot waits
		 * until this returns true, for at most `maxWait` ms.
		 */
		waitFor?: () => boolean;
		maxWait?: number;
	} = {},
) {
	const start = startFn();
	if (!start) {
		update();
		return;
	}
	const root = document.documentElement;
	root.dataset.vt = kind;
	if (options.origin) {
		const { x, y } = options.origin;
		const radius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y),
		);
		root.style.setProperty("--vt-x", `${x}px`);
		root.style.setProperty("--vt-y", `${y}px`);
		root.style.setProperty("--vt-r", `${Math.ceil(radius)}px`);
	}
	const shared = options.shared as HTMLElement | null | undefined;
	if (shared) shared.style.viewTransitionName = SERVER_NAME_VT;

	const transition = start(async () => {
		// The old snapshot is taken; release the name so only the new page owns it.
		if (shared) shared.style.viewTransitionName = "";
		flushSync(update);
		if (options.waitFor)
			await waitUntil(options.waitFor, options.maxWait ?? 400);
	});
	transition.finished.finally(() => {
		delete root.dataset.vt;
	});
}

/** Resolves once `ready()` holds (checked every frame-ish) or after `maxWait`. */
export function waitUntil(ready: () => boolean, maxWait: number) {
	return new Promise<void>((resolve) => {
		const started = Date.now();
		const check = () => {
			if (ready() || Date.now() - started >= maxWait) resolve();
			else window.setTimeout(check, 16);
		};
		check();
	});
}

/** Center of an element, for the theme reveal origin. */
export function centerOf(element: Element | null | undefined) {
	if (!element) return undefined;
	const rect = element.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
