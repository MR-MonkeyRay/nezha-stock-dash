import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServerDetailOverview from "@/components/ServerDetailOverview";
import { createServer } from "@/test/fixtures";

const websocketMocks = vi.hoisted(() => ({
	connected: true,
	lastData: null as {
		now: number;
		servers: ReturnType<typeof createServer>[];
	} | null,
	messageHistory: [] as {
		now: number;
		servers: ReturnType<typeof createServer>[];
	}[],
}));

vi.mock("@/hooks/use-websocket-context", () => ({
	useWebSocketContext: () => websocketMocks,
}));

function seedWebSocketData({
	server = createServer(),
	now = Date.parse("2025-01-01T00:00:20.000Z"),
} = {}) {
	websocketMocks.connected = true;
	websocketMocks.lastData = {
		now,
		servers: [server],
	};
	websocketMocks.messageHistory = [];
}

function LocationProbe() {
	const location = useLocation();
	return <p>{location.pathname}</p>;
}

describe("ServerDetailOverview", () => {
	beforeEach(() => {
		websocketMocks.connected = true;
		websocketMocks.lastData = null;
		Object.assign(window, { ForceUseSvgFlag: true });
	});

	it("shows the loading shell when websocket data or the selected server is missing", () => {
		websocketMocks.connected = false;
		const { rerender } = render(
			<MemoryRouter>
				<ServerDetailOverview server_id="1" />
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();

		seedWebSocketData();
		rerender(
			<MemoryRouter>
				<ServerDetailOverview server_id="404" />
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
	});

	it("renders server identity, hardware, traffic, and temperature details", async () => {
		const user = userEvent.setup();
		sessionStorage.setItem("fromMainPage", "true");
		seedWebSocketData({
			server: createServer({
				id: 7,
				name: "edge-detail",
				country_code: "us",
				host: {
					gpu: ["NVIDIA T4"],
				},
				state: {
					temperatures: [{ Name: "CPU Core", Temperature: 55.5 }],
				},
			}),
		});

		const { unmount } = render(
			<MemoryRouter initialEntries={["/", "/server/7"]} initialIndex={1}>
				<ServerDetailOverview server_id="7" />
				<LocationProbe />
			</MemoryRouter>,
		);

		expect(screen.getByText("edge-detail")).toBeInTheDocument();
		expect(screen.getByText("market.trading")).toBeInTheDocument();
		expect(screen.getByText("000007")).toBeInTheDocument();

		// The 简况 (F10) profile starts collapsed on mobile (matchMedia is false).
		await user.click(screen.getByRole("button", { name: /market.profile/ }));
		expect(screen.getByText("1.0.0")).toBeInTheDocument();
		expect(screen.getByText("amd64")).toBeInTheDocument();
		expect(screen.getByText("US")).toBeInTheDocument();
		expect(screen.getByText(/linux - 6.8/)).toBeInTheDocument();
		expect(screen.getByText(/AMD EPYC/)).toBeInTheDocument();
		expect(screen.getByText("NVIDIA T4")).toBeInTheDocument();
		expect(screen.getByText("2.00 GiB")).toBeInTheDocument();
		expect(screen.getByText("1.00 GiB")).toBeInTheDocument();
		expect(screen.getByText("CPU Core")).toBeInTheDocument();
		expect(screen.getByText(/55.50 °C/)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "market.back" }));
		expect(screen.getByText("/")).toBeInTheDocument();

		unmount();
		expect(sessionStorage.getItem("fromMainPage")).toBeNull();
	});

	it("quotes CPU against the oldest frame in the window", () => {
		const now = Date.parse("2025-01-01T00:00:20.000Z");
		seedWebSocketData({ server: createServer({ state: { cpu: 15 } }), now });
		websocketMocks.messageHistory = [
			{ now: now - 2000, servers: [createServer({ state: { cpu: 11 } })] },
			{ now: now - 4000, servers: [createServer({ state: { cpu: 10 } })] },
		];

		render(
			<MemoryRouter>
				<ServerDetailOverview server_id="1" />
			</MemoryRouter>,
		);

		expect(screen.getByText("market.trading")).toBeInTheDocument();
		// 现价 15.00%, change +5.00pp (+50.00%) vs 10%, high 15 / low 10.
		expect(screen.getAllByText(/15\.00/).length).toBeGreaterThan(0);
		expect(screen.getByText(/50\.00%/)).toBeInTheDocument();
		expect(screen.getByText("10.00%")).toBeInTheDocument();
	});

	it("marks an offline server as 停牌 and blanks live stats", () => {
		seedWebSocketData({
			now: Date.parse("2025-01-01T01:00:00.000Z"),
		});

		render(
			<MemoryRouter>
				<ServerDetailOverview server_id="1" />
			</MemoryRouter>,
		);

		expect(screen.getAllByText("market.suspended").length).toBeGreaterThan(0);
		expect(screen.getAllByText("--").length).toBeGreaterThan(4);
	});
});
