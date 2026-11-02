import { render, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { QuotePrice } from "@/features/market/QuoteText";
import { computeQuote } from "@/features/market/quote-series";
import { Sparkline } from "@/features/market/Sparkline";
import { useTickFlash } from "@/features/market/use-tick-flash";

describe("useTickFlash", () => {
	it("stays idle until the value moves, then alternates parity per tick", () => {
		const { result, rerender } = renderHook(
			({ value }: { value: number | null }) => useTickFlash(value),
			{ initialProps: { value: 10 as number | null } },
		);
		expect(result.current).toEqual({ direction: null, parity: 0 });

		rerender({ value: 12 });
		expect(result.current).toEqual({ direction: "up", parity: 1 });

		rerender({ value: 11 });
		expect(result.current).toEqual({ direction: "down", parity: 0 });

		// Re-rendering with the same value keeps the last flash untouched.
		rerender({ value: 11 });
		expect(result.current).toEqual({ direction: "down", parity: 0 });
	});

	it("ignores sub-epsilon moves and transitions to or from null", () => {
		const { result, rerender } = renderHook(
			({ value }: { value: number | null }) => useTickFlash(value),
			{ initialProps: { value: 10 as number | null } },
		);
		rerender({ value: 10.01 });
		expect(result.current.direction).toBeNull();
		rerender({ value: null });
		rerender({ value: 50 });
		expect(result.current).toEqual({ direction: null, parity: 0 });
	});

	it("flips parity once per tick under StrictMode", () => {
		const { result, rerender } = renderHook(
			({ value }: { value: number }) => useTickFlash(value),
			{ initialProps: { value: 1 }, wrapper: StrictMode },
		);
		rerender({ value: 2 });
		expect(result.current.parity).toBe(1);
		rerender({ value: 3 });
		expect(result.current.parity).toBe(0);
	});
});

describe("QuotePrice tick flash", () => {
	it("marks the price with the tick direction once it changes", () => {
		const { container, rerender } = render(
			<QuotePrice quote={computeQuote([10, 12], true)} />,
		);
		const price = () => container.querySelector("span") as HTMLElement;
		expect(price()).not.toHaveClass("tick-flash");
		expect(price()).not.toHaveAttribute("data-flash");

		rerender(<QuotePrice quote={computeQuote([10, 12, 9], true)} />);
		expect(price()).toHaveClass("tick-flash");
		expect(price()).toHaveAttribute("data-flash", "down");
		expect(price()).toHaveAttribute("data-flash-parity", "1");
	});
});

describe("Sparkline motion", () => {
	it("draws in and marks the latest sample only when live", () => {
		const { container, rerender, queryByTestId } = render(
			<Sparkline values={[1, 3, 2]} direction="up" />,
		);
		expect(container.querySelector("polyline")).toHaveClass("spark-draw");
		expect(container.querySelector("polyline")).toHaveAttribute(
			"pathLength",
			"1",
		);
		expect(queryByTestId("live-dot")).toBeNull();

		rerender(<Sparkline values={[1, 3, 2]} direction="up" live />);
		const dot = queryByTestId("live-dot");
		expect(dot).toHaveClass("text-up");
		expect(dot?.querySelector(".live-ping")).toHaveAttribute("cx", "80");
	});
});
