import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import ChartSkeleton from "@/components/loading/ChartSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatSpeed } from "@/features/market/format";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import type { ChartPeriod } from "@/hooks/use-metric-history";
import {
	combineMetricHistory,
	useMetricHistory,
} from "@/hooks/use-metric-history";
import { selectServerMetrics } from "@/lib/server-metrics";
import { cn, formatRelativeTime, formatTime } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import { HistoricalError } from "./HistoricalError";
import { QUOTE_GRID_PROPS, QUOTE_TICK } from "./quote-chart";
import type { RealtimeSeries } from "./realtime-series";
export function NetworkChart({
	now,
	data,
	series,
	period,
}: {
	now: number;
	data: NezhaServer;
	series: RealtimeSeries;
	period: ChartPeriod;
}) {
	const { t } = useTranslation();

	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const { up, down } = selectServerMetrics(now, data);

	const history = useMetricHistory(
		data.id,
		["net_out_speed", "net_in_speed"],
		period,
	);
	const networkHistoricalData = combineMetricHistory(
		history.data,
		(timestamp, primary, secondary) => ({
			timeStamp: String(timestamp),
			upload: primary / 1024 / 1024,
			download: secondary / 1024 / 1024,
		}),
	);

	const displayData =
		period === "realtime" ? series.network : networkHistoricalData;
	const isNetworkLoading = history.isLoading;

	// 成交量-style mirrored bars: upload above the axis, download below it.
	const mirrored = useMemo(
		() =>
			displayData.map((item) => ({
				...item,
				downloadNeg: -item.download,
			})),
		[displayData],
	);
	const peak = Math.max(
		1,
		Math.ceil(
			Math.max(
				0,
				...displayData.map((item) => Math.max(item.upload, item.download)),
			),
		),
	);

	const chartConfig = {
		upload: {
			label: "Upload",
		},
		download: {
			label: "Download",
		},
	} satisfies ChartConfig;

	return (
		<Card
			className={cn({
				"bg-card/70": customBackgroundImage,
			})}
		>
			<CardContent className="px-3 py-3 md:px-4">
				<section className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">{t("market.volume")}</p>
						<section className="num flex items-center gap-3 text-xs">
							<span className="flex items-center gap-1">
								<span className="text-muted-foreground">
									↑{t("serverDetailChart.upload")}
								</span>
								<span className="font-semibold text-up">{formatSpeed(up)}</span>
							</span>
							<span className="flex items-center gap-1">
								<span className="text-muted-foreground">
									↓{t("serverDetailChart.download")}
								</span>
								<span className="font-semibold text-down">
									{formatSpeed(down)}
								</span>
							</span>
						</section>
					</div>
					<HistoricalError status={history.status} />
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[130px] w-full"
					>
						{isNetworkLoading ? (
							<ChartSkeleton />
						) : (
							<BarChart
								syncId="serverDetailCharts"
								syncMethod="value"
								accessibilityLayer
								data={mirrored}
								stackOffset="sign"
								barCategoryGap={1}
								margin={{
									top: 12,
									left: 12,
									right: 12,
								}}
							>
								<CartesianGrid {...QUOTE_GRID_PROPS} />
								<XAxis
									dataKey="timeStamp"
									tickLine={false}
									axisLine={false}
									tick={QUOTE_TICK}
									tickMargin={8}
									minTickGap={200}
									interval="preserveStartEnd"
									tickFormatter={(value) => formatRelativeTime(value)}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									mirror={true}
									tick={QUOTE_TICK}
									tickMargin={-15}
									type="number"
									minTickGap={30}
									interval="preserveStartEnd"
									domain={[-peak, peak]}
									tickFormatter={(value) => `${Math.abs(value).toFixed(0)}M/s`}
								/>
								<ReferenceLine y={0} stroke="hsl(var(--border))" />
								<ChartTooltip
									isAnimationActive={false}
									content={
										<ChartTooltipContent
											indicator="dot"
											labelFormatter={(_, payload) => {
												return formatTime(
													Number(payload[0]?.payload?.timeStamp),
												);
											}}
											formatter={(value, name) => {
												const label =
													name === "upload"
														? t("serverDetailChart.upload")
														: t("serverDetailChart.download");
												return (
													<div className="flex flex-1 items-center justify-between leading-none">
														<span className="text-muted-foreground">
															{label}
														</span>
														<span className="ml-2 font-medium text-foreground tabular-nums">
															{Math.abs(Number(value)).toFixed(2)} MB/s
														</span>
													</div>
												);
											}}
										/>
									}
								/>
								<Bar
									isAnimationActive={false}
									dataKey="upload"
									stackId="net"
									fill="hsl(var(--up))"
									fillOpacity={0.85}
									maxBarSize={6}
								/>
								<Bar
									isAnimationActive={false}
									dataKey="downloadNeg"
									name="download"
									stackId="net"
									fill="hsl(var(--down))"
									fillOpacity={0.85}
									maxBarSize={6}
								/>
							</BarChart>
						)}
					</ChartContainer>
				</section>
			</CardContent>
		</Card>
	);
}
