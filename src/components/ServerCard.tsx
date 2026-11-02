import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ServerFlag from "@/components/ServerFlag";
import ServerUsageBar from "@/components/ServerUsageBar";
import {
	formatSpeed,
	formatUptimeShort,
	stockCode,
} from "@/features/market/format";
import {
	ChangePill,
	QuoteChange,
	QuotePrice,
} from "@/features/market/QuoteText";
import { type Quote, SUSPENDED_QUOTE } from "@/features/market/quote-series";
import { Sparkline } from "@/features/market/Sparkline";
import { formatBytes } from "@/lib/format";
import {
	GetFontLogoClass,
	GetOsName,
	MageMicrosoftWindows,
} from "@/lib/logo-class";
import { saveMainPageScrollPosition } from "@/lib/navigation";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { preloadServerDetail } from "@/lib/server-detail-preload";
import { cn, formatNezhaInfo, parsePublicNote } from "@/lib/utils";
import type { NezhaServer } from "@/types/nezha-api";
import BillingInfo from "./billingInfo";
import PlanInfo from "./PlanInfo";
import { Card } from "./ui/card";

/** Quote tile: a server presented like a stock card (现价 = CPU). */
function ServerCard({
	now,
	serverInfo,
	quote = SUSPENDED_QUOTE,
}: {
	now: number;
	serverInfo: NezhaServer;
	quote?: Quote;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const {
		name,
		country_code,
		online,
		mem,
		stg,
		up,
		down,
		uptime,
		net_in_transfer,
		net_out_transfer,
		public_note,
		platform,
	} = formatNezhaInfo(now, serverInfo);
	const {
		backgroundImage: customBackgroundImage,
		showNetTransfer,
		fixedTopServerName,
	} = useRuntimeConfig();
	const parsedData = parsePublicNote(public_note);
	const effectiveQuote = online ? quote : SUSPENDED_QUOTE;
	const halted = effectiveQuote.direction === "suspended";

	const cardClick = () => {
		saveMainPageScrollPosition();
		navigate(`/server/${serverInfo.id}`);
	};

	return (
		<Card
			className={cn(
				"server-card flex cursor-pointer flex-col gap-2 p-3 transition-colors hover:border-highlight/60",
				{ "bg-card/70": customBackgroundImage, "opacity-80": halted },
			)}
			onClick={cardClick}
			onPointerEnter={preloadServerDetail}
			onPointerDown={preloadServerDetail}
			onFocus={preloadServerDetail}
		>
			<section className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p
						className={cn(
							"flex items-center gap-1.5 font-semibold",
							fixedTopServerName ? "text-sm" : "text-[13px]",
							halted && "text-muted-foreground",
						)}
					>
						<ServerFlag country_code={country_code} />
						<span className="truncate">{name}</span>
					</p>
					<p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
						<span className="num">{stockCode(serverInfo.id)}</span>
						{platform &&
							(platform.includes("Windows") ? (
								<>
									<MageMicrosoftWindows className="size-[10px]" />
									Windows
								</>
							) : (
								<>
									<span
										aria-hidden="true"
										className={`fl-${GetFontLogoClass(platform)}`}
									/>
									{GetOsName(platform)}
								</>
							))}
						{!halted && (
							<span className="num">· {formatUptimeShort(uptime)}</span>
						)}
					</p>
				</div>
				<ChangePill quote={effectiveQuote} />
			</section>

			<section className="flex items-end justify-between gap-2">
				<div>
					<p className="text-[10px] text-muted-foreground">CPU</p>
					<QuotePrice
						quote={effectiveQuote}
						suffix="%"
						className="block text-2xl font-bold leading-none"
					/>
					{!halted && (
						<QuoteChange quote={effectiveQuote} className="mt-1 text-xs" />
					)}
				</div>
				<Sparkline
					values={effectiveQuote.series}
					direction={effectiveQuote.direction}
					width={120}
					height={40}
				/>
			</section>

			{!halted && (
				<section className="grid grid-cols-4 gap-2 text-[11px]">
					<div>
						<p className="text-muted-foreground">{t("serverCard.mem")}</p>
						<p className="num font-medium">{mem.toFixed(1)}%</p>
						<ServerUsageBar value={mem} />
					</div>
					<div>
						<p className="text-muted-foreground">{t("serverCard.stg")}</p>
						<p className="num font-medium">{stg.toFixed(1)}%</p>
						<ServerUsageBar value={stg} />
					</div>
					<div>
						<p className="text-muted-foreground">↑{t("market.upSpeed")}</p>
						<p className="num font-medium text-up">{formatSpeed(up)}</p>
					</div>
					<div>
						<p className="text-muted-foreground">↓{t("market.downSpeed")}</p>
						<p className="num font-medium text-down">{formatSpeed(down)}</p>
					</div>
				</section>
			)}

			{showNetTransfer && !halted && (
				<section className="num flex justify-between gap-2 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
					<span>
						{t("serverCard.upload")}:{formatBytes(net_out_transfer)}
					</span>
					<span>
						{t("serverCard.download")}:{formatBytes(net_in_transfer)}
					</span>
				</section>
			)}
			{parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} />}
			{parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}
		</Card>
	);
}

export default memo(ServerCard);
