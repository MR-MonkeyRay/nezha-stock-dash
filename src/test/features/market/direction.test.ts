import { describe, expect, it } from "vitest";
import {
	directionGlyph,
	directionPillClass,
	directionTextClass,
	formatPrice,
	formatSigned,
	formatSignedPct,
} from "@/features/market/direction";
import type { Direction } from "@/features/market/quote-series";

const directions: Direction[] = ["up", "down", "flat", "suspended"];

describe("direction helpers", () => {
	it("maps every direction to semantic classes and glyphs", () => {
		expect(directions.map(directionTextClass)).toEqual([
			"text-up",
			"text-down",
			"text-flat",
			"text-suspended",
		]);
		expect(directions.map(directionGlyph)).toEqual(["▲", "▼", "", ""]);
		for (const direction of directions) {
			expect(directionPillClass(direction)).toMatch(/^bg-/);
		}
	});

	it("always signs numbers and uses placeholders for missing values", () => {
		expect(formatSigned(1.2)).toBe("+1.20");
		expect(formatSigned(-0.4)).toBe("−0.40");
		expect(formatSigned(0)).toBe("0.00");
		expect(formatSigned(-0.001)).toBe("0.00");
		expect(formatSigned(null)).toBe("--");
		expect(formatSigned(Number.NaN)).toBe("--");
		expect(formatSigned(3, 1)).toBe("+3.0");
	});

	it("formats percentages with a display cap", () => {
		expect(formatSignedPct(2.5)).toBe("+2.50%");
		expect(formatSignedPct(-12)).toBe("−12.00%");
		expect(formatSignedPct(5000)).toBe("+>999%");
		expect(formatSignedPct(-5000)).toBe("−>999%");
		expect(formatSignedPct(undefined)).toBe("--");
	});

	it("formats prices", () => {
		expect(formatPrice(12.345)).toBe("12.35");
		expect(formatPrice(null)).toBe("--");
		expect(formatPrice(1, 1)).toBe("1.0");
	});
});
