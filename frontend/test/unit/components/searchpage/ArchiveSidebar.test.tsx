import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar/ArchiveSidebar";
import { NextIntlClientProvider } from "next-intl";
import type { Facet } from "@/types/models/taxonomy.types";
import type { StatsPayload } from "@/types/api/stats.api.types";
import type { Location } from "@/types/models/location.types";
import type { PaginatedResult } from "@/types/api/api.types";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

const { useGetStatsMock, useGetFacetsMock, useGetLocationsMock } = vi.hoisted(() => ({
    useGetStatsMock: vi.fn(() => ({
        data: undefined as StatsPayload | undefined,
        isLoading: false,
        isError: false,
    })),
    useGetFacetsMock: vi.fn(() => ({
        data: undefined as Facet[] | undefined,
    })),
    useGetLocationsMock: vi.fn(() => ({
        data: undefined as PaginatedResult<Location> | undefined,
    })),
}));

vi.mock("@/hooks/api/useStats", () => ({
    useGetStats: useGetStatsMock,
}));

vi.mock("@/hooks/api/useTaxonomy", () => ({
    useGetFacets: useGetFacetsMock,
}));

vi.mock("@/hooks/api/useLocations", () => ({
    useGetLocations: useGetLocationsMock,
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => mockSearchParams,
    usePathname: () => "/en/search",
}));

