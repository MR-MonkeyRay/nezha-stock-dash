import ServerCard from "@/components/ServerCard";
import type { SortContextType } from "@/context/sort-context";
import { type Quote, SUSPENDED_QUOTE } from "@/features/market/quote-series";
import { Watchlist } from "@/features/market/Watchlist";
import { useEntrance } from "@/hooks/use-entrance";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWindowList, VIRTUALIZE_FROM } from "@/hooks/use-window-list";
import { cn } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import { ServerEmptyState } from "./server-states";
import type { ServerView } from "./use-server-preferences";

const NO_QUOTES = new Map<number, Quote>();
const GRID_CLASS = "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3";

/** Section class names are a styling hook for users' custom CSS. */
export function ServerList({
	hasServers,
	filteredServers,
	view,
	now,
	quotes = NO_QUOTES,
	sort,
}: {
	hasServers: boolean;
	filteredServers: NezhaServer[];
	view: ServerView;
	now: number;
	quotes?: Map<number, Quote>;
	sort: Pick<
		SortContextType,
		"sortType" | "sortOrder" | "setSortType" | "setSortOrder"
	>;
}) {
	return !hasServers ? (
		<ServerEmptyState />
	) : filteredServers.length > 0 ? (
		view === "list" ? (
			<section className="mt-3 server-inline-list">
				<Watchlist
					servers={filteredServers}
					quotes={quotes}
					now={now}
					{...sort}
				/>
			</section>
		) : (
			<ServerCardGrid servers={filteredServers} quotes={quotes} now={now} />
		)
	) : (
		<ServerEmptyState filtered />
	);
}

function ServerCardGrid({
	servers,
	quotes,
	now,
}: {
	servers: NezhaServer[];
	quotes: ReadonlyMap<number, Quote>;
	now: number;
}) {
	const entering = useEntrance();
	const sm = useMediaQuery("(min-width: 640px)");
	const xl = useMediaQuery("(min-width: 1280px)");
	const columns = xl ? 3 : sm ? 2 : 1;
	const rowCount = Math.ceil(servers.length / columns);
	const list = useWindowList<HTMLElement>({
		count: rowCount,
		estimateSize: 150,
		getKey: (row) => servers[row * columns].id,
		enabled: servers.length >= VIRTUALIZE_FROM,
	});
	const card = (serverInfo: NezhaServer) => (
		<ServerCard
			key={serverInfo.id}
			now={now}
			serverInfo={serverInfo}
			quote={quotes.get(serverInfo.id) ?? SUSPENDED_QUOTE}
		/>
	);

	if (!list.measure) {
		return (
			<section
				className={cn(
					GRID_CLASS,
					"mt-3 server-card-list",
					entering && "stagger",
				)}
			>
				{servers.map(card)}
			</section>
		);
	}

	// Virtualized: whole rows of cards, so CSS grid order is preserved.
	return (
		<section
			ref={list.ref}
			className={cn("mt-3 server-card-list", entering && "stagger")}
			style={{ paddingTop: list.paddingTop, paddingBottom: list.paddingBottom }}
		>
			{list.indices.map((row) => (
				<div
					key={servers[row * columns].id}
					ref={list.measure}
					data-index={row}
					className={cn(GRID_CLASS, "pb-2")}
				>
					{servers.slice(row * columns, (row + 1) * columns).map(card)}
				</div>
			))}
		</section>
	);
}
