import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
	directionGlyph,
	directionPillClass,
	directionTextClass,
	formatPrice,
	formatSigned,
	formatSignedPct,
} from "./direction";
import type { Direction, Quote } from "./quote-series";
import { useTickFlash } from "./use-tick-flash";

/** Screen-reader text so color and glyphs are never the only cue. */
export function useDirectionLabel() {
	const { t } = useTranslation();
	return (direction: Direction) =>
		direction === "up"
			? t("market.rising")
			: direction === "down"
				? t("market.falling")
				: direction === "flat"
					? t("market.flat")
					: t("market.suspended");
}

/** Price ("现价") colored by direction; "--" while halted. Flashes on each tick. */
export function QuotePrice({
	quote,
	digits = 2,
	suffix = "",
	className,
}: {
	quote: Quote;
	digits?: number;
	suffix?: string;
	className?: string;
}) {
	const flash = useTickFlash(quote.last);
	return (
		<span
			className={cn(
				"num",
				flash.direction && "tick-flash",
				directionTextClass(quote.direction),
				className,
			)}
			data-flash={flash.direction ?? undefined}
			data-flash-parity={flash.direction ? flash.parity : undefined}
		>
			{formatPrice(quote.last, digits)}
			{quote.last !== null && suffix}
		</span>
	);
}

/** "▲ +1.20" — change in percentage points. */
export function QuoteChange({
	quote,
	digits = 2,
	glyph = true,
	className,
}: {
	quote: Quote;
	digits?: number;
	glyph?: boolean;
	className?: string;
}) {
	const label = useDirectionLabel();
	if (quote.direction === "suspended") {
		return <span className={cn("num text-suspended", className)}>--</span>;
	}
	return (
		<span
			className={cn(
				"num inline-flex items-center gap-0.5 whitespace-nowrap",
				directionTextClass(quote.direction),
				className,
			)}
		>
			<span className="sr-only">{label(quote.direction)}</span>
			{glyph && quote.change !== null && (
				<span aria-hidden="true" className="text-[0.8em]">
					{directionGlyph(quote.direction)}
				</span>
			)}
			{formatSigned(quote.change, digits)}
		</span>
	);
}

/** "+2.32%" as plain colored text. */
export function QuoteChangePct({
	quote,
	className,
}: {
	quote: Quote;
	className?: string;
}) {
	if (quote.direction === "suspended") {
		return <span className={cn("num text-suspended", className)}>--</span>;
	}
	return (
		<span
			className={cn(
				"num whitespace-nowrap",
				directionTextClass(quote.direction),
				className,
			)}
		>
			{formatSignedPct(quote.changePct)}
		</span>
	);
}

/** Solid 涨跌幅 pill like watchlists; 停牌 for halted servers. */
export function ChangePill({
	quote,
	mode = "pct",
	extra,
	className,
	onClick,
}: {
	quote: Quote;
	/** pct = 涨跌幅, change = 涨跌 (pp), custom = render `extra`. */
	mode?: "pct" | "change" | "custom";
	extra?: string;
	className?: string;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
	const { t } = useTranslation();
	const label = useDirectionLabel();
	const halted = quote.direction === "suspended";
	const text = halted
		? t("market.suspended")
		: mode === "custom"
			? (extra ?? "--")
			: mode === "change"
				? formatSigned(quote.change)
				: formatSignedPct(quote.changePct);
	const content = (
		<>
			{!halted && <span className="sr-only">{label(quote.direction)} </span>}
			{/* Re-keyed per mode so cycling 涨跌幅 → 涨跌 → 内存 slides the new value in. */}
			<span key={mode} className={onClick ? "anim-swap" : undefined}>
				{text}
			</span>
		</>
	);
	const classes = cn(
		"num inline-flex min-w-[4.5rem] items-center justify-center rounded-sm px-1.5 py-1 text-[13px] font-semibold leading-none",
		mode === "custom" && !halted
			? "bg-muted text-foreground"
			: directionPillClass(quote.direction),
		className,
	);
	return onClick ? (
		<button
			type="button"
			className={cn(
				classes,
				// Colors snap like a terminal; only the press scale animates.
				"transition-[scale] duration-(--dur-fast) motion-safe:press",
			)}
			onClick={onClick}
		>
			{content}
		</button>
	) : (
		<span className={classes}>{content}</span>
	);
}
