export type ArticleStatus = "draft" | "published" | "archived";

export type Article = {
    id: string;
    slug: string;
    status: ArticleStatus;
    title: string | null;
    content: Record<string, unknown> | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    subjectPeriodStart: string | null;
    subjectPeriodEnd: string | null;
};

export type ArticleListItem = Pick<
    Article,
    | "id"
    | "slug"
    | "status"
    | "title"
    | "publishedAt"
    | "updatedAt"
    | "subjectPeriodStart"
    | "subjectPeriodEnd"
>;

export type ArticleCreateInput = {
    title?: string | null;
};

export type ArticleUpdateInput = Omit<Article, "createdAt" | "updatedAt">;

export type ArticleRelations = {
    productionIds: string[];
    artistIds: string[];
    locationIds: string[];
    eventIds: string[];
};
