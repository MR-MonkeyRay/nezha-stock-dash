import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import { useRuntimeConfig } from "@/lib/runtime-config";
import { selectServerMetrics } from "@/lib/server-metrics";
import { cn, formatRelativeTime, formatTime } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import { HistoricalError } from "./HistoricalError";
import { QUOTE_GRID_PROPS, QUOTE_LINE_COLOR, QUOTE_TICK } from "./quote-chart";
import type { RealtimeSeries } from "./realtime-series";
export function ConnectChart({
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

	const { tcp, udp } = selectServerMetrics(now, data);

	const history = useMetricHistory(data.id, ["tcp_conn", "udp_conn"], period);
	const connectHistoricalData = combineMetricHistory(
		history.data,
		(timestamp, primary, secondary) => ({
			timeStamp: String(timestamp),
			tcp: primary,
			udp: secondary,
		}),
	);

	const chartConfig = {
		tcp: {
			label: "TCP",
		},
		udp: {
			label: "UDP",
		},
	} satisfies ChartConfig;

	const displayData =
		period === "realtime" ? series.connect : connectHistoricalData;
	const isConnectLoading = history.isLoading;

	return (
		<Card
			className={cn({
				"bg-card/70": customBackgroundImage,
			})}
		>
			<CardContent className="px-3 py-3 md:px-4">
				<section className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">{t("market.connections")}</p>
						<section className="num flex items-center gap-3 text-xs">
							<span className="flex items-center gap-1">
								<span
									aria-hidden="true"
									className="h-0.5 w-3"
									style={{ background: QUOTE_LINE_COLOR }}
								/>
								<span className="text-muted-foreground">TCP</span>
								<span className="font-semibold">{tcp}</span>
							</span>
							<span className="flex items-center gap-1">
								<span
									aria-hidden="true"
									className="h-0.5 w-3"
									style={{ background: "hsl(var(--ma-1))" }}
								/>
								<span className="text-muted-foreground">UDP</span>
								<span className="font-semibold">{udp}</span>
							</span>
						</section>
					</div>
					<HistoricalError status={history.status} />
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-[130px] w-full"
					>
						{isConnectLoading ? (
							<ChartSkeleton />
						) : (
							<LineChart
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
									interval="preserveStartEnd"
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
												const label = name === "tcp" ? "TCP" : "UDP";
												return (
													<div className="flex flex-1 items-center justify-between leading-none">
														<span className="text-muted-foreground">
															{label}
														</span>
														<span className="ml-2 font-medium text-foreground tabular-nums">
															{Number(value).toFixed(0)}
														</span>
													</div>
												);
											}}
										/>
									}
								/>
								<Line
									isAnimationActive={false}
									dataKey="tcp"
									type="linear"
									stroke={QUOTE_LINE_COLOR}
									strokeWidth={1.25}
									dot={false}
								/>
								<Line
									isAnimationActive={false}
									dataKey="udp"
									type="linear"
									stroke="hsl(var(--ma-1))"
									strokeWidth={1.25}
									dot={false}
								/>
							</LineChart>
						)}
					</ChartContainer>
				</section>
			</CardContent>
		</Card>
	);
}
