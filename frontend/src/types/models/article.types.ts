export type ArticleStatus = "draft" | "published" | "archived";

export type Article = {
    id: string;
    slug: string;
    status: ArticleStatus;
    title: string | null;
    content: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    subjectPeriodStart: string | null;
    subjectPeriodEnd: string | null;
    coverImageUrl: string | null;
};

export type ArticleListItem = Pick<
    Article,
    | "id"
    | "slug"
    | "status"
    | "title"
    | "updatedAt"
    | "publishedAt"
    | "subjectPeriodStart"
    | "subjectPeriodEnd"
    | "coverImageUrl"
>;

export type ArticleCreateInput = {
    title?: string | null;
};

export type ArticleUpdateInput = Omit<Article, "createdAt" | "updatedAt" | "publishedAt">;

export type ArticleRelations = {
    productionIds: string[];
    artistIds: string[];
    locationIds: string[];
    eventIds: string[];
};
