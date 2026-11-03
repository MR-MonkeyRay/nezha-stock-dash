import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SkeletonBar({ className }: { className: string }) {
	return (
		<Skeleton
			className={cn(
				"rounded-[5px] bg-muted motion-reduce:animate-none",
				className,
			)}
		/>
	);
}
