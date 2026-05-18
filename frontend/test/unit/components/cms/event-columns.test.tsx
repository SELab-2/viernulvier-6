import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import {
    EventPriceExtraContent,
    makeEventColumns,
} from "@/app/[locale]/(cms)/cms/tables/productions/event-columns";
import type { Event, EventPrice } from "@/types/models/event.types";

const messages = {
    Cms: {
        Productions: {
            eventStartColumn: "Start",
            eventEndColumn: "End",
            eventStatusColumn: "Status",
            eventHallColumn: "Hall",
            eventPriceColumn: "Prices",
            eventPriceCount: "{count} {count, plural, one {price} other {prices}}",
            fieldEventPrices: "Event Prices",
            fieldEventPriceType: "Type",
            fieldEventPriceAvailable: "Available",
        },
        ActionsColumn: {
            edit: "Edit {label}",
            copy: "Copy {key}",
            copied: "Copied {key}",
            copyFailed: "Copy failed",
        },
    },
};

const makePrice = (overrides: Partial<EventPrice> = {}): EventPrice => ({
    id: "price-1",
    sourceId: null,
    createdAt: null,
    updatedAt: null,
    available: 100,
    amountCents: 1500,
    boxOfficeId: null,
    contingentId: null,
    expiresAt: null,
    price: {
        id: "p-1",
        sourceId: null,
        createdAt: null,
        updatedAt: null,
        type: "ticket",
        visibility: "public",
        code: null,
        descriptionNl: "Standaard tarief",
        descriptionEn: "Standard rate",
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
        id: "r-1",
        sourceId: null,
        createdAt: null,
        updatedAt: null,
        descriptionNl: "Rang 1",
        descriptionEn: "Rank 1",
        code: "R1",
        position: 1,
        soldOutBuffer: null,
    },
    ...overrides,
});

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
    id: "event-1",
    sourceId: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    startsAt: "2025-06-15T20:00:00Z",
    endsAt: null,
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={messages}>
        {children}
    </NextIntlClientProvider>
);

describe("EventPriceExtraContent", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows empty state when no prices", () => {
        const event = makeEvent({ prices: [] });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.getByText("Event Prices")).toBeInTheDocument();
        expect(screen.getByText("\u2014")).toBeInTheDocument();
    });

    it("shows price count in header", () => {
        const event = makeEvent({
            prices: [makePrice(), makePrice({ id: "price-2" })],
        });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.getByText("Event Prices (2)")).toBeInTheDocument();
    });

    it("displays price description and euro amount", () => {
        const event = makeEvent({
            prices: [makePrice({ amountCents: 1850, price: makePrice().price })],
        });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.getByText("Standaard tarief")).toBeInTheDocument();
        expect(screen.getByText("\u20ac18.50")).toBeInTheDocument();
    });

    it("shows rank badge when code is present", () => {
        const event = makeEvent({
            prices: [makePrice()],
        });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.getByText("R1")).toBeInTheDocument();
    });

    it("does not show rank badge when code is empty", () => {
        const event = makeEvent({
            prices: [
                makePrice({
                    rank: { ...makePrice().rank, code: "" },
                }),
            ],
        });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.queryByText("R1")).toBeNull();
    });

    it("falls back to price type when description is null", () => {
        const event = makeEvent({
            prices: [
                makePrice({
                    price: { ...makePrice().price, descriptionNl: null },
                }),
            ],
        });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.getByText("ticket")).toBeInTheDocument();
    });

    it("shows type and available metadata", () => {
        const event = makeEvent({
            prices: [makePrice()],
        });

        render(<EventPriceExtraContent entity={event} />, { wrapper: TestWrapper });

        expect(screen.getByText(/Type: ticket/)).toBeInTheDocument();
        expect(screen.getByText(/Available: 100/)).toBeInTheDocument();
    });
});

describe("makeEventColumns", () => {
    it("renders price range in the prices column", () => {
        const columns = makeEventColumns({
            onEdit: () => {},
            t: (key: string, _values?: Record<string, unknown>) => key,
            tProductions: (key: string) => key,
        });

        const priceCol = columns.find((c) => c.accessorKey === "prices");
        expect(priceCol).toBeDefined();
        expect(priceCol?.header).toBe("eventPriceColumn");

        if (priceCol?.cell) {
            const cellFn = priceCol.cell as (info: { getValue: <T>() => T }) => string;

            // Empty
            expect(cellFn({ getValue: () => [] })).toBe("\u2014");

            // Single price
            expect(cellFn({ getValue: () => [{ amountCents: 1500 }] })).toBe("\u20ac15.00");

            // Multiple prices — range
            expect(
                cellFn({
                    getValue: () => [{ amountCents: 1500 }, { amountCents: 5000 }],
                })
            ).toBe("\u20ac15.00 – \u20ac50.00");

            // Same price — single display
            expect(
                cellFn({
                    getValue: () => [{ amountCents: 2000 }, { amountCents: 2000 }],
                })
            ).toBe("\u20ac20.00");
        }
    });

    it("includes all expected columns", () => {
        const columns = makeEventColumns({
            onEdit: () => {},
            t: (key: string) => key,
            tProductions: (key: string) => key,
        });

        expect(columns).toHaveLength(6); // startsAt, endsAt, status, hallIds, prices, actions
    });
});
