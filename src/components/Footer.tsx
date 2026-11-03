import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useTranslation } from "react-i18next";
import { fetchSetting } from "@/lib/nezha-api";

const Footer: React.FC = () => {
	const { t } = useTranslation();
	const isMac = /macintosh|mac os x/i.test(navigator.userAgent);

	const { data: settingData } = useQuery({
		queryKey: ["setting"],
		queryFn: () => fetchSetting(),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		retry: false,
	});

	return (
		<footer className="mx-auto w-full max-w-7xl px-3 md:px-6 pb-4 server-footer">
			<section className="flex flex-col">
				<section className="mt-1 flex items-center sm:flex-row flex-col justify-between gap-2 text-[13px] font-light tracking-tight text-muted-foreground/50 server-footer-name">
					<div className="flex items-center gap-1">
						&copy;2020-{new Date().getFullYear()}{" "}
						<a
							href={"https://github.com/naiba/nezha"}
							target="_blank"
							rel="noopener"
						>
							Nezha
						</a>
						<p>{settingData?.data?.version || ""}</p>
					</div>
					<div className="server-footer-theme flex flex-col items-center sm:items-end">
						<p className="mt-1 text-[13px] font-light tracking-tight text-muted-foreground/50">
							<kbd className="pointer-events-none mx-1 inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
								{isMac ? <span className="text-xs">⌘</span> : "Ctrl "}K
							</kbd>
						</p>
						<section>
							{t("footer.themeBy")}
							<a
								href={"https://github.com/MR-MonkeyRay/nezha-stock-dash"}
								target="_blank"
								rel="noopener"
							>
								nezha-stock-dash
							</a>
							{import.meta.env.VITE_GIT_HASH && (
								<a
									href={`https://github.com/MR-MonkeyRay/nezha-stock-dash/commit/${import.meta.env.VITE_GIT_HASH}`}
									target="_blank"
									rel="noopener"
									className="ml-1"
								>
									({import.meta.env.VITE_GIT_HASH})
								</a>
							)}
						</section>
						<section className="text-[11px]">
							{t("footer.basedOn")}
							<a
								href={"https://github.com/hamster1963/nezha-dash"}
								target="_blank"
								rel="noopener"
							>
								nezha-dash
							</a>
							<span className="mx-1">·</span>
							{t("footer.chartsBy")}
							<a
								href={"https://www.tradingview.com/"}
								target="_blank"
								rel="noopener"
							>
								TradingView
							</a>
						</section>
					</div>
				</section>
			</section>
		</footer>
	);
};

export default Footer;
