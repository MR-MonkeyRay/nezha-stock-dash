import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_LANGUAGES } from "@/lib/language";

const i18nMocks = vi.hoisted(() => ({ init: vi.fn(), on: vi.fn() }));
vi.mock("i18next", () => ({
	default: {
		use: () => ({ init: i18nMocks.init }),
		on: i18nMocks.on,
	},
}));

function mockBrowserLanguages(languages: string[]) {
	return vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
}

describe("i18n bootstrap", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
		i18nMocks.init.mockClear();
		i18nMocks.on.mockClear();
		localStorage.removeItem("preferredLanguage");
		document.documentElement.lang = "en";
	});

	it("starts in the browser's language when nothing was chosen", async () => {
		mockBrowserLanguages(["zh-HK", "en-US"]);
		await import("@/i18n");
		expect(i18nMocks.init).toHaveBeenCalledWith(
			expect.objectContaining({ lng: "zh-TW" }),
		);
	});

	it("prefers a saved choice over the browser language", async () => {
		mockBrowserLanguages(["zh-CN"]);
		localStorage.setItem("preferredLanguage", "en-US");
		await import("@/i18n");
		expect(i18nMocks.init).toHaveBeenCalledWith(
			expect.objectContaining({ lng: "en-US" }),
		);
	});

	it("falls back to English with blocked storage and an unsupported browser", async () => {
		mockBrowserLanguages(["ko-KR"]);
		vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
			throw new DOMException("Storage blocked", "SecurityError");
		});
		await import("@/i18n");
		expect(i18nMocks.init).toHaveBeenCalledWith(
			expect.objectContaining({ lng: "en-US" }),
		);
	});

	it("mirrors language changes onto <html lang> without persisting them", async () => {
		mockBrowserLanguages(["en-US"]);
		const setItem = vi.spyOn(Storage.prototype, "setItem");
		await import("@/i18n");
		const [event, listener] = i18nMocks.on.mock.calls[0];
		expect(event).toBe("languageChanged");
		listener("pt-BR");
		expect(document.documentElement.lang).toBe("pt-BR");
		expect(setItem).not.toHaveBeenCalled();
	});

	it("loads a translation file for every supported language", async () => {
		const { resources } = await import("@/i18n");
		for (const { code } of SUPPORTED_LANGUAGES) {
			expect(resources[code]?.translation, code).toEqual(expect.any(Object));
		}
	});
});
