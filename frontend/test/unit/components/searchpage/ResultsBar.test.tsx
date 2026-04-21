import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ResultsBar } from "@/components/searchpage/results-bar/ResultsBar";
import { NextIntlClientProvider } from "next-intl";

const messages = {
    ResultsBar: {
        sortBy: "Sort by",
        recent: "Most Recent",
        oldest: "Oldest First",
        az: "A-Z",
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

    it("displays the correct shown and total counts", () => {
        renderWithIntl(
            <ResultsBar
                shownCount={20}
                totalCount={1000}
                query=""
                onQueryChange={() => {}}
                showSearch={false}
            />
        );

        expect(screen.getByText("20")).toBeInTheDocument();
        expect(screen.getByText(/1.000/)).toBeInTheDocument();
    });

    it("renders sort options based on translations", () => {
        renderWithIntl(
            <ResultsBar
                shownCount={20}
                totalCount={100}
                query=""
                onQueryChange={() => {}}
                showSearch={false}
            />
        );

        expect(screen.getByText("Sort by")).toBeInTheDocument();
        expect(screen.getByText("Most Recent")).toBeInTheDocument();
        expect(screen.getByText("Oldest First")).toBeInTheDocument();
        expect(screen.getByText("A-Z")).toBeInTheDocument();
    });

    it("calls onSortChange with the clicked option", async () => {
        const user = userEvent.setup();
        const onSortChange = vi.fn();
        renderWithIntl(
            <ResultsBar
                shownCount={20}
                totalCount={100}
                query=""
                onQueryChange={() => {}}
                showSearch={false}
                onSortChange={onSortChange}
            />
        );

        await user.click(screen.getByText("A-Z"));

        expect(onSortChange).toHaveBeenCalledOnce();
        expect(onSortChange).toHaveBeenCalledWith("az");
    });

    it("marks the active sort option from the sort prop", () => {
        renderWithIntl(
            <ResultsBar
                shownCount={20}
                totalCount={100}
                query=""
                onQueryChange={() => {}}
                showSearch={false}
                sort="az"
            />
        );

        expect(screen.getByText("A-Z")).toHaveClass("border-foreground");
        expect(screen.getByText("Most Recent")).not.toHaveClass("border-foreground");
    });
});
