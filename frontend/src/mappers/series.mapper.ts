import { SeriesResponse, SeriesCreateRequest } from "@/types/api/series.api.types";
import {
    Series,
    SeriesCreateInput,
    SeriesRow,
    SeriesTranslation,
} from "@/types/models/series.types";

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

const mapTranslation = (translation: {
    language_code: string;
    name: string;
    subtitle: string;
    description: string;
}): SeriesTranslation => ({
    languageCode: translation.language_code,
    name: translation.name,
    subtitle: translation.subtitle,
    description: translation.description,
});

export const mapSeries = (response: SeriesResponse): Series => ({
    id: response.id,
    slug: response.slug,
    translations: (response.translations ?? []).map(mapTranslation),
    productionIds: response.production_ids,
    periodStart: toNullable(response.period_start),
    periodEnd: toNullable(response.period_end),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    coverImageUrl: toNullable(response.cover_image_url),
});

export const mapAllSeries = (response: SeriesResponse[]): Series[] => response.map(mapSeries);

export const toSeriesRow = (series: Series): SeriesRow => {
    const nl = series.translations.find((t) => t.languageCode === "nl");
    const en = series.translations.find((t) => t.languageCode === "en");
    return {
        id: series.id,
        slug: series.slug,
        nameNl: nl?.name ?? "",
        nameEn: en?.name ?? "",
        subtitleNl: nl?.subtitle ?? "",
        subtitleEn: en?.subtitle ?? "",
        itemCount: series.productionIds.length,
        updatedAt: series.updatedAt,
        coverImageUrl: series.coverImageUrl,
    };
};

const toApiTranslation = (t: SeriesTranslation) => ({
    language_code: t.languageCode,
    name: t.name,
    subtitle: t.subtitle,
    description: t.description,
});

export const mapCreateInput = (input: SeriesCreateInput): SeriesCreateRequest => ({
    slug: input.slug,
    translations: input.translations.map(toApiTranslation),
});

export const mapUpdateInput = (series: Series): SeriesResponse => ({
    id: series.id,
    slug: series.slug,
    translations: series.translations.map(toApiTranslation),
    production_ids: series.productionIds,
    period_start: series.periodStart,
    period_end: series.periodEnd,
    created_at: series.createdAt,
    updated_at: series.updatedAt,
    cover_image_url: series.coverImageUrl,
});
