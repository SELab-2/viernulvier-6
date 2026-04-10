export type ProductionTranslation = {
    languageCode: string;
    supertitle: string | null;
    title: string | null;
    artist: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    tagline: string | null;
    teaser: string | null;
    description: string | null;
    descriptionExtra: string | null;
    description2: string | null;
    quote: string | null;
    quoteSource: string | null;
    programme: string | null;
    info: string | null;
    descriptionShort: string | null;
};

export type Production = {
    id: string;
    sourceId: number | null;
    slug: string;
    video1: string | null;
    video2: string | null;
    eticketInfo: string | null;
    uitdatabankTheme: string | null;
    uitdatabankType: string | null;
    translations: ProductionTranslation[];
    coverImageUrl: string | null;
};

export type ProductionTranslationInput = {
    languageCode: string;
    supertitle?: string | null;
    title?: string | null;
    artist?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    tagline?: string | null;
    teaser?: string | null;
    description?: string | null;
    descriptionExtra?: string | null;
    description2?: string | null;
    quote?: string | null;
    quoteSource?: string | null;
    programme?: string | null;
    info?: string | null;
    descriptionShort?: string | null;
};

export type ProductionCreateInput = {
    sourceId?: number | null;
    slug: string;
    video1?: string | null;
    video2?: string | null;
    eticketInfo?: string | null;
    uitdatabankTheme?: string | null;
    uitdatabankType?: string | null;
    translations?: ProductionTranslationInput[];
};

export type ProductionUpdateInput = ProductionCreateInput & {
    id: string;
};

export type ProductionRow = {
    id: string;
    slug: string;
    sourceId: number | null;
    video1: string | null;
    video2: string | null;
    eticketInfo: string | null;
    uitdatabankTheme: string | null;
    uitdatabankType: string | null;
    supertitleNl: string | null;
    supertitleEn: string | null;
    titleNl: string | null;
    titleEn: string | null;
    artistNl: string | null;
    artistEn: string | null;
    metaTitleNl: string | null;
    metaTitleEn: string | null;
    metaDescriptionNl: string | null;
    metaDescriptionEn: string | null;
    taglineNl: string | null;
    taglineEn: string | null;
    teaserNl: string | null;
    teaserEn: string | null;
    descriptionNl: string | null;
    descriptionEn: string | null;
    descriptionExtraNl: string | null;
    descriptionExtraEn: string | null;
    description2Nl: string | null;
    description2En: string | null;
    quoteNl: string | null;
    quoteEn: string | null;
    quoteSourceNl: string | null;
    quoteSourceEn: string | null;
    programmeNl: string | null;
    programmeEn: string | null;
    infoNl: string | null;
    infoEn: string | null;
    descriptionShortNl: string | null;
    descriptionShortEn: string | null;
};
