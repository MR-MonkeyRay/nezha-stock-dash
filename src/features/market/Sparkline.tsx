import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { directionTextClass } from "./direction";
import type { Direction } from "./quote-series";

type SparklineProps = {
	values: readonly number[];
	direction: Direction;
	width?: number;
	height?: number;
	/** Fixed 0..100 domain for percentages; otherwise auto-scaled to the data. */
	domain?: "percent" | "auto";
	/** Draws the baseline (first sample) as a dashed reference, like 昨收. */
	showBase?: boolean;
	/** Marks the latest sample with a pulsing dot. Keep it to a few instances. */
	live?: boolean;
	className?: string;
};

/** Builds the polyline path once per data change. Exported for tests. */
export function buildSparklinePoints(
	values: readonly number[],
	width: number,
	height: number,
	domain: "percent" | "auto",
) {
	if (values.length === 0) return { points: "", baseY: height / 2, last: null };
	let min = domain === "percent" ? 0 : Math.min(...values);
	let max = domain === "percent" ? 100 : Math.max(...values);
	if (domain === "auto") {
		// Keep a flat line centered instead of dividing by zero.
		const pad = Math.max((max - min) * 0.1, 0.5);
		min -= pad;
		max += pad;
	}
	const span = max - min || 1;
	const step = values.length > 1 ? width / (values.length - 1) : 0;
	const y = (value: number) =>
		Math.round((height - ((value - min) / span) * height) * 100) / 100;
	const x = (index: number) =>
		values.length > 1 ? Math.round(index * step * 100) / 100 : width;
	const points = values
		.map((value, index) => `${x(index)},${y(value)}`)
		.join(" ");
	const lastIndex = values.length - 1;
	return {
		points,
		baseY: y(values[0]),
		last: { x: x(lastIndex), y: y(values[lastIndex]) },
	};
}

/** Lightweight inline-SVG 分时 line; no chart library so long lists stay cheap. */
export const Sparkline = memo(function Sparkline({
	values,
	direction,
	width = 80,
	height = 24,
	domain = "auto",
	showBase = true,
	live = false,
	className,
}: SparklineProps) {
	const { points, baseY, last } = useMemo(
		() => buildSparklinePoints(values, width, height, domain),
		[values, width, height, domain],
	);
	const suspended = direction === "suspended" || values.length === 0;
	const ping = live && !suspended && last;
	const svg = (
		<svg
			aria-hidden="true"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={cn("shrink-0 overflow-visible", ping ? "block" : className)}
			data-testid="sparkline"
		>
			{suspended ? (
				<line
					x1={0}
					x2={width}
					y1={height / 2}
					y2={height / 2}
					className="stroke-suspended"
					strokeDasharray="2 3"
					strokeWidth={1}
				/>
			) : (
				<>
					{showBase && (
						<line
							x1={0}
							x2={width}
							y1={baseY}
							y2={baseY}
							className="stroke-chart-grid"
							strokeDasharray="2 2"
							strokeWidth={1}
						/>
					)}
					<polyline
						points={points}
						pathLength={1}
						fill="none"
						stroke="currentColor"
						strokeWidth={1.25}
						strokeLinejoin="round"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
						className={cn("spark-draw", directionTextClass(direction))}
					/>
					{ping && (
						<circle
							cx={ping.x}
							cy={ping.y}
							r={2}
							fill="currentColor"
							className={directionTextClass(direction)}
						/>
					)}
				</>
			)}
		</svg>
	);
	if (!ping) return svg;
	// The expanding ring is an HTML layer, not an SVG circle: CSS transforms on
	// SVG are not composited, and an infinite main-thread animation costs a
	// full frame (style, paint, commit) 60 times a second on large dashboards.
	return (
		<span className={cn("relative shrink-0", className)}>
			{svg}
			<span
				aria-hidden="true"
				data-testid="live-dot"
				className={cn(
					"live-ping pointer-events-none absolute size-[5px] rounded-full bg-current",
					directionTextClass(direction),
				)}
				style={{ left: ping.x - 2.5, top: ping.y - 2.5 }}
			/>
		</span>
	);
});
