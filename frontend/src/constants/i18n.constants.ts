export const LOCALES = {
    nl: { label: "Nederlands", tag: "nl"},
    en: { label: "English", tag: "en"}
} as const;

export type LocaleCode = keyof typeof LOCALES;
export const DEFAULT_LOCALE: LocaleCode = "nl";

export const SUPPORTED_LOCALES = Object.keys(LOCALES) as LocaleCode[];

export const LOCALE_TAGS = Object.fromEntries(
    SUPPORTED_LOCALES.map((code) => [code, LOCALES[code].tag])
) as Record<LocaleCode, string>;