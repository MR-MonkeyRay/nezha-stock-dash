import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import BillingInfo from "@/components/billingInfo";
import PlanInfo from "@/components/PlanInfo";
import ServerFlag from "@/components/ServerFlag";
import type { SortContextType, SortType } from "@/context/sort-context";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { useEntrance } from "@/hooks/use-entrance";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useOpenServer, useServerLinkClick } from "@/hooks/use-open-server";
import { formatBytes } from "@/lib/format";
import {
	GetFontLogoClass,
	GetOsName,
	MageMicrosoftWindows,
} from "@/lib/logo-class";
import { preloadServerDetail } from "@/lib/server-detail-preload";
import { selectServerMetrics } from "@/lib/server-metrics";
import { cn, parsePublicNote } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import {
	formatSpeed,
	formatUptimeShort,
	stockCode,
	usageLevelClass,
} from "./format";
import {
	ChangePill,
	QuoteChange,
	QuoteChangePct,
	QuotePrice,
} from "./QuoteText";
import { type Quote, SUSPENDED_QUOTE } from "./quote-series";
import { Sparkline } from "./Sparkline";

type SortProps = Pick<
	SortContextType,
	"sortType" | "sortOrder" | "setSortType" | "setSortOrder"
>;

type WatchlistProps = SortProps & {
	servers: NezhaServer[];
	quotes: Map<number, Quote>;
	now: number;
};

/** 自选股-style quote list: a table on desktop, compact quote rows on phones. */
export function Watchlist(props: WatchlistProps) {
	const desktop = useMediaQuery("(min-width: 768px)");
	return desktop ? <WatchlistTable {...props} /> : <QuoteRows {...props} />;
}

type ColumnKey =
	| "name"
	| "last"
	| "change"
	| "changePct"
	| "mem"
	| "disk"
	| "upSpeed"
	| "downSpeed"
	| "traffic"
	| "uptime"
	| "intraday";

const SORTABLE: Partial<Record<ColumnKey, SortType>> = {
	name: "name",
	last: "cpu",
	mem: "mem",
	disk: "disk",
	upSpeed: "up",
	downSpeed: "down",
	traffic: "up total",
	uptime: "uptime",
};

function SortHeader({
	column,
	label,
	align = "right",
	sortType,
	sortOrder,
	setSortType,
	setSortOrder,
}: SortProps & {
	column: ColumnKey;
	label: string;
	align?: "left" | "right";
}) {
	const key = SORTABLE[column];
	const active = key !== undefined && sortType === key;
	const thClass = cn(
		"whitespace-nowrap px-2 py-2 font-normal",
		align === "right" ? "text-right" : "text-left",
	);
	if (!key) {
		return (
			<th scope="col" className={thClass}>
				{label}
			</th>
		);
	}
	return (
		<th
			scope="col"
			className={thClass}
			aria-sort={
				active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"
			}
		>
			<button
				type="button"
				className={cn(
					"inline-flex items-center gap-0.5 transition-colors hover:text-foreground",
					active && "text-highlight",
				)}
				onClick={() => {
					if (active) {
						setSortOrder(sortOrder === "asc" ? "desc" : "asc");
					} else {
						setSortType(key);
						setSortOrder(key === "name" ? "asc" : "desc");
					}
				}}
			>
				{label}
				<span
					key={active ? sortOrder : "none"}
					aria-hidden="true"
					className="anim-swap text-[9px]"
				>
					{active ? (sortOrder === "asc" ? "▲" : "▼") : ""}
				</span>
			</button>
		</th>
	);
}

