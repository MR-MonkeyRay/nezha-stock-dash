import { cn, type PublicNoteData } from "@/lib/utils";

export default function PlanInfo({
	parsedData,
}: {
	parsedData: PublicNoteData;
}) {
	if (!parsedData?.planDataMod) {
		return null;
	}

	const extraList =
		parsedData.planDataMod.extra.split(",").length > 1
			? parsedData.planDataMod.extra.split(",")
			: parsedData.planDataMod.extra.split(",")[0] === ""
				? []
				: [parsedData.planDataMod.extra];
	const networkRoutes = parsedData.planDataMod.networkRoute
		? parsedData.planDataMod.networkRoute.split(",")
		: [];

	return (
		<section className="flex gap-1 items-center flex-wrap mt-0.5">
			{parsedData.planDataMod.bandwidth !== "" && (
				<p
					className={cn(
						"text-[9px] bg-highlight/15 text-highlight w-fit rounded-sm px-[3px] py-[1.5px]",
					)}
				>
					{parsedData.planDataMod.bandwidth}
				</p>
			)}
			{parsedData.planDataMod.trafficVol !== "" && (
				<p
					className={cn(
						"text-[9px] bg-status-ok/15 text-status-ok w-fit rounded-sm px-[3px] py-[1.5px]",
					)}
				>
					{parsedData.planDataMod.trafficVol}
				</p>
			)}
			{parsedData.planDataMod.IPv4 === "1" && (
				<p
					className={cn(
						"text-[9px] bg-highlight/15 text-highlight w-fit rounded-sm px-[3px] py-[1.5px]",
					)}
				>
					IPv4
				</p>
			)}
			{parsedData.planDataMod.IPv6 === "1" && (
				<p
					className={cn(
						"text-[9px] bg-highlight/15 text-highlight w-fit rounded-sm px-[3px] py-[1.5px]",
					)}
				>
					IPv6
				</p>
			)}
			{parsedData.planDataMod.networkRoute && (
				<p
					className={cn(
						"text-[9px] bg-highlight/15 text-highlight w-fit rounded-sm px-[3px] py-[1.5px]",
					)}
				>
					{networkRoutes.map((route, index) => {
						return route + (index === networkRoutes.length - 1 ? "" : "｜");
					})}
				</p>
			)}
			{extraList.map((extra, index) => {
				return (
					<p
						key={index}
						className={cn(
							"text-[9px] bg-muted text-muted-foreground w-fit rounded-sm px-[3px] py-[1.5px]",
						)}
					>
						{extra}
					</p>
				);
			})}
		</section>
	);
}
