/** Page backgrounds used before CSS loads (pre-paint, meta theme-color). Keep in sync with index.html and index.css. */
export const THEME_BG = {
	dark: "#000000",
	light: "#ffffff",
} as const;

export type ResolvedTheme = keyof typeof THEME_BG;

export const DEFAULT_THEME = "dark" as const;
