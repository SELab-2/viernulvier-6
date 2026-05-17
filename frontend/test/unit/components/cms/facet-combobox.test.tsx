import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { FacetCombobox } from "@/components/cms/facet-combobox";
import { Facet } from "@/types/models/taxonomy.types";

const mockFacet: Facet = {
    slug: "discipline",
    translations: [
        { languageCode: "nl", label: "Discipline" },
        { languageCode: "en", label: "Discipline" },
    ],
    tags: [
        {
            slug: "theatre",
            sortOrder: 1,
            translations: [
                { languageCode: "nl", label: "Theater", description: null },
                { languageCode: "en", label: "Theatre", description: null },
            ],
        },
        {
            slug: "music",
            sortOrder: 2,
            translations: [
                { languageCode: "nl", label: "Muziek", description: null },
                { languageCode: "en", label: "Music", description: null },
            ],
        },
    ],
};

afterEach(cleanup);

describe("FacetCombobox", () => {
    it("shows selected tags as badges", () => {
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={["theatre"]}
                inheritedSlugs={[]}
                onChange={vi.fn()}
                onCreateTag={vi.fn()}
            />
        );
        expect(screen.getByText("Theatre")).toBeInTheDocument();
    });

    it("opens dropdown and shows tag options on click", async () => {
        const user = userEvent.setup();
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={[]}
                inheritedSlugs={[]}
                onChange={vi.fn()}
                onCreateTag={vi.fn()}
            />
        );
        await user.click(screen.getByRole("combobox"));
        expect(screen.getByText("Theatre")).toBeInTheDocument();
        expect(screen.getByText("Music")).toBeInTheDocument();
    });

    it("shows 'Create' row when search has no match", async () => {
        const user = userEvent.setup();
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={[]}
                inheritedSlugs={[]}
                onChange={vi.fn()}
                onCreateTag={vi.fn()}
            />
        );
        await user.click(screen.getByRole("combobox"));
        await user.type(screen.getByPlaceholderText(/search/i), "zzzz");
        expect(screen.getByText(/Create/i)).toBeInTheDocument();
    });

    it("calls onCreateTag with search query when Create row is clicked", async () => {
        const user = userEvent.setup();
        const onCreateTag = vi.fn();
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={[]}
                inheritedSlugs={[]}
                onChange={vi.fn()}
                onCreateTag={onCreateTag}
            />
        );
        await user.click(screen.getByRole("combobox"));
        await user.type(screen.getByPlaceholderText(/search/i), "New Tag");
        await user.click(screen.getByText(/Create/i));
        expect(onCreateTag).toHaveBeenCalledWith("New Tag");
    });

    it("calls onChange with slug added when an option is selected", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={[]}
                inheritedSlugs={[]}
                onChange={onChange}
                onCreateTag={vi.fn()}
            />
        );
        await user.click(screen.getByRole("combobox"));
        await user.click(screen.getByText("Theatre"));
        expect(onChange).toHaveBeenCalledWith(["theatre"]);
    });

    it("calls onChange with slug removed when a selected option is clicked again", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={["theatre"]}
                inheritedSlugs={[]}
                onChange={onChange}
                onCreateTag={vi.fn()}
            />
        );
        await user.click(screen.getByRole("combobox"));
        await user.click(screen.getByRole("option", { name: /Theatre/i }));
        expect(onChange).toHaveBeenCalledWith([]);
    });

    it("shows inherited tags as badges", () => {
        render(
            <FacetCombobox
                facet={mockFacet}
                selectedSlugs={[]}
                inheritedSlugs={["music"]}
                onChange={vi.fn()}
                onCreateTag={vi.fn()}
            />
        );
        expect(screen.getByText("Music")).toBeInTheDocument();
    });
});
