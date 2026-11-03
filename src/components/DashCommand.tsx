import {
	Home,
	Moon,
	Sun,
	SunMoon,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { stockCode } from "@/features/market/format";
import { useCommand } from "@/hooks/use-command";
import { usePriceColor } from "@/hooks/use-price-color";
import { useTheme } from "@/hooks/use-theme";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { saveMainPageScrollPosition } from "@/lib/navigation";
import { selectServerMetrics } from "@/lib/server-metrics";
import { cn } from "@/lib/utils";
import { withViewTransition } from "@/lib/view-transition";
import type { NezhaWebsocketResponse } from "@/types/nezha-api";
import ServerFlag from "./ServerFlag";
import type { Theme } from "./ThemeProvider";

/** Rendering every server makes each keystroke re-layout hundreds of rows;
 * the best matches are enough to pick from, the rest narrow as you type. */
const MAX_SERVER_RESULTS = 50;

type ServerEntry = {
	id: number;
	name: string;
	code: string;
	countryCode: string;
	online: boolean;
	cpu: number;
	search: string;
};

function snapshotServers(data: NezhaWebsocketResponse): ServerEntry[] {
	return (data.servers ?? []).map((server) => {
		const metrics = selectServerMetrics(data.now, server);
		const code = stockCode(server.id);
		return {
			id: server.id,
			name: server.name,
			code,
			countryCode: server.country_code,
			online: metrics.online,
			cpu: metrics.cpu,
			search: `${server.name} ${code}`.toLowerCase(),
		};
	});
}

/** Code match, then name prefix, then substring; stable within a rank. */
export function rankServers(servers: ServerEntry[], query: string) {
	const q = query.trim().toLowerCase();
	if (!q) return servers;
	const ranked: { entry: ServerEntry; rank: number; index: number }[] = [];
	servers.forEach((entry, index) => {
		const name = entry.name.toLowerCase();
		const rank =
			entry.code === q.padStart(6, "0") || entry.code === q
				? 0
				: name.startsWith(q)
					? 1
					: entry.search.includes(q)
						? 2
						: -1;
		if (rank >= 0) ranked.push({ entry, rank, index });
	});
	ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
	return ranked.map(({ entry }) => entry);
}

const matchesAll = (text: string, query: string) =>
	query
		.toLowerCase()
		.split(/\s+/)
		.every((token) => text.toLowerCase().includes(token));

export function DashCommand() {
	const { isOpen, closeCommand, toggleCommand } = useCommand();
	const [search, setSearch] = useState("");
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { setTheme } = useTheme();
	const { setPriceColor, forced: priceColorForced } = usePriceColor();
	// From the palette the reveal grows from the center of the screen.
	const themeTransition = useCallback(
		(next: Theme) =>
			withViewTransition(() => setTheme(next), "theme", {
				origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
			}),
		[setTheme],
	);

	const { lastData, connected } = useWebSocketContext();

	const nezhaWsData = lastData;

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				toggleCommand();
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [toggleCommand]);

	const shortcuts = useMemo(
		() =>
			[
				{
					keywords: ["home", "homepage"],
					icon: <Home />,
					label: t("Home"),
					action: () => navigate("/"),
				},
				{
					keywords: ["light", "theme", "lightmode"],
					icon: <Sun />,
					label: t("ToggleLightMode"),
					action: () => themeTransition("light"),
				},
				{
					keywords: ["dark", "theme", "darkmode"],
					icon: <Moon />,
					label: t("ToggleDarkMode"),
					action: () => themeTransition("dark"),
				},
				{
					keywords: ["system", "theme", "systemmode"],
					icon: <SunMoon />,
					label: t("ToggleSystemMode"),
					action: () => themeTransition("system"),
				},
				...(priceColorForced
					? []
					: [
							{
								keywords: ["color", "red", "up", "涨跌", "红涨绿跌"],
								icon: <TrendingUp />,
								label: t("priceColor.useRedUp"),
								action: () =>
									withViewTransition(() => setPriceColor("red-up"), "fade"),
							},
							{
								keywords: ["color", "green", "up", "涨跌", "绿涨红跌"],
								icon: <TrendingDown />,
								label: t("priceColor.useGreenUp"),
								action: () =>
									withViewTransition(() => setPriceColor("green-up"), "fade"),
							},
						]),
			].map((item) => ({
				...item,
				value: `${item.keywords.join(" ")} ${item.label}`,
			})),
		[navigate, themeTransition, setPriceColor, priceColorForced, t],
	);

	// Snapshot the servers when the palette opens: re-rendering the results
	// on every websocket tick would fight the user's typing and selection.
	const hasData = Boolean(nezhaWsData);
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally frozen while open; refreshed on each open.
	const servers = useMemo(
		() => (isOpen && nezhaWsData ? snapshotServers(nezhaWsData) : []),
		[isOpen, hasData],
	);
	const matches = useMemo(
		() => rankServers(servers, search),
		[servers, search],
	);
	const shownServers = matches.slice(0, MAX_SERVER_RESULTS);
	const hiddenCount = matches.length - shownServers.length;
	const shownShortcuts = search.trim()
		? shortcuts.filter((item) => matchesAll(item.value, search.trim()))
		: shortcuts;

	useEffect(() => {
		if (!isOpen) setSearch("");
	}, [isOpen]);

	if (!connected || !nezhaWsData) return null;

	return (
		<CommandDialog
			open={isOpen}
			onOpenChange={closeCommand}
			shouldFilter={false}
		>
			<CommandInput
				placeholder={t("TypeCommand")}
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList className="border-t">
				<CommandEmpty>{t("NoResults")}</CommandEmpty>
				{shownServers.length > 0 && (
					<CommandGroup heading={t("Servers")}>
						{shownServers.map((server) => (
							<CommandItem
								key={server.id}
								value={`server-${server.id}`}
								onSelect={() => {
									saveMainPageScrollPosition();
									navigate(`/server/${server.id}`);
									closeCommand();
								}}
							>
								<span
									className={cn(
										"h-2 w-2 shrink-0 self-center rounded-full",
										server.online ? "bg-status-ok" : "bg-suspended",
									)}
								/>
								<span className="truncate">{server.name}</span>
								<span className="num shrink-0 text-[11px] text-muted-foreground">
									{server.code}
								</span>
								<ServerFlag
									country_code={server.countryCode}
									className="shrink-0"
								/>
								<span
									className={cn(
										"num ml-auto shrink-0 text-xs",
										server.online ? "text-foreground" : "text-muted-foreground",
									)}
								>
									{server.online ? `${server.cpu.toFixed(1)}%` : "--"}
								</span>
							</CommandItem>
						))}
						{hiddenCount > 0 && (
							<p className="px-2 py-2 text-xs text-muted-foreground">
								{t("commandMoreResults", { count: hiddenCount })}
							</p>
						)}
					</CommandGroup>
				)}
				{shownServers.length > 0 && shownShortcuts.length > 0 && (
					<CommandSeparator />
				)}
				{shownShortcuts.length > 0 && (
					<CommandGroup heading={t("Shortcuts")}>
						{shownShortcuts.map((item) => (
							<CommandItem
								key={item.label}
								value={item.value}
								onSelect={() => {
									item.action();
									closeCommand();
								}}
							>
								{item.icon}
								<span>{item.label}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}
			</CommandList>
		</CommandDialog>
	);
}
