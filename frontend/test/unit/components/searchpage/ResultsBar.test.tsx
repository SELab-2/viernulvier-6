import { describe, expect, it, afterEach } from "vitest";
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
            <ResultsBar query="" onQueryChange={() => {}} onSearch={() => {}} showSearch={false} />
        );

        expect(screen.getByText("Sort by")).toBeInTheDocument();
        expect(screen.getByText("Relevant")).toBeInTheDocument();
        expect(screen.getByText("Most Recent")).toBeInTheDocument();
        expect(screen.getByText("Oldest First")).toBeInTheDocument();
    });

    it("updates active sort option on click", async () => {
        const user = userEvent.setup();
        renderWithIntl(
            <ResultsBar query="" onQueryChange={() => {}} onSearch={() => {}} showSearch={false} />
        );

        const relevantBtn = screen.getByText("Relevant");
        const oldestBtn = screen.getByText("Oldest First");

        // Initial state
        expect(relevantBtn).toHaveClass("border-foreground");
        expect(oldestBtn).not.toHaveClass("border-foreground");

        // Click Oldest First
        await user.click(oldestBtn);

        // Updated state
        expect(relevantBtn).not.toHaveClass("border-foreground");
        expect(oldestBtn).toHaveClass("border-foreground");
    });
});
