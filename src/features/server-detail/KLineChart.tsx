import { useQuery } from "@tanstack/react-query";
import {
	CandlestickSeries,
	ColorType,
	CrosshairMode,
	createChart,
	HistogramSeries,
	type IChartApi,
	type ISeriesApi,
	LineSeries,
	type MouseEventParams,
	type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ChartSkeleton from "@/components/loading/ChartSkeleton";
import { Card } from "@/components/ui/card";
import { directionTextClass, formatSigned } from "@/features/market/direction";
import { useLoginUser } from "@/hooks/use-login-user";
import { useMetricHistory } from "@/hooks/use-metric-history";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { formatBytes } from "@/lib/format";
import { fetchSetting } from "@/lib/nezha-api";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";
import type { MetricPeriod, MetricType } from "@/types/nezha-api";
import {
	bucketCandles,
	bucketVolume,
	type Candle,
	candleDirection,
	movingAverage,
	pickBucketMs,
	toChartTime,
} from "./candles";
import { HistoricalError } from "./HistoricalError";
import { readChartPalette } from "./theme-color";

type KMetric = "cpu" | "memory" | "load1";
const METRIC_TYPE: Record<KMetric, MetricType> = {
	cpu: "cpu",
	memory: "memory",
	load1: "load1",
};
const PERIODS: MetricPeriod[] = ["1d", "7d", "30d"];
const MA_WINDOWS = [5, 10, 20] as const;

/** Re-renders when <html> class (dark/light) or data-price-color changes. */
function useThemeVersion() {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		const observer = new MutationObserver(() => setVersion((v) => v + 1));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-price-color"],
		});
		return () => observer.disconnect();
	}, []);
	return version;
}

export type KLineData = {
	candles: Candle[];
	volume: Map<number, number>;
	ma: { window: number; points: { start: number; value: number }[] }[];
	bucketMs: number;
};

/** Pure projection from metric histories into K-line data. Exported for tests. */
export function buildKLineData(
	period: MetricPeriod,
	primary: { ts: number; value: number }[],
	network: { ts: number; value: number }[][],
	scale: (value: number) => number = (value) => value,
): KLineData {
	const points = primary.map((point) => ({
		ts: point.ts,
		value: scale(point.value),
	}));
	const bucketMs = pickBucketMs(period, points);
	const candles = bucketCandles(points, bucketMs);
	return {
		candles,
		volume: bucketVolume(network, bucketMs),
		ma: MA_WINDOWS.map((window) => ({
			window,
			points: movingAverage(candles, window),
		})),
		bucketMs,
	};
}

