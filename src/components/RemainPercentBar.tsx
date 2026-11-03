import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

import { Progress } from "./ui/progress";

export default function RemainPercentBar({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	const { t } = useTranslation();
	return (
		<Progress
			aria-label={t("a11y.usageBar")}
			value={value}
			indicatorClassName={
				value < 30
					? "bg-status-bad"
					: value < 70
						? "bg-status-warn"
						: "bg-status-ok"
			}
			className={cn("h-[3px] rounded-sm w-[70px]", className)}
		/>
	);
}
