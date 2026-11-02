import { Progress } from "@/components/ui/progress";

type ServerUsageBarProps = {
	value: number;
};

export default function ServerUsageBar({ value }: ServerUsageBarProps) {
	return (
		<Progress
			aria-label={"Server Usage Bar"}
			aria-labelledby={"Server Usage Bar"}
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
