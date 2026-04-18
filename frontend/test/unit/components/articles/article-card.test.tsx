import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import { NextIntlClientProvider } from "next-intl";
import { http, HttpResponse } from "msw";

import { server } from "../../../msw/server";
import { apiUrl } from "../../../utils/env";
import type { components } from "@/types/api/generated";
import { ArticleCard } from "@/components/articles/article-card";
import type { ArticleListItem } from "@/types/models/article.types";

vi.mock("@/i18n/routing", () => ({
    Link: ({
        children,
        href,
        ...rest
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
        style?: React.CSSProperties;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const messages = { Articles: { untitled: "Untitled" } };

const renderWithIntl = (ui: React.ReactElement) =>
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );

const mockArticle: ArticleListItem = {
    id: "article-1",
    slug: "test-article",
    status: "published",
    title: "Test Article",
    updatedAt: "2026-03-01T00:00:00Z",
    publishedAt: "2026-03-01T00:00:00Z",
    subjectPeriodStart: "2026-01-01",
    subjectPeriodEnd: "2026-12-31",
};

const coverPayload: components["schemas"]["MediaPayload"] = {
    id: "media-cover-1",
    url: "https://cdn.example.com/cover.jpg",
    s3_key: "covers/cover.jpg",
    mime_type: "image/jpeg",
    gallery_type: "cover",
    alt_text_nl: "Cover photo",
    alt_text_en: null,
    alt_text_fr: null,
    description_nl: null,
    description_en: null,
    description_fr: null,
    credit_nl: null,
    credit_en: null,
    credit_fr: null,
    file_size: 50000,
    width: 800,
    height: 450,
    checksum: null,
    geo_latitude: null,
    geo_longitude: null,
    parent_id: null,
    derivative_type: null,
    source_system: "cms",
    source_uri: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    crops: [],
};

describe("ArticleCard", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders the article title", () => {
        renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);
        expect(screen.getByText("Test Article")).toBeInTheDocument();
    });

    it("renders 'Untitled' when the article has no title", () => {
        renderWithIntl(<ArticleCard article={{ ...mockArticle, title: null }} locale="en" />);
        expect(screen.getByText("Untitled")).toBeInTheDocument();
    });

    it("wraps content in a link pointing to the article slug", () => {
        renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/articles/test-article");
    });

    it("renders the subject period when both dates are set", () => {
        renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);
        // en-GB locale: "Jan 2026 — Dec 2026"
        expect(screen.getByText(/Jan 2026/)).toBeInTheDocument();
        expect(screen.getByText(/Dec 2026/)).toBeInTheDocument();
    });

    it("renders no image when there is no cover media", () => {
        // global handler already returns [] — no override needed
        const { container } = renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);
        expect(container.querySelectorAll("img")).toHaveLength(0);
    });

    it("renders a cover image when entity media returns a cover item", async () => {
        server.use(
            http.get(apiUrl("/media/entity/article/article-1"), () =>
                HttpResponse.json([coverPayload])
            )
        );

        const { container } = renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);

        await screen.findByRole("img");
        const img = container.querySelector("img") as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.getAttribute("alt")).toBe("Cover photo");
    });

    it("uses the thumbnail crop URL when available", async () => {
        const withCrop: components["schemas"]["MediaPayload"] = {
            ...coverPayload,
            crops: [
                {
                    id: "crop-1",
                    media_id: "media-cover-1",
                    variant_kind: "thumbnail",
                    crop_name: null,
                    url: "https://cdn.example.com/cover-thumb.jpg",
                    mime_type: "image/jpeg",
                    file_size: 8000,
                    width: 400,
                    height: 225,
                    checksum: null,
                    source_uri: null,
                },
            ],
        };

        server.use(
            http.get(apiUrl("/media/entity/article/article-1"), () => HttpResponse.json([withCrop]))
        );

        const { container } = renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);

        await screen.findByRole("img");
        const img = container.querySelector("img") as HTMLImageElement;
        expect(img.src).toContain("cover-thumb.jpg");
    });
});
