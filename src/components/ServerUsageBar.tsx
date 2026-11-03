import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";

type ServerUsageBarProps = {
	value: number;
};

export default function ServerUsageBar({ value }: ServerUsageBarProps) {
	const { t } = useTranslation();
	return (
		<Progress
			aria-label={t("a11y.usageBar")}
			value={value}
			indicatorClassName={
				value > 90
					? "bg-status-bad"
					: value > 70
						? "bg-status-warn"
						: "bg-status-ok"
			}
			className={"h-[3px] rounded-sm"}
		/>
	);
}
