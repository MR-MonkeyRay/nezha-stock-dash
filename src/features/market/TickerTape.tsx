import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useServerLinkClick } from "@/hooks/use-open-server";
import { preloadServerDetail } from "@/lib/server-detail-preload";
import { cn } from "@/lib/utils";
import { QuoteChange, QuotePrice } from "./QuoteText";
import type { TickerItem } from "./quote-series";

/** Seconds per item; keeps the scroll speed constant regardless of list length. */
const SECONDS_PER_ITEM = 3;

const TickerEntry = memo(function TickerEntry({
	item,
	hidden = false,
}: {
	item: TickerItem;
	hidden?: boolean;
}) {
	const { t } = useTranslation();
	const linkClick = useServerLinkClick();
	return (
		<li className="shrink-0">
			<Link
				to={`/server/${item.id}`}
				tabIndex={hidden ? -1 : undefined}
				onClick={(event) => linkClick(item.id, event)}
				onPointerEnter={preloadServerDetail}
				className="flex items-center gap-1.5 px-3 text-xs leading-7 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
			>
				<span
					data-vt-name
					className="max-w-[10rem] truncate font-medium text-foreground/90"
				>
					{item.name}
				</span>
				{item.quote.direction === "suspended" ? (
					<span className="text-suspended">{t("market.suspended")}</span>
				) : (
					<>
						<QuotePrice quote={item.quote} suffix="%" />
						<QuoteChange quote={item.quote} />
					</>
				)}
			</Link>
		</li>
	);
});

/** Scrolling 行情 strip. Pauses on hover/focus; static under reduced motion. */
export function TickerTape({
	items,
	className,
}: {
	items: TickerItem[];
	className?: string;
}) {
	const { t } = useTranslation();
	if (items.length === 0) return null;
	const animate = items.length > 1;
	return (
		<nav
			aria-label={t("market.ticker")}
			className={cn(
				"ticker relative overflow-hidden border-y border-border bg-card/60",
				className,
			)}
		>
			<div
				className={cn("ticker-track flex w-max", { "is-animated": animate })}
				style={{ animationDuration: `${items.length * SECONDS_PER_ITEM}s` }}
			>
				<ul className="flex">
					{items.map((item) => (
						<TickerEntry key={item.id} item={item} />
					))}
				</ul>
				{animate && (
					<ul className="ticker-clone flex" aria-hidden="true">
						{items.map((item) => (
							<TickerEntry key={item.id} item={item} hidden />
						))}
					</ul>
				)}
			</div>
		</nav>
	);
}
