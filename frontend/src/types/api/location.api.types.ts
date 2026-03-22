export type LocationResponse = {
    id: string;
    source_id: number | null;
    name: string | null;
    code: string | null;
    street: string | null;
    number: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    phone_1: string | null;
    phone_2: string | null;
    is_owned_by_viernulvier: boolean | null;
    uitdatabank_id: string | null;
};

export type LocationCreateRequest = {
    source_id?: number | null;
    name?: string | null;
    code?: string | null;
    street?: string | null;
    number?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
    phone_1?: string | null;
    phone_2?: string | null;
    is_owned_by_viernulvier?: boolean | null;
    uitdatabank_id?: string | null;
};

export type LocationUpdateRequest = LocationCreateRequest & {
    id: string;
};
