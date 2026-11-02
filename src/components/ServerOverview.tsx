import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import {
	QuoteChange,
	QuoteChangePct,
	QuotePrice,
} from "@/features/market/QuoteText";
import {
	type Breadth,
	type MarketIndex,
	SUSPENDED_QUOTE,
} from "@/features/market/quote-series";
import { Sparkline } from "@/features/market/Sparkline";
import { useStatus } from "@/hooks/use-status";
import { formatBytes } from "@/lib/format";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";
import SkeletonBar from "./loading/SkeletonBar";

type ServerOverviewProps = {
	loading?: boolean;
	online: number;
	offline: number;
	total: number;
	up: number;
	down: number;
	upSpeed: number;
	downSpeed: number;
	index?: MarketIndex;
	breadth?: Breadth;
};

const EMPTY_BREADTH: Breadth = { rising: 0, falling: 0, flat: 0, suspended: 0 };

/** Market overview: 综合负载指数, 涨跌分布 and network "turnover". */
export default function ServerOverview({
	loading = false,
	online,
	offline,
	total,
	up,
	down,
	upSpeed,
	downSpeed,
	index,
	breadth = EMPTY_BREADTH,
}: ServerOverviewProps) {
	const { t } = useTranslation();
	const { status, setStatus } = useStatus();
	const {
		backgroundImage: customBackgroundImage,
		disableAnimatedMan,
		customIllustration,
	} = useRuntimeConfig();
	const quote = index?.quote ?? SUSPENDED_QUOTE;
	const panel = cn("relative overflow-hidden p-3 md:p-4", {
		"bg-card/70": customBackgroundImage,
	});

	return (
		<section
			aria-busy={loading}
			className={cn(
				"grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-[1.35fr_1fr_1fr] server-overview",
				loading && "pointer-events-none",
			)}
		>
			<Card className={cn(panel, "col-span-2 lg:col-span-1")}>
				{loading ? (
					<PanelPlaceholder rows={3} />
				) : (
					<button
						type="button"
						onClick={() => setStatus("all")}
						className="flex w-full items-end justify-between gap-3 text-left"
					>
						<div className="min-w-0">
							<p className="flex items-center gap-2 text-xs text-muted-foreground">
								<span className="font-medium text-foreground">
									{t("market.index")}
								</span>
								<span className="hidden sm:inline">
									{t("market.indexHint")}
								</span>
							</p>
							<QuotePrice
								quote={quote}
								className="mt-1 block w-fit text-[2rem] font-bold leading-none md:text-[2.5rem]"
							/>
							<p className="mt-1.5 flex items-center gap-3 text-sm">
								<QuoteChange quote={quote} />
								<QuoteChangePct quote={quote} />
								<span className="text-[11px] text-muted-foreground">
									{t("market.vsOneMinute")}
								</span>
							</p>
						</div>
						<Sparkline
							values={quote.series}
							direction={quote.direction}
							width={140}
							height={48}
							live
							className="hidden sm:block"
						/>
					</button>
				)}
				{!loading && customIllustration && !disableAnimatedMan && (
					<img
						className="pointer-events-none absolute right-2 top-1 w-14 opacity-80"
						alt="illustration"
						src={customIllustration}
						loading="eager"
					/>
				)}
			</Card>

			<Card className={cn(panel, "col-span-2 sm:col-span-1")}>
				{loading ? (
					<PanelPlaceholder rows={3} />
				) : (
					<BreadthPanel
						breadth={breadth}
						total={total}
						online={online}
						offline={offline}
						status={status}
						setStatus={setStatus}
					/>
				)}
			</Card>

			<Card className={cn(panel, "col-span-2 sm:col-span-1")}>
				{loading ? (
					<PanelPlaceholder rows={3} />
				) : (
					<div className="grid h-full grid-cols-2 items-center gap-x-3 gap-y-1 sm:flex sm:flex-col sm:items-stretch sm:gap-1.5">
						<p className="col-span-2 text-xs font-medium">
							{t("market.turnover")}
						</p>
						<p className="num flex items-baseline gap-1 text-sm font-semibold text-up md:text-base">
							<span aria-hidden="true">↑</span>
							<span className="sr-only">{t("market.upSpeed")}</span>
							{formatBytes(upSpeed)}/s
						</p>
						<p className="num flex items-baseline gap-1 text-sm font-semibold text-down md:text-base">
							<span aria-hidden="true">↓</span>
							<span className="sr-only">{t("market.downSpeed")}</span>
							{formatBytes(downSpeed)}/s
						</p>
						<p className="num col-span-2 mt-auto flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
							<span>
								{t("market.traffic")} ↑{formatBytes(up)}
							</span>
							<span>↓{formatBytes(down)}</span>
						</p>
					</div>
				)}
			</Card>
		</section>
	);
}

