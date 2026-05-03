import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ResultsBar } from "@/components/searchpage/results-bar/ResultsBar";
import { NextIntlClientProvider } from "next-intl";

const messages = {
    ResultsBar: {
        sortBy: "Sort by",
        relevant: "Relevant",
        recent: "Most Recent",
        oldest: "Oldest First",
        relevance: "Most Relevant",
    },
    Search: {
        heroPlaceholder: "Search the archive",
    },
};

const renderWithIntl = (ui: React.ReactElement) => {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );
};

describe("ResultsBar component", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders sort options based on translations", () => {
        renderWithIntl(
            <ResultsBar
                query=""
                onQueryChange={() => {}}
                onSearch={() => {}}
                showSearch={false}
                sort="recent"
                onSortChange={() => {}}
            />
        );

        expect(screen.getByText("Sort by")).toBeInTheDocument();
        expect(screen.getByText("Relevant")).toBeInTheDocument();
        expect(screen.getByText("Most Recent")).toBeInTheDocument();
        expect(screen.getByText("Oldest First")).toBeInTheDocument();
        expect(screen.getByText("Most Relevant")).toBeInTheDocument();
    });

    it("highlights the active sort option from the sort prop", () => {
        renderWithIntl(
            <ResultsBar
                query=""
                onQueryChange={() => {}}
                onSearch={() => {}}
                showSearch={false}
                sort="oldest"
                onSortChange={() => {}}
            />
        );

        expect(screen.getByText("Oldest First")).toHaveClass("border-foreground");
        expect(screen.getByText("Most Recent")).not.toHaveClass("border-foreground");
    });

    it("calls onSortChange with the clicked option", async () => {
        const user = userEvent.setup();
        const onSortChange = vi.fn();

        renderWithIntl(
            <ResultsBar
                query=""
                onQueryChange={() => {}}
                onSearch={() => {}}
                showSearch={false}
                sort="recent"
                onSortChange={onSortChange}
            />
        );

        await user.click(screen.getByText("Oldest First"));
        expect(onSortChange).toHaveBeenCalledWith("oldest");
    });
});
