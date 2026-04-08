import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import { ProductionList } from "@/components/searchpage/production-list/ProductionList";
import { NextIntlClientProvider } from "next-intl";
import type { Production } from "@/types/models/production.types";

const messages = {
    Events: {
        past: "Past",
        upcoming: "Upcoming",
        showAll: "Show all events",
        hide: "Hide events",
    },
};

const renderWithIntl = (ui: React.ReactElement) => {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );
};

describe("ProductionList component", () => {
    afterEach(() => {
        cleanup();
    });

    const mockProductions: Production[] = [
        {
            id: "1",
            slug: "prod-1",
            sourceId: null,
            video1: null,
            video2: null,
            eticketInfo: null,
            uitdatabankTheme: null,
            uitdatabankType: null,
            translations: [],
            coverImageUrl: null,
        },
        {
            id: "2",
            slug: "prod-2",
            sourceId: null,
            video1: null,
            video2: null,
            eticketInfo: null,
            uitdatabankTheme: null,
            uitdatabankType: null,
            translations: [],
            coverImageUrl: null,
        },
    ];

    it("renders empty state when no productions provided", () => {
        const { container } = renderWithIntl(<ProductionList productions={[]} locale="en" />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it("renders a list of productions using fallback slug if title fails", () => {
        renderWithIntl(<ProductionList productions={mockProductions} locale="en" />);

        expect(screen.getByText("prod-1")).toBeInTheDocument();
        expect(screen.getByText("prod-2")).toBeInTheDocument();
    });
});
