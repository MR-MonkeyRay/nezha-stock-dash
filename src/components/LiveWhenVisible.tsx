import {
	type ReactNode,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";

/** Starts visible, so the first paint and environments without
 * IntersectionObserver always render live content. */
function useOnScreen(ref: RefObject<HTMLElement | null>, margin: string) {
	const [inViewport, setInViewport] = useState(true);
	const [pageVisible, setPageVisible] = useState(
		() => document.visibilityState !== "hidden",
	);

	useEffect(() => {
		const element = ref.current;
		if (!element || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[entries.length - 1];
				if (entry) setInViewport(entry.isIntersecting);
			},
			{ rootMargin: margin },
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref, margin]);

	useEffect(() => {
		const update = () => setPageVisible(document.visibilityState !== "hidden");
		document.addEventListener("visibilitychange", update);
		return () => document.removeEventListener("visibilitychange", update);
	}, []);

	return inViewport && pageVisible;
}

/**
 * Re-renders `children` only while they can be seen. Off-screen (beyond
 * `margin`) or in a background tab, the last rendered element is reused, so
 * React skips the subtree on every websocket tick; it catches up with the
 * latest props as soon as it scrolls back into view. State inside the
 * subtree (fetched history, tooltips) still updates normally.
 */
export function LiveWhenVisible({
	children,
	className,
	margin = "200px",
}: {
	children: ReactNode;
	className?: string;
	margin?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const live = useOnScreen(ref, margin);
	// biome-ignore lint/correctness/useExhaustiveDependencies: freezing is the point; `children` is a dependency only while live.
	const content = useMemo(() => children, [live ? children : null]);

	return (
		// `grid` lets the child stretch to the row height like a direct grid item.
		<div ref={ref} className={cn("grid", className)}>
			{content}
		</div>
	);
}
