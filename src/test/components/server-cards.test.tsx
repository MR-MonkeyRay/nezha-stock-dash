import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServerCard from "@/components/ServerCard";
import type { SortOrder, SortType } from "@/context/sort-context";
import { computeQuote, type Quote } from "@/features/market/quote-series";
import { Watchlist } from "@/features/market/Watchlist";
import { createServer } from "@/test/fixtures";
import { renderWithProviders } from "@/test/utils";

const publicNote = JSON.stringify({
	billingDataMod: {
		startDate: "2025-01-01T00:00:00.000Z",
		endDate: "2025-01-31T00:00:00.000Z",
		autoRenewal: "0",
		cycle: "monthly",
		amount: "10",
	},
	planDataMod: {
		bandwidth: "1Gbps",
		trafficVol: "2TB",
		trafficType: "monthly",
		IPv4: "1",
		IPv6: "1",
		networkRoute: "CN2,CMI",
		extra: "Premium",
	},
});

const NOW = Date.parse("2025-01-01T00:00:20.000Z");
const rising = computeQuote([10, 12], true);
const falling = computeQuote([20, 12], true);

function LocationProbe() {
	const location = useLocation();
	return <p>{location.pathname}</p>;
}

function useDesktop(matches: boolean) {
	vi.mocked(window.matchMedia).mockImplementation(
		(query: string) =>
			({
				matches,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}) as unknown as MediaQueryList,
	);
}

describe("ServerCard quote tile", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-15T00:00:00.000Z"));
		Object.assign(window, {
			ForceUseSvgFlag: true,
			ShowNetTransfer: true,
		});
	});

	it("updates memoized card display when config changes without a server tick", () => {
		window.ShowNetTransfer = false;
		const server = createServer({ name: "live-config" });
		const { container } = renderWithProviders(
			<ServerCard now={NOW} serverInfo={server} quote={rising} />,
		);
		expect(
			screen.queryByText("serverCard.upload:2.00 GiB"),
		).not.toBeInTheDocument();
		act(() => {
			window.ShowNetTransfer = true;
			window.CustomBackgroundImage = "/late.png";
		});
		expect(screen.getByText("serverCard.upload:2.00 GiB")).toBeInTheDocument();
		expect(container.querySelector(".bg-card\\/70")).toBeInTheDocument();
	});

	it("renders the quote, metrics, billing and plan data, and navigates on click", () => {
		const server = createServer({
			id: 7,
			name: "edge-online",
			public_note: publicNote,
			host: { platform: "Windows Server" },
		});

		renderWithProviders(
			<>
				<ServerCard now={NOW} serverInfo={server} quote={rising} />
				<LocationProbe />
			</>,
		);

		expect(screen.getByText("edge-online")).toBeInTheDocument();
		expect(screen.getByText("000007")).toBeInTheDocument();
		expect(screen.getByText("Windows")).toBeInTheDocument();
		expect(screen.getByText("12.00%")).toHaveClass("text-up");
		expect(screen.getByText("+20.00%")).toBeInTheDocument();
		expect(screen.getAllByText("25.0%")).toHaveLength(2);
		expect(screen.getByText("2.00M/s")).toHaveClass("text-up");
		expect(screen.getByText("1.00M/s")).toHaveClass("text-down");
		expect(screen.getByText("serverCard.upload:2.00 GiB")).toBeInTheDocument();
		expect(screen.getByText("1Gbps")).toBeInTheDocument();
		expect(
			screen.getAllByText(/billingInfo.remaining: 16/).length,
		).toBeGreaterThan(0);

		Object.defineProperty(window, "scrollY", {
			configurable: true,
			value: 432,
		});
		fireEvent.click(screen.getByText("edge-online"));

		expect(sessionStorage.getItem("fromMainPage")).toBe("true");
		expect(sessionStorage.getItem("scrollPosition")).toBe("432");
		expect(screen.getByText("/server/7")).toBeInTheDocument();
	});

	it("shows an offline server as halted (停牌) without live metrics", () => {
		const server = createServer({
			id: 8,
			name: "edge-offline",
			public_note: publicNote,
			last_active: "2024-12-31T23:00:00.000Z",
		});

		renderWithProviders(
			<ServerCard now={NOW} serverInfo={server} quote={rising} />,
		);

		expect(screen.getByText("edge-offline")).toBeInTheDocument();
		expect(screen.getAllByText("market.suspended").length).toBeGreaterThan(0);
		expect(screen.getByText("1Gbps")).toBeInTheDocument();
		expect(screen.queryByText("serverCard.mem")).not.toBeInTheDocument();
	});
});

