import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ArchiveSidebar } from "@/components/searchpage/archive-sidebar/ArchiveSidebar";
import { NextIntlClientProvider } from "next-intl";
import type { Facet } from "@/types/models/taxonomy.types";
import type { StatsPayload } from "@/types/api/stats.api.types";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

const { useGetStatsMock, useGetFacetsMock, useGetInfiniteLocationsMock } = vi.hoisted(() => ({
    useGetStatsMock: vi.fn(() => ({
        data: undefined as StatsPayload | undefined,
        isPending: false,
        isLoading: false,
        isError: false,
    })),
    useGetFacetsMock: vi.fn(() => ({
        data: undefined as Facet[] | undefined,
        isPending: false,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useGetInfiniteLocationsMock: vi.fn((): any => ({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
    })),
}));

vi.mock("@/hooks/api/useStats", () => ({
    useGetStats: useGetStatsMock,
}));

vi.mock("@/hooks/api/useTaxonomy", () => ({
    useGetFacets: useGetFacetsMock,
}));

vi.mock("@/hooks/api/useLocations", () => ({
    useGetInfiniteLocations: useGetInfiniteLocationsMock,
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
        showMore: "Show more",
        showLess: "Show less",
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
            isPending: false,
            isLoading: false,
            isError: false,
        });
        useGetFacetsMock.mockReturnValue({ data: undefined, isPending: false });
        useGetInfiniteLocationsMock.mockReturnValue({
            data: undefined,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
        });
        mockReplace.mockClear();
        for (const key of Array.from(mockSearchParams.keys())) {
            mockSearchParams.delete(key);
        }
        window.history.pushState({}, "", "/");
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
        useGetFacetsMock.mockReturnValue({ data: mockFacets, isPending: false });
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
        useGetFacetsMock.mockReturnValue({ data: mockFacets, isPending: false });
        renderWithIntl(<ArchiveSidebar />);

        const tag1 = screen.getByRole("button", { name: "Tag 1" });
        expect(tag1).toHaveAttribute("aria-pressed", "false");
    });

    it("tag appears checked when its slug is in URL params", () => {
        useGetFacetsMock.mockReturnValue({ data: mockFacets, isPending: false });
        mockSearchParams.set("discipline", "t1");
        renderWithIntl(<ArchiveSidebar />);

        const tag1 = screen.getByRole("button", { name: "Tag 1" });
        expect(tag1).toHaveAttribute("aria-pressed", "true");
    });

    it("clicking a tag calls router.replace with updated URL param", async () => {
        const user = userEvent.setup();
        useGetFacetsMock.mockReturnValue({ data: mockFacets, isPending: false });
        renderWithIntl(<ArchiveSidebar />);

        await user.click(screen.getByRole("button", { name: "Tag 1" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).toContain("discipline=t1");
    });

    it("clicking an active tag removes it from the URL param", async () => {
        const user = userEvent.setup();
        useGetFacetsMock.mockReturnValue({ data: mockFacets, isPending: false });
        mockSearchParams.set("discipline", "t1");
        window.history.pushState({}, "", "?discipline=t1");
        renderWithIntl(<ArchiveSidebar />);

        await user.click(screen.getByRole("button", { name: "Tag 1" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).not.toContain("discipline");
    });

    it("location appears checked when its id is in URL params", () => {
        mockSearchParams.set("location", "loc1");
        useGetInfiniteLocationsMock.mockReturnValue({
            data: {
                pages: [
                    {
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
                                coverImageUrl: null,
                            },
                        ],
                        nextCursor: null,
                    },
                ],
                pageParams: [null],
            },
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
        });
        renderWithIntl(<ArchiveSidebar />);

        expect(screen.getByRole("button", { name: "Venue A" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
    });

    it("clicking an active location removes it from the URL param", async () => {
        const user = userEvent.setup();
        mockSearchParams.set("location", "loc1");
        window.history.pushState({}, "", "?location=loc1");
        useGetInfiniteLocationsMock.mockReturnValue({
            data: {
                pages: [
                    {
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
                                coverImageUrl: null,
                            },
                        ],
                        nextCursor: null,
                    },
                ],
                pageParams: [null],
            },
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
        });
        renderWithIntl(<ArchiveSidebar />);

        await user.click(screen.getByRole("button", { name: "Venue A" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).not.toContain("location");
    });

    it("renders provided locations from the API hook and toggles them", async () => {
        const user = userEvent.setup();
        useGetInfiniteLocationsMock.mockReturnValue({
            data: {
                pages: [
                    {
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
                                coverImageUrl: null,
                            },
                        ],
                        nextCursor: null,
                    },
                ],
                pageParams: [null],
            },
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
        });
        renderWithIntl(<ArchiveSidebar />);

        const locBtn = screen.getByRole("button", { name: "Venue A" });
        expect(locBtn).toBeInTheDocument();
        expect(locBtn).not.toBeDisabled();

        await user.click(locBtn);

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).toContain("location=loc1");
    });

    it("Show more button calls fetchNextPage when hasNextPage is true", async () => {
        const user = userEvent.setup();
        const fetchNextPage = vi.fn();
        useGetInfiniteLocationsMock.mockReturnValue({
            data: {
                pages: [
                    {
                        data: Array.from({ length: 5 }, (_, i) => ({
                            id: `loc${i}`,
                            name: `Venue ${i}`,
                            address: `Street ${i}`,
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
                            coverImageUrl: null,
                        })),
                        nextCursor: "cursor-abc",
                    },
                ],
                pageParams: [null],
            },
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: false,
        });
        renderWithIntl(<ArchiveSidebar />);

        const showMore = screen.getByRole("button", { name: /show more/i });
        await user.click(showMore);

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it("switches back to year mode and removes date_mode param from URL", async () => {
        const user = userEvent.setup();
        mockSearchParams.set("date_mode", "exact");
        renderWithIntl(<ArchiveSidebar minYear={2000} />);

        await user.click(screen.getByRole("button", { name: "Year range" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).not.toContain("date_mode");
    });

    it("switchToYear converts existing exact dates to year-boundary params", async () => {
        const user = userEvent.setup();
        mockSearchParams.set("date_mode", "exact");
        mockSearchParams.set("date_from", "2018-03-15");
        mockSearchParams.set("date_to", "2022-11-20");
        window.history.pushState(
            {},
            "",
            "?date_mode=exact&date_from=2018-03-15&date_to=2022-11-20"
        );
        renderWithIntl(<ArchiveSidebar minYear={2000} />);

        await user.click(screen.getByRole("button", { name: "Year range" }));

        expect(mockReplace).toHaveBeenCalledOnce();
        const calledUrl = mockReplace.mock.calls[0][0] as string;
        expect(calledUrl).not.toContain("date_mode");
        expect(calledUrl).toContain("date_from=2018-01-01");
        expect(calledUrl).toContain("date_to=2022-12-31");
    });

    it("clearAll strips filter params from URL and resets category state", async () => {
        const user = userEvent.setup();
        useGetFacetsMock.mockReturnValue({ data: mockFacets, isPending: false });
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
            isPending: false,
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
            media_count: 0,
            oldest_article: "2018-01-01",
            newest_article: "2024-06-01",
        };

        useGetStatsMock.mockReturnValue({
            data: statsPayload,
            isPending: false,
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
        // maxYear comes from newest_article (2024) which exceeds newest_event (2023)
        expect(screen.getByText("2024")).toBeInTheDocument();
        expect(screen.queryByText("1980")).not.toBeInTheDocument();
    });

    it("uses oldest_article when it predates oldest_event", async () => {
        const statsPayload: StatsPayload = {
            oldest_event: "2016-06-15T12:00:00.000Z",
            newest_event: "2023-08-01T12:00:00.000Z",
            event_count: 10,
            production_count: 5,
            location_count: 3,
            article_count: 2,
            artist_count: 0,
            collection_count: 0,
            media_count: 0,
            oldest_article: "2005-01-01",
            newest_article: "2023-01-01",
        };

        useGetStatsMock.mockReturnValue({ data: statsPayload, isLoading: false, isError: false });

        renderWithIntl(<ArchiveSidebar />);

        await waitFor(() => expect(screen.getByText("2005")).toBeInTheDocument());
        expect(screen.queryByText("2016")).not.toBeInTheDocument();
    });

    // ── Mobile open/close ─────────────────────────────────────────────────────

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

    it("shows skeleton year range while stats are loading", () => {
        useGetStatsMock.mockReturnValue({
            data: undefined,
            isPending: true,
            isLoading: true,
            isError: false,
        });
        renderWithIntl(<ArchiveSidebar minYear={2000} />);

        expect(screen.queryAllByRole("slider")).toHaveLength(0);
    });

    it("shows skeleton filter groups while facets are loading", () => {
        useGetFacetsMock.mockReturnValue({ data: undefined, isPending: true });
        renderWithIntl(<ArchiveSidebar />);

        expect(screen.queryByText("Categories")).not.toBeInTheDocument();
        expect(screen.queryByText("Locations")).not.toBeInTheDocument();
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
