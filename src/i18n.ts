import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, getInitialLanguage } from "@/lib/language";

import deTranslation from "./locales/de/translation.json";
import enTranslation from "./locales/en/translation.json";
import esTranslation from "./locales/es/translation.json";
import frTranslation from "./locales/fr/translation.json";
import glTranslation from "./locales/gl/translation.json";
import idTranslation from "./locales/id/translation.json";
import jaTranslation from "./locales/ja/translation.json";
import ptBRTranslation from "./locales/pt_BR/translation.json";
import roTranslation from "./locales/ro/translation.json";
import ruTranslation from "./locales/ru/translation.json";
import taTranslation from "./locales/ta/translation.json";
import ukTranslation from "./locales/uk/translation.json";
import zhCNTranslation from "./locales/zh-CN/translation.json";
import zhTWTranslation from "./locales/zh-TW/translation.json";

const resources = {
	"en-US": { translation: enTranslation },
	"zh-CN": { translation: zhCNTranslation },
	"zh-TW": { translation: zhTWTranslation },
	"de-DE": { translation: deTranslation },
	"es-ES": { translation: esTranslation },
	fr: { translation: frTranslation },
	gl: { translation: glTranslation },
	id: { translation: idTranslation },
	ja: { translation: jaTranslation },
	pt_BR: { translation: ptBRTranslation },
	ro: { translation: roTranslation },
	"ru-RU": { translation: ruTranslation },
	"ta-IN": { translation: taTranslation },
	uk: { translation: ukTranslation },
};

/** Keep `<html lang>` in step so screen readers, hyphenation and CJK font
 * selection follow the UI language. `pt_BR` is not a valid BCP 47 tag. */
function syncDocumentLanguage(lng: string) {
	if (typeof document === "undefined") return;
	document.documentElement.lang = lng.replace(/_/g, "-");
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
