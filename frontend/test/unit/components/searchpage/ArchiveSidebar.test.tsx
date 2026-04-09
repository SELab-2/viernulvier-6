import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar/ArchiveSidebar";
import { NextIntlClientProvider } from "next-intl";
import type { Facet } from "@/types/models/taxonomy.types";

const messages = {
    Sidebar: {
        title: "Filter",
        clearAll: "Clear all",
        categories: {
            label: "Categories",
            artists: "Artists",
            productions: "Productions",
            articles: "Articles",
            posters: "Posters",
        },
        tags: {
            label: "Tags",
            showAll: "Show all",
        },
        locations: {
            label: "Locations",
            showAll: "Show all",
        },
        year: {
            label: "Year",
            rangeMode: "Year range",
            exactMode: "Exact dates",
            rangeFrom: "Start year",
            rangeTo: "End year",
        },
    },
};

const renderWithIntl = (ui: React.ReactElement) => {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );
};

describe("ArchiveSidebar component", () => {
    afterEach(() => {
        cleanup();
    });

    const mockFacets: Facet[] = [
        {
            slug: "discipline",
            translations: [{ languageCode: "en", label: "Facet 1" }],
            tags: [
                {
                    slug: "t1",
                    sortOrder: 0,
                    translations: [{ languageCode: "en", label: "Tag 1", description: null }],
                },
            ],
        },
        {
            slug: "format",
            translations: [{ languageCode: "en", label: "Facet 2" }],
            tags: [
                {
                    slug: "t2",
                    sortOrder: 1,
                    translations: [{ languageCode: "en", label: "Tag 2", description: null }],
                },
            ],
        },
    ];

    it("renders categories based on translations", () => {
        renderWithIntl(<ArchiveSidebar />);

        expect(screen.getByText("Categories")).toBeInTheDocument();
        expect(screen.getByText("Artists")).toBeInTheDocument();
        expect(screen.getByText("Productions")).toBeInTheDocument();
        expect(screen.getByText("Articles")).toBeInTheDocument();
        expect(screen.getByText("Posters")).toBeInTheDocument();
    });

    it("renders tags (facets) if provided", () => {
        renderWithIntl(<ArchiveSidebar facets={mockFacets} />);

        expect(screen.getByText("Facet 1")).toBeInTheDocument();
        expect(screen.getByText("Tag 1")).toBeInTheDocument();
        expect(screen.getByText("Facet 2")).toBeInTheDocument();
        expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("has 'productions' category checked by default", () => {
        renderWithIntl(<ArchiveSidebar />);

        const productionsButton = screen.getByRole("button", { name: "Productions" });
        expect(productionsButton).toHaveAttribute("aria-pressed", "true");

        const artistsButton = screen.getByRole("button", { name: "Artists" });
        expect(artistsButton).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles categories on click", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar />);

        const artistsButton = screen.getByRole("button", { name: "Artists" });
        expect(artistsButton).toHaveAttribute("aria-pressed", "false");

        await user.click(artistsButton);

        expect(artistsButton).toHaveAttribute("aria-pressed", "true");
    });
});
