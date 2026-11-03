import { useContext } from "react";
import { PriceColorContext } from "@/components/PriceColorProvider";

export const usePriceColor = () => {
	const context = useContext(PriceColorContext);
	if (context === undefined) {
		throw new Error("usePriceColor must be used within a PriceColorProvider");
	}
	return context;
};
