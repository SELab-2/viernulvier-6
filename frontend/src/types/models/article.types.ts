export type ArticleStatus = "draft" | "published" | "archived";

export type Article = {
    id: string;
    slug: string;
    status: ArticleStatus;
    titleNl: string | null;
    titleEn: string | null;
    content: Record<string, unknown> | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    subjectPeriodStart: string | null;
    subjectPeriodEnd: string | null;
};

export type ArticleListItem = Pick<
    Article,
    "id" | "slug" | "status" | "titleNl" | "titleEn" | "publishedAt" | "updatedAt"
>;

export type ArticleCreateInput = {
    titleNl?: string | null;
};

export type ArticleUpdateInput = Article;

export type ArticleRelations = {
    productionIds: string[];
    artistIds: string[];
    locationIds: string[];
    eventIds: string[];
};
