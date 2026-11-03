/// <reference types="vite/client" />

interface Window {
	CustomBackgroundImage: string;
	CustomMobileBackgroundImage: string;
	ForceShowServices: boolean;
	ForceCardInline: boolean;
	ForceShowMap: boolean;
	ForcePeakCutEnabled: boolean;
	CustomLogo?: string;
	CustomDesc?: string;
	CustomLinks?: string;
	CustomIllustration?: string;
	ShowNetTransfer?: boolean;
	ForceUseSvgFlag?: boolean;
	ForceTheme?: string;
	/** "red-up" (红涨绿跌, default) or "green-up" (绿涨红跌). */
	ForceColorConvention?: string;
	ForceSortType?: string;
	ForceSortOrder?: string;
}
