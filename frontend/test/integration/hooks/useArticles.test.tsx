import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { components } from "@/types/api/generated";
import { queryKeys } from "@/hooks/api";
import {
    useGetArticles,
    useGetArticleBySlug,
    useGetArticlesCms,
    useGetArticle,
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
            publishedAt: null,
            updatedAt: articleListItems[0]!.updated_at,
            subjectPeriodStart: articleListItems[0]!.subject_period_start,
            subjectPeriodEnd: articleListItems[0]!.subject_period_end,
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
                return HttpResponse.json(
                    [] satisfies components["schemas"]["ArticleListPayload"][]
                );
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
