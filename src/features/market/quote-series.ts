import { isServerOnline } from "@/features/servers/selectors";
import type { NezhaServer, NezhaWebsocketResponse } from "@/types/nezha-api";

/**
 * Quote math for the market view: every server is a "stock" whose price is its
 * CPU usage. Pure functions only; callers memoize on websocket frames.
 */

export type Direction = "up" | "down" | "flat" | "suspended";

export type Quote = {
	/** Latest sample, null while suspended or before the first sample. */
	last: number | null;
	/** Baseline: the oldest sample in the window (about one minute ago). */
	base: number | null;
	/** last - base, in percentage points. Null until two samples exist. */
	change: number | null;
	/** change / base * 100. Null when the base is too small to be meaningful. */
	changePct: number | null;
	high: number | null;
	low: number | null;
	direction: Direction;
	/** Oldest-first samples, used by sparklines. */
	series: readonly number[];
};

/** 30 frames at the 2s websocket cadence is roughly one minute. */
export const QUOTE_WINDOW = 30;
/** Changes that round to 0.0 at one decimal are flat, so the UI never shows "▲0.0". */
export const FLAT_EPSILON = 0.05;
/** Below this base, a percentage change explodes and is not shown. */
export const MIN_PCT_BASE = 0.05;
export const MAX_DISPLAY_PCT = 999;

const EMPTY: readonly number[] = [];

export const SUSPENDED_QUOTE: Quote = Object.freeze({
	last: null,
	base: null,
	change: null,
	changePct: null,
	high: null,
	low: null,
	direction: "suspended",
	series: EMPTY,
});

/**
 * Provider history is newest-first and may repeat the current frame. Dedupe by
 * timestamp (the current frame wins), keep the newest `limit`, return oldest-first.
 */
export function orderFrames(
	messageHistory: readonly NezhaWebsocketResponse[],
	lastData: NezhaWebsocketResponse | null,
	limit = QUOTE_WINDOW,
): NezhaWebsocketResponse[] {
	const frames = new Map<number, NezhaWebsocketResponse>();
	for (const frame of lastData
		? [lastData, ...messageHistory]
		: messageHistory) {
		if (!frames.has(frame.now)) frames.set(frame.now, frame);
	}
	return [...frames.values()]
		.sort((a, b) => b.now - a.now)
		.slice(0, limit)
		.reverse();
}

const finite = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/**
 * One pass over frames × servers. Samples are recorded only while a server is
 * online, so a server returning from 停牌 does not show a fake drop to zero.
 */
export function selectCpuSeries(
	frames: readonly NezhaWebsocketResponse[],
): Map<number, number[]> {
	const series = new Map<number, number[]>();
	for (const frame of frames) {
		for (const server of frame.servers) {
			if (!isServerOnline(frame.now, server)) continue;
			const cpu = finite(server.state?.cpu) ? server.state.cpu : 0;
			const samples = series.get(server.id);
			if (samples) samples.push(cpu);
			else series.set(server.id, [cpu]);
		}
	}
	return series;
}

export function computeQuote(
	series: readonly number[] | undefined,
	online: boolean,
): Quote {
	if (!online) return SUSPENDED_QUOTE;
	const samples = series ?? EMPTY;
	if (samples.length === 0) {
		return { ...SUSPENDED_QUOTE, direction: "flat" };
	}
	const last = samples[samples.length - 1];
	let high = last;
	let low = last;
	for (const value of samples) {
		if (value > high) high = value;
		if (value < low) low = value;
	}
	if (samples.length < 2) {
		return {
			last,
			base: last,
			change: null,
			changePct: null,
			high,
			low,
			direction: "flat",
			series: samples,
		};
	}
	const base = samples[0];
	const change = last - base;
	const flat = Math.abs(change) < FLAT_EPSILON;
	return {
		last,
		base,
		change: flat ? 0 : change,
		changePct: flat ? 0 : base >= MIN_PCT_BASE ? (change / base) * 100 : null,
		high,
		low,
		direction: flat ? "flat" : change > 0 ? "up" : "down",
		series: samples,
	};
}

/** Quotes for the current server list; `now` decides online/停牌. */
export function selectQuotes(
	servers: readonly NezhaServer[],
	now: number,
	series: Map<number, number[]>,
): Map<number, Quote> {
	const quotes = new Map<number, Quote>();
	for (const server of servers) {
		quotes.set(
			server.id,
			computeQuote(series.get(server.id), isServerOnline(now, server)),
		);
	}
	return quotes;
}

export type MarketIndex = {
	/** Average CPU of online member servers, per frame. */
	quote: Quote;
	/** Member servers counted in the latest frame. */
	members: number;
};

/** "综合负载指数": mean CPU of the group's online servers in each frame. */
export function selectMarketIndex(
	frames: readonly NezhaWebsocketResponse[],
	memberIds?: ReadonlySet<number>,
): MarketIndex {
	const values: number[] = [];
	let members = 0;
	frames.forEach((frame, index) => {
		let sum = 0;
		let count = 0;
		for (const server of frame.servers) {
			if (memberIds && !memberIds.has(server.id)) continue;
			if (!isServerOnline(frame.now, server)) continue;
			sum += finite(server.state?.cpu) ? server.state.cpu : 0;
			count += 1;
		}
		if (index === frames.length - 1) members = count;
		if (count > 0) values.push(sum / count);
	});
	return { quote: computeQuote(values, members > 0), members };
}

export type Breadth = {
	rising: number;
	falling: number;
	flat: number;
	suspended: number;
};

/** 上涨 / 下跌 / 平盘 / 停牌 counts. */
export function selectBreadth(quotes: Iterable<Quote>): Breadth {
	const breadth: Breadth = { rising: 0, falling: 0, flat: 0, suspended: 0 };
	for (const quote of quotes) {
		if (quote.direction === "up") breadth.rising += 1;
		else if (quote.direction === "down") breadth.falling += 1;
		else if (quote.direction === "flat") breadth.flat += 1;
		else breadth.suspended += 1;
	}
	return breadth;
}

export type TickerItem = { id: number; name: string; quote: Quote };

/** Ticker tape: trading servers first (in list order), then halted ones, capped. */
export function selectTickerItems(
	servers: readonly NezhaServer[],
	quotes: Map<number, Quote>,
	cap = 100,
): TickerItem[] {
	const trading: TickerItem[] = [];
	const halted: TickerItem[] = [];
	for (const server of servers) {
		const quote = quotes.get(server.id) ?? SUSPENDED_QUOTE;
		(quote.direction === "suspended" ? halted : trading).push({
			id: server.id,
			name: server.name,
			quote,
		});
	}
	return [...trading, ...halted].slice(0, cap);
}