function WatchlistTable({ servers, quotes, now, ...sort }: WatchlistProps) {
	const { t } = useTranslation();
	const entering = useEntrance();
	const { showNetTransfer } = useRuntimeConfig();
	const columns: { key: ColumnKey; label: string; align?: "left" }[] = [
		{ key: "name", label: t("market.name"), align: "left" },
		{ key: "last", label: t("market.last") },
		{ key: "change", label: t("market.change") },
		{ key: "changePct", label: t("market.changePct") },
		{ key: "mem", label: t("market.mem") },
		{ key: "disk", label: t("market.disk") },
		{ key: "upSpeed", label: `↑${t("market.upSpeed")}` },
		{ key: "downSpeed", label: `↓${t("market.downSpeed")}` },
		...(showNetTransfer
			? [{ key: "traffic" as const, label: t("market.traffic") }]
			: []),
		{ key: "uptime", label: t("market.uptime") },
		{ key: "intraday", label: t("market.intraday") },
	];
	return (
		<div className="watchlist overflow-x-auto rounded-md border border-border bg-card scrollbar-hidden">
			<table className="w-full min-w-[960px] border-collapse text-[13px]">
				<thead className="sticky top-0 z-10 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
					<tr className="border-b border-border">
						{columns.map((column) => (
							<SortHeader
								key={column.key}
								column={column.key}
								label={column.label}
								align={column.align}
								{...sort}
							/>
						))}
					</tr>
				</thead>
				<tbody className={cn(entering && "stagger")}>
					{servers.map((server) => (
						<WatchlistRow
							key={server.id}
							server={server}
							now={now}
							quote={quotes.get(server.id) ?? SUSPENDED_QUOTE}
							showNetTransfer={showNetTransfer}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

function PlatformLogo({ platform }: { platform: string }) {
	return platform.includes("Windows") ? (
		<MageMicrosoftWindows className="size-[10px]" />
	) : (
		<span
			className={`fl-${GetFontLogoClass(platform)} text-[10px]`}
			aria-hidden="true"
		/>
	);
}

const WatchlistRow = memo(function WatchlistRow({
	server,
	now,
	quote,
	showNetTransfer,
}: {
	server: NezhaServer;
	now: number;
	quote: Quote;
	showNetTransfer: boolean;
}) {
	const { t } = useTranslation();
	const open = useOpenServer();
	const linkClick = useServerLinkClick();
	const info = selectServerMetrics(now, server);
	const halted = quote.direction === "suspended";
	const note = parsePublicNote(info.public_note);
	const dash = <span className="text-suspended">--</span>;
	return (
		<tr
			onClick={(event) => open(server.id, event.currentTarget)}
			onPointerEnter={preloadServerDetail}
			className={cn(
				"watchlist-row group cursor-pointer border-b border-border/60 transition-colors duration-(--dur-fast) last:border-0 hover:bg-accent/60 active:bg-accent [content-visibility:auto] [contain-intrinsic-size:auto_48px]",
				halted && "text-muted-foreground",
			)}
		>
			<td className="max-w-[260px] px-2 py-1.5 text-left shadow-[inset_2px_0_0_transparent] transition-shadow duration-(--dur-base) group-hover:shadow-[inset_2px_0_0_hsl(var(--highlight))]">
				<div className="flex items-center gap-2">
					<ServerFlag country_code={info.country_code} className="shrink-0" />
					<div className="min-w-0">
						<Link
							to={`/server/${server.id}`}
							onClick={(event) => {
								event.stopPropagation();
								linkClick(server.id, event, event.currentTarget.closest("tr"));
							}}
							data-vt-name
							className="block truncate font-semibold text-foreground hover:text-highlight focus-visible:text-highlight focus-visible:outline-none"
						>
							{info.name}
						</Link>
						<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
							<span className="num">{stockCode(server.id)}</span>
							{info.platform && <PlatformLogo platform={info.platform} />}
							{halted ? (
								<span className="rounded-sm bg-suspended/20 px-1 text-suspended">
									{t("market.suspended")}
								</span>
							) : (
								info.platform && (
									<span className="truncate">
										{info.platform.includes("Windows")
											? "Windows"
											: GetOsName(info.platform)}
									</span>
								)
							)}
						</div>
						{note?.billingDataMod && (
							<div className="mt-0.5 [&_p]:text-[10px]">
								<BillingInfo parsedData={note} />
							</div>
						)}
						{note?.planDataMod && <PlanInfo parsedData={note} />}
					</div>
				</div>
			</td>
			<td className="px-2 text-right font-semibold">
				<QuotePrice quote={quote} />
			</td>
			<td className="px-2 text-right">
				<QuoteChange quote={quote} />
			</td>
			<td className="px-2 text-right">
				<QuoteChangePct quote={quote} />
			</td>
			<td className="px-2 text-right">
				{halted ? dash : <UsageCell value={info.mem} />}
			</td>
			<td className="px-2 text-right">
				{halted ? dash : <UsageCell value={info.stg} />}
			</td>
			<td className="num px-2 text-right text-up">
				{halted ? dash : formatSpeed(info.up)}
			</td>
			<td className="num px-2 text-right text-down">
				{halted ? dash : formatSpeed(info.down)}
			</td>
			{showNetTransfer && (
				<td className="num whitespace-nowrap px-2 text-right text-[11px] leading-tight">
					{halted ? (
						dash
					) : (
						<>
							<span className="block text-up">
								↑{formatBytes(info.net_out_transfer)}
							</span>
							<span className="block text-down">
								↓{formatBytes(info.net_in_transfer)}
							</span>
						</>
					)}
				</td>
			)}
			<td className="num px-2 text-right text-muted-foreground">
				{halted ? dash : formatUptimeShort(info.uptime)}
			</td>
			<td className="px-2 py-1 text-right">
				<Sparkline
					values={quote.series}
					direction={quote.direction}
					className="ml-auto"
				/>
			</td>
		</tr>
	);
});

function UsageCell({ value }: { value: number }) {
	return (
		<span className="inline-flex flex-col items-end gap-0.5">
			<span className="num">{value.toFixed(1)}%</span>
			<span className="block h-0.5 w-12 overflow-hidden rounded-full bg-muted">
				<span
					className={cn("block h-full", usageLevelClass(value))}
					style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
				/>
			</span>
		</span>
	);
}

/** Right-hand pill content, cycled for all rows at once like 自选股 apps. */
type PillMode = "pct" | "change" | "mem";
const NEXT_MODE: Record<PillMode, PillMode> = {
	pct: "change",
	change: "mem",
	mem: "pct",
};

function QuoteRows({ servers, quotes, now }: WatchlistProps) {
	const { t } = useTranslation();
	const entering = useEntrance();
	const [mode, setMode] = useState<PillMode>("pct");
	const modeLabel =
		mode === "pct"
			? t("market.changePct")
			: mode === "change"
				? t("market.change")
				: t("market.mem");
	return (
		<div className="watchlist overflow-hidden rounded-md border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground">
				<span>{t("market.name")}</span>
				<span className="flex items-center gap-4">
					<span>{t("market.last")}</span>
					<button
						type="button"
						aria-label={t("market.cycleColumn")}
						className="min-w-[4.5rem] text-right text-highlight transition-press motion-safe:press"
						onClick={() => setMode(NEXT_MODE[mode])}
					>
						<span key={mode} className="anim-swap">
							{modeLabel}
						</span>{" "}
						⇄
					</button>
				</span>
			</div>
			<ul className={cn(entering && "stagger")}>
				{servers.map((server) => (
					<QuoteRow
						key={server.id}
						server={server}
						now={now}
						quote={quotes.get(server.id) ?? SUSPENDED_QUOTE}
						mode={mode}
						onCycle={() => setMode(NEXT_MODE[mode])}
					/>
				))}
			</ul>
		</div>
	);
}

const QuoteRow = memo(function QuoteRow({
	server,
	now,
	quote,
	mode,
	onCycle,
}: {
	server: NezhaServer;
	now: number;
	quote: Quote;
	mode: PillMode;
	onCycle: () => void;
}) {
	const linkClick = useServerLinkClick();
	const info = selectServerMetrics(now, server);
	const halted = quote.direction === "suspended";
	return (
		<li className="quote-row relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-border/60 px-3 py-2 transition-colors duration-(--dur-fast) last:border-0 has-[a:active]:bg-accent/60">
			<div className="min-w-0">
				{/* Stretched link: the whole row opens the detail page. */}
				<Link
					to={`/server/${server.id}`}
					onClick={(event) => linkClick(server.id, event)}
					onPointerDown={preloadServerDetail}
					data-vt-name
					className={cn(
						"block truncate text-sm font-semibold after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring",
						halted && "text-muted-foreground",
					)}
				>
					{info.name}
				</Link>
				<p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
					<ServerFlag country_code={info.country_code} />
					<span className="num">{stockCode(server.id)}</span>
				</p>
			</div>
			<Sparkline
				values={quote.series}
				direction={quote.direction}
				width={48}
				height={26}
				className="max-[359px]:hidden"
			/>
			<div className="flex items-center gap-2">
				<QuotePrice
					quote={quote}
					className="min-w-[3rem] text-right text-base font-semibold"
				/>
				<ChangePill
					quote={quote}
					mode={mode === "mem" ? "custom" : mode}
					extra={`${info.mem.toFixed(1)}%`}
					className="relative z-10"
					onClick={onCycle}
				/>
			</div>
		</li>
	);
});
