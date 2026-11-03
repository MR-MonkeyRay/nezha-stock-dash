import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ImageMinus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/ThemeSwitcher";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { useBackground } from "@/hooks/use-background";
import { useLoginUser } from "@/hooks/use-login-user";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { fetchSetting } from "@/lib/nezha-api";
import { safeSessionStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { Loader, LoadingSpinner } from "./loading/Loader";
import SkeletonBar from "./loading/SkeletonBar";
import NumericText from "./NumericText";
import { SearchButton } from "./SearchButton";
import { Button } from "./ui/button";

interface TimeState {
	hh: number;
	mm: number;
	ss: number;
}

const readTime = (): TimeState => {
	const now = new Date();
	return { hh: now.getHours(), mm: now.getMinutes(), ss: now.getSeconds() };
};

const useCurrentTime = () => {
	const [time, setTime] = useState<TimeState>(readTime);

	useEffect(() => {
		const intervalId = setInterval(() => setTime(readTime()), 1000);

		return () => clearInterval(intervalId);
	}, []);

	return time;
};

function Header({
	configurationLoading = false,
}: {
	configurationLoading?: boolean;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { backgroundImage, updateBackground } = useBackground();

	const { data: settingData, isLoading } = useQuery({
		queryKey: ["setting"],
		queryFn: () => fetchSetting(),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		retry: false,
	});

	const { lastData, connected, reconnect } = useWebSocketContext();

	const onlineCount = connected ? (lastData ? lastData.online || 0 : 0) : "...";

	const siteName = settingData?.data?.config?.site_name;
	const brandingLoading = isLoading || configurationLoading;

	const config = useRuntimeConfig();
	const customLogo = config.customLogo || "/apple-touch-icon.png";
	const customDesc = config.customDesc || t("nezha");
	const customMobileBackgroundImage = config.mobileBackgroundImage;

	useEffect(() => {
		const link =
			document.querySelector("link[rel*='icon']") ||
			document.createElement("link");
		// @ts-expect-error set link.type
		link.type = "image/x-icon";
		// @ts-expect-error set link.rel
		link.rel = "shortcut icon";
		// @ts-expect-error set link.href
		link.href = customLogo;
		document.getElementsByTagName("head")[0].appendChild(link);
	}, [customLogo]);

	useEffect(() => {
		document.title = siteName || "哪吒行情 Nezha Stock Dash";
	}, [siteName]);

	const handleBackgroundToggle = () => {
		if (backgroundImage) {
			// Store the current background image before removing it
			safeSessionStorage.setItem("savedBackgroundImage", backgroundImage);
			updateBackground(undefined);
		} else {
			// Restore the saved background image
			const savedImage = safeSessionStorage.getItem("savedBackgroundImage");
			if (savedImage) {
				updateBackground(savedImage);
			}
		}
	};

	const customBackgroundImage = backgroundImage;

	return (
		<div className="mx-auto w-full max-w-7xl">
			<section className="flex items-center justify-between gap-2 header-top">
				<section
					onClick={() => {
						safeSessionStorage.removeItem("selectedGroup");
						navigate("/");
					}}
					aria-busy={brandingLoading}
					className="flex min-w-0 cursor-pointer items-center text-sm font-semibold sm:text-base"
				>
					<div className="mr-1 flex flex-row items-center justify-start header-logo">
						{brandingLoading ? (
							<Skeleton
								aria-hidden="true"
								className="h-6 w-6 rounded-md bg-muted-foreground/10 motion-reduce:animate-none"
							/>
						) : (
							<img
								width={40}
								height={40}
								alt="apple-touch-icon"
								src={customLogo}
								className="relative m-0! border-2 border-transparent h-6 w-6 object-cover object-top p-0!"
							/>
						)}
					</div>
					{brandingLoading ? (
						<Skeleton className="h-6 w-20 rounded-[5px] bg-muted-foreground/10 motion-reduce:animate-none" />
					) : (
						<span className="truncate">{siteName || "NEZHA"}</span>
					)}
					<span className="ml-1.5 shrink-0 rounded-sm bg-highlight px-1 py-px text-[10px] font-bold leading-4 text-highlight-foreground">
						{t("market.brand")}
					</span>
					<Separator
						orientation="vertical"
						className="mx-2 hidden h-4 w-px md:block"
					/>
					{brandingLoading ? (
						<Skeleton
							aria-hidden="true"
							className="hidden h-4 w-28 bg-muted-foreground/10 motion-reduce:animate-none md:block"
						/>
					) : (
						<p className="hidden text-sm font-medium opacity-40 md:block">
							{customDesc}
						</p>
					)}
				</section>
				<section className="flex shrink-0 items-center gap-1.5 sm:gap-2 header-handles">
					<div className="hidden sm:flex items-center gap-2">
						<Links />
						<DashboardLink />
					</div>
					<SearchButton />
					<LanguageSwitcher />
					<ModeToggle />
					{(customBackgroundImage ||
						safeSessionStorage.getItem("savedBackgroundImage")) && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleBackgroundToggle}
							className={cn("rounded-sm bg-card px-[9px]", {
								"bg-card/70": customBackgroundImage,
								"hidden sm:block": customMobileBackgroundImage,
							})}
						>
							<ImageMinus className="w-4 h-4" />
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={connected ? undefined : reconnect}
						aria-label={connected ? undefined : t("retry")}
						className={cn(
							"flex cursor-default items-center gap-1.5 rounded-sm bg-card px-2 hover:bg-card",
							{
								"bg-card/70": customBackgroundImage,
								"cursor-pointer": !connected,
							},
						)}
					>
						<span aria-hidden="true" className="relative flex h-1.5 w-1.5">
							{connected && (
								<span className="absolute inset-0 rounded-full bg-status-ok opacity-60 motion-safe:animate-ping" />
							)}
							<span
								className={cn(
									"relative h-1.5 w-1.5 rounded-full bg-status-ok",
									{
										"animate-pulse bg-suspended": !connected,
									},
								)}
							/>
						</span>
						<span className="hidden text-xs text-status-ok sm:inline">
							{connected ? t("market.live") : ""}
						</span>
						{connected && !lastData ? (
							<SkeletonBar className="h-4 w-4" />
						) : connected ? (
							<NumericText value={onlineCount} className="num" />
						) : (
							<Loader visible={true} />
						)}
						<p
							className={cn("text-xs text-muted-foreground", {
								"sr-only sm:not-sr-only": connected,
							})}
						>
							{connected ? t("online") : t("market.reconnecting")}
						</p>
					</Button>
				</section>
			</section>
			{/* Phones: custom links get their own scrollable row, and the
			    dashboard link joins the date row instead of a row of its own. */}
			<div className="scrollbar-hidden mt-1 flex overflow-x-auto sm:hidden empty:hidden">
				<Links />
			</div>
			<Overview
				loading={brandingLoading}
				aside={
					<div className="sm:hidden">
						<DashboardLink />
					</div>
				}
			/>
		</div>
	);
}

type links = {
	link: string;
	name: string;
};

function parseCustomLinks(customLinks: string | undefined): links[] | null {
	if (!customLinks) return null;

	try {
		const parsedLinks = JSON.parse(customLinks);

		if (!Array.isArray(parsedLinks)) {
			return null;
		}

		return parsedLinks.filter(
			(link): link is links =>
				typeof link?.link === "string" && typeof link?.name === "string",
		);
	} catch {
		return null;
	}
}

function Links() {
	const { customLinks } = useRuntimeConfig();

	const links = parseCustomLinks(customLinks);

	if (!links) return null;

	return (
		<div className="flex items-center gap-2 w-fit">
			{links.map((link, index) => {
				return (
					<a
						key={index}
						href={link.link}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
					>
						{link.name}
					</a>
				);
			})}
		</div>
	);
}

export function RefreshToast() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const { needReconnect } = useWebSocketContext();

	useEffect(() => {
		if (!needReconnect) return;
		const timer = setTimeout(() => navigate(0), 1000);
		return () => clearTimeout(timer);
	}, [needReconnect, navigate]);

	if (!needReconnect) return null;

	return (
		<div className="refresh-toast-animate fixed left-1/2 -translate-x-1/2 top-8 z-999 flex items-center justify-between gap-4 rounded-sm border border-border bg-popover px-2 py-1.5 text-popover-foreground shadow-xl shadow-black/10">
			<section className="flex items-center gap-1.5">
				<LoadingSpinner />
				<p className="text-[12.5px] font-medium">{t("refreshing")}...</p>
			</section>
		</div>
	);
}

function DashboardLink() {
	const { t } = useTranslation();
	const { setNeedReconnect } = useWebSocketContext();
	const previousLoginState = useRef<boolean | null>(null);
	const { isAuthenticated: isLogin, authStatus } = useLoginUser();

	useEffect(() => {
		if (authStatus === "unknown") return;
		if (
			previousLoginState.current !== null &&
			previousLoginState.current !== isLogin
		) {
			setNeedReconnect(true);
		}
		previousLoginState.current = isLogin;
	}, [isLogin, authStatus, setNeedReconnect]);

	return (
		<div className="flex items-center gap-2">
			<a
				href={"/dashboard"}
				rel="noopener noreferrer"
				className="flex items-center text-nowrap gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
			>
				{!isLogin && t("login")}
				{isLogin && t("dashboard")}
			</a>
		</div>
	);
}

function Overview({ loading, aside }: { loading: boolean; aside?: ReactNode }) {
	const { t } = useTranslation();
	const time = useCurrentTime();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (loading) {
		return (
			<section className="mt-3 flex h-6 items-center justify-between header-timer">
				<div aria-hidden="true">
					<SkeletonBar className="h-4 w-28" />
				</div>
				<div className="flex items-center gap-3">
					{aside}
					<div aria-hidden="true">
						<SkeletonBar className="h-4 w-16" />
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="mt-3 flex h-6 items-center justify-between text-xs text-muted-foreground header-timer">
			<p className="flex items-center gap-2">
				<span className="font-medium text-foreground">{t("overview")}</span>
				<span className="num">{dayjs().format("YYYY-MM-DD")}</span>
				<span className="hidden sm:inline">{t("whereTheTimeIs")}</span>
			</p>
			<div className="flex items-center gap-3">
				{aside}
				{mounted ? (
					<p className="num text-sm font-semibold text-foreground">
						{String(time.hh).padStart(2, "0")}:
						{String(time.mm).padStart(2, "0")}:
						{String(time.ss).padStart(2, "0")}
					</p>
				) : (
					<Skeleton className="h-[21px] w-16 animate-none rounded-[5px] bg-muted-foreground/10" />
				)}
			</div>
		</section>
	);
}
export default Header;
