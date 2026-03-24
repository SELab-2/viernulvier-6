import {
    ProductionCreateRequest,
    ProductionResponse,
    ProductionUpdateRequest,
} from "@/types/api/production.api.types";
import {
    Production,
    ProductionCreateInput,
    ProductionTranslation,
    ProductionTranslationInput,
    ProductionUpdateInput,
} from "@/types/models/production.types";

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

// NOTE: The shape of ProductionResponse will reflect the new API after running
// `cargo sqlx prepare` and then `npm run generate-openapi-types`.
// Until then, `generated.ts` still contains the old flat schema.

type ApiTranslation = {
    supertitle?: string | null;
    title?: string | null;
    artist?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    tagline?: string | null;
    teaser?: string | null;
    description?: string | null;
    description_extra?: string | null;
    description_2?: string | null;
    quote?: string | null;
    quote_source?: string | null;
    programme?: string | null;
    info?: string | null;
    description_short?: string | null;
};

const mapTranslation = (t: ApiTranslation): ProductionTranslation => ({
    supertitle: toNullable(t.supertitle),
    title: toNullable(t.title),
    artist: toNullable(t.artist),
    metaTitle: toNullable(t.meta_title),
    metaDescription: toNullable(t.meta_description),
    tagline: toNullable(t.tagline),
    teaser: toNullable(t.teaser),
    description: toNullable(t.description),
    descriptionExtra: toNullable(t.description_extra),
    description2: toNullable(t.description_2),
    quote: toNullable(t.quote),
    quoteSource: toNullable(t.quote_source),
    programme: toNullable(t.programme),
    info: toNullable(t.info),
    descriptionShort: toNullable(t.description_short),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapProduction = (response: ProductionResponse | any): Production => {
    return {
        id: response.id,
        sourceId: toNullable(response.source_id),
        slug: response.slug,
        video1: toNullable(response.video_1),
        video2: toNullable(response.video_2),
        eticketInfo: toNullable(response.eticket_info),
        uitdatabankTheme: toNullable(response.uitdatabank_theme),
        uitdatabankType: toNullable(response.uitdatabank_type),
        translations: Object.fromEntries(
            Object.entries(response.translations ?? {}).map(([lang, t]) => [
                lang,
                mapTranslation(t as ApiTranslation),
            ])
        ),
    };
};

export const mapProductions = (response: (ProductionResponse | any)[]): Production[] =>
    response.map(mapProduction);

const mapTranslationInput = (
    t: ProductionTranslationInput
): Record<string, string | null | undefined> => ({
    supertitle: t.supertitle,
    title: t.title,
    artist: t.artist,
    meta_title: t.metaTitle,
    meta_description: t.metaDescription,
    tagline: t.tagline,
    teaser: t.teaser,
    description: t.description,
    description_extra: t.descriptionExtra,
    description_2: t.description2,
    quote: t.quote,
    quote_source: t.quoteSource,
    programme: t.programme,
    info: t.info,
    description_short: t.descriptionShort,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapCreateProductionInput = (
    input: ProductionCreateInput
): ProductionCreateRequest | any => {
    return {
        source_id: input.sourceId,
        slug: input.slug,
        video_1: input.video1,
        video_2: input.video2,
        eticket_info: input.eticketInfo,
        uitdatabank_theme: input.uitdatabankTheme,
        uitdatabank_type: input.uitdatabankType,
        translations: Object.fromEntries(
            Object.entries(input.translations ?? {}).map(([lang, t]) => [
                lang,
                mapTranslationInput(t),
            ])
        ),
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapUpdateProductionInput = (
    input: ProductionUpdateInput
): ProductionUpdateRequest | any => {
    return {
        ...mapCreateProductionInput(input),
        id: input.id,
    };
};
