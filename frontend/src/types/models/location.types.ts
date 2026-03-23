export type Location = {
    id: string;
    sourceId: number | null;
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
};

export type LocationCreateInput = {
    sourceId?: number | null;
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
};

export type LocationUpdateInput = LocationCreateInput & {
    id: string;
};
