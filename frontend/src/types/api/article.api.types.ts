import { components } from "@/types/api/generated";
import { PaginatedListResponse } from "./api.types";

export type ArticleStatus = components["schemas"]["ArticleStatus"];
export type ArticleListResponse = components["schemas"]["ArticleListPayload"];
export type ArticleResponse = components["schemas"]["ArticlePayload"];
export type ArticleCreateRequest = components["schemas"]["ArticlePostPayload"];
export type ArticleUpdateRequest = components["schemas"]["ArticleUpdatePayload"];
export type ArticleRelationsResponse = components["schemas"]["ArticleRelationsPayload"];

export type GetAllArticlesResponse = PaginatedListResponse<"get_all_articles">;
export type PaginatedArticleResponse = GetAllArticlesResponse;
