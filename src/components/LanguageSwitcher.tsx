import { CheckCircleIcon, LanguageIcon } from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type LanguageCode,
	resolveLanguage,
	SUPPORTED_LANGUAGES,
	storeLanguage,
} from "@/lib/language";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
	const { t, i18n } = useTranslation();

	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const locale = resolveLanguage(i18n.language);

	const handleSelect = (e: Event, newLocale: LanguageCode) => {
		e.preventDefault(); // keep the menu open so the check mark visibly moves
		storeLanguage(newLocale);
		void Promise.resolve(i18n.changeLanguage(newLocale)).catch(() => undefined);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					title={t("a11y.changeLanguage")}
					className={cn("rounded-sm bg-card px-[9px]", {
						"bg-card/70": customBackgroundImage,
					})}
				>
					<LanguageIcon className="size-4" />
					<span className="sr-only">{t("a11y.changeLanguage")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="flex flex-col gap-0.5" align="end">
				{SUPPORTED_LANGUAGES.map((item, index) => (
					<DropdownMenuItem
						key={item.code}
						lang={item.code.replace(/_/g, "-")}
						onSelect={(e) => handleSelect(e, item.code)}
						className={cn(
							"text-xs",
							{
								"gap-3 bg-muted font-semibold": locale === item.code,
							},
							{
								"rounded-t-[5px]": index === SUPPORTED_LANGUAGES.length - 1,
								"rounded-[5px]":
									index !== 0 && index !== SUPPORTED_LANGUAGES.length - 1,
								"rounded-b-[5px]": index === 0,
							},
						)}
					>
						{item.name}{" "}
						{locale === item.code && <CheckCircleIcon className="size-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
