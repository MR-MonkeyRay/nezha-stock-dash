import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	applyPriceColor,
	DEFAULT_PRICE_COLOR,
	type PriceColor,
	readStoredPriceColor,
	storePriceColor,
} from "@/lib/price-color";
import { useRuntimeConfig } from "@/lib/runtime-config";

export type PriceColorState = {
	priceColor: PriceColor;
	setPriceColor: (value: PriceColor) => void;
	/** True while custom code sets window.ForceColorConvention. */
	forced: boolean;
};

// Like ThemeProvider: a harmless default so isolated renders (tests, embeds) work.
export const PriceColorContext = createContext<PriceColorState | undefined>({
	priceColor: DEFAULT_PRICE_COLOR,
	setPriceColor: () => undefined,
	forced: false,
});

export function PriceColorProvider({ children }: { children: ReactNode }) {
	const { forceColorConvention } = useRuntimeConfig();
	const [selected, setSelected] = useState<PriceColor>(
		() => readStoredPriceColor() ?? DEFAULT_PRICE_COLOR,
	);
	const priceColor = forceColorConvention ?? selected;

	useEffect(() => {
		applyPriceColor(priceColor);
	}, [priceColor]);

	// Persist a forced value like ForceTheme does, so the pre-paint script in
	// index.html renders the admin's convention on the next load without a flash.
	useEffect(() => {
		if (!forceColorConvention) return;
		storePriceColor(forceColorConvention);
		setSelected(forceColorConvention);
	}, [forceColorConvention]);

	const setPriceColor = useCallback(
		(value: PriceColor) => {
			if (forceColorConvention) return;
			storePriceColor(value);
			setSelected(value);
		},
		[forceColorConvention],
	);

	const value = useMemo(
		() => ({
			priceColor,
			setPriceColor,
			forced: Boolean(forceColorConvention),
		}),
		[priceColor, setPriceColor, forceColorConvention],
	);

	return (
		<PriceColorContext.Provider value={value}>
			{children}
		</PriceColorContext.Provider>
	);
}
