import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashCommand, rankServers } from "@/components/DashCommand";
import { createServer } from "@/test/fixtures";

const dashMocks = vi.hoisted(() => ({
	closeCommand: vi.fn(),
	isOpen: true,
	lastData: null as {
		now: number;
		servers: ReturnType<typeof createServer>[];
	} | null,
	navigate: vi.fn(),
	setTheme: vi.fn(),
	setPriceColor: vi.fn(),
	priceColorForced: false,
	toggleCommand: vi.fn(),
	connected: true,
}));

vi.mock("@/hooks/use-command", () => ({
	useCommand: () => ({
		closeCommand: dashMocks.closeCommand,
		isOpen: dashMocks.isOpen,
		toggleCommand: dashMocks.toggleCommand,
	}),
}));

vi.mock("@/hooks/use-theme", () => ({
	useTheme: () => ({
		setTheme: dashMocks.setTheme,
	}),
}));

vi.mock("@/hooks/use-price-color", () => ({
	usePriceColor: () => ({
		priceColor: "red-up",
		setPriceColor: dashMocks.setPriceColor,
		forced: dashMocks.priceColorForced,
	}),
}));

vi.mock("@/hooks/use-websocket-context", () => ({
	useWebSocketContext: () => ({
		connected: dashMocks.connected,
		lastData: dashMocks.lastData,
	}),
}));

vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router-dom")>();
	return {
		...actual,
		useNavigate: () => dashMocks.navigate,
	};
});

function seedWebSocketData() {
	dashMocks.connected = true;
	dashMocks.lastData = {
		now: Date.parse("2025-01-01T00:00:20.000Z"),
		servers: [
			createServer({
				id: 7,
				name: "edge-7",
				last_active: "2025-01-01T00:00:00.000Z",
			}),
		],
	};
}

