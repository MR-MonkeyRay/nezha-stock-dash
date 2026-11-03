import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
	DEFAULT_LANGUAGE,
	getInitialLanguage,
	SUPPORTED_LANGUAGES,
} from "@/lib/language";

type Translation = Record<string, unknown>;

const translations = import.meta.glob<Translation>(
	"./locales/*/translation.json",
	{ eager: true, import: "default" },
);

export const resources = Object.fromEntries(
	SUPPORTED_LANGUAGES.map(({ code }) => [
		code,
		{ translation: translations[`./locales/${code}/translation.json`] },
	]),
);

/** Keep `<html lang>` in step so screen readers, hyphenation and CJK font
 * selection follow the UI language. */
function syncDocumentLanguage(lng: string) {
	document.documentElement.lang = lng;
}

// Only an explicit pick in the language switcher is persisted (see
// LanguageSwitcher), so browser detection and the dashboard's configured
// language keep applying until the visitor chooses one.
i18n.on("languageChanged", syncDocumentLanguage);

void i18n.use(initReactI18next).init({
	resources,
	lng: getInitialLanguage(),
	fallbackLng: {
		"zh-TW": ["zh-CN", DEFAULT_LANGUAGE],
		default: [DEFAULT_LANGUAGE],
	},
	interpolation: {
		escapeValue: false, // React already escapes rendered values
	},
});

export default i18n;
