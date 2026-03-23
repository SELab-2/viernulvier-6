export type Space = {
    id: string;
    sourceId: number | null;
    nameNl: string;
    locationId: string;
};

export type SpaceCreateInput = {
    sourceId?: number | null;
    nameNl: string;
    locationId: string;
};

export type SpaceUpdateInput = SpaceCreateInput & {
    id: string;
};