describe("DashCommand", () => {
	beforeEach(() => {
		dashMocks.closeCommand.mockClear();
		dashMocks.navigate.mockClear();
		dashMocks.setTheme.mockClear();
		dashMocks.setPriceColor.mockClear();
		dashMocks.priceColorForced = false;
		dashMocks.toggleCommand.mockClear();
		dashMocks.isOpen = true;
		dashMocks.connected = true;
		dashMocks.lastData = null;
	});

	it("does not render until websocket data is available", () => {
		dashMocks.connected = false;
		dashMocks.lastData = null;

		const { container } = render(<DashCommand />);

		expect(container).toBeEmptyDOMElement();
	});

	it("adds no layout element when websocket connects with the command dialog closed", () => {
		dashMocks.isOpen = false;
		dashMocks.connected = false;
		const { container, rerender } = render(<DashCommand />);
		expect(container).toBeEmptyDOMElement();
		seedWebSocketData();
		rerender(<DashCommand />);
		expect(container).toBeEmptyDOMElement();
	});

	it("keeps the accessible title inside the open dialog", () => {
		seedWebSocketData();
		render(<DashCommand />);
		const dialog = screen.getByRole("dialog", { name: "Command palette" });
		expect(dialog).toContainElement(
			screen.getByRole("heading", { name: "Command palette" }),
		);
	});

	it("does not mount server command items while the dialog is closed", () => {
		seedWebSocketData();
		dashMocks.isOpen = false;

		render(<DashCommand />);

		expect(screen.queryByText("edge-7")).not.toBeInTheDocument();
	});

	it("renders server and shortcut commands, handles selection, and listens for keyboard toggle", async () => {
		const user = userEvent.setup();
		seedWebSocketData();

		render(<DashCommand />);

		fireEvent.keyDown(document, { key: "k", metaKey: true });
		expect(dashMocks.toggleCommand).toHaveBeenCalledOnce();

		expect(screen.getByPlaceholderText("TypeCommand")).toBeInTheDocument();
		expect(screen.getByText("edge-7")).toBeInTheDocument();
		expect(screen.getByText("ToggleDarkMode")).toBeInTheDocument();

		Object.defineProperty(window, "scrollY", {
			configurable: true,
			value: 256,
		});
		await user.click(screen.getByText("edge-7"));
		expect(dashMocks.navigate).toHaveBeenCalledWith("/server/7");
		expect(sessionStorage.getItem("fromMainPage")).toBe("true");
		expect(sessionStorage.getItem("scrollPosition")).toBe("256");
		expect(dashMocks.closeCommand).toHaveBeenCalled();

		await user.click(screen.getByText("ToggleDarkMode"));
		expect(dashMocks.setTheme).toHaveBeenCalledWith("dark");
	});

	it("offers up/down color commands unless the convention is forced", async () => {
		const user = userEvent.setup();
		seedWebSocketData();
		dashMocks.priceColorForced = false;

		const { rerender } = render(<DashCommand />);
		await user.click(screen.getByText("priceColor.useGreenUp"));
		expect(dashMocks.setPriceColor).toHaveBeenCalledWith("green-up");
		await user.click(screen.getByText("priceColor.useRedUp"));
		expect(dashMocks.setPriceColor).toHaveBeenCalledWith("red-up");

		dashMocks.priceColorForced = true;
		rerender(<DashCommand />);
		expect(screen.queryByText("priceColor.useGreenUp")).not.toBeInTheDocument();
	});

	it("caps server results and narrows them as the user types", async () => {
		const user = userEvent.setup();
		dashMocks.lastData = {
			now: Date.parse("2025-01-01T00:00:20.000Z"),
			servers: Array.from({ length: 120 }, (_, index) =>
				createServer({
					id: index + 1,
					name: `node-${index + 1}`,
					last_active: "2025-01-01T00:00:00.000Z",
				}),
			),
		};

		render(<DashCommand />);
		expect(screen.getAllByText(/^node-/)).toHaveLength(50);
		expect(screen.getByText("commandMoreResults")).toBeInTheDocument();

		await user.type(screen.getByPlaceholderText("TypeCommand"), "node-11");
		const names = screen.getAllByText(/^node-/).map((node) => node.textContent);
		expect(names[0]).toBe("node-11");
		expect(names).toEqual([
			"node-11",
			"node-110",
			"node-111",
			"node-112",
			"node-113",
			"node-114",
			"node-115",
			"node-116",
			"node-117",
			"node-118",
			"node-119",
		]);
		expect(screen.queryByText("commandMoreResults")).not.toBeInTheDocument();
		expect(screen.queryByText("ToggleDarkMode")).not.toBeInTheDocument();
	});

	it("keeps the results still while websocket ticks arrive", () => {
		seedWebSocketData();
		const { rerender } = render(<DashCommand />);
		expect(screen.getByText("edge-7")).toBeInTheDocument();

		dashMocks.lastData = {
			now: Date.parse("2025-01-01T00:00:22.000Z"),
			servers: [createServer({ id: 8, name: "edge-8" })],
		};
		rerender(<DashCommand />);
		expect(screen.getByText("edge-7")).toBeInTheDocument();
		expect(screen.queryByText("edge-8")).not.toBeInTheDocument();
	});
});

describe("rankServers", () => {
	const entry = (id: number, name: string) => ({
		id,
		name,
		code: String(id).padStart(6, "0"),
		countryCode: "",
		online: true,
		cpu: 0,
		search: `${name} ${String(id).padStart(6, "0")}`.toLowerCase(),
	});

	it("ranks stock code, then name prefix, then substring", () => {
		const servers = [
			entry(1, "Tokyo-edge"),
			entry(42, "edge-1"),
			entry(3, "eu"),
		];
		expect(rankServers(servers, "edge").map((s) => s.id)).toEqual([42, 1]);
		expect(rankServers(servers, "42").map((s) => s.id)).toEqual([42]);
		expect(rankServers(servers, "000003").map((s) => s.id)).toEqual([3]);
		expect(rankServers(servers, "  ")).toBe(servers);
	});
});
