/**
 * Utility to convert ProductionRow (flat fields) to Production (translations array) format.
 * This is needed because the CMS table uses ProductionRow but the public page expects Production.
 */
import { Production, ProductionRow, ProductionTranslation } from "@/types/models/production.types";

const TRANSLATION_FIELDS: Array<keyof ProductionTranslation> = [
    "supertitle",
    "title",
    "artist",
    "metaTitle",
    "metaDescription",
    "tagline",
    "teaser",
    "description",
    "descriptionExtra",
    "description2",
    "quote",
    "quoteSource",
    "programme",
    "info",
    "descriptionShort",
];

/**
 * Converts a ProductionRow (flat fields like titleNl, titleEn) to Production format
 * (translations array with languageCode).
 */
export function convertProductionRowToProduction(row: ProductionRow): Production {
    const nlTranslation: ProductionTranslation = {
        languageCode: "nl",
        ...Object.fromEntries(
            TRANSLATION_FIELDS.map((field) => [
                field,
                row[`${field}Nl` as keyof ProductionRow] as string | null,
            ])
        ),
    } as ProductionTranslation;

    const enTranslation: ProductionTranslation = {
        languageCode: "en",
        ...Object.fromEntries(
            TRANSLATION_FIELDS.map((field) => [
                field,
                row[`${field}En` as keyof ProductionRow] as string | null,
            ])
        ),
    } as ProductionTranslation;

    return {
        id: row.id,
        sourceId: row.sourceId,
        slug: row.slug,
        video1: row.video1,
        video2: row.video2,
        eticketInfo: row.eticketInfo,
        uitdatabankTheme: row.uitdatabankTheme,
        uitdatabankType: row.uitdatabankType,
        translations: [nlTranslation, enTranslation],
        coverImageUrl: null, // ProductionRow doesn't have this field
    };
}

/**
 * Type guard to check if a value is a ProductionRow.
 * ProductionRow has flat fields like titleNl/titleEn, while Production has translations array.
 */
export function isProductionRow(value: Production | ProductionRow): value is ProductionRow {
    return "translations" in value === false;
}

/**
 * Type guard to check if a value is a Production.
 */
export function isProduction(value: Production | ProductionRow): value is Production {
    return "translations" in value && Array.isArray(value.translations);
}

/**
 * Converts a Production or ProductionRow to Production format.
 * If already a Production, returns as-is. If ProductionRow, converts it.
 */
export function ensureProduction(value: Production | ProductionRow): Production {
    if (isProduction(value)) {
        return value;
    }
    return convertProductionRowToProduction(value);
}
