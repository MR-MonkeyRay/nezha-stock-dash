import { describe, expect, it, vi } from "vitest";
import {
	applyPriceColor,
	isPriceColor,
	PRICE_COLOR_STORAGE_KEY,
	readStoredPriceColor,
	storePriceColor,
} from "@/lib/price-color";

describe("price color convention", () => {
	it("validates convention values", () => {
		expect(isPriceColor("red-up")).toBe(true);
		expect(isPriceColor("green-up")).toBe(true);
		expect(isPriceColor("blue-up")).toBe(false);
		expect(isPriceColor(undefined)).toBe(false);
	});

	it("reads and writes the bare storage key", () => {
		expect(readStoredPriceColor()).toBeUndefined();
		expect(storePriceColor("green-up")).toBe(true);
		expect(localStorage.getItem(PRICE_COLOR_STORAGE_KEY)).toBe("green-up");
		expect(readStoredPriceColor()).toBe("green-up");
		localStorage.setItem(PRICE_COLOR_STORAGE_KEY, "invalid");
		expect(readStoredPriceColor()).toBeUndefined();
	});

	it("tolerates blocked storage", () => {
		const storage = vi
			.spyOn(window, "localStorage", "get")
			.mockImplementation(() => {
				throw new Error("denied");
			});
		try {
			expect(readStoredPriceColor()).toBeUndefined();
			expect(storePriceColor("red-up")).toBe(false);
		} finally {
			storage.mockRestore();
		}
	});

	it("applies the convention to the root element", () => {
		applyPriceColor("green-up");
		expect(document.documentElement).toHaveAttribute(
			"data-price-color",
			"green-up",
		);
	});
});
