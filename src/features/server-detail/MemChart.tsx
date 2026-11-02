import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import ChartSkeleton from "@/components/loading/ChartSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartPeriod } from "@/hooks/use-metric-history";
import {
	combineMetricHistory,
	useMetricHistory,
} from "@/hooks/use-metric-history";
import { formatBytes } from "@/lib/format";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { selectServerMetrics } from "@/lib/server-metrics";
import { cn, formatRelativeTime, formatTime } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import { HistoricalError } from "./HistoricalError";
import { QUOTE_GRID_PROPS, QUOTE_LINE_COLOR, QUOTE_TICK } from "./quote-chart";
import type { RealtimeSeries } from "./realtime-series";
export function MemChart({
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

	const { mem, swap } = selectServerMetrics(now, data);

	const history = useMetricHistory(data.id, ["memory", "swap"], period);
	const memHistoricalData = combineMetricHistory(
		history.data,
		(timestamp, primary, secondary) => ({
			timeStamp: String(timestamp),
			mem: data.host.mem_total > 0 ? (primary / data.host.mem_total) * 100 : 0,
			swap:
				data.host.swap_total > 0 ? (secondary / data.host.swap_total) * 100 : 0,
		}),
	);

	const chartConfig = {
		mem: {
			label: "Mem",
		},
		swap: {
			label: "Swap",
		},
	} satisfies ChartConfig;

	const displayData = period === "realtime" ? series.mem : memHistoricalData;
	const isMemLoading = history.isLoading;

	return (
		<Card
			className={cn({
				"bg-card/70": customBackgroundImage,
			})}
		>
			<CardContent className="px-3 py-3 md:px-4">
				<section className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<section className="num flex items-center gap-3 text-xs">
							<p className="font-sans text-sm font-medium">
								{t("serverDetailChart.mem")}
							</p>
							<span className="flex items-center gap-1">
								<span
									aria-hidden="true"
									className="h-0.5 w-3"
									style={{ background: QUOTE_LINE_COLOR }}
								/>
								<span className="font-semibold">{mem.toFixed(0)}%</span>
							</span>
							<span className="flex items-center gap-1">
								<span
									aria-hidden="true"
									className="h-0.5 w-3"
									style={{ background: "hsl(var(--ma-1))" }}
								/>
								<span className="text-muted-foreground">
									{t("serverDetailChart.swap")}
								</span>
								<span className="font-semibold">{swap.toFixed(0)}%</span>
							</span>
						</section>
						<section className="num flex flex-col items-end text-[11px] text-muted-foreground">
							<div>
								{formatBytes(data.state.mem_used)} /{" "}
								{formatBytes(data.host.mem_total)}
							</div>
							<div>
								{data.host.swap_total ? (
									<>
										swap: {formatBytes(data.state.swap_used)} /{" "}
										{formatBytes(data.host.swap_total)}
									</>
								) : (
									<>no swap</>
								)}
							</div>
						</section>
					</div>
					<HistoricalError status={history.status} />
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[130px] w-full"
					>
						{isMemLoading ? (
							<ChartSkeleton />
						) : (
							<AreaChart
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
									<linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
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
									<linearGradient id="swapFill" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="0%"
											stopColor={"hsl(var(--ma-1))"}
											stopOpacity={0.25}
										/>
										<stop
											offset="100%"
											stopColor={"hsl(var(--ma-1))"}
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
											formatter={(value, name) => {
												const label =
													name === "mem"
														? t("serverDetailChart.mem")
														: t("serverDetailChart.swap");
												return (
													<div className="flex flex-1 items-center justify-between leading-none">
														<span className="text-muted-foreground">
															{label}
														</span>
														<span className="ml-2 font-medium text-foreground tabular-nums">
															{Number(value).toFixed(1)}%
														</span>
													</div>
												);
											}}
										/>
									}
								/>
								<Area
									isAnimationActive={false}
									dataKey="mem"
									type="linear"
									fill="url(#memFill)"
									fillOpacity={1}
									stroke={QUOTE_LINE_COLOR}
									strokeWidth={1.25}
								/>
								<Area
									isAnimationActive={false}
									dataKey="swap"
									type="linear"
									fill="url(#swapFill)"
									fillOpacity={1}
									stroke={"hsl(var(--ma-1))"}
									strokeWidth={1.25}
								/>
							</AreaChart>
						)}
					</ChartContainer>
				</section>
			</CardContent>
		</Card>
	);
}
