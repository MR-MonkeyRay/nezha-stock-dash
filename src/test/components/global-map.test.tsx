import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import GlobalMap, { InteractiveMap } from "@/components/GlobalMap";
import { TooltipProvider } from "@/context/tooltip-provider";
import { createServer } from "@/test/fixtures";

const now = Date.parse("2025-01-01T00:00:20.000Z");

function LocationProbe() {
	const location = useLocation();
	return <p>{location.pathname}</p>;
}

function renderMap(ui: React.ReactElement) {
	return render(
		<MemoryRouter initialEntries={["/"]}>
			<TooltipProvider>
				{ui}
				<LocationProbe />
			</TooltipProvider>
		</MemoryRouter>,
	);
}

describe("GlobalMap", () => {
	it("counts unique countries and ignores servers without country codes", () => {
		Object.assign(window, { CustomBackgroundImage: "/background.png" });

		const { container } = renderMap(
			<GlobalMap
				now={now}
				serverList={[
					createServer({ country_code: "us" }),
					createServer({ id: 2, country_code: "US" }),
					createServer({ id: 3, country_code: "sg" }),
					createServer({ id: 4, country_code: "" }),
				]}
			/>,
		);

		expect(
			screen.getByText(/map\.Distributions 2 map\.Regions/),
		).toBeInTheDocument();
		expect(container.querySelector("section")).toHaveClass("bg-card/70");
	});
});

const outline = (container: HTMLElement, code: string) =>
	container.querySelector(`path[data-code="${code}"]`) as SVGPathElement;

describe("InteractiveMap", () => {
	it("shows country tooltips, navigates from servers, and clears tooltip state", async () => {
		const user = userEvent.setup();
		const { container } = renderMap(
			<InteractiveMap
				countryServers={{
					US: [
						{ id: 11, name: "us-online", status: true },
						{ id: 12, name: "us-offline", status: false },
					],
					SG: [{ id: 13, name: "sg-edge", status: true }],
				}}
			/>,
		);

		const us = outline(container, "US");
		expect(us).toHaveClass("fill-chart-line/70");
		fireEvent.mouseEnter(us);

		expect(await screen.findByText("United States")).toBeInTheDocument();
		expect(screen.getByText("2 map.Servers")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /us-offline/ }));

		expect(sessionStorage.getItem("fromMainPage")).toBe("true");
		expect(screen.getByText("/server/12")).toBeInTheDocument();

		// Singapore is too small for the 1:110m outlines and is drawn as a dot.
		const marker = container.querySelector("circle") as SVGCircleElement;
		expect(marker).toBeInTheDocument();
		fireEvent.mouseEnter(marker);

		expect(await screen.findByText("Singapore")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /sg-edge/ })).toBeInTheDocument();

		fireEvent.mouseLeave(container.querySelector(".relative") as HTMLElement);
		expect(screen.queryByText("Singapore")).not.toBeInTheDocument();
	});

	it("positions the tooltip relative to the rendered map and flips at edges", () => {
		const { container } = renderMap(
			<InteractiveMap
				countryServers={{
					AU: [{ id: 1, name: "syd", status: true }],
					CA: [{ id: 2, name: "yyz", status: true }],
				}}
			/>,
		);
		fireEvent.mouseEnter(outline(container, "AU"));
		const tooltip = screen.getByTestId("map-tooltip");
		expect(tooltip.style.left).toMatch(/%$/);
		expect(tooltip.style.transform).toContain("calc(-100% - 12px)");

		fireEvent.mouseEnter(outline(container, "CA"));
		expect(screen.getByTestId("map-tooltip").style.transform).toBe(
			"translate(12px, 8px)",
		);
	});

	it("clears tooltip state for non-highlighted countries and empty map areas", () => {
		const { container } = renderMap(
			<InteractiveMap
				countryServers={{ US: [{ id: 11, name: "us-online", status: true }] }}
			/>,
		);

		fireEvent.mouseEnter(outline(container, "US"));
		expect(screen.getByText("United States")).toBeInTheDocument();

		const neutral = outline(container, "DE");
		expect(neutral).toHaveClass("fill-muted");
		fireEvent.mouseEnter(neutral);
		expect(screen.queryByText("United States")).not.toBeInTheDocument();

		fireEvent.mouseEnter(outline(container, "US"));
		fireEvent.mouseEnter(container.querySelector("rect") as SVGRectElement);
		expect(screen.queryByText("United States")).not.toBeInTheDocument();
	});

	it("keeps outline elements across data ticks for the same countries", () => {
		const servers = { US: [{ id: 1, name: "a", status: true }] };
		const { container, rerender } = renderMap(
			<InteractiveMap countryServers={servers} />,
		);
		const before = outline(container, "US");
		rerender(
			<MemoryRouter>
				<TooltipProvider>
					<InteractiveMap
						countryServers={{ US: [{ id: 1, name: "a", status: false }] }}
					/>
				</TooltipProvider>
			</MemoryRouter>,
		);
		expect(outline(container, "US")).toBe(before);
	});
});
