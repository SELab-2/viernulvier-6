export type EventPrice = {
    id: string | null;
    sourceId: number | null;
    createdAt: string | null;
    updatedAt: string | null;
    available: number;
    amountCents: number;
    boxOfficeId: string | null;
    contingentId: number | null;
    expiresAt: string | null;
    price: {
        id: string | null;
        sourceId: number | null;
        createdAt: string | null;
        updatedAt: string | null;
        type: string;
        visibility: string;
        code: string | null;
        descriptionNl: string | null;
        descriptionEn: string | null;
        minimum: number;
        maximum: number | null;
        step: number;
        order: number;
        autoSelectCombo: boolean;
        includeInPriceRange: boolean;
        cinevilleBox: boolean;
        membership: string | null;
    };
    rank: {
        id: string | null;
        sourceId: number | null;
        createdAt: string | null;
        updatedAt: string | null;
        descriptionNl: string | null;
        descriptionEn: string | null;
        code: string;
        position: number;
        soldOutBuffer: number | null;
    };
};

export type Event = {
    id: string;
    sourceId: number | null;
    createdAt: string;
    updatedAt: string;
    startsAt: string;
    endsAt: string | null;
    intermissionAt: string | null;
    doorsAt: string | null;
    vendorId: string | null;
    boxOfficeId: string | null;
    uitdatabankId: string | null;
    maxTicketsPerOrder: number | null;
    productionId: string;
    status: string;
    hallIds: string[];
    prices: EventPrice[];
};

export type EventCreateInput = {
    sourceId?: number | null;
    startsAt: string;
    endsAt?: string | null;
    intermissionAt?: string | null;
    doorsAt?: string | null;
    vendorId?: string | null;
    boxOfficeId?: string | null;
    uitdatabankId?: string | null;
    maxTicketsPerOrder?: number | null;
    productionId: string;
    status: string;
    hallIds?: string[];
    prices?: EventPrice[];
};

export type EventUpdateInput = EventCreateInput & {
    id: string;
    createdAt: string; // Required for updates to preserve original timestamp
};
