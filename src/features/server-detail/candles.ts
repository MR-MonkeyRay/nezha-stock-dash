import type { MetricPoint } from "@/hooks/use-metric-history";
import type { MetricPeriod } from "@/types/nezha-api";

/** One K-line bar. `start` is the bucket start in epoch ms. */
export type Candle = {
	start: number;
	open: number;
	high: number;
	low: number;
	close: number;
	count: number;
};

export type LinePoint = { start: number; value: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Candle sizes offered, smallest first (5分 … 日K). */
export const BUCKET_LADDER = [
	5 * MINUTE,
	15 * MINUTE,
	30 * MINUTE,
	HOUR,
	2 * HOUR,
	4 * HOUR,
	6 * HOUR,
	12 * HOUR,
	DAY,
] as const;

/** Smallest candle per period: 1日 → 30分, 7日 → 4小时, 30日 → 日K. */
const MIN_BUCKET: Record<MetricPeriod, number> = {
	"1d": 30 * MINUTE,
	"7d": 4 * HOUR,
	"30d": DAY,
};

/** Typical spacing between samples (median of gaps), 0 when unknown. */
export function sampleInterval(points: readonly MetricPoint[]) {
	if (points.length < 2) return 0;
	const gaps: number[] = [];
	for (let index = 1; index < points.length; index++) {
		const gap = points[index].ts - points[index - 1].ts;
		if (gap > 0) gaps.push(gap);
	}
	if (gaps.length === 0) return 0;
	gaps.sort((a, b) => a - b);
	return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Candle size: at least the period's minimum, and wide enough for roughly
 * three samples per candle so open/high/low/close are meaningful.
 */
export function pickBucketMs(
	period: MetricPeriod,
	points: readonly MetricPoint[],
) {
	const wanted = Math.max(MIN_BUCKET[period], sampleInterval(points) * 3);
	return BUCKET_LADDER.find((size) => size >= wanted) ?? DAY;
}

/** Local-time offset in ms, so hour and day candles start at local boundaries. */
export const localOffset = (ms: number) =>
	-new Date(ms).getTimezoneOffset() * MINUTE;

/** Bucket start (epoch ms) aligned to local time. */
export function bucketStart(ts: number, bucketMs: number) {
	const offset = localOffset(ts);
	return Math.floor((ts + offset) / bucketMs) * bucketMs - offset;
}

/** OHLC per bucket; points must be oldest-first (as the API returns them). */
export function bucketCandles(
	points: readonly MetricPoint[],
	bucketMs: number,
): Candle[] {
	const candles: Candle[] = [];
	let current: Candle | undefined;
	for (const point of points) {
		if (!Number.isFinite(point.value)) continue;
		const start = bucketStart(point.ts, bucketMs);
		if (!current || current.start !== start) {
			current = {
				start,
				open: point.value,
				high: point.value,
				low: point.value,
				close: point.value,
				count: 1,
			};
			candles.push(current);
			continue;
		}
		current.high = Math.max(current.high, point.value);
		current.low = Math.min(current.low, point.value);
		current.close = point.value;
		current.count += 1;
	}
	return candles;
}

/** Simple moving average of closes; starts once the window is full. */
export function movingAverage(
	candles: readonly Candle[],
	window: number,
): LinePoint[] {
	const result: LinePoint[] = [];
	let sum = 0;
	candles.forEach((candle, index) => {
		sum += candle.close;
		if (index >= window) sum -= candles[index - window].close;
		if (index >= window - 1)
			result.push({ start: candle.start, value: sum / window });
	});
	return result;
}

/**
 * "成交量": mean combined network throughput (bytes/s) per bucket, from the
 * net_in_speed and net_out_speed histories.
 */
export function bucketVolume(
	series: readonly (readonly MetricPoint[])[],
	bucketMs: number,
): Map<number, number> {
	const totals = new Map<number, number>();
	for (const points of series) {
		const sums = new Map<number, { sum: number; count: number }>();
		for (const point of points) {
			if (!Number.isFinite(point.value)) continue;
			const start = bucketStart(point.ts, bucketMs);
			const entry = sums.get(start) ?? { sum: 0, count: 0 };
			entry.sum += point.value;
			entry.count += 1;
			sums.set(start, entry);
		}
		for (const [start, { sum, count }] of sums) {
			totals.set(start, (totals.get(start) ?? 0) + sum / count);
		}
	}
	return totals;
}

/**
 * lightweight-charts renders UTCTimestamp in UTC; shifting by the local offset
 * makes its axis show the viewer's local wall-clock time.
 */
export const toChartTime = (ms: number) =>
	Math.floor((ms + localOffset(ms)) / 1000);

/** Candle direction: close vs open, as in K-line charts. */
export const candleDirection = (candle: Candle) =>
	candle.close > candle.open
		? "up"
		: candle.close < candle.open
			? "down"
			: "flat";
