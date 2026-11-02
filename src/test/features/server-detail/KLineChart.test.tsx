import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildKLineData,
	KLineChart,
} from "@/features/server-detail/KLineChart";
import { createServer, createSettingResponse } from "@/test/fixtures";
import { renderWithProviders } from "@/test/utils";

const chartMocks = vi.hoisted(() => {
	const series = () => ({ applyOptions: vi.fn(), setData: vi.fn() });
	const state = {
		created: [] as { series: ReturnType<typeof series>[] }[],
		crosshair: undefined as undefined | ((param: { time?: unknown }) => void),
		remove: vi.fn(),
		fitContent: vi.fn(),
		history: {
			status: "success" as string,
			isLoading: false,
			data: [] as { ts: number; value: number }[][],
		},
		isLogin: true,
		tsdb: true,
		calls: [] as [number, string[], string][],
	};
	return { series, state };
});

vi.mock("lightweight-charts", () => ({
	CandlestickSeries: "Candlestick",
	HistogramSeries: "Histogram",
	LineSeries: "Line",
	ColorType: { Solid: "solid" },
	CrosshairMode: { Normal: 0 },
	createChart: vi.fn(() => {
		const created = { series: [] as ReturnType<typeof chartMocks.series>[] };
		chartMocks.state.created.push(created);
		return {
			addSeries: vi.fn(() => {
				const item = chartMocks.series();
				created.series.push(item);
				return item;
			}),
			panes: () => [
				{ setStretchFactor: vi.fn() },
				{ setStretchFactor: vi.fn() },
			],
			applyOptions: vi.fn(),
			timeScale: () => ({ fitContent: chartMocks.state.fitContent }),
			subscribeCrosshairMove: (
				handler: (param: { time?: unknown }) => void,
			) => {
				chartMocks.state.crosshair = handler;
			},
			unsubscribeCrosshairMove: vi.fn(),
			remove: chartMocks.state.remove,
		};
	}),
}));

vi.mock("@/hooks/use-metric-history", () => ({
	useMetricHistory: (...args: [number, string[], string]) => {
		chartMocks.state.calls.push(args);
		return {
			...chartMocks.state.history,
			error: null,
			dataPeriod: null,
		};
	},
}));

vi.mock("@/hooks/use-login-user", () => ({
	useLoginUser: () => ({ isAuthenticated: chartMocks.state.isLogin }),
}));

vi.mock("@/lib/nezha-api", () => ({
	fetchSetting: () =>
		Promise.resolve({
			...createSettingResponse(),
			data: {
				...createSettingResponse().data,
				tsdb_enabled: chartMocks.state.tsdb,
			},
		}),
}));

vi.mock("@/hooks/use-websocket-context", () => ({
	useWebSocketContext: () => ({
		lastData: {
			now: Date.now(),
			servers: [createServer({ id: 3, host: { mem_total: 200 } })],
		},
	}),
}));

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const series = (values: number[], step = 15 * 60_000) =>
	values.map((value, index) => ({ ts: T0 + index * step, value }));

function lastCall() {
	const { calls } = chartMocks.state;
	return calls[calls.length - 1];
}

describe("KLineChart", () => {
	beforeEach(() => {
		chartMocks.state.created = [];
		chartMocks.state.calls = [];
		chartMocks.state.isLogin = true;
		chartMocks.state.tsdb = true;
		chartMocks.state.history = {
			status: "success",
			isLoading: false,
			data: [
				series([10, 20, 5, 15, 15, 25, 30, 12]),
				series([1024, 1024]),
				series([2048, 2048]),
			],
		};
	});

	it("projects histories into candles, volume and moving averages", () => {
		const data = buildKLineData(
			"1d",
			series([100, 50]),
			[series([10]), series([20])],
			(value) => value / 2,
		);
		expect(data.bucketMs).toBe(HOUR);
		expect(data.candles[0]).toMatchObject({ open: 50, close: 25 });
		expect([...data.volume.values()]).toEqual([30]);
		expect(data.ma.map((item) => item.window)).toEqual([5, 10, 20]);
	});

	it("renders candlesticks, MA lines and a volume pane with theme colors", async () => {
		const { unmount } = renderWithProviders(<KLineChart server_id={3} />);
		expect(await screen.findByTestId("kline-chart")).toBeInTheDocument();
		const created = chartMocks.state.created[0];
		// candles + 3 MA lines + volume
		expect(created.series).toHaveLength(5);
		const [candles, , , , volume] = created.series;
		expect(candles.setData).toHaveBeenCalled();
		expect(candles.applyOptions).toHaveBeenCalledWith(
			expect.objectContaining({ upColor: expect.stringMatching(/^rgba/) }),
		);
		expect(volume.setData.mock.calls[0][0][0]).toMatchObject({ value: 3072 });
		expect(chartMocks.state.fitContent).toHaveBeenCalled();
		expect(screen.getByText(/MA5/)).toBeInTheDocument();

		// Theme or convention changes re-apply colors.
		const before = candles.applyOptions.mock.calls.length;
		act(() => {
			document.documentElement.setAttribute("data-price-color", "green-up");
		});
		await waitFor(() =>
			expect(candles.applyOptions.mock.calls.length).toBeGreaterThan(before),
		);

		// Crosshair hover switches the OHLC legend to the hovered candle.
		act(() => chartMocks.state.crosshair?.({ time: undefined }));
		act(() => chartMocks.state.crosshair?.({ time: "2025-01-01" }));
		unmount();
		expect(chartMocks.state.remove).toHaveBeenCalled();
	});

	it("switches metric and period, and converts memory bytes to percent", async () => {
		const user = userEvent.setup();
		renderWithProviders(<KLineChart server_id={3} />);
		await user.click(screen.getByRole("tab", { name: "market.mem" }));
		expect(lastCall()?.[1]).toEqual([
			"memory",
			"net_in_speed",
			"net_out_speed",
		]);
		await user.click(
			screen.getByRole("button", { name: "serverDetailChart.period7d" }),
		);
		expect(lastCall()?.[2]).toBe("7d");
		await user.click(screen.getByRole("tab", { name: /market.load/ }));
		expect(lastCall()?.[1]?.[0]).toBe("load1");
	});

	it("limits guests to one day and shows empty, loading and TSDB states", async () => {
		chartMocks.state.isLogin = false;
		chartMocks.state.history = {
			status: "success",
			isLoading: false,
			data: [[]],
		};
		const { unmount } = renderWithProviders(<KLineChart server_id={3} />);
		expect(
			screen.getByRole("button", { name: "serverDetailChart.period30d" }),
		).toBeDisabled();
		expect(lastCall()?.[2]).toBe("1d");
		expect(screen.getByText("monitor.noData")).toBeInTheDocument();
		unmount();

		chartMocks.state.history = { status: "pending", isLoading: true, data: [] };
		const loading = renderWithProviders(<KLineChart server_id={3} />);
		expect(screen.queryByTestId("kline-chart")).not.toBeInTheDocument();
		loading.unmount();

		chartMocks.state.tsdb = false;
		renderWithProviders(<KLineChart server_id={3} />);
		expect(
			await screen.findByText("serverDetailChart.tsdbRequired"),
		).toBeInTheDocument();
	});
});
