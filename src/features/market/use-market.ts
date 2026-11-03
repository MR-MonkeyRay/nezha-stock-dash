import { useMemo } from "react";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import type { NezhaServer } from "@/types/nezha-api";
import {
	orderFrames,
	selectBreadth,
	selectCpuSeries,
	selectMarketIndex,
	selectQuotes,
	selectTickerItems,
} from "./quote-series";

/**
 * Market view model for the home page: quotes for the selected group's servers,
 * the load index, breadth and ticker. Recomputed once per websocket frame.
 */
export function useMarket(groupServers: readonly NezhaServer[]) {
	const { messageHistory, lastData } = useWebSocketContext();
	const frames = useMemo(
		() => orderFrames(messageHistory, lastData),
		[messageHistory, lastData],
	);
	const series = useMemo(() => selectCpuSeries(frames), [frames]);
	const now = lastData?.now ?? 0;
	return useMemo(() => {
		const memberIds = new Set(groupServers.map((server) => server.id));
		const quotes = selectQuotes(groupServers, now, series);
		return {
			quotes,
			index: selectMarketIndex(frames, memberIds),
			breadth: selectBreadth(quotes.values()),
			ticker: selectTickerItems(groupServers, quotes),
		};
	}, [frames, series, groupServers, now]);
}

export type MarketView = ReturnType<typeof useMarket>;
