import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar/ArchiveSidebar";
import { NextIntlClientProvider } from "next-intl";
import type { Facet } from "@/types/models/taxonomy.types";

vi.mock("@/hooks/api/useStats", () => ({
    useGetStats: () => ({
        data: undefined,
        isLoading: false,
        isError: false,
    }),
}));

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
            startYear: "Start year",
            endYear: "End year",
            monthsShort: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ],
            monthsLong: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ],
            weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
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
    beforeEach(() => {
        // jsdom does not implement scrollIntoView (needed by DateRangePicker)
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers(); // restore in case a test used fake timers
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

    // ── Rendering ────────────────────────────────────────────────────────────

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

    // ── Category toggles ─────────────────────────────────────────────────────

    it("toggles categories on click", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar />);

        const artistsButton = screen.getByRole("button", { name: "Artists" });
        expect(artistsButton).toHaveAttribute("aria-pressed", "false");

        await user.click(artistsButton);

        expect(artistsButton).toHaveAttribute("aria-pressed", "true");
    });

    // ── Tag toggles ───────────────────────────────────────────────────────────

    it("toggles a tag on and off", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar facets={mockFacets} />);

        const tag1 = screen.getByRole("button", { name: "Tag 1" });
        expect(tag1).toHaveAttribute("aria-pressed", "false");

        await user.click(tag1);
        expect(tag1).toHaveAttribute("aria-pressed", "true");

        await user.click(tag1);
        expect(tag1).toHaveAttribute("aria-pressed", "false");
    });

    // ── Location toggles ──────────────────────────────────────────────────────

    it("renders default 'De Vooruit' location when none provided", () => {
        renderWithIntl(<ArchiveSidebar />);

        const locBtn = screen.getByRole("button", { name: "De Vooruit" });
        expect(locBtn).toBeInTheDocument();
        expect(locBtn).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles the default location on click", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar />);

        const locBtn = screen.getByRole("button", { name: "De Vooruit" });
        await user.click(locBtn);
        expect(locBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("renders provided locations and toggles them", async () => {
        const user = userEvent.setup();
        const locations = [
            {
                id: "loc1",
                name: "Venue A",
                address: "Street 1",
                sourceId: null,
                code: null,
                street: null,
                number: null,
                postalCode: null,
                city: null,
                country: null,
                phone1: null,
                phone2: null,
                isOwnedByViernulvier: null,
                uitdatabankId: null,
                slug: null,
                translations: [],
            },
        ];
        renderWithIntl(<ArchiveSidebar locations={locations} />);

        const locBtn = screen.getByRole("button", { name: "Venue A" });
        expect(locBtn).toHaveAttribute("aria-pressed", "false");

        await user.click(locBtn);
        expect(locBtn).toHaveAttribute("aria-pressed", "true");
    });

    // ── clearAll ──────────────────────────────────────────────────────────────

    it("clearAll resets all active filters", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar facets={mockFacets} />);

        await user.click(screen.getByRole("button", { name: "Artists" }));
        await user.click(screen.getByRole("button", { name: "Tag 1" }));

        expect(screen.getByRole("button", { name: "Artists" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        expect(screen.getByRole("button", { name: "Tag 1" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        await user.click(screen.getByRole("button", { name: "Clear all" }));

        expect(screen.getByRole("button", { name: "Artists" })).toHaveAttribute(
            "aria-pressed",
            "false"
        );
        expect(screen.getByRole("button", { name: "Tag 1" })).toHaveAttribute(
            "aria-pressed",
            "false"
        );
        expect(screen.getByRole("button", { name: "Productions" })).toHaveAttribute(
            "aria-pressed",
            "false"
        );
    });

    // ── onFilterChange debounce ───────────────────────────────────────────────

    it("calls onFilterChange after a filter change (debounced)", async () => {
        const onFilterChange = vi.fn();
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar onFilterChange={onFilterChange} />);

        await user.click(screen.getByRole("button", { name: "Artists" }));

        // Wait for the 300ms debounce to fire
        await waitFor(() => expect(onFilterChange).toHaveBeenCalledOnce(), { timeout: 1000 });

        const call = onFilterChange.mock.calls[0][0];
        expect(call.categories).toBeInstanceOf(Set);
        expect(call.tags).toBeInstanceOf(Set);
        expect(call.locations).toBeInstanceOf(Set);
        expect(Array.isArray(call.dateRange)).toBe(true);
    });

    // ── Date mode switching ───────────────────────────────────────────────────

    it("shows YearRangeSlider by default (year mode)", () => {
        renderWithIntl(<ArchiveSidebar minYear={2000} maxYear={2020} />);

        expect(screen.getAllByRole("slider")).toHaveLength(2);
        expect(screen.getByText("2000")).toBeInTheDocument();
        expect(screen.getByText("2020")).toBeInTheDocument();
    });

    it("switches to exact date mode when clicking 'Exact dates' tab", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar minYear={2000} maxYear={2020} />);

        await user.click(screen.getByRole("button", { name: "Exact dates" }));

        expect(screen.queryAllByRole("slider")).toHaveLength(0);
    });

    it("switches back to year mode when clicking 'Year range' tab", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar minYear={2000} maxYear={2020} />);

        await user.click(screen.getByRole("button", { name: "Exact dates" }));
        expect(screen.queryAllByRole("slider")).toHaveLength(0);

        await user.click(screen.getByRole("button", { name: "Year range" }));
        expect(screen.getAllByRole("slider")).toHaveLength(2);
    });

    // ── Mobile open/close ─────────────────────────────────────────────────────

    it("opens mobile sidebar when clicking the FAB button", async () => {
        const user = userEvent.setup();
        const { container } = renderWithIntl(<ArchiveSidebar />);

        // FAB is the fixed button in the bottom-left corner (lg:hidden)
        const fab = container.querySelector("button.fixed") as HTMLElement;
        expect(fab).toBeTruthy();

        await user.click(fab);

        expect(document.body.style.overflow).toBe("hidden");
    });

    it("closes mobile sidebar when clicking the X button inside the sidebar", async () => {
        const user = userEvent.setup();
        const { container } = renderWithIntl(<ArchiveSidebar />);

        const fab = container.querySelector("button.fixed") as HTMLElement;
        await user.click(fab);
        expect(document.body.style.overflow).toBe("hidden");

        // X close button: icon-only button with lg:hidden class inside the sidebar header
        const closeBtn = Array.from(container.querySelectorAll("button")).find(
            (btn) =>
                btn.querySelector("svg") !== null &&
                btn.textContent?.trim() === "" &&
                btn.className.includes("lg:hidden")
        );
        expect(closeBtn).toBeTruthy();
        await user.click(closeBtn!);

        expect(document.body.style.overflow).toBe("");
    });

    it("closes mobile sidebar when clicking the backdrop overlay", async () => {
        const user = userEvent.setup();
        const { container } = renderWithIntl(<ArchiveSidebar />);

        const fab = container.querySelector("button.fixed") as HTMLElement;
        await user.click(fab);

        const backdrop = container.querySelector("div.fixed.inset-0") as HTMLElement;
        expect(backdrop).toBeTruthy();
        await user.click(backdrop);

        expect(document.body.style.overflow).toBe("");
    });
});
