export type LocationTranslation = {
    languageCode: string;
    description: string | null;
    history: string | null;
};

export type Location = {
    id: string;
    sourceId: number | null;
    slug: string | null;
    name: string | null;
    code: string | null;
    street: string | null;
    number: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    phone1: string | null;
    phone2: string | null;
    isOwnedByViernulvier: boolean | null;
    uitdatabankId: string | null;
    address: string;
    translations: LocationTranslation[];
};

export type LocationTranslationInput = {
    languageCode: string;
    description?: string | null;
    history?: string | null;
};

export type LocationCreateInput = {
    sourceId?: number | null;
    slug?: string | null;
    name?: string | null;
    code?: string | null;
    street?: string | null;
    number?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    phone1?: string | null;
    phone2?: string | null;
    isOwnedByViernulvier?: boolean | null;
    uitdatabankId?: string | null;
    translations?: LocationTranslationInput[];
};

export type LocationUpdateInput = LocationCreateInput & {
    id: string;
};

export type LocationRow = {
    id: string;
    sourceId: number | null;
    slug: string | null;
    name: string | null;
    code: string | null;
    street: string | null;
    number: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    phone1: string | null;
    phone2: string | null;
    isOwnedByViernulvier: boolean | null;
    uitdatabankId: string | null;
    address: string;
    descriptionNl: string | null;
    descriptionEn: string | null;
    historyNl: string | null;
    historyEn: string | null;
};
