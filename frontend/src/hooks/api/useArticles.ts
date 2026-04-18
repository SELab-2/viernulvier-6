import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapArticle,
    mapArticleListItems,
    mapArticleRelations,
    mapCreateArticleInput,
    mapPaginatedArticleListItemsResult,
    mapUpdateArticleInput,
    mapUpdateArticleRelationsInput,
} from "@/mappers/article.mapper";
import {
    ArticleListResponse,
    ArticleRelationsResponse,
    ArticleResponse,
    ArticlesCmsSearchResponse,
} from "@/types/api/article.api.types";
import {
    Article,
    ArticleCreateInput,
    ArticleListItem,
    ArticleRelations,
    ArticleUpdateInput,
} from "@/types/models/article.types";
import { PaginatedResult, SearchPaginationParams } from "@/types/api/api.types";

import { queryKeys } from "./query-keys";

const fetchArticlesPublished = async (): Promise<ArticleListItem[]> => {
    const { data } = await api.get<ArticleListResponse[]>("/articles");
    return mapArticleListItems(data);
};

const fetchArticleBySlug = async (slug: string): Promise<Article> => {
    const { data } = await api.get<ArticleResponse>(`/articles/${slug}`);
    return mapArticle(data);
};

const fetchArticlesCms = async (): Promise<ArticleListItem[]> => {
    const { data } = await api.get<ArticleListResponse[]>("/articles/cms");
    return mapArticleListItems(data);
};

const fetchArticlesCmsSearch = async (
    params?: SearchPaginationParams
): Promise<PaginatedResult<ArticleListItem>> => {
    const { data } = await api.get<ArticlesCmsSearchResponse>("/articles/cms/search", { params });
    return mapPaginatedArticleListItemsResult(data);
};

const fetchArticleById = async (id: string): Promise<Article> => {
    const { data } = await api.get<ArticleResponse>(`/articles/cms/${id}`);
    return mapArticle(data);
};

const fetchArticleRelations = async (id: string): Promise<ArticleRelations> => {
    const { data } = await api.get<ArticleRelationsResponse>(`/articles/cms/${id}/relations`);
    return mapArticleRelations(data);
};

export const useGetArticles = () => {
    return useQuery({
        queryKey: queryKeys.articles.published,
        queryFn: fetchArticlesPublished,
    });
};

export const useGetArticleBySlug = (slug: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.articles.bySlug(slug),
        queryFn: () => fetchArticleBySlug(slug),
        enabled: Boolean(slug) && (options?.enabled ?? true),
    });
};

export const useGetArticlesCms = () => {
    return useQuery({
        queryKey: queryKeys.articles.all,
        queryFn: fetchArticlesCms,
    });
};

export const useGetInfiniteArticlesCms = (
    params?: Omit<SearchPaginationParams, "cursor">,
    options?: { enabled?: boolean }
) => {
    return useInfiniteQuery({
        queryKey: queryKeys.articles.cmsInfinite(params),
        queryFn: async ({ pageParam }) => fetchArticlesCmsSearch({ ...params, cursor: pageParam }),
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: null as string | null,
        ...options,
    });
};

export const useGetArticle = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.articles.detail(id),
        queryFn: () => fetchArticleById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useGetArticleRelations = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.articles.relations(id),
        queryFn: () => fetchArticleRelations(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useCreateArticle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ArticleCreateInput) => {
            const { data } = await api.post<ArticleResponse>(
                "/articles",
                mapCreateArticleInput(payload)
            );
            return mapArticle(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });
        },
    });
};

export const useUpdateArticle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ArticleUpdateInput) => {
            const { data } = await api.put<ArticleResponse>(
                `/articles/cms/${payload.id}`,
                mapUpdateArticleInput(payload)
            );
            return mapArticle(data);
        },
        onSuccess: (article) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });
            queryClient.setQueryData(queryKeys.articles.detail(article.id), article);
        },
    });
};

export const useDeleteArticle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/articles/cms/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });
            queryClient.removeQueries({ queryKey: queryKeys.articles.detail(id) });
        },
    });
};

export const useUpdateArticleRelations = (id: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (relations: ArticleRelations) => {
            const { data } = await api.put<ArticleRelationsResponse>(
                `/articles/cms/${id}/relations`,
                mapUpdateArticleRelationsInput(relations)
            );
            return mapArticleRelations(data);
        },
        onSuccess: (relations) => {
            queryClient.setQueryData(queryKeys.articles.relations(id), relations);
        },
    });
};
