import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { ProductionSidebar } from "@/components/productionpage/production-sidebar";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

vi.mock("@/hooks/api/useFallbackLocation", () => ({
    useFallbackLocation: vi.fn(() => null),
}));

vi.mock("@/i18n/routing", () => ({
    Link: ({
        children,
        href,
        ...rest
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const messages = {
    Events: { title: "Events", noEvents: "No events available" },
    ProductionPage: {
        metaLanguage: "Language",
        languageNl: "NL",
        languageNlEn: "NL/EN",
        shareSectionTitle: "Share",
        copyLink: "Copy link",
        copyLinkSuccess: "Copied",
    },
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={messages}>
        {children}
    </NextIntlClientProvider>
);

const mockProduction: Production = {
    id: "prod-1",
    slug: "test-prod",
    sourceId: null,
    video1: null,
    video2: null,
    eticketInfo: null,
    uitdatabankTheme: null,
    uitdatabankType: null,
    translations: [
        {
            languageCode: "en",
            title: "Test Production",
            supertitle: null,
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

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
    id: "event-1",
    sourceId: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    startsAt: "2025-06-15T20:00:00Z",
    endsAt: "2025-06-15T22:00:00Z",
    intermissionAt: null,
    doorsAt: null,
    vendorId: null,
    boxOfficeId: null,
    uitdatabankId: null,
    maxTicketsPerOrder: null,
    productionId: "prod-1",
    status: "available",
    hallIds: [],
    prices: [],
    ...overrides,
});

describe("ProductionSidebar events", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows events section title", () => {
        render(<ProductionSidebar production={mockProduction} events={[]} locale="en" />, {
            wrapper: TestWrapper,
        });
        expect(screen.getByText("Events")).toBeInTheDocument();
    });

    it("shows no events message when empty", () => {
        render(<ProductionSidebar production={mockProduction} events={[]} locale="en" />, {
            wrapper: TestWrapper,
        });
        expect(screen.getByText("No events available")).toBeInTheDocument();
    });

    it("renders event date and time", () => {
        render(
            <ProductionSidebar production={mockProduction} events={[makeEvent()]} locale="en" />,
            { wrapper: TestWrapper }
        );
        expect(screen.getByText(/De Vooruit/)).toBeInTheDocument();
    });

    it("displays individual price entries with ticket icon", () => {
        const event = makeEvent({
            prices: [
                {
                    id: "p-1",
                    sourceId: null,
                    createdAt: null,
                    updatedAt: null,
                    available: 100,
                    amountCents: 1500,
                    boxOfficeId: null,
                    contingentId: null,
                    expiresAt: null,
                    price: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        type: "ticket",
                        visibility: "public",
                        code: null,
                        descriptionNl: "Standaard tarief",
                        descriptionEn: null,
                        minimum: 0,
                        maximum: null,
                        step: 100,
                        order: 1,
                        autoSelectCombo: false,
                        includeInPriceRange: true,
                        cinevilleBox: false,
                        membership: null,
                    },
                    rank: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        descriptionNl: null,
                        descriptionEn: null,
                        code: "R1",
                        position: 1,
                        soldOutBuffer: null,
                    },
                },
                {
                    id: "p-2",
                    sourceId: null,
                    createdAt: null,
                    updatedAt: null,
                    available: 50,
                    amountCents: 5000,
                    boxOfficeId: null,
                    contingentId: null,
                    expiresAt: null,
                    price: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        type: "ticket",
                        visibility: "public",
                        code: null,
                        descriptionNl: "Premium",
                        descriptionEn: null,
                        minimum: 0,
                        maximum: null,
                        step: 100,
                        order: 2,
                        autoSelectCombo: false,
                        includeInPriceRange: true,
                        cinevilleBox: false,
                        membership: null,
                    },
                    rank: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        descriptionNl: null,
                        descriptionEn: null,
                        code: "R2",
                        position: 2,
                        soldOutBuffer: null,
                    },
                },
            ],
        });

        render(<ProductionSidebar production={mockProduction} events={[event]} locale="en" />, {
            wrapper: TestWrapper,
        });

        expect(screen.getByText("Standaard tarief")).toBeInTheDocument();
        expect(screen.getByText("R1")).toBeInTheDocument();
        expect(screen.getByText("€15.00")).toBeInTheDocument();
        expect(screen.getByText("Premium")).toBeInTheDocument();
        expect(screen.getByText("R2")).toBeInTheDocument();
        expect(screen.getByText("€50.00")).toBeInTheDocument();
    });

    it("shows price type as fallback when description is null", () => {
        const event = makeEvent({
            prices: [
                {
                    id: "p-1",
                    sourceId: null,
                    createdAt: null,
                    updatedAt: null,
                    available: 100,
                    amountCents: 2000,
                    boxOfficeId: null,
                    contingentId: null,
                    expiresAt: null,
                    price: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        type: "abo",
                        visibility: "public",
                        code: null,
                        descriptionNl: null,
                        descriptionEn: null,
                        minimum: 0,
                        maximum: null,
                        step: 100,
                        order: 1,
                        autoSelectCombo: false,
                        includeInPriceRange: true,
                        cinevilleBox: false,
                        membership: null,
                    },
                    rank: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        descriptionNl: null,
                        descriptionEn: null,
                        code: "",
                        position: 1,
                        soldOutBuffer: null,
                    },
                },
            ],
        });

        render(<ProductionSidebar production={mockProduction} events={[event]} locale="en" />, {
            wrapper: TestWrapper,
        });

        expect(screen.getByText("abo")).toBeInTheDocument();
        expect(screen.getByText("€20.00")).toBeInTheDocument();
    });

    it("does not show price section when event has no prices", () => {
        const event = makeEvent({ prices: [] });

        render(<ProductionSidebar production={mockProduction} events={[event]} locale="en" />, {
            wrapper: TestWrapper,
        });

        expect(screen.queryByText(/€/)).toBeNull();
    });

    it("shows price type as fallback when description is null", () => {
        const event = makeEvent({
            prices: [
                {
                    id: "p-1",
                    sourceId: null,
                    createdAt: null,
                    updatedAt: null,
                    available: 100,
                    amountCents: 2000,
                    boxOfficeId: null,
                    contingentId: null,
                    expiresAt: null,
                    price: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        type: "ticket",
                        visibility: "public",
                        code: null,
                        descriptionNl: null,
                        descriptionEn: null,
                        minimum: 0,
                        maximum: null,
                        step: 100,
                        order: 1,
                        autoSelectCombo: false,
                        includeInPriceRange: true,
                        cinevilleBox: false,
                        membership: null,
                    },
                    rank: {
                        id: null,
                        sourceId: null,
                        createdAt: null,
                        updatedAt: null,
                        descriptionNl: null,
                        descriptionEn: null,
                        code: "A",
                        position: 1,
                        soldOutBuffer: null,
                    },
                },
            ],
        });

        render(<ProductionSidebar production={mockProduction} events={[event]} locale="en" />, {
            wrapper: TestWrapper,
        });

        expect(screen.getByText("€20.00")).toBeInTheDocument();
    });
});
