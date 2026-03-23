export type Hall = {
    id: string;
    sourceId: number | null;
    vendorId: string | null;
    boxOfficeId: string | null;
    seatSelection: boolean | null;
    openSeating: boolean | null;
    name: string;
    remark: string | null;
    slug: string;
    spaceId: string | null;
};

export type HallCreateInput = {
    sourceId?: number | null;
    slug: string;
    vendorId?: string | null;
    boxOfficeId?: string | null;
    seatSelection?: boolean | null;
    openSeating?: boolean | null;
    name: string;
    remark?: string | null;
    spaceId?: string | null;
};

export type HallUpdateInput = HallCreateInput & {
    id: string;
};
