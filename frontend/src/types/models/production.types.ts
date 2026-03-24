export type ProductionTranslation = {
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
    /** Translations keyed by language code, e.g. "nl" or "en". */
    translations: Record<string, ProductionTranslation>;
};

export type ProductionTranslationInput = {
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
    translations?: Record<string, ProductionTranslationInput>;
};

export type ProductionUpdateInput = ProductionCreateInput & {
    id: string;
};
