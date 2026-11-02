import { useTranslation } from "react-i18next";
import { useActiveIndicator } from "@/hooks/use-active-indicator";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

export default function TabSwitch({
	tabs,
	currentTab,
	setCurrentTab,
}: {
	tabs: string[];
	currentTab: string;
	setCurrentTab: (tab: string) => void;
}) {
	const { t } = useTranslation();
	const { containerRef, enableIndicatorAnimation, indicator, setItemRef } =
		useActiveIndicator(tabs, currentTab);
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();
	return (
		<div className="z-10 flex w-full flex-col items-start overflow-x-auto scrollbar-hidden server-info-tab">
			<div
				ref={containerRef}
				role="tablist"
				className={cn(
					"relative flex w-full items-center gap-1 border-b border-border",
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
						role="tab"
						tabIndex={0}
						aria-selected={currentTab === tab}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								setCurrentTab(tab);
							}
						}}
						onClick={() => {
							if (currentTab !== tab) {
								enableIndicatorAnimation();
							}
							setCurrentTab(tab);
						}}
						className={cn(
							"relative cursor-pointer px-3 py-2 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-highlight",
							currentTab === tab ? "text-highlight" : "text-muted-foreground",
						)}
					>
						<div className="relative z-20 flex items-center gap-1">
							<p className="whitespace-nowrap">{t(`tabSwitch.${tab}`)}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
