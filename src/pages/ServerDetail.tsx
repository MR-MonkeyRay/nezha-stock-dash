import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import OnlineHistorySkeleton from "@/components/loading/OnlineHistorySkeleton";
import { ServerDetailChartLoading } from "@/components/loading/ServerDetailLoading";
import NetworkChartLoading from "@/components/NetworkChartLoading";
import RetryableLazy from "@/components/RetryableLazy";
import ServerDetailOverview from "@/components/ServerDetailOverview";
import TabSwitch from "@/components/TabSwitch";
import {
	getPreloadedServerDetailChart,
	loadServerDetailChart,
} from "@/lib/server-detail-preload";

const loadNetworkChart = () =>
	import("@/components/NetworkChart").then((module) => ({
		default: module.NetworkChart,
	}));

const loadKLineChart = () =>
	import("@/features/server-detail/KLineChart").then((module) => ({
		default: module.KLineChart,
	}));

const loadOnlineHistory = () =>
	import("@/components/ServerDetailOnlineHistory").then((module) => ({
		default: module.default,
	}));

export default function ServerDetail() {
	const { t } = useTranslation();
	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "instant" });
	}, []);

	// Internal values stay stable for custom CSS; labels come from tabSwitch.*.
	const tabs = ["Detail", "KLine", "Network", "Online"];
	const [currentTab, setCurrentTab] = useState(tabs[0]);
	// +1 when moving right, -1 when moving left: the new panel slides in from that side.
	const [tabDirection, setTabDirection] = useState(0);
	const changeTab = (next: string) => {
		setTabDirection(
			Math.sign(tabs.indexOf(next) - tabs.indexOf(currentTab)) || 0,
		);
		setCurrentTab(next);
	};

	const { id: server_id } = useParams();

	if (!server_id) {
		return <Navigate to="/404" replace />;
	}

	return (
		<div className="anim-rise mx-auto w-full max-w-7xl px-0 flex flex-col gap-3 server-info">
			<ServerDetailOverview server_id={server_id} />
			<TabSwitch
				tabs={tabs}
				currentTab={currentTab}
				setCurrentTab={changeTab}
			/>

			<div
				key={currentTab}
				className="anim-tab"
				style={{ "--tab-dir": tabDirection } as CSSProperties}
			>
				{currentTab === tabs[0] && (
					<RetryableLazy
						load={loadServerDetailChart}
						getPreloaded={getPreloadedServerDetailChart}
						componentProps={{ server_id }}
						fallback={<ServerDetailChartLoading />}
						resetKey={server_id}
						title={t("error.chartFailed")}
					/>
				)}
				{currentTab === tabs[1] && (
					<RetryableLazy
						load={loadKLineChart}
						componentProps={{ server_id: Number(server_id) }}
						fallback={<ServerDetailChartLoading />}
						resetKey={server_id}
						title={t("error.chartFailed")}
					/>
				)}
				{currentTab === tabs[2] && (
					<RetryableLazy
						load={loadNetworkChart}
						componentProps={{ server_id: Number(server_id), show: true }}
						fallback={<NetworkChartLoading />}
						resetKey={server_id}
						title={t("error.chartFailed")}
					/>
				)}
				{currentTab === tabs[3] && (
					<RetryableLazy
						load={loadOnlineHistory}
						componentProps={{ server_id }}
						fallback={<OnlineHistorySkeleton />}
						resetKey={server_id}
						title={t("error.chartFailed")}
					/>
				)}
			</div>
		</div>
	);
}
