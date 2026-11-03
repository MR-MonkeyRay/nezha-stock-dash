import type React from "react";
import { useTranslation } from "react-i18next";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { cn } from "@/lib/utils";

import { Separator } from "./ui/separator";

interface ServiceTrackerProps {
	days: Array<{
		completed: boolean;
		date?: Date;
		uptime: number;
		delay: number;
	}>;
	className?: string;
	title?: string;
	uptime?: number;
	avgDelay?: number;
}

export const ServiceTrackerClient: React.FC<ServiceTrackerProps> = ({
	days,
	className,
	title,
	uptime = 100,
	avgDelay = 0,
}) => {
	const { t } = useTranslation();
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const getUptimeColor = (uptime: number) => {
		if (uptime >= 99) return "text-status-ok";
		if (uptime >= 95) return "text-status-warn";
		return "text-status-bad";
	};

	const getDelayColor = (delay: number) => {
		if (delay < 100) return "text-status-ok";
		if (delay < 300) return "text-status-warn";
		return "text-status-bad";
	};

	const getStatusColor = (uptime: number) => {
		if (uptime >= 99) return "bg-status-ok";
		if (uptime >= 95) return "bg-status-warn";
		return "bg-status-bad";
	};

	return (
		<div
			className={cn(
				"w-full space-y-3 px-4 py-4 rounded-md border bg-card text-card-foreground shadow-none",
				className,
				{
					"bg-card/70": customBackgroundImage,
				},
			)}
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"w-2.5 h-2.5 rounded-full transition-colors",
							getStatusColor(uptime),
						)}
					/>
					<span className="font-medium text-sm">{title}</span>
				</div>
				<div className="flex items-center gap-3">
					<span
						className={cn(
							"font-medium text-sm transition-colors",
							getDelayColor(avgDelay),
						)}
					>
						{avgDelay.toFixed(0)}ms
					</span>
					<Separator className="h-4" orientation="vertical" />
					<span
						className={cn(
							"font-medium text-sm transition-colors",
							getUptimeColor(uptime),
						)}
					>
						{uptime.toFixed(1)}% {t("serviceTracker.uptime")}
					</span>
				</div>
			</div>

			<div className="flex gap-[3px] p-1 rounded-lg">
				{days.map((day, index) => (
					<TooltipProvider delayDuration={50} key={index}>
						<Tooltip>
							<TooltipTrigger asChild>
								<div
									className={cn(
										"relative flex-1 h-7 rounded-[8px] transition-all duration-200 cursor-help",
										"before:absolute before:inset-0 before:rounded-[4px] before:opacity-0 hover:before:opacity-100 before:bg-foreground/10 before:transition-opacity",
										"after:absolute after:inset-0 after:rounded-[4px] after:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.1)]",
										day.completed ? "bg-status-ok" : "bg-status-bad",
									)}
								/>
							</TooltipTrigger>
							<TooltipContent className="p-0 overflow-hidden rounded-[10px]">
								<div className="px-3 py-2 bg-popover">
									<p className="font-medium text-sm mb-2">
										{day.date?.toLocaleDateString()}
									</p>
									<div className="space-y-1.5">
										<div className="flex items-center justify-between gap-3">
											<span className="text-xs text-muted-foreground">
												{t("serviceTracker.uptime")}:
											</span>
											<span
												className={cn(
													"text-xs font-medium",
													day.uptime > 95
														? "text-status-ok"
														: "text-status-bad",
												)}
											>
												{day.uptime.toFixed(1)}%
											</span>
										</div>
										<div className="flex items-center justify-between gap-3">
											<span className="text-xs text-muted-foreground">
												{t("serviceTracker.delay")}:
											</span>
											<span
												className={cn(
													"text-xs font-medium",
													day.delay < 100
														? "text-status-ok"
														: day.delay < 300
															? "text-status-warn"
															: "text-status-bad",
												)}
											>
												{day.delay.toFixed(0)}ms
											</span>
										</div>
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				))}
			</div>

			<div className="flex justify-between text-xs text-muted-foreground">
				<span>30 {t("serviceTracker.daysAgo")}</span>
				<span>{t("serviceTracker.today")}</span>
			</div>
		</div>
	);
};

export default ServiceTrackerClient;
