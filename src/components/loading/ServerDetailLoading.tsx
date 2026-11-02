import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

// Shared critical styles live in index.html so these placeholders also render
// before the application bundle arrives on a direct /server/:id visit.
const STATS = Array.from({ length: 12 }, (_, index) => index);
const TABS = [0, 1, 2, 3];

export function ServerDetailChartLoading() {
	const { t } = useTranslation();
	const { backgroundImage } = useRuntimeConfig();
	return (
		<div
			role="status"
			aria-label={t("serviceTracker.loading")}
			aria-busy="true"
			className={cn(
				"detail-skeleton detail-chart-loading",
				backgroundImage && "detail-transparent",
			)}
		>
			<div aria-hidden="true">
				<div className="detail-period">
					<span className="detail-bar" />
				</div>
				<div className="detail-chart-grid">
					{[0, 1, 2, 3, 4, 5].map((index) => (
						<div key={index} className="detail-card detail-chart-card">
							<div className="detail-chart-title">
								<span className="detail-bar" />
								<span className="detail-bar" />
							</div>
							<div className="detail-chart-plot">
								{[0, 1, 2].map((tick) => (
									<div key={tick} className="detail-chart-tick">
										<span className="detail-bar" />
										<i />
									</div>
								))}
								<div className="detail-chart-axis">
									{[0, 1, 2].map((tick) => (
										<span key={tick} className="detail-bar" />
									))}
								</div>
								<span className="detail-chart-spinner" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function ServerDetailLoading() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { backgroundImage } = useRuntimeConfig();
	return (
		<div
			className={cn(
				"detail-skeleton detail-summary",
				backgroundImage && "detail-summary-background",
			)}
			aria-busy="true"
		>
			<button
				type="button"
				aria-label={t("Home")}
				onClick={() => navigate("/")}
				className="detail-name"
			>
				<svg
					aria-hidden="true"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<path d="m14 6-6 6 6 6" />
				</svg>
				<span aria-hidden="true" className="detail-bar" />
				<span aria-hidden="true" className="detail-bar" />
			</button>
			<div aria-hidden="true" className="detail-card detail-quote">
				<div className="detail-price">
					<span className="detail-bar" />
					<span className="detail-bar" />
					<span className="detail-bar" />
				</div>
				<div className="detail-stats">
					{STATS.map((index) => (
						<div key={index} className="detail-stat">
							<span className="detail-bar" />
							<span className="detail-bar" />
						</div>
					))}
				</div>
			</div>
			<div aria-hidden="true" className="detail-card detail-f10">
				<span className="detail-bar" />
			</div>
		</div>
	);
}

export function ServerDetailPageLoading() {
	return (
		<div className="detail-skeleton detail-page server-info">
			<ServerDetailLoading />
			<div aria-hidden="true" className="detail-tabs">
				{TABS.map((index) => (
					<span key={index} className="detail-bar" />
				))}
			</div>
			<ServerDetailChartLoading />
		</div>
	);
}
