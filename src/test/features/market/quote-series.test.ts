import { describe, expect, it } from "vitest";
import {
	computeQuote,
	orderFrames,
	SUSPENDED_QUOTE,
	selectBreadth,
	selectCpuSeries,
	selectMarketIndex,
	selectQuotes,
	selectTickerItems,
} from "@/features/market/quote-series";
import { createServer } from "@/test/fixtures";
import type { NezhaServer, NezhaWebsocketResponse } from "@/types/nezha-api";

const T0 = Date.parse("2025-01-01T00:00:00.000Z");
const at = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

function server(id: number, cpu: number, online = true): NezhaServer {
	return createServer({
		id,
		name: `edge-${id}`,
		last_active: online ? at(0) : "0001-01-01T00:00:00Z",
		state: { cpu },
	});
}

function frame(now: number, servers: NezhaServer[]): NezhaWebsocketResponse {
	return {
		now: T0 + now,
		servers: servers.map((item) =>
			item.last_active.startsWith("000")
				? item
				: { ...item, last_active: at(now) },
		),
	};
}

describe("orderFrames", () => {
	it("dedupes by timestamp with the current frame winning, oldest-first and capped", () => {
		const old = frame(0, [server(1, 1)]);
		const mid = frame(2000, [server(1, 2)]);
		const current = frame(4000, [server(1, 9)]);
		const stale = frame(4000, [server(1, 3)]);
		const ordered = orderFrames([stale, mid, old], current, 2);
		expect(ordered.map((item) => item.now - T0)).toEqual([2000, 4000]);
		expect(ordered[1].servers[0].state.cpu).toBe(9);
		expect(orderFrames([mid, old], null).map((item) => item.now - T0)).toEqual([
			0, 2000,
		]);
	});
});

describe("selectCpuSeries", () => {
	it("records only online samples so a returning server has no fake zero", () => {
		const frames = [
			frame(0, [server(1, 10), server(2, 5)]),
			frame(2000, [server(1, 12), server(2, 0, false)]),
			frame(4000, [server(1, 11), server(2, 7)]),
		];
		const series = selectCpuSeries(frames);
		expect(series.get(1)).toEqual([10, 12, 11]);
		expect(series.get(2)).toEqual([5, 7]);
	});

	it("treats a missing or invalid cpu reading as zero", () => {
		const broken = {
			...server(3, 0),
			state: { cpu: Number.NaN },
		} as unknown as NezhaServer;
		const series = selectCpuSeries([frame(0, [broken])]);
		expect(series.get(3)).toEqual([0]);
	});
});

describe("computeQuote", () => {
	it("measures change against the oldest sample in the window", () => {
		const quote = computeQuote([20, 30, 25], true);
		expect(quote).toMatchObject({
			last: 25,
			base: 20,
			change: 5,
			changePct: 25,
			high: 30,
			low: 20,
			direction: "up",
		});
		expect(computeQuote([20, 10], true).direction).toBe("down");
	});

	it("treats sub-epsilon changes as flat", () => {
		expect(computeQuote([10, 10.04], true)).toMatchObject({
			change: 0,
			changePct: 0,
			direction: "flat",
		});
	});

	it("hides percentages for a near-zero base", () => {
		const quote = computeQuote([0, 4], true);
		expect(quote.change).toBe(4);
		expect(quote.changePct).toBeNull();
		expect(quote.direction).toBe("up");
	});

	it("needs two samples for a change and reports offline as suspended", () => {
		expect(computeQuote([7], true)).toMatchObject({
			last: 7,
			change: null,
			changePct: null,
			direction: "flat",
		});
		expect(computeQuote(undefined, true)).toMatchObject({
			last: null,
			direction: "flat",
		});
		expect(computeQuote([1, 2], false)).toBe(SUSPENDED_QUOTE);
	});
});

describe("market selectors", () => {
	const frames = [
		frame(0, [
			server(1, 10),
			server(2, 50),
			server(3, 30),
			server(4, 1, false),
		]),
		frame(2000, [
			server(1, 20),
			server(2, 40),
			server(3, 30.01),
			server(4, 1, false),
		]),
	];
	const current = frames[1];

	it("builds quotes, breadth and ticker items for the current list", () => {
		const quotes = selectQuotes(
			current.servers,
			current.now,
			selectCpuSeries(frames),
		);
		expect(quotes.get(1)?.direction).toBe("up");
		expect(quotes.get(2)?.direction).toBe("down");
		expect(quotes.get(3)?.direction).toBe("flat");
		expect(quotes.get(4)?.direction).toBe("suspended");
		expect(selectBreadth(quotes.values())).toEqual({
			rising: 1,
			falling: 1,
			flat: 1,
			suspended: 1,
		});

		const halted = server(4, 1, false);
		const ticker = selectTickerItems(
			[halted, ...current.servers.slice(0, 3)],
			quotes,
		);
		expect(ticker.map((item) => item.id)).toEqual([1, 2, 3, 4]);
		expect(selectTickerItems(current.servers, quotes, 2)).toHaveLength(2);
		expect(selectTickerItems([server(9, 1)], new Map())[0].quote).toBe(
			SUSPENDED_QUOTE,
		);
	});

	it("averages online member CPU per frame for the market index", () => {
		const all = selectMarketIndex(frames);
		expect(all.members).toBe(3);
		expect(all.quote.base).toBeCloseTo(30);
		expect(all.quote.last).toBeCloseTo((20 + 40 + 30.01) / 3);

		const group = selectMarketIndex(frames, new Set([1]));
		expect(group.quote).toMatchObject({ base: 10, last: 20, direction: "up" });

		const halted = selectMarketIndex(frames, new Set([4]));
		expect(halted.members).toBe(0);
		expect(halted.quote.direction).toBe("suspended");
		expect(selectMarketIndex([]).quote.direction).toBe("suspended");
	});
});
