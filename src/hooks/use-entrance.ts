import { useEffect, useState } from "react";

/**
 * True only for the first `duration` ms after mount. Lists use it to apply the
 * `stagger` entrance class once, so rows that React later reorders (live CPU
 * sorting re-inserts DOM nodes) do not replay the entrance animation.
 */
export function useEntrance(duration = 900) {
	const [entering, setEntering] = useState(true);
	useEffect(() => {
		const timer = window.setTimeout(() => setEntering(false), duration);
		return () => window.clearTimeout(timer);
	}, [duration]);
	return entering;
}
