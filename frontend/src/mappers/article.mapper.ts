import {
    ArticleCreateRequest,
    ArticleListResponse,
    ArticleRelationsResponse,
    ArticleResponse,
    ArticleUpdateRequest,
} from "@/types/api/article.api.types";
import {
    Article,
    ArticleCreateInput,
    ArticleListItem,
    ArticleRelations,
    ArticleUpdateInput,
} from "@/types/models/article.types";
import { toNullable } from "./utils";

function toArticleContent(value: unknown): Record<string, unknown> | null {
    if (value == null) return null;
    if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    throw new Error(`Unexpected article content shape: ${typeof value}`);
}

export const mapArticle = (response: ArticleResponse): Article => ({
    id: response.id,
    slug: response.slug,
    status: response.status,
    title: toNullable(response.title),
    content: toArticleContent(response.content),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    publishedAt: toNullable(response.published_at),
    subjectPeriodStart: toNullable(response.subject_period_start),
    subjectPeriodEnd: toNullable(response.subject_period_end),
});

export const mapArticleListItem = (response: ArticleListResponse): ArticleListItem => ({
    id: response.id,
    slug: response.slug,
    status: response.status,
    title: toNullable(response.title),
    updatedAt: response.updated_at,
    publishedAt: toNullable(response.published_at),
    subjectPeriodStart: toNullable(response.subject_period_start),
    subjectPeriodEnd: toNullable(response.subject_period_end),
});

export const mapArticleListItems = (responses: ArticleListResponse[]): ArticleListItem[] =>
    responses.map(mapArticleListItem);

export const mapArticleRelations = (response: ArticleRelationsResponse): ArticleRelations => ({
    productionIds: response.production_ids,
    artistIds: response.artist_ids,
    locationIds: response.location_ids,
    eventIds: response.event_ids,
});

export const mapCreateArticleInput = (input: ArticleCreateInput): ArticleCreateRequest => ({
    title: input.title,
});

export const mapUpdateArticleInput = (input: ArticleUpdateInput): ArticleUpdateRequest => ({
    slug: input.slug,
    status: input.status,
    title: input.title,
    content: input.content,
    subject_period_start: input.subjectPeriodStart,
    subject_period_end: input.subjectPeriodEnd,
});

export const mapUpdateArticleRelationsInput = (
    input: ArticleRelations
): ArticleRelationsResponse => ({
    production_ids: input.productionIds,
    artist_ids: input.artistIds,
    location_ids: input.locationIds,
    event_ids: input.eventIds,
});
