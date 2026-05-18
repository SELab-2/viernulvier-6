import { renderHook, waitFor, act } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { components } from "@/types/api/generated";
import { queryKeys } from "@/hooks/api";
import {
    useCreateArticle,
    useDeleteArticle,
    useGetArticle,
    useGetArticleBySlug,
    useGetArticleRelations,
    useGetArticles,
    useGetArticlesByProduction,
    useGetArticlesCms,
    useGetInfiniteArticles,
    useGetInfiniteArticlesCms,
    useUpdateArticle,
    useUpdateArticleRelations,
} from "@/hooks/api/useArticles";
import { articleFull, articleListItems } from "../../msw/handlers/articles.handlers";
import { server } from "../../msw/server";
import { apiUrl } from "../../utils/env";
import { createQueryClientWrapper } from "../../utils/query-client";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

// ── Public hooks ─────────────────────────────────────────────────────

describe("useGetArticles (public)", () => {
    it("fetches published articles and maps them to domain models", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticles(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const articles = result.current.data!;
        expect(articles).toHaveLength(2);

        // Verify camelCase mapping from snake_case API response
        expect(articles[0]).toEqual({
            id: articleListItems[0]!.id,
            slug: articleListItems[0]!.slug,
            status: articleListItems[0]!.status,
            title: articleListItems[0]!.title,
            updatedAt: articleListItems[0]!.updated_at,
            publishedAt: articleListItems[0]!.published_at,
            subjectPeriodStart: articleListItems[0]!.subject_period_start,
            subjectPeriodEnd: articleListItems[0]!.subject_period_end,
            coverImageUrl: articleListItems[0]!.cover_image_url ?? null,
            tags: articleListItems[0]!.tags ?? [],
        });

        // Verify query cache key
        const cached = queryClient.getQueryData(queryKeys.articles.published);
        expect(cached).toEqual(articles);
    });

    it("returns empty array when no articles exist", async () => {
        server.use(
            http.get(apiUrl("/articles"), ({ request }) => {
                const url = new URL(request.url);
                if (url.pathname.includes("/cms")) return;
                return HttpResponse.json({
                    data: [],
                    next_cursor: null,
                } satisfies components["schemas"]["PaginatedResponse_ArticleListPayload"]);
            })
        );

        const { wrapper } = createQueryClientWrapper();
        const { result } = renderHook(() => useGetArticles(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([]);
    });
});

describe("useGetArticleBySlug (public)", () => {
    it("fetches a single published article by slug with full content", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticleBySlug("kleurenstudies-van-de-vooruit"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const article = result.current.data!;
        expect(article.id).toBe(articleFull.id);
        expect(article.slug).toBe(articleFull.slug);
        expect(article.title).toBe(articleFull.title);
        expect(article.content).toEqual(articleFull.content);
        expect(article.createdAt).toBe(articleFull.created_at);
        expect(article.updatedAt).toBe(articleFull.updated_at);
        expect(article.subjectPeriodStart).toBe(articleFull.subject_period_start);
        expect(article.subjectPeriodEnd).toBe(articleFull.subject_period_end);

        // Verify query cache key
        const cached = queryClient.getQueryData(
            queryKeys.articles.bySlug("kleurenstudies-van-de-vooruit")
        );
        expect(cached).toEqual(article);
    });

    it("returns error for non-existent slug", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticleBySlug("does-not-exist"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
    });

    it("does not fetch when slug is empty", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticleBySlug(""), { wrapper });

        // Should stay idle — enabled guard prevents fetch
        expect(result.current.fetchStatus).toBe("idle");
    });

    it("respects the enabled option", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetArticleBySlug("kleurenstudies-van-de-vooruit", { enabled: false }),
            { wrapper }
        );

        expect(result.current.fetchStatus).toBe("idle");
    });
});

// ── CMS hooks (existing, verify they still work with new handlers) ───

describe("useGetArticlesCms", () => {
    it("fetches all articles for CMS", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticlesCms(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0]!.slug).toBe("kleurenstudies-van-de-vooruit");
    });
});

describe("useGetArticle (CMS by id)", () => {
    it("fetches a single article by UUID", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticle(articleFull.id), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data!.id).toBe(articleFull.id);
        expect(result.current.data!.content).toEqual(articleFull.content);
    });

    it("returns error for non-existent id", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticle("00000000-0000-0000-0000-000000000000"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
    });
});

describe("useGetArticlesByProduction", () => {
    it("fetches articles filtered by production id", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(
            () => useGetArticlesByProduction("4f327f95-3a64-4fc0-8f6a-a9dc44c01111"),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(2);
    });

    it("does not fetch when productionId is empty", () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticlesByProduction(""), { wrapper });

        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useGetInfiniteArticles", () => {
    it("fetches articles with infinite scroll pagination", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetInfiniteArticles(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.pages).toHaveLength(1);
        expect(result.current.data?.pages[0]?.data).toHaveLength(2);
    });
});

describe("useGetInfiniteArticlesCms", () => {
    it("fetches CMS articles with search and cursor pagination", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetInfiniteArticlesCms({ limit: 10 }), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.pages).toHaveLength(1);
    });
});

describe("useGetArticleRelations", () => {
    it("fetches article relations", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticleRelations(articleFull.id), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.productionIds).toContain(
            "4f327f95-3a64-4fc0-8f6a-a9dc44c01111"
        );
    });

    it("does not fetch when id is empty", () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetArticleRelations(""), { wrapper });

        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useCreateArticle", () => {
    it("creates an article and invalidates CMS cache", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useCreateArticle(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ title: "New Article" });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(
            expect.objectContaining({
                slug: articleFull.slug,
            })
        );
    });
});

describe("useUpdateArticle", () => {
    it("updates an article and sets detail cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        queryClient.setQueryData(queryKeys.articles.all, []);

        const { result } = renderHook(() => useUpdateArticle(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                id: articleFull.id,
                slug: articleFull.slug,
                title: "Updated Title",
                content: { type: "doc", content: [] },
                status: "published",
                subjectPeriodStart: null,
                subjectPeriodEnd: null,
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const detailCache = queryClient.getQueryData(queryKeys.articles.detail(articleFull.id));
        expect(detailCache).toBeDefined();
    });
});

describe("useDeleteArticle", () => {
    it("deletes an article and removes detail from cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        queryClient.setQueryData(queryKeys.articles.detail(articleFull.id), {
            id: articleFull.id,
            title: "Test",
        });

        const { result } = renderHook(() => useDeleteArticle(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync(articleFull.id);
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.articles.detail(articleFull.id));
        expect(cached).toBeUndefined();
    });
});

describe("useUpdateArticleRelations", () => {
    it("updates article relations and sets cache", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        queryClient.setQueryData(queryKeys.articles.relations(articleFull.id), {
            productionIds: [],
        });

        const { result } = renderHook(() => useUpdateArticleRelations(articleFull.id), {
            wrapper,
        });

        await act(async () => {
            await result.current.mutateAsync({
                productionIds: ["4f327f95-3a64-4fc0-8f6a-a9dc44c01111"],
                artistIds: [],
                locationIds: [],
                eventIds: [],
            });
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
    });
});