vi.mock("@/i18n/routing", () => ({
    useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
    usePathname: () => "/en/search",
    Link: ({ children }: { children: React.ReactNode }) => children,
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

const mockFacets: Facet[] = [
    {
        slug: "discipline",
        translations: [{ languageCode: "en", label: "Facet 1" }],
        tags: [
            {
                slug: "t1",
                sortOrder: 0,
                translations: [
                    {
                        languageCode: "en",
                        label: "Tag 1",
                        description: null,
                    },
                ],
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
                translations: [
                    {
                        languageCode: "en",
                        label: "Tag 2",
                        description: null,
                    },
                ],
            },
        ],
    },
];

describe("ArchiveSidebar component", () => {
    beforeEach(() => {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
        useGetStatsMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: false,
        });
        useGetFacetsMock.mockReturnValue({ data: undefined });
        useGetLocationsMock.mockReturnValue({ data: undefined });
        mockReplace.mockClear();
        mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it("renders categories based on translations", () => {
        renderWithIntl(<ArchiveSidebar />);

        expect(screen.getByText("Categories")).toBeInTheDocument();
        expect(screen.getByText("Artists")).toBeInTheDocument();
        expect(screen.getByText("Productions")).toBeInTheDocument();
        expect(screen.getByText("Articles")).toBeInTheDocument();
        expect(screen.getByText("Posters")).toBeInTheDocument();
    });

    it("renders tags (facets) from API hook", () => {
        useGetFacetsMock.mockReturnValue({ data: mockFacets });
        renderWithIntl(<ArchiveSidebar />);

        expect(screen.getByText("Facet 1")).toBeInTheDocument();
        expect(screen.getByText("Tag 1")).toBeInTheDocument();
        expect(screen.getByText("Facet 2")).toBeInTheDocument();
        expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("has 'productions' category checked by default", () => {
        renderWithIntl(<ArchiveSidebar />);

        const productionsButton = screen.getByRole("button", {
            name: "Productions",
        });
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

    it("tag starts unchecked when not in URL", () => {
        useGetFacetsMock.mockReturnValue({ data: mockFacets });
        renderWithIntl(<ArchiveSidebar />);

        const tag1 = screen.getByRole("button", { name: "Tag 1" });
        expect(tag1).toHaveAttribute("aria-pressed", "false");
    });

    it("tag appears checked when its slug is in URL params", () => {
        useGetFacetsMock.mockReturnValue({ data: mockFacets });
        mockSearchParams.set("discipline", "t1");
        renderWithIntl(<ArchiveSidebar />);

        const tag1 = screen.getByRole("button", { name: "Tag 1" });
        expect(tag1).toHaveAttribute("aria-pressed", "true");
    });

    it("clicking a tag calls router.replace with updated URL param", async () => {
        const user = userEvent.setup();
        useGetFacetsMock.mockReturnValue({ data: mockFacets });
        renderWithIntl(<ArchiveSidebar />);

        await user.click(screen.getByRole("button", { name: "Tag 1" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).toContain("discipline=t1");
    });

    it("renders default 'De Vooruit' location when none provided", () => {
        renderWithIntl(<ArchiveSidebar />);

        const locBtn = screen.getByRole("button", { name: "De Vooruit" });
        expect(locBtn).toBeInTheDocument();
        expect(locBtn).toBeDisabled();
    });

    it("renders provided locations from the API hook", () => {
        useGetLocationsMock.mockReturnValue({
            data: {
                data: [
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
                ],
                nextCursor: null,
            },
        });
        renderWithIntl(<ArchiveSidebar />);

        const locBtn = screen.getByRole("button", { name: "Venue A" });
        expect(locBtn).toBeInTheDocument();
        expect(locBtn).toBeDisabled();
    });

    it("clearAll strips filter params from URL and resets category state", async () => {
        const user = userEvent.setup();
        useGetFacetsMock.mockReturnValue({ data: mockFacets });
        mockSearchParams.set("discipline", "t1");
        renderWithIntl(<ArchiveSidebar />);

        await user.click(screen.getByRole("button", { name: "Artists" }));
        await user.click(screen.getByRole("button", { name: "Clear all" }));

        expect(mockReplace).toHaveBeenCalled();
        const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
        expect(lastCall).not.toContain("discipline");

        expect(screen.getByRole("button", { name: "Artists" })).toHaveAttribute(
            "aria-pressed",
            "false"
        );
    });

    it("shows YearRangeSlider by default (year mode)", () => {
        renderWithIntl(<ArchiveSidebar minYear={2000} />);

        expect(screen.getAllByRole("slider")).toHaveLength(2);
    });

    it("switches to exact date mode when clicking 'Exact dates' tab", async () => {
        const user = userEvent.setup();
        renderWithIntl(<ArchiveSidebar minYear={2000} />);

        await user.click(screen.getByRole("button", { name: "Exact dates" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).toContain("date_mode=exact");
    });

    it("shows DateRangePicker when date_mode=exact is in URL", () => {
        mockSearchParams.set("date_mode", "exact");
        renderWithIntl(<ArchiveSidebar minYear={2000} />);

        expect(screen.queryAllByRole("slider")).toHaveLength(0);
    });

    it("updates year range labels when /stats arrives after mount (null draft tracks new bounds)", async () => {
        const currentYear = new Date().getFullYear();

        useGetStatsMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: false,
        });

        const { rerender } = renderWithIntl(<ArchiveSidebar />);

        expect(screen.getByText("1980")).toBeInTheDocument();
        expect(screen.getByText(String(currentYear))).toBeInTheDocument();

        const statsPayload: StatsPayload = {
            oldest_event: "2016-06-15T12:00:00.000Z",
            newest_event: "2023-08-01T12:00:00.000Z",
            event_count: 10,
            production_count: 5,
            location_count: 3,
            article_count: 2,
            artist_count: 0,
            collection_count: 0,
        };

        useGetStatsMock.mockReturnValue({
            data: statsPayload,
            isLoading: false,
            isError: false,
        });

        rerender(
            <NextIntlClientProvider locale="en" messages={messages}>
                <ArchiveSidebar />
            </NextIntlClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("2016")).toBeInTheDocument();
        });
        expect(screen.getByText("2023")).toBeInTheDocument();
        expect(screen.queryByText("1980")).not.toBeInTheDocument();
    });

    it("opens mobile sidebar when clicking the FAB button", async () => {
        const user = userEvent.setup();
        const { container } = renderWithIntl(<ArchiveSidebar />);

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
