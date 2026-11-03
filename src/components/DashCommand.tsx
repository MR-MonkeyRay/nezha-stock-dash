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
import { useCommand } from "@/hooks/use-command";
import { usePriceColor } from "@/hooks/use-price-color";
import { useTheme } from "@/hooks/use-theme";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { saveMainPageScrollPosition } from "@/lib/navigation";
import { selectServerMetrics } from "@/lib/server-metrics";
import { withViewTransition } from "@/lib/view-transition";
import type { Theme } from "./ThemeProvider";

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

	const serverCommands = useMemo(() => {
		if (!isOpen || !nezhaWsData) return [];

		return (nezhaWsData.servers ?? []).map((server) => ({
			id: server.id,
			name: server.name,
			online: selectServerMetrics(nezhaWsData.now, server).online,
		}));
	}, [isOpen, nezhaWsData]);

	if (!connected || !nezhaWsData) return null;

	return (
		<CommandDialog open={isOpen} onOpenChange={closeCommand}>
			<CommandInput
				placeholder={t("TypeCommand")}
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList className="border-t">
				<CommandEmpty>{t("NoResults")}</CommandEmpty>
				{serverCommands.length > 0 && (
					<CommandGroup heading={t("Servers")}>
						{serverCommands.map((server) => (
							<CommandItem
								key={server.id}
								value={server.name}
								onSelect={() => {
									saveMainPageScrollPosition();
									navigate(`/server/${server.id}`);
									closeCommand();
								}}
							>
								{server.online ? (
									<span className="h-2 w-2 shrink-0 rounded-full bg-status-ok self-center" />
								) : (
									<span className="h-2 w-2 shrink-0 rounded-full bg-suspended self-center" />
								)}
								<span>{server.name}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}
				<CommandSeparator />

				<CommandGroup heading={t("Shortcuts")}>
					{shortcuts.map((item) => (
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
			</CommandList>
		</CommandDialog>
	);
}
