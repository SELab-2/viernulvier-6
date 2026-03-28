export type ArticleStatus = "draft" | "published" | "archived";

export type ArticleResponse = {
    id: string;
    slug: string;
    status: ArticleStatus;
    title: string | null;
    content: Record<string, unknown> | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    subject_period_start: string | null;
    subject_period_end: string | null;
};

export type ArticleListResponse = {
    id: string;
    slug: string;
    status: ArticleStatus;
    title: string | null;
    published_at: string | null;
    updated_at: string;
    subject_period_start: string | null;
    subject_period_end: string | null;
};

export type ArticleCreateRequest = {
    title?: string | null;
};

export type ArticleUpdateRequest = {
    slug: string;
    status: ArticleStatus;
    title: string | null;
    content: Record<string, unknown> | null;
    published_at: string | null;
    subject_period_start: string | null;
    subject_period_end: string | null;
};

export type ArticleRelationsResponse = {
    production_ids: string[];
    artist_ids: string[];
    location_ids: string[];
    event_ids: string[];
};
