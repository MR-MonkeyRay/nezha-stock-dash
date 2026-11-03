import { describe, expect, it } from "vitest";
import {
	BUCKET_LADDER,
	bucketCandles,
	bucketStart,
	bucketVolume,
	candleDirection,
	localOffset,
	movingAverage,
	pickBucketMs,
	sampleInterval,
	toChartTime,
} from "@/features/server-detail/candles";

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1, 0, 0, 0);
const points = (values: number[], stepMs: number, start = T0) =>
	values.map((value, index) => ({ ts: start + index * stepMs, value }));

describe("candles", () => {
	it("measures the median sample interval", () => {
		expect(sampleInterval([])).toBe(0);
		expect(sampleInterval(points([1], HOUR))).toBe(0);
		expect(sampleInterval(points([1, 2, 3, 4], 15 * 60_000))).toBe(15 * 60_000);
		expect(
			sampleInterval([
				{ ts: 0, value: 1 },
				{ ts: 0, value: 2 },
			]),
		).toBe(0);
	});

	it("picks candle sizes per period with about three samples each", () => {
		expect(pickBucketMs("1d", points([1, 2, 3], 15 * 60_000))).toBe(HOUR);
		expect(pickBucketMs("1d", points([1, 2, 3], 60_000))).toBe(30 * 60_000);
		expect(pickBucketMs("7d", points([1, 2, 3], HOUR))).toBe(4 * HOUR);
		expect(pickBucketMs("30d", points([1, 2, 3], 6 * HOUR))).toBe(24 * HOUR);
		expect(pickBucketMs("30d", points([1, 2, 3], 10 * 24 * HOUR))).toBe(
			BUCKET_LADDER[BUCKET_LADDER.length - 1],
		);
	});

	it("aligns buckets to local boundaries", () => {
		const ts = T0 + 90 * 60_000;
		const start = bucketStart(ts, HOUR);
		expect((start + localOffset(start)) % HOUR).toBe(0);
		expect(start).toBeLessThanOrEqual(ts);
		expect(ts - start).toBeLessThan(HOUR);
		expect(toChartTime(start)).toBe(
			Math.floor((start + localOffset(start)) / 1000),
		);
	});

	it("builds OHLC candles and skips invalid samples", () => {
		const samples = [
			...points([10, 30, 5, 20], 15 * 60_000),
			{ ts: T0 + 70 * 60_000, value: Number.NaN },
			...points([20, 15], 15 * 60_000, T0 + 2 * HOUR),
		];
		const candles = bucketCandles(samples, HOUR);
		const first = candles.find((candle) => candle.count === 4);
		expect(first).toMatchObject({ open: 10, high: 30, low: 5, close: 20 });
		expect(candleDirection(first ?? candles[0])).toBe("up");
		const last = candles[candles.length - 1];
		expect(last).toMatchObject({ open: 20, close: 15, count: 2 });
		expect(candleDirection(last)).toBe("down");
		expect(candleDirection({ ...last, close: last.open })).toBe("flat");
	});

	it("computes moving averages only once the window is full", () => {
		const candles = bucketCandles(points([1, 2, 3, 4], HOUR), HOUR);
		const ma = movingAverage(candles, 3);
		expect(ma.map((point) => point.value)).toEqual([2, 3]);
		expect(ma[0].start).toBe(candles[2].start);
		expect(movingAverage(candles, 10)).toEqual([]);
	});

	it("sums the mean throughput of each series per bucket", () => {
		const volume = bucketVolume(
			[
				points([100, 300], 30 * 60_000),
				[...points([50], HOUR), { ts: T0, value: Number.NaN }],
			],
			HOUR,
		);
		const start = bucketStart(T0, HOUR);
		expect(volume.get(start)).toBe(200 + 50);
	});
});
