import { createContext } from "react";

export interface TooltipData {
	centroid: [number, number];
	country: string;
	/** ISO 3166-1 alpha-2 code, used to localise `country`. */
	code?: string;
	count: number;
	servers: Array<{
		id: number;
		name: string;
		status: boolean;
	}>;
}

interface TooltipContextType {
	tooltipData: TooltipData | null;
	setTooltipData: (data: TooltipData | null) => void;
}

export const TooltipContext = createContext<TooltipContextType | undefined>(
	undefined,
);
