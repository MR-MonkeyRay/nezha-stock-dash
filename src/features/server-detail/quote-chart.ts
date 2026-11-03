/** Shared 分时 (intraday) chart styling: dashed grid, axis ticks, 均价 line. */

export const QUOTE_GRID_PROPS = {
	vertical: true,
	strokeDasharray: "3 3",
	stroke: "hsl(var(--chart-grid))",
} as const;

export const QUOTE_TICK = {
	fill: "hsl(var(--chart-axis))",
	fontSize: 10,
	fontFamily: "var(--font-num)",
} as const;

export const QUOTE_LINE_COLOR = "hsl(var(--chart-line))";
export const QUOTE_AVG_COLOR = "hsl(var(--chart-avg))";

/**
 * Adds a cumulative mean of `key` as `avgKey`, like the yellow 均价 line of an
 * intraday chart. Non-finite values are skipped and carry the previous mean.
 */
export function withRunningAverage<
	T extends Record<string, unknown>,
	K extends string,
>(
	data: readonly T[],
	key: keyof T,
	avgKey: K,
): (T & Record<K, number | null>)[] {
	let sum = 0;
	let count = 0;
	return data.map((item) => {
		const value = item[key];
		if (typeof value === "number" && Number.isFinite(value)) {
			sum += value;
			count += 1;
		}
		return {
			...item,
			[avgKey]: count > 0 ? sum / count : null,
		} as T & Record<K, number | null>;
	});
}
