import { memo, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import useTooltip from "@/hooks/use-tooltip";
import { selectServerMetrics } from "@/lib/server-metrics";
import { cn } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import MapTooltip from "./MapTooltip";
import worldMap from "./map/world-map.json";

/** [ISO alpha-2, SVG path, centroid x, centroid y], precomputed by
 * scripts/build-world-map.js for a fixed width × height viewBox. */
type CountryOutline = [code: string, d: string, cx: number, cy: number];

const { width: MAP_WIDTH, height: MAP_HEIGHT } = worldMap;
const OUTLINES = worldMap.countries as unknown as CountryOutline[];
const MARKERS = worldMap.markers as unknown as Record<
	string,
	[x: number, y: number]
>;

type TooltipServer = {
	id: number;
	name: string;
	status: boolean;
};

export default function GlobalMap({
	serverList,
	now,
}: {
	serverList: NezhaServer[];
	now: number;
}) {
	const { t } = useTranslation();
	const countryServers = useMemo(() => {
		const byCountry: Record<string, TooltipServer[]> = {};
		for (const server of serverList) {
			if (!server.country_code) continue;
			const code = server.country_code.toUpperCase();
			byCountry[code] ??= [];
			byCountry[code].push({
				id: server.id,
				name: server.name,
				status: selectServerMetrics(now, server).online,
			});
		}
		return byCountry;
	}, [now, serverList]);

	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	return (
		<section
			className={cn("mt-8 flex flex-col gap-4", {
				"rounded-lg bg-card/70 p-4": customBackgroundImage,
			})}
		>
			<p className="text-sm font-medium opacity-40">
				{t("map.Distributions")} {Object.keys(countryServers).length}{" "}
				{t("map.Regions")}
			</p>
			<InteractiveMap countryServers={countryServers} />
		</section>
	);
}

type EnterHandler = (code: string | null, x: number, y: number) => void;

/** Outlines only change when the set of countries with servers changes, so
 * websocket ticks never re-render the 177 country paths. */
const CountryLayer = memo(function CountryLayer({
	highlighted,
	onEnter,
}: {
	highlighted: string;
	onEnter: EnterHandler;
}) {
	const codes = new Set(highlighted.split(","));
	return OUTLINES.map(([code, d, cx, cy]) =>
		codes.has(code) ? (
			<path
				key={code}
				data-code={code}
				d={d}
				className="cursor-pointer fill-chart-line/70 transition-colors hover:fill-highlight"
				onMouseEnter={() => onEnter(code, cx, cy)}
			/>
		) : (
			<path
				key={code}
				data-code={code}
				d={d}
				className="fill-muted stroke-border stroke-[0.5]"
				onMouseEnter={() => onEnter(null, cx, cy)}
			/>
		),
	);
});

export function InteractiveMap({
	countryServers,
}: {
	countryServers: Record<string, TooltipServer[]>;
}) {
	const { setTooltipData } = useTooltip();
	const countries = Object.keys(countryServers).sort();

	// Hover reads the latest servers without re-creating the handler, so the
	// memoized outline layer survives data ticks.
	const latest = useRef(countryServers);
	latest.current = countryServers;
	const handleEnter = useCallback<EnterHandler>(
		(code, x, y) => {
			const servers = code ? latest.current[code] : undefined;
			setTooltipData(
				code && servers
					? {
							centroid: [x, y],
							country: code,
							code,
							count: servers.length,
							servers,
						}
					: null,
			);
		},
		[setTooltipData],
	);

	return (
		<div
			className="relative aspect-9/5 w-full"
			onMouseLeave={() => setTooltipData(null)}
		>
			<svg
				viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
				xmlns="http://www.w3.org/2000/svg"
				className="size-full"
				aria-hidden="true"
			>
				{/* Background rect clears the tooltip over empty areas. */}
				<rect
					width={MAP_WIDTH}
					height={MAP_HEIGHT}
					fill="transparent"
					onMouseEnter={() => setTooltipData(null)}
				/>
				<CountryLayer highlighted={countries.join(",")} onEnter={handleEnter} />
				{countries.map((code) => {
					const point = MARKERS[code];
					if (!point) return null;
					const [x, y] = point;
					return (
						<circle
							key={code}
							cx={x}
							cy={y}
							r={4}
							className="cursor-pointer fill-chart-line/70 stroke-border transition-colors hover:fill-highlight"
							onMouseEnter={() => handleEnter(code, x, y)}
						/>
					);
				})}
			</svg>
			<MapTooltip width={MAP_WIDTH} height={MAP_HEIGHT} />
		</div>
	);
}
