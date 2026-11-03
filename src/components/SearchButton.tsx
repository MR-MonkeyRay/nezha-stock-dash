import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { useCommand } from "@/hooks/use-command";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";

export function SearchButton() {
	const { t } = useTranslation();
	const { openCommand } = useCommand();

	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	return (
		<Button
			variant="outline"
			size="sm"
			className={cn("rounded-sm bg-card px-[9px]", {
				"bg-card/70": customBackgroundImage,
			})}
			onClick={openCommand}
			title={t("a11y.search")}
		>
			<MagnifyingGlassIcon className="size-4" />
			<span className="sr-only">{t("a11y.search")}</span>
		</Button>
	);
}
