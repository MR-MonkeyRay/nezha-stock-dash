import {
	ArrowDownIcon,
	ArrowsUpDownIcon,
	ArrowUpIcon,
	ChartBarSquareIcon,
	MapIcon,
	QueueListIcon,
	Squares2X2Icon,
} from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import GroupSwitch from "@/components/GroupSwitch";
import { SORT_TYPES, type SortContextType } from "@/context/sort-context";
import { cn } from "@/lib/utils";
import type { useServerPreferences } from "./use-server-preferences";

type Props = ReturnType<typeof useServerPreferences> &
	SortContextType & {
		hasServers: boolean;
		hasServices: boolean;
		groupTabs: string[];
		customBackgroundImage: string | undefined;
	};

export function ServerControls({
	hasServers,
	hasServices,
	groupTabs,
	customBackgroundImage,
	showMap,
	showServices,
	inline,
	currentGroup,
	handleTagChange,
	toggleMap,
	toggleServices,
	toggleInline,
	sortType,
	sortOrder,
	setSortType,
	setSortOrder,
}: Props) {
	const { t } = useTranslation();
	const toggleClass = (active: boolean) =>
		cn(
			"flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-sm border px-2 text-xs transition-press motion-safe:press",
			active
				? "border-highlight bg-highlight text-highlight-foreground"
				: "border-border bg-card text-muted-foreground hover:text-foreground",
			{ "bg-card/70": customBackgroundImage && !active },
		);
	return (
		<div
			hidden={!hasServers}
			className="mt-3 flex items-center justify-between gap-2 server-overview-controls"
		>
			<section className="flex w-full items-center gap-2 overflow-hidden">
				<fieldset className="relative m-0 grid h-8 min-w-0 shrink-0 grid-cols-2 overflow-hidden rounded-sm border border-border bg-card p-0 text-xs">
					<legend className="sr-only">{t("market.viewMode")}</legend>
					{/* Sliding thumb under the active segment. */}
					<span
						aria-hidden="true"
						data-testid="view-thumb"
						className="absolute inset-y-0 left-0 w-1/2 bg-highlight transition-transform duration-(--dur-base) ease-(--ease-out) motion-reduce:transition-none"
						style={{
							transform: inline === "1" ? "translateX(0)" : "translateX(100%)",
						}}
					/>
					{(
						[
							["1", t("market.listView"), QueueListIcon],
							["0", t("market.cardView"), Squares2X2Icon],
						] as const
					).map(([value, label, Icon]) => (
						<button
							key={value}
							type="button"
							aria-pressed={inline === value}
							onClick={inline === value ? undefined : toggleInline}
							className={cn(
								"relative flex items-center justify-center gap-1 px-2 transition-press motion-safe:press",
								inline === value
									? "text-highlight-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon className="size-3.5" />
							<span className="hidden sm:inline">{label}</span>
							<span className="sr-only sm:hidden">{label}</span>
						</button>
					))}
				</fieldset>
				<button
					type="button"
					aria-pressed={showMap === "1"}
					onClick={toggleMap}
					className={toggleClass(showMap === "1")}
				>
					<MapIcon className="size-3.5" />
					<span className="hidden sm:inline">{t("market.showMap")}</span>
					<span className="sr-only sm:hidden">{t("market.showMap")}</span>
				</button>
				{hasServices && (
					<button
						type="button"
						aria-pressed={showServices === "1"}
						onClick={toggleServices}
						className={toggleClass(showServices === "1")}
					>
						<ChartBarSquareIcon className="size-3.5" />
						<span className="hidden sm:inline">{t("market.showServices")}</span>
						<span className="sr-only sm:hidden">
							{t("market.showServices")}
						</span>
					</button>
				)}
				<GroupSwitch
					tabs={groupTabs}
					currentTab={currentGroup}
					setCurrentTab={handleTagChange}
				/>
			</section>
			<div
				className={cn(
					"flex h-8 shrink-0 items-center rounded-sm border border-border bg-card text-xs text-muted-foreground transition-colors",
					{
						"bg-card/70": customBackgroundImage,
					},
					{
						"border-highlight/60 text-highlight": sortType !== "default",
					},
				)}
			>
				<button
					aria-label={t("a11y.toggleSortDirection")}
					onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
					disabled={sortType === "default"}
					className="flex h-full cursor-pointer items-center gap-1.5 px-2.5 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<div className="text-foreground">
						{sortOrder === "asc" && sortType !== "default" ? (
							<ArrowUpIcon className="size-3.5 shrink-0" />
						) : sortOrder === "desc" && sortType !== "default" ? (
							<ArrowDownIcon className="size-3.5 shrink-0" />
						) : (
							<ArrowsUpDownIcon className="size-3.5 shrink-0" />
						)}
					</div>

					<span className="hidden font-medium text-foreground sm:inline">
						{t("sort.label")}
					</span>
				</button>
				<span className="mb-0.5 text-border">|</span>
				<span className="relative ml-2 mr-3 inline-flex items-center">
					<span
						className="pointer-events-none select-none whitespace-nowrap text-xs font-medium opacity-0"
						aria-hidden
					>
						{t(`sort.types.${sortType.replace(/ /g, "_")}`)}
					</span>
					<select
						aria-label={t("a11y.sortMetric")}
						value={sortType}
						onChange={(e) => {
							const val = e.target.value as typeof sortType;
							setSortType(val);
							if (val === "default") setSortOrder("desc");
						}}
						className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-xs font-medium outline-none [&>option]:bg-popover [&>option]:text-popover-foreground"
					>
						{SORT_TYPES.map((type) => (
							<option key={type} value={type}>
								{t(`sort.types.${type.replace(/ /g, "_")}`)}
							</option>
						))}
					</select>
				</span>
			</div>
		</div>
	);
}
