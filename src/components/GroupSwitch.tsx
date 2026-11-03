import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { useActiveIndicator } from "@/hooks/use-active-indicator";
import { safeSessionStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

const FADE = "1.5rem";

/** Fades whichever edge still has tabs scrolled out of view, so a clipped
 * tab reads as "more this way" instead of a layout bug. */
function edgeMask(start: boolean, end: boolean) {
	if (!start && !end) return undefined;
	const left = start ? `transparent, #000 ${FADE}` : "#000";
	const right = end ? `#000 calc(100% - ${FADE}), transparent` : "#000";
	return `linear-gradient(to right, ${left}, ${right})`;
}

export default function GroupSwitch({
	tabs,
	currentTab,
	setCurrentTab,
	className,
}: {
	tabs: string[];
	currentTab: string;
	setCurrentTab: (tab: string) => void;
	className?: string;
}) {
	const { t } = useTranslation();
	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const scrollRef = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState({ start: false, end: false });
	const {
		containerRef,
		enableIndicatorAnimation,
		indicator,
		itemRefs,
		setItemRef,
	} = useActiveIndicator(tabs, currentTab);

	const hidden = tabs.length === 1 && tabs[0] === "All";

	// biome-ignore lint/correctness/useExhaustiveDependencies: `hidden` mounts or unmounts the scroll container, so listeners must re-attach.
	useLayoutEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		const update = () => {
			const max = container.scrollWidth - container.clientWidth;
			const start = container.scrollLeft > 1;
			const end = max - container.scrollLeft > 1;
			setEdges((current) =>
				current.start === start && current.end === end
					? current
					: { start, end },
			);
		};
		// A vertical wheel scrolls the tabs sideways, but only while they
		// overflow, so the page still scrolls over a short tab bar.
		const onWheel = (event: WheelEvent) => {
			if (container.scrollWidth <= container.clientWidth) return;
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			event.preventDefault();
			container.scrollLeft += event.deltaY;
			update();
		};

		update();
		container.addEventListener("scroll", update, { passive: true });
		container.addEventListener("wheel", onWheel, { passive: false });
		const observer =
			typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
		observer?.observe(container);
		if (containerRef.current) observer?.observe(containerRef.current);
		return () => {
			container.removeEventListener("scroll", update);
			container.removeEventListener("wheel", onWheel);
			observer?.disconnect();
		};
	}, [containerRef, hidden]);

	useEffect(() => {
		if (hidden) {
			setCurrentTab("All");
			return;
		}
		const savedGroup = safeSessionStorage.getItem("selectedGroup");
		if (savedGroup && tabs.includes(savedGroup)) {
			setCurrentTab(savedGroup);
		}
	}, [hidden, tabs, setCurrentTab]);

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

	if (hidden) {
		return null;
	}

	const mask = edgeMask(edges.start, edges.end);

	return (
		<div
			ref={scrollRef}
			className={cn(
				"scrollbar-hidden z-10 flex min-w-0 flex-col items-start overflow-x-auto overscroll-x-contain",
				className,
			)}
			style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
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
					<button
						key={tab}
						type="button"
						ref={setItemRef(index)}
						aria-pressed={currentTab === tab}
						onClick={() => {
							if (currentTab !== tab) {
								enableIndicatorAnimation();
							}
							setCurrentTab(tab);
						}}
						className={cn(
							"relative z-20 cursor-pointer whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
							currentTab === tab ? "text-highlight" : "text-muted-foreground",
						)}
					>
						{tab === "All" ? t("group.all", { defaultValue: "All" }) : tab}
					</button>
				))}
			</div>
		</div>
	);
}
