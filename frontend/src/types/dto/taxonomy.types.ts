export interface TagDto {
    slug: string;
    label: string;
    sort_order: number;
}

export interface FacetDto {
    slug: string;
    label: string;
    sort_order: number;
    tags: TagDto[];
}
