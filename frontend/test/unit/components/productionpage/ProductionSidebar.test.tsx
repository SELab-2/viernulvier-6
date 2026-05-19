import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { ProductionSidebar } from "@/components/productionpage/production-sidebar";
import type { Event } from "@/types/models/event.types";
import type { Production } from "@/types/models/production.types";

vi.mock("@/hooks/api/useFallbackLocation", () => ({
    useFallbackLocation: () => null,
}));

vi.mock("@/i18n/routing", () => ({
    Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={String(href)} {...props}>
            {children}
        </a>
    ),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn() },
}));

const messages = {
    Events: {
        title: "Events",
        noEvents: "No events available",
        showAllDates: "Show all {count} dates",
        showFewerDates: "Show fewer dates",
    },
    ProductionPage: {
        copyLink: "Copy link",
        copyLinkSuccess: "Copied",
        languageNl: "Dutch",
        languageNlEn: "Dutch and English",
        metaLanguage: "Language",
        shareEmail: "Share by email",
        shareSectionTitle: "Share",
        shareWhatsApp: "Share on WhatsApp",
    },
};

const production: Production = {
    id: "production-1",
    slug: "test-production",
    sourceId: null,
    video1: null,
    video2: null,
    eticketInfo: null,
    uitdatabankTheme: null,
    uitdatabankType: null,
    translations: [
        {
            languageCode: "en",
            supertitle: null,
            title: "Test production",
            artist: null,
            metaTitle: null,
            metaDescription: null,
            tagline: null,
            teaser: null,
            description: null,
            descriptionExtra: null,
            description2: null,
            quote: null,
            quoteSource: null,
            programme: null,
            info: null,
            descriptionShort: null,
        },
    ],
    coverImageUrl: null,
    locations: [],
    tags: [],
};

function makeEvent(index: number): Event {
    return {
        id: `event-${index}`,
        sourceId: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        startsAt: `2024-02-${String(index + 1).padStart(2, "0")}T20:00:00.000Z`,
        endsAt: null,
        intermissionAt: null,
        doorsAt: null,
        vendorId: null,
        boxOfficeId: null,
        uitdatabankId: null,
        maxTicketsPerOrder: null,
        productionId: "production-1",
        status: "scheduled",
        hallIds: [],
        prices: [],
    };
}

function renderSidebar(events: Event[]) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ProductionSidebar production={production} events={events} locale="en" />
        </NextIntlClientProvider>
    );
}

describe("ProductionSidebar", () => {
    it("keeps long event lists compact until expanded", () => {
        renderSidebar([0, 1, 2, 3, 4, 5].map(makeEvent));

        expect(screen.queryByText("Tuesday, 6 February 2024")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Show all 6 dates" }));

        expect(screen.getByText("Tuesday, 6 February 2024")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Show fewer dates" })).toBeInTheDocument();
    });
});
