import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import GlobalMap from "@/components/GlobalMap";
import HomeSkeleton from "@/components/loading/HomeSkeleton";
import ServerOverview from "@/components/ServerOverview";
import { ServiceTracker } from "@/components/ServiceTracker";
import { TickerTape } from "@/features/market/TickerTape";
import { useMarket } from "@/features/market/use-market";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import {
	selectGroupServerIds,
	selectGroupTabs,
	selectServers,
} from "@/features/servers/selectors";
import { ServerControls } from "@/features/servers/server-controls";
import { ServerList } from "@/features/servers/server-list";
import { BackendErrorState } from "@/features/servers/server-states";
import { useServerPreferences } from "@/features/servers/use-server-preferences";
import { useSort } from "@/hooks/use-sort";
import { useStatus } from "@/hooks/use-status";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { fetchServerGroup, fetchService } from "@/lib/nezha-api";

export default function Servers({
	backendError,
	configurationLoading = false,
}: {
	backendError?: Error | null;
	configurationLoading?: boolean;
}) {
	const sort = useSort();
	const { sortType, sortOrder } = sort;
	const { data: groupData, error: groupError } = useQuery({
		queryKey: ["server-group"],
		queryFn: () => fetchServerGroup(),
		retry: false,
	});
	const { data: serviceData, error: serviceError } = useQuery({
		queryKey: ["service"],
		queryFn: () => fetchService(),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		refetchInterval: 10000,
		retry: false,
	});
	const hasServices =
		!!serviceData?.data?.services &&
		Object.keys(serviceData.data.services).length > 0;
	const { lastData } = useWebSocketContext();
	const { status } = useStatus();
	const nezhaWsData = lastData;
	const preferences = useServerPreferences(
		hasServices,
		nezhaWsData,
		!configurationLoading,
	);
	const { showServices, showMap, view, currentGroup } = preferences;

	const { backgroundImage: customBackgroundImage } = useRuntimeConfig();

	const groupServerIdSets = useMemo(
		() => selectGroupServerIds(groupData?.data),
		[groupData?.data],
	);
	const groupTabs = useMemo(
		() => selectGroupTabs(groupData?.data),
		[groupData?.data],
	);
	const {
		down,
		downSpeed,
		filteredServers,
		groupServers,
		offlineServers,
		onlineServers,
		totalServers,
		up,
		upSpeed,
	} = useMemo(
		() =>
			selectServers({
				data: nezhaWsData,
				currentGroup,
				groupServerIdSets,
				status,
				sortType,
				sortOrder,
			}),
		[nezhaWsData, currentGroup, groupServerIdSets, status, sortType, sortOrder],
	);

	const market = useMarket(groupServers);

	const currentBackendError = backendError || groupError || serviceError;

	if (!nezhaWsData && currentBackendError) {
		return <BackendErrorState error={currentBackendError} />;
	}

	if (!nezhaWsData || configurationLoading) {
		return <HomeSkeleton />;
	}

	const hasServers = nezhaWsData.servers.length > 0;

	return (
		<div className="anim-rise mx-auto w-full max-w-7xl px-0">
			<TickerTape items={market.ticker} className="-mx-3 mb-3 md:mx-0" />
			<ServerOverview
				total={totalServers}
				online={onlineServers}
				offline={offlineServers}
				up={up}
				down={down}
				upSpeed={upSpeed}
				downSpeed={downSpeed}
				index={market.index}
				breadth={market.breadth}
			/>
			<ServerControls
				{...preferences}
				{...sort}
				hasServers={hasServers}
				hasServices={hasServices}
				groupTabs={groupTabs}
				customBackgroundImage={customBackgroundImage}
			/>
			{hasServers && showMap && (
				<div className="anim-expand">
					<GlobalMap now={nezhaWsData.now} serverList={nezhaWsData.servers} />
				</div>
			)}
			{hasServers && showServices && (
				<div className="anim-expand">
					<ServiceTracker serverList={filteredServers} />
				</div>
			)}
			<ServerList
				hasServers={hasServers}
				filteredServers={filteredServers}
				view={view}
				now={nezhaWsData.now}
				quotes={market.quotes}
				sort={sort}
			/>
		</div>
	);
}
