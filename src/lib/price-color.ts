import { safeLocalStorage } from "@/lib/storage";

/**
 * Up/down color convention, as in stock apps' 涨跌颜色 setting.
 * "red-up" = 红涨绿跌 (A-share / HK default), "green-up" = 绿涨红跌.
 */
export type PriceColor = "red-up" | "green-up";

export const PRICE_COLORS: readonly PriceColor[] = ["red-up", "green-up"];
export const DEFAULT_PRICE_COLOR: PriceColor = "red-up";
/** Bare key, like `inline` / `showMap`. index.html reads it before first paint. */
export const PRICE_COLOR_STORAGE_KEY = "priceColor";
export const PRICE_COLOR_ATTRIBUTE = "data-price-color";

export function isPriceColor(value: unknown): value is PriceColor {
	return value === "red-up" || value === "green-up";
}

export function readStoredPriceColor(): PriceColor | undefined {
	const stored = safeLocalStorage.getItem(PRICE_COLOR_STORAGE_KEY);
	return isPriceColor(stored) ? stored : undefined;
}

export function storePriceColor(value: PriceColor) {
	return safeLocalStorage.setItem(PRICE_COLOR_STORAGE_KEY, value);
}

export function applyPriceColor(value: PriceColor) {
	if (typeof document === "undefined") return;
	document.documentElement.setAttribute(PRICE_COLOR_ATTRIBUTE, value);
}
