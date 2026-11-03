import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useTooltip from "@/hooks/use-tooltip";
import { regionName } from "@/lib/language";
import { saveMainPageScrollPosition } from "@/lib/navigation";

const MapTooltip = memo(function MapTooltip() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { tooltipData } = useTooltip();

	if (!tooltipData) return null;

	const countryName =
		regionName(tooltipData.code, i18n.language) ?? tooltipData.country;

	const verticalPlacement =
		tooltipData.centroid[1] < 120
			? "translate(20%, 8px)"
			: tooltipData.centroid[1] > 380
				? "translate(20%, calc(-100% - 8px))"
				: "translate(20%, -50%)";

	return (
		<div
			className="tooltip-animate absolute hidden lg:block bg-popover text-popover-foreground border border-border px-2 py-1 rounded-sm shadow-lg text-sm z-50"
			data-testid="map-tooltip"
			key={tooltipData.country}
			style={{
				left: tooltipData.centroid[0],
				top: tooltipData.centroid[1],
				transform: verticalPlacement,
			}}
			onMouseEnter={(e) => {
				e.stopPropagation();
			}}
		>
			<div>
				<p className="font-medium">
					{countryName === "China" ? "Mainland China" : countryName}
				</p>
				<p className="text-muted-foreground text-xs font-light mb-1">
					{tooltipData.count} {t("map.Servers")}
				</p>
			</div>
			<div
				className="border-t border-border pt-1"
				style={{
					maxHeight: "200px",
					overflowY: "auto",
				}}
			>
				{tooltipData.servers.map((server) => (
					<button
						key={server.id}
						type="button"
						className="flex items-center gap-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
						onClick={() => {
							saveMainPageScrollPosition();
							navigate(`/server/${server.id}`);
						}}
					>
						<span
							className={`h-1.5 w-1.5 shrink-0 rounded-full ${server.status ? "bg-status-ok" : "bg-suspended"}`}
						/>
						<span className="text-xs">{server.name}</span>
					</button>
				))}
			</div>
		</div>
	);
});

export default MapTooltip;