/** 日K-style candlestick chart of a metric's history with MA lines and a volume pane. */
export function KLineChart({ server_id }: { server_id: number }) {
	const { t, i18n } = useTranslation();
	const { isAuthenticated: isLogin } = useLoginUser();
	const { lastData } = useWebSocketContext();
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();
	const { data: settingData } = useQuery({
		queryKey: ["setting"],
		queryFn: () => fetchSetting(),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});
	const tsdbEnabled = settingData?.data?.tsdb_enabled ?? true;
	const [period, setPeriod] = useState<MetricPeriod>("1d");
	const [metric, setMetric] = useState<KMetric>("cpu");
	const effectivePeriod: MetricPeriod = isLogin ? period : "1d";

	const history = useMetricHistory(
		server_id,
		[METRIC_TYPE[metric], "net_in_speed", "net_out_speed"],
		tsdbEnabled ? effectivePeriod : "realtime",
	);

	const memTotal =
		lastData?.servers.find((server) => server.id === server_id)?.host
			.mem_total ?? 0;
	const kline = useMemo(() => {
		if (history.status !== "success") return null;
		const [primary = [], netIn = [], netOut = []] = history.data;
		const scale =
			metric === "memory" && memTotal > 0
				? (value: number) => (value / memTotal) * 100
				: undefined;
		return buildKLineData(effectivePeriod, primary, [netIn, netOut], scale);
	}, [history.status, history.data, metric, memTotal, effectivePeriod]);

	const metricLabels: Record<KMetric, string> = {
		cpu: "CPU",
		memory: t("market.mem"),
		load1: `${t("market.load")} 1m`,
	};
	const unit = metric === "load1" ? "" : "%";

	if (!tsdbEnabled) {
		return (
			<Card className="p-6 text-center text-sm text-muted-foreground">
				{t(
					"serverDetailChart.tsdbRequired",
					"Enable TSDB to use historical data",
				)}
			</Card>
		);
	}

	return (
		<Card
			className={cn("flex flex-col gap-2 p-3 md:p-4", {
				"bg-card/70": customBackgroundImage,
			})}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div role="tablist" className="flex items-center gap-1 text-xs">
					{(Object.keys(metricLabels) as KMetric[]).map((item) => (
						<button
							key={item}
							type="button"
							role="tab"
							aria-selected={metric === item}
							onClick={() => setMetric(item)}
							className={cn(
								"rounded-sm px-2 py-1",
								metric === item
									? "bg-highlight text-highlight-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{metricLabels[item]}
						</button>
					))}
				</div>
				<div className="flex items-center gap-1 text-xs">
					{PERIODS.map((item) => {
						const locked = !isLogin && item !== "1d";
						return (
							<button
								key={item}
								type="button"
								disabled={locked}
								title={
									locked
										? t(
												"serverDetailChart.loginRequired",
												"Please login to view",
											)
										: undefined
								}
								onClick={() => setPeriod(item)}
								className={cn(
									"rounded-sm border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40",
									effectivePeriod === item
										? "border-highlight text-highlight"
										: "border-border text-muted-foreground hover:text-foreground",
								)}
							>
								{t(`serverDetailChart.period${item}`)}
							</button>
						);
					})}
				</div>
			</div>
			<HistoricalError status={history.status} />
			{history.isLoading || !kline ? (
				<div className="h-[360px] md:h-[440px]">
					{history.isLoading && <ChartSkeleton />}
				</div>
			) : kline.candles.length === 0 ? (
				<p className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
					{t("monitor.noData", "No data")}
				</p>
			) : (
				<KLineCanvas
					data={kline}
					unit={unit}
					locale={i18n.language}
					maLabel={(window) => `MA${window}`}
					volumeLabel={t("market.volume")}
					labels={{
						open: t("market.open"),
						high: t("market.high"),
						low: t("market.low"),
						close: t("market.close"),
						change: t("market.change"),
					}}
				/>
			)}
		</Card>
	);
}

function KLineCanvas({
	data,
	unit,
	locale,
	maLabel,
	volumeLabel,
	labels,
}: {
	data: KLineData;
	unit: string;
	locale: string;
	maLabel: (window: number) => string;
	volumeLabel: string;
	labels: Record<"open" | "high" | "low" | "close" | "change", string>;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<{
		candles: ISeriesApi<"Candlestick">;
		volume: ISeriesApi<"Histogram">;
		ma: ISeriesApi<"Line">[];
	} | null>(null);
	const themeVersion = useThemeVersion();
	const lastCandle = data.candles[data.candles.length - 1];
	const [hovered, setHovered] = useState<Candle | undefined>(undefined);
	const byTime = useMemo(
		() =>
			new Map(
				data.candles.map((candle) => [toChartTime(candle.start), candle]),
			),
		[data.candles],
	);
	const intraday = data.bucketMs < 24 * 3_600_000;
	const byTimeRef = useRef(byTime);
	byTimeRef.current = byTime;

	// Create once; tear down on unmount.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const chart = createChart(container, {
			autoSize: true,
			crosshair: { mode: CrosshairMode.Normal },
			rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.05 } },
			timeScale: { rightOffset: 2, borderVisible: true },
			// Let vertical swipes scroll the page on phones; pinch and horizontal
			// drag still zoom and pan the chart.
			handleScroll: { vertTouchDrag: false },
			localization: { locale },
		});
		const candles = chart.addSeries(CandlestickSeries, {
			priceLineVisible: true,
			priceFormat: { type: "price", precision: 2, minMove: 0.01 },
		});
		const ma = MA_WINDOWS.map(() =>
			chart.addSeries(LineSeries, {
				lineWidth: 1,
				priceLineVisible: false,
				lastValueVisible: false,
				crosshairMarkerVisible: false,
			}),
		);
		const volume = chart.addSeries(
			HistogramSeries,
			{
				priceFormat: { type: "volume" },
				priceLineVisible: false,
				lastValueVisible: false,
			},
			1,
		);
		chart.panes()[0]?.setStretchFactor(3);
		chart.panes()[1]?.setStretchFactor(1);
		chartRef.current = chart;
		seriesRef.current = { candles, volume, ma };

		const onMove = (param: MouseEventParams) => {
			const time = typeof param.time === "number" ? param.time : undefined;
			setHovered(time === undefined ? undefined : byTimeRef.current.get(time));
		};
		chart.subscribeCrosshairMove(onMove);
		return () => {
			chart.unsubscribeCrosshairMove(onMove);
			chart.remove();
			chartRef.current = null;
			seriesRef.current = null;
		};
	}, [locale]);

	// Colors follow dark/light and 涨跌颜色; data follows the query.
	useEffect(() => {
		const chart = chartRef.current;
		const series = seriesRef.current;
		if (!chart || !series) return;
		void themeVersion;
		const palette = readChartPalette();
		chart.applyOptions({
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: palette.text,
				fontFamily:
					'"DIN Alternate","Roboto Mono","SF Mono",ui-monospace,monospace',
				panes: { separatorColor: palette.border },
			},
			grid: {
				vertLines: { color: palette.grid, style: 2 },
				horzLines: { color: palette.grid, style: 2 },
			},
			rightPriceScale: { borderColor: palette.border },
			timeScale: {
				borderColor: palette.border,
				timeVisible: intraday,
				secondsVisible: false,
			},
			crosshair: {
				vertLine: {
					color: palette.crosshair,
					labelBackgroundColor: palette.border,
				},
				horzLine: {
					color: palette.crosshair,
					labelBackgroundColor: palette.border,
				},
			},
		});
		series.candles.applyOptions({
			upColor: palette.up,
			downColor: palette.down,
			borderUpColor: palette.up,
			borderDownColor: palette.down,
			wickUpColor: palette.up,
			wickDownColor: palette.down,
		});
		series.ma.forEach((line, index) => {
			line.applyOptions({ color: palette.ma[index] });
		});

		series.candles.setData(
			data.candles.map((candle) => ({
				time: toChartTime(candle.start) as UTCTimestamp,
				open: candle.open,
				high: candle.high,
				low: candle.low,
				close: candle.close,
			})),
		);
		series.volume.setData(
			data.candles.map((candle) => {
				const direction = candleDirection(candle);
				return {
					time: toChartTime(candle.start) as UTCTimestamp,
					value: data.volume.get(candle.start) ?? 0,
					color:
						direction === "up"
							? palette.up
							: direction === "down"
								? palette.down
								: palette.flat,
				};
			}),
		);
		data.ma.forEach(({ points }, index) => {
			series.ma[index]?.setData(
				points.map((point) => ({
					time: toChartTime(point.start) as UTCTimestamp,
					value: point.value,
				})),
			);
		});
		chart.timeScale().fitContent();
	}, [data, themeVersion, intraday]);

	const shown = hovered ?? lastCandle;
	const change = shown ? shown.close - shown.open : null;
	const direction = shown ? candleDirection(shown) : "flat";
	const maValues = data.ma.map(({ window, points }) => {
		const point = shown
			? points.find((item) => item.start === shown.start)
			: undefined;
		return { window, value: point?.value };
	});
	const fmt = (value: number) => `${value.toFixed(2)}${unit}`;

	return (
		<div className="flex flex-col gap-1">
			{shown && (
				<div className="num flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
					<span className="text-muted-foreground">
						{new Date(shown.start).toLocaleString(locale, {
							month: "2-digit",
							day: "2-digit",
							hour: intraday ? "2-digit" : undefined,
							minute: intraday ? "2-digit" : undefined,
						})}
					</span>
					{(["open", "high", "low", "close"] as const).map((key) => (
						<span key={key}>
							<span className="text-muted-foreground">{labels[key]} </span>
							<span className={directionTextClass(direction)}>
								{fmt(shown[key])}
							</span>
						</span>
					))}
					<span>
						<span className="text-muted-foreground">{labels.change} </span>
						<span className={directionTextClass(direction)}>
							{formatSigned(change)}
						</span>
					</span>
					{maValues.map(({ window, value }, index) => (
						<span key={window} className={`text-ma-${index + 1}`}>
							{maLabel(window)} {value === undefined ? "--" : value.toFixed(2)}
						</span>
					))}
					<span className="text-muted-foreground">
						{volumeLabel} {formatBytes(data.volume.get(shown.start) ?? 0)}/s
					</span>
				</div>
			)}
			<div
				ref={containerRef}
				data-testid="kline-chart"
				className="anim-fade h-[360px] w-full md:h-[440px]"
			/>
		</div>
	);
}