function BreadthPanel({
	breadth,
	total,
	online,
	offline,
	status,
	setStatus,
}: {
	breadth: Breadth;
	total: number;
	online: number;
	offline: number;
	status: string;
	setStatus: (status: "all" | "online" | "offline") => void;
}) {
	const { t } = useTranslation();
	const counted =
		breadth.rising + breadth.flat + breadth.falling + breadth.suspended || 1;
	const segments = [
		{ key: "rising", value: breadth.rising, bar: "bg-up" },
		{ key: "flat", value: breadth.flat, bar: "bg-flat/60" },
		{ key: "falling", value: breadth.falling, bar: "bg-down" },
		{ key: "suspended", value: breadth.suspended, bar: "bg-suspended/40" },
	] as const;
	const items = [
		{ key: "rising", value: breadth.rising, text: "text-up", target: "online" },
		{
			key: "falling",
			value: breadth.falling,
			text: "text-down",
			target: "online",
		},
		{ key: "flat", value: breadth.flat, text: "text-flat", target: "online" },
		{
			key: "suspended",
			value: breadth.suspended,
			text: "text-suspended",
			target: "offline",
		},
	] as const;
	return (
		<div className="flex h-full flex-col gap-2">
			<div className="flex items-center justify-between text-xs">
				<span className="font-medium">{t("market.breadth")}</span>
				<button
					type="button"
					onClick={() => setStatus("all")}
					className={cn(
						"num rounded-sm px-1 text-muted-foreground hover:text-foreground",
						status === "all" && "text-foreground",
					)}
				>
					{t("market.total")} {total}
				</button>
			</div>
			<div
				className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
				aria-hidden="true"
			>
				{segments.map((segment) => (
					// Always rendered so a segment can grow from 0 instead of popping in.
					<span
						key={segment.key}
						className={cn(
							"transition-[width] duration-500 ease-(--ease-out) motion-reduce:transition-none",
							segment.bar,
						)}
						style={{ width: `${(segment.value / counted) * 100}%` }}
					/>
				))}
			</div>
			<div className="grid grid-cols-4 gap-x-2 gap-y-1 sm:grid-cols-2">
				{items.map((item) => {
					const active =
						item.target === "offline"
							? status === "offline"
							: status === "online";
					return (
						<button
							key={item.key}
							type="button"
							aria-pressed={active}
							title={
								item.target === "offline"
									? `${t("offline")} ${offline}`
									: `${t("online")} ${online}`
							}
							onClick={() => setStatus(item.target)}
							className={cn(
								"flex flex-col items-start gap-x-2 rounded-sm px-1 text-xs hover:bg-accent sm:flex-row sm:items-baseline sm:justify-between",
								active && "bg-accent",
							)}
						>
							<span className="truncate text-muted-foreground">
								{t(`market.${item.key}`)}
							</span>
							<span className={cn("num text-sm font-semibold", item.text)}>
								{item.value}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function PanelPlaceholder({ rows }: { rows: number }) {
	return (
		<div aria-hidden="true" className="flex flex-col gap-2">
			<SkeletonBar className="h-3 w-20" />
			{Array.from({ length: rows - 1 }, (_, key) => (
				<SkeletonBar
					key={key}
					className={key === 0 ? "h-7 w-28" : "h-3 w-36"}
				/>
			))}
		</div>
	);
}
