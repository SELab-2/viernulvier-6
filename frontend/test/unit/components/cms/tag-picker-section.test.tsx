import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";

import * as useTaxonomyModule from "@/hooks/api/useTaxonomy";
import { Facet } from "@/types/models/taxonomy.types";

vi.mock("@/hooks/api/useTaxonomy");

const mockFacets: Facet[] = [
    {
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
    },
    {
        slug: "format",
        translations: [
            { languageCode: "nl", label: "Formaat" },
            { languageCode: "en", label: "Format" },
        ],
        tags: [
            {
                slug: "workshop",
                sortOrder: 1,
                translations: [
                    { languageCode: "nl", label: "Workshop", description: null },
                    { languageCode: "en", label: "Workshop", description: null },
                ],
            },
        ],
    },
];

beforeEach(() => {
    vi.mocked(useTaxonomyModule.useGetFacets).mockReturnValue({
        data: mockFacets,
        isLoading: false,
    } as ReturnType<typeof useTaxonomyModule.useGetFacets>);
});

afterEach(() => {
    cleanup();
});

import { TagPickerSection } from "@/components/cms/tag-picker-section";

describe("TagPickerSection", () => {
    it("renders a checkbox for each tag in each facet", () => {
        render(<TagPickerSection entityType="production" selectedSlugs={[]} onChange={vi.fn()} />);

        expect(screen.getByRole("checkbox", { name: /Theatre/i })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: /Music/i })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: /Workshop/i })).toBeInTheDocument();
    });

    it("checks a checkbox when its slug is in selectedSlugs", () => {
        render(
            <TagPickerSection
                entityType="production"
                selectedSlugs={["theatre"]}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByRole("checkbox", { name: /Theatre/i })).toBeChecked();
        expect(screen.getByRole("checkbox", { name: /Music/i })).not.toBeChecked();
    });

    it("calls onChange with slug added when an unchecked tag is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<TagPickerSection entityType="production" selectedSlugs={[]} onChange={onChange} />);

        await user.click(screen.getByRole("checkbox", { name: /Theatre/i }));

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith(["theatre"]);
    });

    it("calls onChange with slug removed when a checked tag is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <TagPickerSection
                entityType="production"
                selectedSlugs={["theatre", "music"]}
                onChange={onChange}
            />
        );

        await user.click(screen.getByRole("checkbox", { name: /Theatre/i }));

        expect(onChange).toHaveBeenCalledWith(["music"]);
    });

    it("renders inherited tags as checked and disabled", () => {
        render(
            <TagPickerSection
                entityType="production"
                selectedSlugs={[]}
                inheritedSlugs={["theatre"]}
                onChange={vi.fn()}
            />
        );

        const theatreCheckbox = screen.getByRole("checkbox", { name: /Theatre/i });
        expect(theatreCheckbox).toBeChecked();
        expect(theatreCheckbox).toBeDisabled();
    });

    it("does not call onChange when an inherited tag is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <TagPickerSection
                entityType="production"
                selectedSlugs={[]}
                inheritedSlugs={["theatre"]}
                onChange={onChange}
            />
        );

        await user.click(screen.getByRole("checkbox", { name: /Theatre/i }));

        expect(onChange).not.toHaveBeenCalled();
    });

    it("passes entityType to useGetFacets", () => {
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={vi.fn()} />);

        expect(vi.mocked(useTaxonomyModule.useGetFacets)).toHaveBeenCalledWith(
            expect.objectContaining({ entityType: "article" })
        );
    });
});
