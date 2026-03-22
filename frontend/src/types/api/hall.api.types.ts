export type HallResponse = {
    id: string;
    source_id: number | null;
    vendor_id: string | null;
    box_office_id: string | null;
    seat_selection: boolean | null;
    open_seating: boolean | null;
    name: string;
    remark: string | null;
    slug: string;
    space_id: string | null;
};

export type HallCreateRequest = {
    source_id?: number | null;
    slug: string;
    vendor_id?: string | null;
    box_office_id?: string | null;
    seat_selection?: boolean | null;
    open_seating?: boolean | null;
    name: string;
    remark?: string | null;
    space_id?: string | null;
};

export type HallUpdateRequest = HallCreateRequest & {
    id: string;
};
