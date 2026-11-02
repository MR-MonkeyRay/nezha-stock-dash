import { describe, expect, it } from "vitest";
import { withRunningAverage } from "@/features/server-detail/quote-chart";
import {
	hslTripletToRgba,
	readChartPalette,
} from "@/features/server-detail/theme-color";

describe("quote chart helpers", () => {
	it("adds a cumulative average that skips invalid samples", () => {
		const data = withRunningAverage(
			[
				{ t: 1, cpu: Number.NaN },
				{ t: 2, cpu: 10 },
				{ t: 3, cpu: 20 },
				{ t: 4, cpu: "x" as unknown as number },
			],
			"cpu",
			"avg",
		);
		expect(data.map((item) => item.avg)).toEqual([null, 10, 15, 15]);
		expect(data[1]).toMatchObject({ t: 2, cpu: 10 });
	});

	it("converts HSL token triplets to rgba", () => {
		expect(hslTripletToRgba("0 0% 0%")).toBe("rgba(0,0,0,1)");
		expect(hslTripletToRgba("0 0% 100%")).toBe("rgba(255,255,255,1)");
		expect(hslTripletToRgba("0 100% 50%")).toBe("rgba(255,0,0,1)");
		expect(hslTripletToRgba("120 100% 25%")).toBe("rgba(0,128,0,1)");
		expect(hslTripletToRgba("240 100% 75%")).toBe("rgba(128,128,255,1)");
		expect(hslTripletToRgba("0 0% 93% / 0.13")).toBe("rgba(237,237,237,0.13)");
		expect(hslTripletToRgba("0 0% 93% / 50%")).toBe("rgba(237,237,237,0.5)");
		expect(hslTripletToRgba("-60 100% 50%")).toBe("rgba(255,0,255,1)");
		expect(hslTripletToRgba("nonsense", "fallback")).toBe("fallback");
	});

	it("reads the chart palette from tokens with fallbacks", () => {
		const root = document.documentElement;
		root.style.setProperty("--up", "0 100% 50%");
		const palette = readChartPalette(root);
		expect(palette.up).toBe("rgba(255,0,0,1)");
		expect(palette.down).toBe("rgba(29,191,96,1)");
		expect(palette.ma).toHaveLength(3);
		root.style.removeProperty("--up");
	});
});
