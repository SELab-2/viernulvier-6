import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar/ArchiveSidebar";
import { NextIntlClientProvider } from "next-intl";

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

    const mockLocations = [
        { id: "1", title: { nl: "Location 1" } } as any,
        { id: "2", title: { nl: "Location 2" } } as any,
    ];

    const mockFacets = [
        {
            slug: "f1",
            label: "Facet 1",
            tags: [{ slug: "t1", label: "Tag 1" }],
        } as any,
        {
            slug: "f2",
            label: "Facet 2",
            tags: [{ slug: "t2", label: "Tag 2" }],
        } as any,
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

        const productionsCheckbox = screen.getByRole("checkbox", { name: "Productions" });
        expect(productionsCheckbox).toBeChecked();

        const artistsCheckbox = screen.getByRole("checkbox", { name: "Artists" });
        expect(artistsCheckbox).not.toBeChecked();
    });

    it("toggles categories on click", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar />);

        const artistsCheckbox = screen.getByRole("checkbox", { name: "Artists" });
        expect(artistsCheckbox).not.toBeChecked();

        await user.click(artistsCheckbox);

        expect(artistsCheckbox).toBeChecked();
    });
});
