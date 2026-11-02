import { type Direction, MAX_DISPLAY_PCT } from "./quote-series";

/** Text color per direction. Up/down follow html[data-price-color]. */
export function directionTextClass(direction: Direction) {
	switch (direction) {
		case "up":
			return "text-up";
		case "down":
			return "text-down";
		case "flat":
			return "text-flat";
		default:
			return "text-suspended";
	}
}

/** Solid pill background per direction (white text on top). */
export function directionPillClass(direction: Direction) {
	switch (direction) {
		case "up":
			return "bg-up text-white";
		case "down":
			return "bg-down text-white";
		case "flat":
			return "bg-flat/25 text-foreground";
		default:
			return "bg-suspended/20 text-suspended";
	}
}

/** Shape cue so color is never the only signal. */
export function directionGlyph(direction: Direction) {
	switch (direction) {
		case "up":
			return "▲";
		case "down":
			return "▼";
		case "flat":
			return "–";
		default:
			return "";
	}
}

const PLACEHOLDER = "--";

/** Always signed: +1.20 / -0.40 / 0.00. Uses a real minus sign for alignment. */
export function formatSigned(value: number | null | undefined, digits = 2) {
	if (value === null || value === undefined || !Number.isFinite(value))
		return PLACEHOLDER;
	const fixed = Math.abs(value).toFixed(digits);
	if (Number(fixed) === 0) return (0).toFixed(digits);
	return `${value > 0 ? "+" : "−"}${fixed}`;
}

export function formatSignedPct(value: number | null | undefined, digits = 2) {
	if (value === null || value === undefined || !Number.isFinite(value))
		return PLACEHOLDER;
	if (Math.abs(value) > MAX_DISPLAY_PCT)
		return `${value > 0 ? "+" : "−"}>${MAX_DISPLAY_PCT}%`;
	return `${formatSigned(value, digits)}%`;
}

export function formatPrice(value: number | null | undefined, digits = 2) {
	if (value === null || value === undefined || !Number.isFinite(value))
		return PLACEHOLDER;
	return value.toFixed(digits);
}
