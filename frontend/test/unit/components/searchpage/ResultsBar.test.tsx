import { describe, expect, it, afterEach } from "vitest";
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

    it("renders sort options based on translations", () => {
        renderWithIntl(
            <ResultsBar query="" onQueryChange={() => {}} onSearch={() => {}} showSearch={false} />
        );

        expect(screen.getByText("Sort by")).toBeInTheDocument();
        expect(screen.getByText("Most Recent")).toBeInTheDocument();
        expect(screen.getByText("Oldest First")).toBeInTheDocument();
        expect(screen.getByText("A-Z")).toBeInTheDocument();
    });

    it("updates active sort option on click", async () => {
        const user = userEvent.setup();
        renderWithIntl(
            <ResultsBar query="" onQueryChange={() => {}} onSearch={() => {}} showSearch={false} />
        );

        const recentBtn = screen.getByText("Most Recent");
        const azBtn = screen.getByText("A-Z");

        // Initial state
        expect(recentBtn).toHaveClass("border-foreground");
        expect(azBtn).not.toHaveClass("border-foreground");

        // Click A-Z
        await user.click(azBtn);

        // Updated state
        expect(recentBtn).not.toHaveClass("border-foreground");
        expect(azBtn).toHaveClass("border-foreground");
    });
});
