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
    hallId: string | null;
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
    hallId?: string | null;
};

export type EventUpdateInput = EventCreateInput & {
    id: string;
    createdAt: string; // Required for updates to preserve original timestamp
};
