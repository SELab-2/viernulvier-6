import type { Production } from "@/types/models/production.types";

type BilingualField =
    | "supertitle"
    | "title"
    | "artist"
    | "metaTitle"
    | "metaDescription"
    | "tagline"
    | "teaser"
    | "description"
    | "descriptionExtra"
    | "description2"
    | "quote"
    | "quoteSource"
    | "programme"
    | "info"
    | "descriptionShort";

/**
 * Returns the correct locale variant of a bilingual Production field.
 * Translations are stored in the DB (nl/en columns), not via next-intl.
 * Returns null when the field is missing for that locale.
 */
export function getLocalizedField(
    production: Production,
    field: BilingualField,
    locale: string
): string | null {
    const suffix = locale === "en" ? "En" : "Nl";
    const key = `${field}${suffix}` as keyof Production;
    return (production[key] as string | null) ?? null;
}
