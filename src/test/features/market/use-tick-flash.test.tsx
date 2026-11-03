import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { QuotePrice } from "@/features/market/QuoteText";
import { computeQuote } from "@/features/market/quote-series";
import { Sparkline } from "@/features/market/Sparkline";

const priceOf = (container: HTMLElement) =>
	container.querySelector("span") as HTMLElement;

// Flashes are applied two animation frames after the tick.
const flush = () =>
	act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 60));
	});

function placeAt(element: HTMLElement, top: number) {
	element.getBoundingClientRect = () =>
		({
			top,
			bottom: top + 20,
			left: 10,
			right: 60,
			width: 50,
			height: 20,
		}) as DOMRect;
}

describe("QuotePrice tick flash", () => {
	it("stays idle until the value moves, then alternates parity per tick", async () => {
		const { container, rerender } = render(
			<QuotePrice quote={computeQuote([10, 12], true)} />,
		);
		const price = priceOf(container);
		expect(price).toHaveClass("tick-flash");
		expect(price).not.toHaveAttribute("data-flash");

		rerender(<QuotePrice quote={computeQuote([10, 12, 9], true)} />);
		await flush();
		expect(price).toHaveAttribute("data-flash", "down");
		expect(price).toHaveAttribute("data-flash-parity", "0");

		rerender(<QuotePrice quote={computeQuote([10, 12, 9, 15], true)} />);
		await flush();
		expect(price).toHaveAttribute("data-flash", "up");
		expect(price).toHaveAttribute("data-flash-parity", "1");

		// Same value again: the last flash is left untouched.
		rerender(<QuotePrice quote={computeQuote([10, 15], true)} />);
		await flush();
		expect(price).toHaveAttribute("data-flash-parity", "1");
	});

	it("ignores sub-epsilon moves and transitions to or from null", async () => {
		const { container, rerender } = render(
			<QuotePrice quote={computeQuote([1, 10], true)} />,
		);
		rerender(<QuotePrice quote={computeQuote([1, 10.01], true)} />);
		rerender(<QuotePrice quote={computeQuote([1, 10], false)} />);
		rerender(<QuotePrice quote={computeQuote([1, 50], true)} />);
		await flush();
		expect(priceOf(container)).not.toHaveAttribute("data-flash");
	});

	it("skips prices that are off screen or skipped by content-visibility", async () => {
		const { container, rerender } = render(
			<QuotePrice quote={computeQuote([1, 10], true)} />,
		);
		const price = priceOf(container);
		placeAt(price, window.innerHeight + 100);
		rerender(<QuotePrice quote={computeQuote([1, 20], true)} />);
		await flush();
		expect(price).not.toHaveAttribute("data-flash");

		placeAt(price, 10);
		Object.assign(price, { checkVisibility: () => false });
		rerender(<QuotePrice quote={computeQuote([1, 30], true)} />);
		await flush();
		expect(price).not.toHaveAttribute("data-flash");

		Object.assign(price, { checkVisibility: () => true });
		rerender(<QuotePrice quote={computeQuote([1, 40], true)} />);
		await flush();
		expect(price).toHaveAttribute("data-flash", "up");
	});

	it("flips parity once per tick under StrictMode", async () => {
		const { container, rerender } = render(
			<StrictMode>
				<QuotePrice quote={computeQuote([0, 1], true)} />
			</StrictMode>,
		);
		rerender(
			<StrictMode>
				<QuotePrice quote={computeQuote([0, 2], true)} />
			</StrictMode>,
		);
		await flush();
		expect(priceOf(container)).toHaveAttribute("data-flash-parity", "0");
		rerender(
			<StrictMode>
				<QuotePrice quote={computeQuote([0, 3], true)} />
			</StrictMode>,
		);
		await flush();
		expect(priceOf(container)).toHaveAttribute("data-flash-parity", "1");
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

		rerender(
			<Sparkline values={[1, 3, 2]} direction="up" live className="mx-1" />,
		);
		const dot = queryByTestId("live-dot");
		expect(dot).toHaveClass("live-ping", "text-up");
		// Centered on the last point (x = width).
		expect(dot).toHaveStyle({ left: "77.5px" });
		expect(dot?.parentElement).toHaveClass("relative", "mx-1");
		expect(container.querySelector("svg")).not.toHaveClass("mx-1");

		rerender(<Sparkline values={[1, 3, 2]} direction="suspended" live />);
		expect(queryByTestId("live-dot")).toBeNull();
	});
});
