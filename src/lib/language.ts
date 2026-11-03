import { safeLocalStorage } from "@/lib/storage";

/** Storage key for an explicit choice made in the language switcher. */
export const LANGUAGE_STORAGE_KEY = "preferredLanguage";

export const DEFAULT_LANGUAGE = "en-US";

/** Supported locales in switcher order; each `code` is a BCP 47 tag and the
 * name of its `src/locales/<code>/translation.json` folder. `name` is the
 * endonym so every option stays recognisable whatever the UI language is. */
export const SUPPORTED_LANGUAGES = [
	{ code: "zh-CN", name: "简体中文" },
	{ code: "zh-TW", name: "繁體中文" },
	{ code: "en-US", name: "English" },
	{ code: "ru-RU", name: "Русский" },
	{ code: "es-ES", name: "Español" },
	{ code: "de-DE", name: "Deutsch" },
	{ code: "ta-IN", name: "தமிழ்" },
	{ code: "fr", name: "Français" },
	{ code: "gl", name: "Galego" },
	{ code: "id", name: "Bahasa Indonesia" },
	{ code: "ja", name: "日本語" },
	{ code: "pt-BR", name: "Português (Brasil)" },
	{ code: "ro", name: "Română" },
	{ code: "uk", name: "Українська" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const TRADITIONAL_CHINESE_REGIONS = new Set(["tw", "hk", "mo"]);

/** Primary subtag → resource code, for locales registered under one region
 * (or none) that should also match every other region of that language. */
const BY_PRIMARY: Record<string, LanguageCode> = {
	en: "en-US",
	ru: "ru-RU",
	es: "es-ES",
	de: "de-DE",
	ta: "ta-IN",
	fr: "fr",
	gl: "gl",
	id: "id",
	ja: "ja",
	pt: "pt-BR",
	ro: "ro",
	uk: "uk",
};

/** Map a BCP 47 tag, or the gettext form the Nezha backend stores (`zh_CN`),
 * onto a supported code, or `undefined` when unsupported. */
export function resolveLanguage(
	tag: string | null | undefined,
): LanguageCode | undefined {
	if (!tag) return undefined;
	const parts = tag.trim().toLowerCase().replace(/_/g, "-").split("-");
	const [primary, ...subtags] = parts;
	if (!primary) return undefined;

	if (primary === "zh") {
		if (subtags.includes("hant")) return "zh-TW";
		if (subtags.includes("hans")) return "zh-CN";
		return subtags.some((s) => TRADITIONAL_CHINESE_REGIONS.has(s))
			? "zh-TW"
			: "zh-CN";
	}
	return BY_PRIMARY[primary];
}

/** First supported entry of the browser's preferred languages, in order. */
export function detectBrowserLanguage(
	nav:
		| Pick<Navigator, "language" | "languages">
		| undefined = typeof navigator === "undefined" ? undefined : navigator,
): LanguageCode | undefined {
	if (!nav) return undefined;
	const candidates = nav.languages?.length ? nav.languages : [nav.language];
	for (const tag of candidates) {
		const resolved = resolveLanguage(tag);
		if (resolved) return resolved;
	}
	return undefined;
}

/** The user's explicit, still-supported choice from the switcher, if any. */
export function getStoredLanguage(): LanguageCode | undefined {
	return resolveLanguage(safeLocalStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function storeLanguage(code: LanguageCode): void {
	safeLocalStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

/** Startup language: saved choice → browser preference → English. The
 * dashboard's configured language is applied later, and only when neither of
 * the first two is available (see `shouldApplySiteLanguage`). */
export function getInitialLanguage(): LanguageCode {
	return getStoredLanguage() ?? detectBrowserLanguage() ?? DEFAULT_LANGUAGE;
}

/** The backend's configured language is a site-wide default for visitors
 * whose browser asks for nothing we support. */
export function shouldApplySiteLanguage(): boolean {
	return !getStoredLanguage() && !detectBrowserLanguage();
}

const regionNameFormatters = new Map<string, Intl.DisplayNames | null>();

/** Localised country/region name for an ISO 3166-1 alpha-2 code, using the
 * browser's own CLDR data, or `undefined` when it cannot be resolved. */
export function regionName(
	code: string | null | undefined,
	lng: string,
): string | undefined {
	if (!code) return undefined;
	let formatter = regionNameFormatters.get(lng);
	if (formatter === undefined) {
		try {
			formatter = new Intl.DisplayNames([lng, DEFAULT_LANGUAGE], {
				type: "region",
			});
		} catch {
			formatter = null;
		}
		regionNameFormatters.set(lng, formatter);
	}
	try {
		return formatter?.of(code.toUpperCase());
	} catch {
		return undefined; // not a well-formed region code
	}
}
