import ServerCard from "@/components/ServerCard";
import type { SortContextType } from "@/context/sort-context";
import { type Quote, SUSPENDED_QUOTE } from "@/features/market/quote-series";
import { Watchlist } from "@/features/market/Watchlist";
import type { NezhaServer } from "@/types/nezha-api";
import { ServerEmptyState } from "./server-states";

const NO_QUOTES = new Map<number, Quote>();

/**
 * `inline === "1"` is the 行情列表 (watchlist) and the default; "0" is the
 * quote-tile grid. Section class names are kept for users' custom CSS.
 */
export function ServerList({
	hasServers,
	filteredServers,
	inline,
	now,
	quotes = NO_QUOTES,
	sort,
}: {
	hasServers: boolean;
	filteredServers: NezhaServer[];
	inline: string;
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
		inline === "1" ? (
			<section className="mt-3 server-inline-list">
				<Watchlist
					servers={filteredServers}
					quotes={quotes}
					now={now}
					{...sort}
				/>
			</section>
		) : (
			<section className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 server-card-list">
				{filteredServers.map((serverInfo) => (
					<ServerCard
						key={serverInfo.id}
						now={now}
						serverInfo={serverInfo}
						quote={quotes.get(serverInfo.id) ?? SUSPENDED_QUOTE}
					/>
				))}
			</section>
		)
	) : (
		<ServerEmptyState filtered />
	);
}
