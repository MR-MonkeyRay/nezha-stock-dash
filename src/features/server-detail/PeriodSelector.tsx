import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveIndicator } from "@/hooks/use-active-indicator";
import type { ChartPeriod } from "@/hooks/use-metric-history";
import { cn } from "@/lib/utils";
export function PeriodSelector({
	selectedPeriod,
	onPeriodChange,
	isLogin,
	isTsdbEnabled,
}: {
	selectedPeriod: ChartPeriod;
	onPeriodChange: (period: ChartPeriod) => void;
	isLogin: boolean;
	isTsdbEnabled: boolean;
}) {
	const { t } = useTranslation();

	const periods = useMemo<{ value: ChartPeriod; label: string }[]>(
		() => [
			{ value: "realtime", label: t("serverDetailChart.realtime") },
			{ value: "1d", label: t("serverDetailChart.period1d") },
			{ value: "7d", label: t("serverDetailChart.period7d") },
			{ value: "30d", label: t("serverDetailChart.period30d") },
		],
		[t],
	);
	const periodValues = useMemo(
		() => periods.map((period) => period.value),
		[periods],
	);
	const { containerRef, enableIndicatorAnimation, indicator, setItemRef } =
		useActiveIndicator(periodValues, selectedPeriod);

	return (
		<TooltipProvider delayDuration={120}>
			<div
				ref={containerRef}
				className="relative mb-3 flex w-fit flex-wrap gap-0.5 rounded-sm border border-border bg-card p-0.5"
			>
				{indicator && (
					<div
						className="active-indicator-fade-in absolute left-0 top-0 z-10 rounded-sm bg-highlight"
						style={{
							height: indicator.height,
							transform: `translate(${indicator.x}px, ${indicator.y}px)`,
							transition: indicator.shouldAnimate
								? "transform 0.5s var(--timing), width 0.5s var(--timing), height 0.5s var(--timing)"
								: "none",
							width: indicator.width,
						}}
					/>
				)}
				{periods.map((period, index) => {
					const isHistoryPeriod = period.value !== "realtime";
					const isLockedByTsdb = !isTsdbEnabled && isHistoryPeriod;
					// Only realtime and 1d are available for non-logged-in users
					const isLockedByLogin =
						!isLockedByTsdb &&
						!isLogin &&
						period.value !== "realtime" &&
						period.value !== "1d";
					const isLocked = isLockedByTsdb || isLockedByLogin;

					const periodItem = (
						<div
							ref={setItemRef(index)}
							onClick={() => {
								if (!isLocked) {
									if (selectedPeriod !== period.value) {
										enableIndicatorAnimation();
									}
									onPeriodChange(period.value);
								}
							}}
							className={cn(
								"relative cursor-pointer rounded-sm px-3 py-1 text-xs font-medium transition-colors duration-300",
								selectedPeriod === period.value
									? "text-highlight-foreground"
									: "text-muted-foreground hover:text-foreground",
								isLocked && "cursor-not-allowed opacity-40 grayscale",
							)}
						>
							<div className="relative z-20 flex items-center gap-1.5">
								{period.value === "realtime" && (
									<span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-status-ok motion-reduce:animate-none"></span>
								)}
								{period.label}
							</div>
						</div>
					);

					if (isLockedByTsdb || isLockedByLogin) {
						return (
							<Tooltip key={period.value}>
								<TooltipTrigger asChild>{periodItem}</TooltipTrigger>
								<TooltipContent>
									{isLockedByTsdb
										? t(
												"serverDetailChart.tsdbRequired",
												"Enable TSDB to use historical data",
											)
										: t(
												"serverDetailChart.loginRequired",
												"Please login to view",
											)}
								</TooltipContent>
							</Tooltip>
						);
					}

					return <div key={period.value}>{periodItem}</div>;
				})}
			</div>
		</TooltipProvider>
	);
}
