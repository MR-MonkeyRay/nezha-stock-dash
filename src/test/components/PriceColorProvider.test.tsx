import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	PriceColorContext,
	PriceColorProvider,
} from "@/components/PriceColorProvider";
import { usePriceColor } from "@/hooks/use-price-color";
import { refreshRuntimeConfig } from "@/lib/runtime-config";

function Probe() {
	const { priceColor, setPriceColor, forced } = usePriceColor();
	return (
		<div>
			<p data-testid="state">
				{priceColor}:{forced ? "forced" : "free"}
			</p>
			<button type="button" onClick={() => setPriceColor("green-up")}>
				green
			</button>
			<button type="button" onClick={() => setPriceColor("red-up")}>
				red
			</button>
		</div>
	);
}

const root = () => document.documentElement;

describe("PriceColorProvider", () => {
	it("defaults to red-up and persists the user's choice", () => {
		render(
			<PriceColorProvider>
				<Probe />
			</PriceColorProvider>,
		);
		expect(screen.getByTestId("state")).toHaveTextContent("red-up:free");
		expect(root()).toHaveAttribute("data-price-color", "red-up");

		act(() => screen.getByRole("button", { name: "green" }).click());
		expect(screen.getByTestId("state")).toHaveTextContent("green-up:free");
		expect(root()).toHaveAttribute("data-price-color", "green-up");
		expect(localStorage.getItem("priceColor")).toBe("green-up");
	});

	it("restores a stored convention and ignores invalid values", () => {
		localStorage.setItem("priceColor", "green-up");
		const { unmount } = render(
			<PriceColorProvider>
				<Probe />
			</PriceColorProvider>,
		);
		expect(screen.getByTestId("state")).toHaveTextContent("green-up");
		unmount();

		localStorage.setItem("priceColor", "purple-up");
		render(
			<PriceColorProvider>
				<Probe />
			</PriceColorProvider>,
		);
		expect(screen.getByTestId("state")).toHaveTextContent("red-up");
	});

	it("keeps working when storage is blocked", () => {
		const storage = vi
			.spyOn(window, "localStorage", "get")
			.mockImplementation(() => {
				throw new Error("denied");
			});
		try {
			render(
				<PriceColorProvider>
					<Probe />
				</PriceColorProvider>,
			);
			act(() => screen.getByRole("button", { name: "green" }).click());
			expect(root()).toHaveAttribute("data-price-color", "green-up");
		} finally {
			storage.mockRestore();
		}
	});

	it("lets custom code force the convention, persisting it for pre-paint", () => {
		localStorage.setItem("priceColor", "red-up");
		render(
			<PriceColorProvider>
				<Probe />
			</PriceColorProvider>,
		);
		act(() => {
			window.ForceColorConvention = "green-up";
			refreshRuntimeConfig();
		});
		expect(screen.getByTestId("state")).toHaveTextContent("green-up:forced");
		expect(root()).toHaveAttribute("data-price-color", "green-up");
		expect(localStorage.getItem("priceColor")).toBe("green-up");

		// User choices are ignored while forced.
		act(() => screen.getByRole("button", { name: "red" }).click());
		expect(screen.getByTestId("state")).toHaveTextContent("green-up:forced");
	});

	it("has a usable default outside the provider and throws on an explicit undefined context", () => {
		render(<Probe />);
		expect(screen.getByTestId("state")).toHaveTextContent("red-up:free");
		act(() => screen.getByRole("button", { name: "green" }).click());
		expect(screen.getByTestId("state")).toHaveTextContent("red-up:free");

		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<PriceColorContext.Provider value={undefined}>
					<Probe />
				</PriceColorContext.Provider>,
			),
		).toThrow("usePriceColor must be used within a PriceColorProvider");
	});
});
