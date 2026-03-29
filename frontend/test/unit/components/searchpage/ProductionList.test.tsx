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
            title: { nl: "Production 1 Title", en: "Production 1 Title" },
            slug: "prod-1",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            status: "draft",
            sourceId: 1,
        } as unknown as Production,
        {
            id: "2",
            title: { nl: "Production 2 Title", en: "Production 2 Title" },
            slug: "prod-2",
            createdAt: "2024-01-02T00:00:00Z",
            updatedAt: "2024-01-02T00:00:00Z",
            status: "draft",
            sourceId: 2,
        } as unknown as Production,
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
