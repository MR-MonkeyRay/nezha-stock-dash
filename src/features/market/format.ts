/** Six-digit "stock code" from the server id, like A-share tickers. */
export const stockCode = (id: number) => String(id).padStart(6, "0");

/** Network speed in MiB/s (as produced by selectServerMetrics) → compact text. */
export function formatSpeed(mibPerSecond: number) {
	if (!Number.isFinite(mibPerSecond) || mibPerSecond <= 0) return "0K/s";
	if (mibPerSecond >= 1024) return `${(mibPerSecond / 1024).toFixed(2)}G/s`;
	if (mibPerSecond >= 1) return `${mibPerSecond.toFixed(2)}M/s`;
	return `${(mibPerSecond * 1024).toFixed(1)}K/s`;
}

/** Uptime seconds → "12d" / "5h" / "8m". Language-neutral and narrow for tables. */
export function formatUptimeShort(seconds: number) {
	if (!Number.isFinite(seconds) || seconds <= 0) return "--";
	const days = Math.floor(seconds / 86400);
	if (days >= 1) return `${days}d`;
	const hours = Math.floor(seconds / 3600);
	if (hours >= 1) return `${hours}h`;
	return `${Math.max(1, Math.floor(seconds / 60))}m`;
}

/** Usage level for neutral bars (not a direction): ok / warn (>70) / bad (>90). */
export function usageLevelClass(percent: number) {
	if (percent > 90) return "bg-status-bad";
	if (percent > 70) return "bg-status-warn";
	return "bg-status-ok";
}
