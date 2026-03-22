export type SpaceResponse = {
    id: string;
    source_id: number | null;
    name_nl: string;
    location_id: string;
};

export type SpaceCreateRequest = {
    source_id?: number | null;
    name_nl: string;
    location_id: string;
};

export type SpaceUpdateRequest = SpaceCreateRequest & {
    id: string;
};
