import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	formatSpeed,
	formatUptimeShort,
	stockCode,
	usageLevelClass,
} from "@/features/market/format";
import { ChangePill, QuoteChange } from "@/features/market/QuoteText";
import { computeQuote, SUSPENDED_QUOTE } from "@/features/market/quote-series";
import { buildSparklinePoints, Sparkline } from "@/features/market/Sparkline";
import { TickerTape } from "@/features/market/TickerTape";
import { renderWithProviders } from "@/test/utils";

describe("Sparkline", () => {
	it("builds scaled points for auto and percent domains", () => {
		expect(buildSparklinePoints([], 80, 24, "auto")).toEqual({
			points: "",
			baseY: 12,
		});
		const percent = buildSparklinePoints([0, 100], 80, 20, "percent");
		expect(percent.points).toBe("0,20 80,0");
		expect(percent.baseY).toBe(20);
		const single = buildSparklinePoints([5], 80, 20, "auto");
		expect(single.points).toBe("80,10");
		const flat = buildSparklinePoints([5, 5], 80, 20, "auto");
		expect(flat.points).toBe("0,10 80,10");
	});

	it("draws a dashed line while halted and a colored line otherwise", () => {
		const { container, rerender } = render(
			<Sparkline values={[1, 2]} direction="suspended" />,
		);
		expect(container.querySelector("polyline")).toBeNull();
		expect(container.querySelector("line")).toHaveAttribute(
			"stroke-dasharray",
			"2 3",
		);
		rerender(<Sparkline values={[1, 2]} direction="up" showBase={false} />);
		expect(container.querySelector("polyline")).toHaveClass("text-up");
		expect(container.querySelector("line")).toBeNull();
	});
});

describe("TickerTape", () => {
	it("renders nothing without items", () => {
		const { container } = renderWithProviders(<TickerTape items={[]} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("duplicates items for a seamless loop and hides the clone from assistive tech", () => {
		const { container } = renderWithProviders(
			<TickerTape
				items={[
					{ id: 1, name: "alpha", quote: computeQuote([10, 12], true) },
					{ id: 2, name: "beta", quote: SUSPENDED_QUOTE },
				]}
			/>,
		);
		const track = container.querySelector(".ticker-track");
		expect(track).toHaveClass("is-animated");
		expect(track).toHaveStyle({ animationDuration: "6s" });
		expect(screen.getAllByText("alpha")).toHaveLength(2);
		const clone = container.querySelector(".ticker-clone");
		expect(clone).toHaveAttribute("aria-hidden", "true");
		expect(clone?.querySelector("a")).toHaveAttribute("tabindex", "-1");
		expect(screen.getAllByText("market.suspended")).toHaveLength(2);
		expect(screen.getAllByRole("link", { name: /alpha/ })[0]).toHaveAttribute(
			"href",
			"/server/1",
		);
	});

	it("does not animate a single item", () => {
		const { container } = renderWithProviders(
			<TickerTape
				items={[{ id: 1, name: "solo", quote: computeQuote([5, 5], true) }]}
			/>,
		);
		expect(container.querySelector(".ticker-track")).not.toHaveClass(
			"is-animated",
		);
		expect(container.querySelector(".ticker-clone")).toBeNull();
	});
});

describe("quote text and formatting", () => {
	it("renders halted and flat states with placeholders", () => {
		render(
			<>
				<QuoteChange quote={SUSPENDED_QUOTE} />
				<QuoteChange quote={computeQuote([3], true)} />
				<ChangePill quote={SUSPENDED_QUOTE} />
				<ChangePill quote={computeQuote([3, 4], true)} mode="change" />
				<ChangePill quote={computeQuote([3, 4], true)} mode="custom" />
			</>,
		);
		expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("market.suspended")).toBeInTheDocument();
		expect(screen.getByText("+1.00")).toBeInTheDocument();
	});

	it("formats speeds, uptime, codes and usage levels", () => {
		expect(formatSpeed(0)).toBe("0K/s");
		expect(formatSpeed(0.5)).toBe("512.0K/s");
		expect(formatSpeed(2)).toBe("2.00M/s");
		expect(formatSpeed(2048)).toBe("2.00G/s");
		expect(formatUptimeShort(0)).toBe("--");
		expect(formatUptimeShort(30)).toBe("1m");
		expect(formatUptimeShort(7200)).toBe("2h");
		expect(formatUptimeShort(3 * 86400)).toBe("3d");
		expect(stockCode(42)).toBe("000042");
		expect(usageLevelClass(50)).toBe("bg-status-ok");
		expect(usageLevelClass(80)).toBe("bg-status-warn");
		expect(usageLevelClass(95)).toBe("bg-status-bad");
	});
});
