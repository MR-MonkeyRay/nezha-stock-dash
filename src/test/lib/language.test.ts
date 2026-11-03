import { afterEach, describe, expect, it, vi } from "vitest";
import {
	detectBrowserLanguage,
	getInitialLanguage,
	getStoredLanguage,
	regionName,
	resolveLanguage,
	SUPPORTED_LANGUAGES,
	shouldApplySiteLanguage,
	storeLanguage,
} from "@/lib/language";

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.removeItem("preferredLanguage");
});

describe("resolveLanguage", () => {
	it.each([
		["zh-CN", "zh-CN"],
		["zh", "zh-CN"],
		["zh-SG", "zh-CN"],
		["zh-Hans-HK", "zh-CN"],
		["zh_CN", "zh-CN"],
		["zh-TW", "zh-TW"],
		["zh-HK", "zh-TW"],
		["zh-MO", "zh-TW"],
		["zh-Hant", "zh-TW"],
		["en", "en-US"],
		["en-GB", "en-US"],
		["EN_us", "en-US"],
		["pt", "pt-BR"],
		["pt-PT", "pt-BR"],
		["pt_BR", "pt-BR"],
		["de-AT", "de-DE"],
		["ru", "ru-RU"],
		["uk-UA", "uk"],
	])("maps %s to %s", (tag, expected) => {
		expect(resolveLanguage(tag)).toBe(expected);
	});

	it("rejects unsupported or empty tags", () => {
		expect(resolveLanguage("ko-KR")).toBeUndefined();
		expect(resolveLanguage("")).toBeUndefined();
		expect(resolveLanguage(null)).toBeUndefined();
		expect(resolveLanguage(undefined)).toBeUndefined();
	});

	it("resolves every supported code to itself", () => {
		for (const { code } of SUPPORTED_LANGUAGES) {
			expect(resolveLanguage(code)).toBe(code);
		}
	});
});

describe("detectBrowserLanguage", () => {
	it("returns the first supported preference in order", () => {
		expect(
			detectBrowserLanguage({
				language: "ko",
				languages: ["ko", "zh-TW", "en"],
			}),
		).toBe("zh-TW");
	});

	it("falls back to navigator.language when languages is empty", () => {
		expect(detectBrowserLanguage({ language: "en-AU", languages: [] })).toBe(
			"en-US",
		);
	});

	it("returns undefined when nothing is supported", () => {
		expect(
			detectBrowserLanguage({ language: "ko", languages: ["ko", "th"] }),
		).toBeUndefined();
	});

	it("reads the global navigator by default", () => {
		vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-Hant-TW"]);
		expect(detectBrowserLanguage()).toBe("zh-TW");
	});
});

describe("startup and site language", () => {
	it("uses saved choice, then browser, then English", () => {
		const languages = vi
			.spyOn(navigator, "languages", "get")
			.mockReturnValue(["zh-CN"]);
		storeLanguage("ja");
		expect(getStoredLanguage()).toBe("ja");
		expect(getInitialLanguage()).toBe("ja");

		localStorage.removeItem("preferredLanguage");
		expect(getInitialLanguage()).toBe("zh-CN");

		languages.mockReturnValue(["ko"]);
		expect(getInitialLanguage()).toBe("en-US");
	});

	it("ignores a saved value that is no longer supported", () => {
		localStorage.setItem("preferredLanguage", "xx");
		expect(getStoredLanguage()).toBeUndefined();
	});

	it("applies the site language only without a choice or supported browser language", () => {
		const languages = vi
			.spyOn(navigator, "languages", "get")
			.mockReturnValue(["ko"]);
		expect(shouldApplySiteLanguage()).toBe(true);

		languages.mockReturnValue(["en-US"]);
		expect(shouldApplySiteLanguage()).toBe(false);

		languages.mockReturnValue(["ko"]);
		storeLanguage("zh-CN");
		expect(shouldApplySiteLanguage()).toBe(false);
	});
});

describe("regionName", () => {
	it("localises ISO region codes", () => {
		expect(regionName("us", "en-US")).toBe("United States");
		expect(regionName("JP", "zh-CN")).toBe("日本");
		expect(regionName("JP", "pt-BR")).toBe("Japão");
	});

	it("returns undefined for missing or malformed codes", () => {
		expect(regionName(undefined, "en-US")).toBeUndefined();
		expect(regionName("not-a-region", "en-US")).toBeUndefined();
	});
});
