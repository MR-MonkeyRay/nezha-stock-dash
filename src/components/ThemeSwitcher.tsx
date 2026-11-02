import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Theme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePriceColor } from "@/hooks/use-price-color";
import type { PriceColor } from "@/lib/price-color";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

import { useTheme } from "../hooks/use-theme";

const THEMES: Theme[] = ["light", "dark", "system"];
const PRICE_COLOR_LABELS: Record<PriceColor, string> = {
	"red-up": "priceColor.redUp",
	"green-up": "priceColor.greenUp",
};

/** Swatch shows the literal colors, so it reads the same in either mode. */
function PriceColorSwatch({ value }: { value: PriceColor }) {
	const redUp = value === "red-up";
	return (
		<span aria-hidden="true" className="num flex items-center gap-0.5">
			<span
				className={
					redUp ? "text-[hsl(var(--red))]" : "text-[hsl(var(--green))]"
				}
			>
				▲
			</span>
			<span
				className={
					redUp ? "text-[hsl(var(--green))]" : "text-[hsl(var(--red))]"
				}
			>
				▼
			</span>
		</span>
	);
}

export function ModeToggle() {
	const { t } = useTranslation();
	const { setTheme, theme } = useTheme();
	const { priceColor, setPriceColor, forced } = usePriceColor();

	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const handleSelect = (e: Event, newTheme: Theme) => {
		e.preventDefault();
		setTheme(newTheme);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("rounded-full px-[9px] bg-white dark:bg-black", {
						"bg-white/70 dark:bg-black/70": customBackgroundImage,
					})}
				>
					<Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="flex min-w-36 flex-col gap-0.5"
				align="end"
			>
				{THEMES.map((item) => (
					<DropdownMenuItem
						key={item}
						className={cn("text-xs", {
							"gap-3 bg-muted font-semibold": theme === item,
						})}
						onSelect={(e) => handleSelect(e, item)}
					>
						{t(`theme.${item}`)}
						{theme === item && <CheckCircleIcon className="size-4" />}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
					{t("priceColor.title")}
					{forced && (
						<span className="block font-normal">{t("priceColor.forced")}</span>
					)}
				</DropdownMenuLabel>
				{(Object.keys(PRICE_COLOR_LABELS) as PriceColor[]).map((item) => (
					<DropdownMenuItem
						key={item}
						disabled={forced}
						className={cn("justify-between gap-3 text-xs", {
							"bg-muted font-semibold": priceColor === item,
						})}
						onSelect={(e) => {
							e.preventDefault();
							setPriceColor(item);
						}}
					>
						<span className="flex items-center gap-2">
							<PriceColorSwatch value={item} />
							{t(PRICE_COLOR_LABELS[item])}
						</span>
						{priceColor === item && <CheckCircleIcon className="size-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
