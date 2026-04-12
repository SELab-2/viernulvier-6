import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { SearchHero } from "@/components/searchpage/search-hero/SearchHero";
import { NextIntlClientProvider } from "next-intl";

const messages = {
    Search: {
        heroTitle: "Search",
        heroTitleItalic: "the archive",
        heroPlaceholder: "What are you looking for?",
        enter: "Press enter",
        quickSearch: "Quick search",
        tags: {
            dance: "Dance",
            theater: "Theater",
            concert: "Concert",
            nightlife: "Nightlife",
            performance: "Performance",
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

describe("SearchHero component", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders title, placeholder, and quick tags based on translations", () => {
        renderWithIntl(<SearchHero query="" onQueryChange={vi.fn()} />);

        expect(screen.getByText("Search")).toBeInTheDocument();
        expect(screen.getByText("the archive")).toBeInTheDocument();

        const input = screen.getByPlaceholderText("What are you looking for?");
        expect(input).toBeInTheDocument();

        expect(screen.getByText("Quick search")).toBeInTheDocument();
        expect(screen.getByText("Dance")).toBeInTheDocument();
        expect(screen.getByText("Theater")).toBeInTheDocument();
    });

    it("displays the correct query value", () => {
        renderWithIntl(<SearchHero query="test query" onQueryChange={vi.fn()} />);

        const input = screen.getByPlaceholderText("What are you looking for?");
        expect(input).toHaveValue("test query");
    });

    it("calls onQueryChange when user types", async () => {
        const user = userEvent.setup();
        const onQueryChange = vi.fn();

        renderWithIntl(<SearchHero query="" onQueryChange={onQueryChange} />);

        const input = screen.getByPlaceholderText("What are you looking for?");
        await user.type(input, "a");

        expect(onQueryChange).toHaveBeenCalledWith("a");
    });

    it("calls onQueryChange when a quick tag is clicked", async () => {
        const user = userEvent.setup();
        const onQueryChange = vi.fn();

        renderWithIntl(<SearchHero query="" onQueryChange={onQueryChange} />);

        const tagButton = screen.getByText("Dance");
        await user.click(tagButton);

        expect(onQueryChange).toHaveBeenCalledWith("Dance");
    });
});
