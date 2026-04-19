import { describe, expect, it } from "vitest";

import type { components } from "@/types/api/generated";
import {
    mapArticle,
    mapArticleListItem,
    mapArticleListItems,
    mapArticleRelations,
    mapCreateArticleInput,
    mapUpdateArticleInput,
    mapUpdateArticleRelationsInput,
} from "@/mappers/article.mapper";

// ── Typed fixtures that break when backend schema changes ────────────

const articleResponse: components["schemas"]["ArticlePayload"] = {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    slug: "kleurenstudies-van-de-vooruit",
    status: "published",
    title: "Kleurenstudies van De Vooruit",
    content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Eerste alinea." }] }],
    },
    created_at: "2026-01-15T10:30:00Z",
    updated_at: "2026-03-20T14:00:00Z",
    subject_period_start: "1960-01-01",
    subject_period_end: "1970-12-31",
};

const articleListResponse: components["schemas"]["ArticleListPayload"] = {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    slug: "kleurenstudies-van-de-vooruit",
    status: "published",
    title: "Kleurenstudies van De Vooruit",
    updated_at: "2026-03-20T14:00:00Z",
    subject_period_start: "1960-01-01",
    subject_period_end: "1970-12-31",
};

const relationsResponse: components["schemas"]["ArticleRelationsPayload"] = {
    production_ids: ["p1", "p2"],
    artist_ids: ["a1"],
    location_ids: ["l1", "l2", "l3"],
    event_ids: [],
};

// ── Tests ────────────────────────────────────────────────────────────

describe("article mapper", () => {
    describe("mapArticle", () => {
        it("maps a full article response to the domain model", () => {
            const mapped = mapArticle(articleResponse);

            expect(mapped).toEqual({
                id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                slug: "kleurenstudies-van-de-vooruit",
                status: "published",
                title: "Kleurenstudies van De Vooruit",
                content: {
                    type: "doc",
                    content: [
                        { type: "paragraph", content: [{ type: "text", text: "Eerste alinea." }] },
                    ],
                },
                createdAt: "2026-01-15T10:30:00Z",
                updatedAt: "2026-03-20T14:00:00Z",
                publishedAt: null,
                subjectPeriodStart: "1960-01-01",
                subjectPeriodEnd: "1970-12-31",
            });
        });

        it("maps nullable fields to null when absent", () => {
            const minimal: components["schemas"]["ArticlePayload"] = {
                id: "00000000-0000-0000-0000-000000000000",
                slug: "untitled",
                status: "draft",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
            };

            const mapped = mapArticle(minimal);

            expect(mapped.title).toBeNull();
            expect(mapped.content).toBeNull();
            expect(mapped.subjectPeriodStart).toBeNull();
            expect(mapped.subjectPeriodEnd).toBeNull();
        });

        it("throws on invalid content shape", () => {
            const bad: components["schemas"]["ArticlePayload"] = {
                ...articleResponse,
                content: "not-an-object" as unknown,
            };

            expect(() => mapArticle(bad)).toThrow("Unexpected article content shape");
        });
    });

    describe("mapArticleListItem / mapArticleListItems", () => {
        it("maps a single list response to domain model", () => {
            const mapped = mapArticleListItem(articleListResponse);

            expect(mapped).toEqual({
                id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                slug: "kleurenstudies-van-de-vooruit",
                status: "published",
                title: "Kleurenstudies van De Vooruit",
                updatedAt: "2026-03-20T14:00:00Z",
                publishedAt: null,
                subjectPeriodStart: "1960-01-01",
                subjectPeriodEnd: "1970-12-31",
            });
        });

        it("maps a batch of list responses", () => {
            const second: components["schemas"]["ArticleListPayload"] = {
                ...articleListResponse,
                id: "bbbbbbbb-0000-0000-0000-000000000000",
                slug: "ander-artikel",
                title: "Ander Artikel",
            };

            const mapped = mapArticleListItems([articleListResponse, second]);

            expect(mapped).toHaveLength(2);
            expect(mapped[0]?.slug).toBe("kleurenstudies-van-de-vooruit");
            expect(mapped[1]?.slug).toBe("ander-artikel");
        });
    });

    describe("mapArticleRelations", () => {
        it("maps snake_case relation IDs to camelCase", () => {
            const mapped = mapArticleRelations(relationsResponse);

            expect(mapped).toEqual({
                productionIds: ["p1", "p2"],
                artistIds: ["a1"],
                locationIds: ["l1", "l2", "l3"],
                eventIds: [],
            });
        });
    });

    describe("mapCreateArticleInput", () => {
        it("maps create input to API request", () => {
            const result = mapCreateArticleInput({ title: "Nieuw Artikel" });
            expect(result).toEqual({ title: "Nieuw Artikel" });
        });

        it("maps null title", () => {
            const result = mapCreateArticleInput({ title: null });
            expect(result).toEqual({ title: null });
        });
    });

    describe("mapUpdateArticleInput", () => {
        it("maps update input to snake_case API request", () => {
            const result = mapUpdateArticleInput({
                id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
                slug: "updated-slug",
                status: "archived",
                title: "Updated Title",
                content: { type: "doc", content: [] },
                subjectPeriodStart: "2020-01-01",
                subjectPeriodEnd: "2020-12-31",
            });

            expect(result).toEqual({
                slug: "updated-slug",
                status: "archived",
                title: "Updated Title",
                content: { type: "doc", content: [] },
                subject_period_start: "2020-01-01",
                subject_period_end: "2020-12-31",
            });
        });
    });

    describe("mapUpdateArticleRelationsInput", () => {
        it("maps camelCase relation IDs back to snake_case", () => {
            const result = mapUpdateArticleRelationsInput({
                productionIds: ["p1"],
                artistIds: [],
                locationIds: ["l1"],
                eventIds: ["e1", "e2"],
            });

            expect(result).toEqual({
                production_ids: ["p1"],
                artist_ids: [],
                location_ids: ["l1"],
                event_ids: ["e1", "e2"],
            });
        });
    });
});
