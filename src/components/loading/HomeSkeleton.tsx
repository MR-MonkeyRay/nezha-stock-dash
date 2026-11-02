import ServerOverview from "@/components/ServerOverview";
import { Loader } from "./Loader";
import SkeletonBar from "./SkeletonBar";

const ITEMS = [0, 1, 2, 3, 4, 5];

export default function HomeSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="mx-auto flex w-full max-w-7xl flex-1 flex-col"
		>
			<div aria-hidden="true">
				<div className="-mx-3 mb-3 flex h-[30px] items-center gap-6 overflow-hidden border-y border-border px-3 md:mx-0">
					{ITEMS.map((item) => (
						<SkeletonBar key={item} className="h-3 w-32 shrink-0" />
					))}
				</div>
				<ServerOverview
					loading
					total={0}
					online={0}
					offline={0}
					up={0}
					down={0}
					upSpeed={0}
					downSpeed={0}
				/>
				<div className="mt-3 flex h-8 items-center justify-between gap-4">
					<div className="flex min-w-0 items-center gap-2 overflow-hidden">
						<SkeletonBar className="h-8 w-28 shrink-0 rounded-sm" />
						<SkeletonBar className="h-8 w-16 shrink-0 rounded-sm" />
						<SkeletonBar className="h-6 w-12 shrink-0 rounded-sm" />
						<SkeletonBar className="hidden h-6 w-20 rounded-sm sm:block" />
					</div>
					<SkeletonBar className="h-8 w-28 shrink-0 rounded-sm" />
				</div>
			</div>
			<div className="flex min-h-16 flex-1 items-center justify-center gap-2">
				<span aria-hidden="true">
					<Loader visible />
				</span>
				<p className="text-sm font-semibold">Loading…</p>
			</div>
		</div>
	);
}
