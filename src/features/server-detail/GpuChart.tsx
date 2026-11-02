import { useMemo } from "react";
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
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
import type { ChartPeriod } from "@/hooks/use-metric-history";
import { useHistoricalData } from "@/hooks/use-metric-history";
import { formatBytes } from "@/lib/format";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn, formatRelativeTime, formatTime } from "@/lib/utils";

import type { gpuChartData } from "./chart-types";
import { HistoricalError } from "./HistoricalError";
import {
	QUOTE_AVG_COLOR,
	QUOTE_GRID_PROPS,
	QUOTE_LINE_COLOR,
	QUOTE_TICK,
	withRunningAverage,
} from "./quote-chart";
import type { RealtimeSeries } from "./realtime-series";
export function GpuChart({
	id,
	index,
	gpuStat,
	gpuName,
	gpuMemory,
	series,
	period,
}: {
	id: number;
	index: number;
	gpuStat: number;
	gpuName?: string;
	gpuMemory?: { memory_used?: number; memory_total?: number };
	series: RealtimeSeries;
	period: ChartPeriod;
}) {
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const transformGpuData = useMemo(
		() => (timestamp: number, value: number) => ({
			timeStamp: timestamp.toString(),
			gpu: value,
		}),
		[],
	);

	const {
		displayData: gpuHistoricalData,
		isLoading,
		status,
	} = useHistoricalData<gpuChartData>(id, "gpu", period, transformGpuData);

	const chartConfig = {
		gpu: {
			label: "GPU",
		},
		avg: {
			label: "Avg",
		},
	} satisfies ChartConfig;

	const rawData =
		period === "realtime" ? (series.gpu[index] ?? []) : gpuHistoricalData;
	const displayData = useMemo(
		() => withRunningAverage(rawData, "gpu", "avg"),
		[rawData],
	);

	return (
		<Card
			className={cn({
				"bg-card/70": customBackgroundImage,
			})}
		>
			<CardContent className="px-3 py-3 md:px-4">
				<section className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<section className="flex min-w-0 flex-col">
							{!gpuName && <p className="text-sm font-medium">GPU</p>}
							{gpuName && (
								<p className="truncate text-sm font-medium">GPU: {gpuName}</p>
							)}
							{gpuMemory?.memory_total ? (
								<p className="num text-xs text-muted-foreground">
									{gpuMemory.memory_used != null
										? formatBytes(gpuMemory.memory_used * 1024 * 1024)
										: "—"}{" "}
									/ {formatBytes(gpuMemory.memory_total * 1024 * 1024)}
								</p>
							) : null}
						</section>
						<section className="num flex shrink-0 items-center gap-3 text-xs">
							<span className="flex items-center gap-1">
								<span
									aria-hidden="true"
									className="h-0.5 w-3"
									style={{ background: QUOTE_LINE_COLOR }}
								/>
								<span className="font-semibold">{gpuStat.toFixed(2)}%</span>
							</span>
							<span className="flex items-center gap-1 text-muted-foreground">
								<span
									aria-hidden="true"
									className="h-0.5 w-3"
									style={{ background: QUOTE_AVG_COLOR }}
								/>
								{displayData.length > 0 &&
								displayData[displayData.length - 1].avg !== null
									? `${Number(displayData[displayData.length - 1].avg).toFixed(2)}%`
									: "--"}
							</span>
						</section>
					</div>
					<HistoricalError status={status} />
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[130px] w-full"
					>
						{isLoading ? (
							<ChartSkeleton />
						) : (
							<ComposedChart
								syncId="serverDetailCharts"
								syncMethod="value"
								accessibilityLayer
								data={displayData}
								margin={{
									top: 12,
									left: 12,
									right: 12,
								}}
							>
								<defs>
									<linearGradient
										id={`gpu${index}Fill`}
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="0%"
											stopColor={QUOTE_LINE_COLOR}
											stopOpacity={0.25}
										/>
										<stop
											offset="100%"
											stopColor={QUOTE_LINE_COLOR}
											stopOpacity={0.02}
										/>
									</linearGradient>
								</defs>
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
									domain={[0, 100]}
									tickFormatter={(value) => `${value}%`}
								/>
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
											formatter={(value, name) => (
												<div className="flex flex-1 items-center justify-between leading-none">
													<span className="text-muted-foreground">
														{name === "avg" ? "Avg" : "GPU"}
													</span>
													<span className="ml-2 font-medium text-foreground tabular-nums">
														{Number(value).toFixed(1)}%
													</span>
												</div>
											)}
										/>
									}
								/>
								<Area
									isAnimationActive={false}
									dataKey="gpu"
									type="linear"
									fill={`url(#gpu${index}Fill)`}
									fillOpacity={1}
									stroke={QUOTE_LINE_COLOR}
									strokeWidth={1.25}
								/>
								<Line
									isAnimationActive={false}
									dataKey="avg"
									type="linear"
									dot={false}
									stroke={QUOTE_AVG_COLOR}
									strokeWidth={1}
									connectNulls
								/>
							</ComposedChart>
						)}
					</ChartContainer>
				</section>
			</CardContent>
		</Card>
	);
}
