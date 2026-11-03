let loadedDetail: typeof import("@/pages/ServerDetail").default | undefined;
let loadedChart:
	| typeof import("@/components/ServerDetailChart").default
	| undefined;

export const getPreloadedServerDetail = () => loadedDetail;
export const getPreloadedServerDetailChart = () => loadedChart;

let detailModule: Promise<typeof import("@/pages/ServerDetail")> | undefined;
let chartModule:
	| Promise<typeof import("@/components/ServerDetailChart")>
	| undefined;

export function loadServerDetail() {
	if (!detailModule) {
		detailModule = import("@/pages/ServerDetail")
			.then((module) => {
				loadedDetail = module.default;
				return module;
			})
			.catch((error) => {
				detailModule = undefined;
				throw error;
			});
	}
	return detailModule;
}

export function loadServerDetailChart() {
	if (!chartModule) {
		chartModule = import("@/components/ServerDetailChart")
			.then((module) => {
				loadedChart = module.default;
				return module;
			})
			.catch((error) => {
				chartModule = undefined;
				throw error;
			});
	}
	return chartModule;
}

export function preloadServerDetail() {
	// 页面与图表并行下载；预加载失败不阻断导航，实际进入时仍可重试。
	void Promise.all([loadServerDetail(), loadServerDetailChart()]).catch(
		() => undefined,
	);
}

/** Runs `task` once the browser is idle, so prefetching never competes with
 * the current page's first render. Returns a canceller. */
export function whenIdle(task: () => void): () => void {
	if (typeof window.requestIdleCallback === "function") {
		const handle = window.requestIdleCallback(task, { timeout: 4000 });
		return () => window.cancelIdleCallback(handle);
	}
	// Safari has no requestIdleCallback; wait past first paint and data.
	const timer = window.setTimeout(task, 2000);
	return () => window.clearTimeout(timer);
}

/** Preload the detail route's code while the home page is idle. */
export const preloadServerDetailWhenIdle = () => whenIdle(preloadServerDetail);
