import { useState } from "react";
import { FLAT_EPSILON } from "./quote-series";

export type TickFlash = {
	/** Direction of the latest tick, null until the value first moves. */
	direction: "up" | "down" | null;
	/** Alternates 0/1 on every tick so the CSS animation restarts. */
	parity: 0 | 1;
};

type State = TickFlash & { value: number | null };

/**
 * 跳价闪烁: reports whether a price just ticked up or down versus the previous
 * render. State is adjusted during render (not in an effect), so a tick costs no
 * extra commit and StrictMode double renders cannot flip the parity twice.
 * Moves smaller than FLAT_EPSILON, and transitions to/from null, do not flash.
 */
export function useTickFlash(value: number | null): TickFlash {
	const state = useTickState(value);
	return { direction: state.direction, parity: state.parity };
}

function useTickState(value: number | null): State {
	const [state, setState] = useState<State>({
		value,
		direction: null,
		parity: 0,
	});
	if (!Object.is(state.value, value)) {
		const previous = state.value;
		const moved =
			previous !== null &&
			value !== null &&
			Math.abs(value - previous) >= FLAT_EPSILON;
		const next: State = moved
			? {
					value,
					direction: value > previous ? "up" : "down",
					parity: state.parity === 0 ? 1 : 0,
				}
			: { ...state, value };
		setState(next);
		return next;
	}
	return state;
}
