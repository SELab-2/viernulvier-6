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

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

export const mapArticle = (response: ArticleResponse): Article => ({
    id: response.id,
    slug: response.slug,
    status: response.status,
    titleNl: toNullable(response.title_nl),
    titleEn: toNullable(response.title_en),
    content: toNullable(response.content),
    publishedAt: toNullable(response.published_at),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    subjectPeriodStart: toNullable(response.subject_period_start),
    subjectPeriodEnd: toNullable(response.subject_period_end),
});

export const mapArticleListItem = (response: ArticleListResponse): ArticleListItem => ({
    id: response.id,
    slug: response.slug,
    status: response.status,
    titleNl: toNullable(response.title_nl),
    titleEn: toNullable(response.title_en),
    publishedAt: toNullable(response.published_at),
    updatedAt: response.updated_at,
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
    title_nl: input.titleNl,
});

export const mapUpdateArticleInput = (input: ArticleUpdateInput): ArticleUpdateRequest => ({
    id: input.id,
    slug: input.slug,
    status: input.status,
    title_nl: input.titleNl,
    title_en: input.titleEn,
    content: input.content,
    published_at: input.publishedAt,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
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
