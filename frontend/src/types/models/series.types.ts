export interface SeriesTranslation {
    languageCode: string;
    name: string;
    subtitle: string;
    description: string;
}

export interface Series {
    id: string;
    slug: string;
    translations: SeriesTranslation[];
    productionIds: string[];
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
    updatedAt: string;
    coverImageUrl: string | null;
}

export interface SeriesCreateInput {
    slug: string;
    translations: SeriesTranslation[];
}

export type SeriesRow = {
    id: string;
    slug: string;
    nameNl: string;
    nameEn: string;
    subtitleNl: string;
    subtitleEn: string;
    itemCount: number;
    updatedAt: string;
    coverImageUrl: string | null;
};
