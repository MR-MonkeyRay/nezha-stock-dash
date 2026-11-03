import ServerCard from "@/components/ServerCard";
import type { SortContextType } from "@/context/sort-context";
import { type Quote, SUSPENDED_QUOTE } from "@/features/market/quote-series";
import { Watchlist } from "@/features/market/Watchlist";
import { useEntrance } from "@/hooks/use-entrance";
import { cn } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import { ServerEmptyState } from "./server-states";
import type { ServerView } from "./use-server-preferences";

const NO_QUOTES = new Map<number, Quote>();

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
	return (
		<section
			className={cn(
				"mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 server-card-list",
				entering && "stagger",
			)}
		>
			{servers.map((serverInfo) => (
				<ServerCard
					key={serverInfo.id}
					now={now}
					serverInfo={serverInfo}
					quote={quotes.get(serverInfo.id) ?? SUSPENDED_QUOTE}
				/>
			))}
		</section>
	);
}
