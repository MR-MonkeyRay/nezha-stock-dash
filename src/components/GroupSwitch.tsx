import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useActiveIndicator } from "@/hooks/use-active-indicator";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { safeSessionStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function GroupSwitch({
	tabs,
	currentTab,
	setCurrentTab,
}: {
	tabs: string[];
	currentTab: string;
	setCurrentTab: (tab: string) => void;
}) {
	const { t } = useTranslation();
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const scrollRef = useRef<HTMLDivElement>(null);
	const {
		containerRef,
		enableIndicatorAnimation,
		indicator,
		itemRefs,
		setItemRef,
	} = useActiveIndicator(tabs, currentTab);

	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		const isOverflowing = container.scrollWidth > container.clientWidth;
		if (!isOverflowing) return;

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			container.scrollLeft += e.deltaY;
		};

		container.addEventListener("wheel", onWheel, { passive: false });

		return () => {
			container.removeEventListener("wheel", onWheel);
		};
	}, []);

	useEffect(() => {
		if (tabs.length === 1 && tabs[0] === "All") {
			setCurrentTab("All");
			return;
		}
		const savedGroup = safeSessionStorage.getItem("selectedGroup");
		if (savedGroup && tabs.includes(savedGroup)) {
			setCurrentTab(savedGroup);
		}
	}, [tabs, setCurrentTab]);

	useEffect(() => {
		const currentTagRef = itemRefs.current[tabs.indexOf(currentTab)];
		const scrollContainer = scrollRef.current;

		if (currentTagRef && scrollContainer) {
			const nextScrollLeft =
				currentTagRef.offsetLeft -
				scrollContainer.clientWidth / 2 +
				currentTagRef.offsetWidth / 2;

			if (typeof scrollContainer.scrollTo === "function") {
				scrollContainer.scrollTo({
					behavior: "smooth",
					left: Math.max(0, nextScrollLeft),
				});
			} else {
				scrollContainer.scrollLeft = Math.max(0, nextScrollLeft);
			}
		}
	}, [currentTab, itemRefs, tabs]);

	if (tabs.length === 1 && tabs[0] === "All") {
		return null;
	}

	return (
		<div
			ref={scrollRef}
			className="scrollbar-hidden z-10 flex min-w-0 flex-col items-start overflow-x-scroll"
		>
			<div
				ref={containerRef}
				className={cn(
					"relative flex h-8 items-center gap-0.5 border-b border-border",
					{
						"bg-card/70": customBackgroundImage,
					},
				)}
			>
				{indicator && (
					<div
						className="active-indicator-fade-in absolute left-0 top-0 z-10 bg-highlight"
						style={{
							height: 2,
							transform: `translate(${indicator.x}px, ${indicator.y + indicator.height - 2}px)`,
							transition: indicator.shouldAnimate
								? "transform 0.5s var(--timing), width 0.5s var(--timing), height 0.5s var(--timing)"
								: "none",
							width: indicator.width,
						}}
					/>
				)}
				{tabs.map((tab: string, index: number) => (
					<div
						key={tab}
						ref={setItemRef(index)}
						onClick={() => {
							if (currentTab !== tab) {
								enableIndicatorAnimation();
							}
							setCurrentTab(tab);
						}}
						className={cn(
							"relative cursor-pointer px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:text-foreground",
							currentTab === tab ? "text-highlight" : "text-muted-foreground",
						)}
					>
						<div className="relative z-20 flex items-center gap-1">
							<p className="whitespace-nowrap">
								{tab === "All" ? t("group.all", { defaultValue: "All" }) : tab}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