function renderWatchlist(
	quotes: Map<number, Quote>,
	sort: Partial<{
		sortType: SortType;
		sortOrder: SortOrder;
		setSortType: (value: SortType) => void;
		setSortOrder: (value: SortOrder) => void;
	}> = {},
) {
	const servers = [
		createServer({ id: 1, name: "alpha", public_note: publicNote }),
		createServer({ id: 2, name: "beta", host: { platform: "Windows" } }),
		createServer({
			id: 3,
			name: "gamma",
			last_active: "2024-12-31T23:00:00.000Z",
		}),
	];
	return renderWithProviders(
		<>
			<Watchlist
				servers={servers}
				quotes={quotes}
				now={NOW}
				sortType={sort.sortType ?? "default"}
				sortOrder={sort.sortOrder ?? "desc"}
				setSortType={sort.setSortType ?? vi.fn()}
				setSortOrder={sort.setSortOrder ?? vi.fn()}
			/>
			<LocationProbe />
		</>,
	);
}

describe("Watchlist", () => {
	const quotes = new Map<number, Quote>([
		[1, rising],
		[2, falling],
	]);

	beforeEach(() => {
		Object.assign(window, { ForceUseSvgFlag: true, ShowNetTransfer: true });
	});

	it("renders a sortable quote table on desktop with halted rows", async () => {
		useDesktop(true);
		const user = userEvent.setup();
		const setSortType = vi.fn();
		const setSortOrder = vi.fn();
		renderWatchlist(quotes, { setSortType, setSortOrder });

		expect(screen.getByRole("table")).toBeInTheDocument();
		const rows = screen.getAllByRole("row");
		expect(rows).toHaveLength(4);
		expect(screen.getByText("+20.00%")).toHaveClass("text-up");
		expect(screen.getByText("−40.00%")).toHaveClass("text-down");
		expect(screen.getAllByText("market.rising").length).toBeGreaterThan(0);
		expect(screen.getByText("market.suspended")).toBeInTheDocument();
		expect(screen.getByText("1Gbps")).toBeInTheDocument();
		expect(screen.getAllByText("↑2.00 GiB")).toHaveLength(2);

		await user.click(screen.getByRole("button", { name: /market.mem/ }));
		expect(setSortType).toHaveBeenCalledWith("mem");
		expect(setSortOrder).toHaveBeenCalledWith("desc");
		await user.click(screen.getByRole("button", { name: /market.name/ }));
		expect(setSortOrder).toHaveBeenCalledWith("asc");

		await user.click(screen.getByText("beta"));
		expect(screen.getByText("/server/2")).toBeInTheDocument();
		fireEvent.click(rows[1]);
		expect(screen.getByText("/server/1")).toBeInTheDocument();
	});

	it("toggles direction on the active sort column", async () => {
		useDesktop(true);
		const user = userEvent.setup();
		const setSortOrder = vi.fn();
		renderWatchlist(quotes, {
			sortType: "cpu",
			sortOrder: "desc",
			setSortOrder,
		});
		const header = screen.getByRole("columnheader", { name: /market.last/ });
		expect(header).toHaveAttribute("aria-sort", "descending");
		await user.click(screen.getByRole("button", { name: /market.last/ }));
		expect(setSortOrder).toHaveBeenCalledWith("asc");
	});

	it("renders compact quote rows on phones and cycles the pill column", async () => {
		useDesktop(false);
		const user = userEvent.setup();
		renderWatchlist(quotes);

		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(screen.getByText("+20.00%")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "market.cycleColumn" }),
		);
		expect(screen.getByText("+2.00")).toBeInTheDocument();
		await user.click(screen.getByText("+2.00"));
		expect(screen.getAllByText("25.0%").length).toBeGreaterThan(0);
		await user.click(
			screen.getByRole("button", { name: "market.cycleColumn" }),
		);
		expect(screen.getByText("+20.00%")).toBeInTheDocument();

		await user.click(screen.getByRole("link", { name: "alpha" }));
		expect(screen.getByText("/server/1")).toBeInTheDocument();
	});
});
