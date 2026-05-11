import type { EntityTagSlim } from "./taxonomy.types";

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
    tags: EntityTagSlim[];
};

export type ArticleListItem = {
    id: string;
    slug: string;
    status: ArticleStatus;
    title: string | null;
    updatedAt: string;
    publishedAt: string | null;
    subjectPeriodStart: string | null;
    subjectPeriodEnd: string | null;
    coverImageUrl: string | null;
    tags: EntityTagSlim[];
};

export type ArticleCreateInput = {
    title?: string | null;
};

export type ArticleUpdateInput = Omit<
    Article,
    "createdAt" | "updatedAt" | "publishedAt" | "coverImageUrl" | "tags"
>;

export type ArticleRelations = {
    productionIds: string[];
    artistIds: string[];
    locationIds: string[];
    eventIds: string[];
};
