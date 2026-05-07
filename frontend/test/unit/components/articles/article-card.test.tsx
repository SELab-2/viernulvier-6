import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import { NextIntlClientProvider } from "next-intl";

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
    coverImageUrl: null,
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

    it("renders no image when coverImageUrl is null", () => {
        const { container } = renderWithIntl(<ArticleCard article={mockArticle} locale="en" />);
        expect(container.querySelectorAll("img")).toHaveLength(0);
    });

    it("renders a cover image when the article has a coverImageUrl", () => {
        const article = { ...mockArticle, coverImageUrl: "https://cdn.example.com/cover.jpg" };
        const { container } = renderWithIntl(<ArticleCard article={article} locale="en" />);
        const img = container.querySelector("img") as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.getAttribute("alt")).toBe("Test Article");
    });

    it("uses the coverImageUrl from the article directly as the image src", () => {
        const article = {
            ...mockArticle,
            coverImageUrl: "https://cdn.example.com/cover-thumb.jpg",
        };
        const { container } = renderWithIntl(<ArticleCard article={article} locale="en" />);
        const img = container.querySelector("img") as HTMLImageElement;
        expect(img.src).toContain("cover-thumb.jpg");
    });
});
