import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BackIcon } from "@/components/Icon";
import { ServerDetailLoading } from "@/components/loading/ServerDetailLoading";
import ServerFlag from "@/components/ServerFlag";
import { formatSpeed, stockCode } from "@/features/market/format";
import {
	QuoteChange,
	QuoteChangePct,
	QuotePrice,
} from "@/features/market/QuoteText";
import {
	computeQuote,
	orderFrames,
	selectCpuSeries,
} from "@/features/market/quote-series";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { formatBytes } from "@/lib/format";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { safeSessionStorage } from "@/lib/storage";
import { cn, formatNezhaInfo } from "@/lib/utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

countries.registerLocale(enLocale);

function Stat({
	label,
	children,
	className,
}: {
	label: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
			<dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
			<dd className="num truncate text-[13px] font-medium">{children}</dd>
		</div>
	);
}

function ProfileItem({
	label,
	children,
}: {
	label: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className="text-[11px] text-muted-foreground">{label}</dt>
			<dd className="break-words text-xs">{children}</dd>
		</div>
	);
}

/** Quote page header: 现价 (CPU), change, stats grid and the 简况 (F10) profile. */
export default function ServerDetailOverview({
	server_id,
}: {
	server_id: string;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();
	const desktop = useMediaQuery("(min-width: 768px)");
	const [hasHistory, setHasHistory] = useState(false);

	useEffect(() => {
		const previousPath = safeSessionStorage.getItem("fromMainPage");
		if (previousPath) {
			setHasHistory(true);
		}

		return () => {
			if (previousPath) {
				safeSessionStorage.removeItem("fromMainPage");
			}
		};
	}, []);

	const { lastData, connected, messageHistory } = useWebSocketContext();
	const series = useMemo(
		() => selectCpuSeries(orderFrames(messageHistory, lastData)),
		[messageHistory, lastData],
	);

	if (!connected && !lastData) {
		return <ServerDetailLoading />;
	}

	const linkClick = () => {
		if (hasHistory) {
			navigate(-1);
		} else {
			navigate("/");
		}
	};

	const nezhaWsData = lastData;

	if (!nezhaWsData) {
		return <ServerDetailLoading />;
	}

	const server = nezhaWsData.servers.find((s) => s.id === Number(server_id));

	if (!server) {
		return <ServerDetailLoading />;
	}

	const info = formatNezhaInfo(nezhaWsData.now, server);
	const {
		name,
		online,
		uptime,
		version,
		arch,
		mem_total,
		disk_total,
		country_code,
		platform,
		platform_version,
		cpu_info,
		gpu_info,
		load_1,
		load_5,
		load_15,
		net_out_transfer,
		net_in_transfer,
		last_active_time_string,
		boot_time_string,
	} = info;
	const quote = computeQuote(series.get(server.id), online);
	const halted = quote.direction === "suspended";
	const dash = "--";
	const uptimeText =
		uptime / 86400 >= 1
			? `${Math.floor(uptime / 86400)} ${t("serverDetail.days")} ${Math.floor((uptime % 86400) / 3600)} ${t("serverDetail.hours")}`
			: `${Math.floor(uptime / 3600)} ${t("serverDetail.hours")}`;

	return (
		<div
			className={cn("flex flex-col gap-3", {
				"rounded-md bg-card/70 p-4": customBackgroundImage,
			})}
		>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<button
					type="button"
					onClick={linkClick}
					aria-label={t("market.back")}
					className="flex min-w-0 cursor-pointer items-center gap-1 break-all text-xl font-semibold leading-none tracking-tight server-name"
				>
					<BackIcon />
					{name}
				</button>
				<span className="num text-xs text-muted-foreground">
					{stockCode(server.id)}
				</span>
				{country_code && <ServerFlag country_code={country_code} />}
				<span
					className={cn(
						"rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-none",
						halted
							? "bg-suspended/20 text-suspended"
							: "bg-status-ok/15 text-status-ok",
					)}
				>
					{halted ? t("market.suspended") : t("market.trading")}
				</span>
			</div>

			<section className="grid gap-4 rounded-md border border-border bg-card p-3 md:grid-cols-[minmax(220px,auto)_1fr] md:p-4">
				<div className="flex flex-col justify-center">
					<p className="text-[11px] text-muted-foreground">CPU</p>
					<QuotePrice
						quote={quote}
						suffix="%"
						className="block w-fit text-[2.5rem] font-bold leading-none md:text-5xl"
					/>
					<p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
						<QuoteChange quote={quote} />
						<QuoteChangePct quote={quote} />
						<span className="text-[11px] text-muted-foreground">
							{t("market.vsOneMinute")}
						</span>
					</p>
				</div>
				<dl className="grid grid-cols-4 gap-x-3 gap-y-2.5 md:grid-cols-6 lg:grid-cols-8">
					<Stat label={t("market.high")}>
						<span className={halted ? "" : "text-up"}>
							{quote.high === null ? dash : `${quote.high.toFixed(2)}%`}
						</span>
					</Stat>
					<Stat label={t("market.low")}>
						<span className={halted ? "" : "text-down"}>
							{quote.low === null ? dash : `${quote.low.toFixed(2)}%`}
						</span>
					</Stat>
					<Stat label={t("market.mem")}>
						{halted ? dash : `${info.mem.toFixed(1)}%`}
					</Stat>
					<Stat label={t("market.swap")}>
						{halted ? dash : `${info.swap.toFixed(1)}%`}
					</Stat>
					<Stat label={t("market.disk")}>
						{halted ? dash : `${info.disk.toFixed(1)}%`}
					</Stat>
					<Stat label={t("market.processes")}>
						{halted ? dash : info.process}
					</Stat>
					<Stat label="TCP / UDP">
						{halted ? dash : `${info.tcp} / ${info.udp}`}
					</Stat>
					<Stat label={t("market.uptime")}>{halted ? dash : uptimeText}</Stat>
					<Stat label={t("market.load")} className="col-span-2">
						{`${load_1} / ${load_5} / ${load_15}`}
					</Stat>
					<Stat label={`↑${t("market.upSpeed")}`}>
						<span className={halted ? "" : "text-up"}>
							{halted ? dash : formatSpeed(info.up)}
						</span>
					</Stat>
					<Stat label={`↓${t("market.downSpeed")}`}>
						<span className={halted ? "" : "text-down"}>
							{halted ? dash : formatSpeed(info.down)}
						</span>
					</Stat>
					<Stat label={t("market.totalUp")}>
						{net_out_transfer
							? formatBytes(net_out_transfer)
							: t("serverDetail.unknown")}
					</Stat>
					<Stat label={t("market.totalDown")}>
						{net_in_transfer
							? formatBytes(net_in_transfer)
							: t("serverDetail.unknown")}
					</Stat>
				</dl>
			</section>

			<Accordion
				key={desktop ? "desktop" : "mobile"}
				type="single"
				collapsible
				defaultValue={desktop ? "profile" : undefined}
				className="rounded-md border border-border bg-card px-3"
			>
				<AccordionItem value="profile" className="border-none">
					<AccordionTrigger className="py-2 text-xs font-medium">
						{t("market.profile")} · F10
					</AccordionTrigger>
					<AccordionContent className="pb-3">
						<dl className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
							{platform && (
								<ProfileItem label={t("serverDetail.system")}>
									{platform}
									{platform_version ? ` - ${platform_version}` : ""}
								</ProfileItem>
							)}
							{arch && (
								<ProfileItem label={t("serverDetail.arch")}>{arch}</ProfileItem>
							)}
							{version && (
								<ProfileItem label={t("serverDetail.version")}>
									{version}
								</ProfileItem>
							)}
							{country_code && (
								<ProfileItem label={t("serverDetail.region")}>
									<TooltipProvider delayDuration={100}>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="inline-flex items-center gap-1">
													{country_code.toUpperCase()}
													<ServerFlag
														className="text-[11px]"
														country_code={country_code}
													/>
												</span>
											</TooltipTrigger>
											<TooltipContent>
												<p>
													{countries.getName(country_code.toUpperCase(), "en")}
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</ProfileItem>
							)}
							{mem_total ? (
								<ProfileItem label={t("serverDetail.mem")}>
									{formatBytes(mem_total)}
								</ProfileItem>
							) : null}
							{disk_total ? (
								<ProfileItem label={t("serverDetail.disk")}>
									{formatBytes(disk_total)}
								</ProfileItem>
							) : null}
							{cpu_info.length > 0 && (
								<ProfileItem label="CPU">{cpu_info.join(", ")}</ProfileItem>
							)}
							{gpu_info.length > 0 && (
								<ProfileItem label="GPU">{gpu_info.join(", ")}</ProfileItem>
							)}
							<ProfileItem label={t("serverDetail.bootTime")}>
								<span className="num">{boot_time_string || "N/A"}</span>
							</ProfileItem>
							<ProfileItem label={t("serverDetail.lastActive")}>
								<span className="num">{last_active_time_string || "N/A"}</span>
							</ProfileItem>
							{server.state.temperatures &&
								server.state.temperatures.length > 0 && (
									<ProfileItem label={t("serverDetail.temperature")}>
										<span className="flex flex-wrap gap-x-3 gap-y-0.5">
											{server.state.temperatures.map((item, index) => (
												<span key={index} className="num">
													<span className="font-semibold">{item.Name}</span>:{" "}
													{item.Temperature.toFixed(2)} °C
												</span>
											))}
										</span>
									</ProfileItem>
								)}
						</dl>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
