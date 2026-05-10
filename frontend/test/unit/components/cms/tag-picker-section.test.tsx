import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";

import * as useTaxonomyModule from "@/hooks/api/useTaxonomy";
import { Facet } from "@/types/models/taxonomy.types";

vi.mock("@/hooks/api/useTaxonomy");
vi.mock("@/components/cms/tag-management-sheet", () => ({
    TagManagementSheet: vi.fn(() => null),
}));

import { TagManagementSheet } from "@/components/cms/tag-management-sheet";

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
    vi.clearAllMocks();
});

import { TagPickerSection } from "@/components/cms/tag-picker-section";

describe("TagPickerSection", () => {
    it("renders a combobox trigger for each facet", () => {
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={vi.fn()} />);

        expect(screen.getAllByRole("combobox")).toHaveLength(2);
    });

    it("renders a Manage button for each facet", () => {
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={vi.fn()} />);

        expect(screen.getAllByRole("button", { name: /manage/i })).toHaveLength(2);
    });

    it("clicking Manage button opens TagManagementSheet for that facet", async () => {
        const user = userEvent.setup();
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={vi.fn()} />);

        const manageButtons = screen.getAllByRole("button", { name: /manage/i });
        await user.click(manageButtons[0]);

        expect(TagManagementSheet).toHaveBeenCalledWith(
            expect.objectContaining({ open: true, facet: mockFacets[0] }),
            undefined
        );
    });

    it("clicking Create in FacetCombobox opens TagManagementSheet with openWithCreate", async () => {
        const user = userEvent.setup();
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={vi.fn()} />);

        const comboboxes = screen.getAllByRole("combobox");
        await user.click(comboboxes[0]);
        await user.type(screen.getByPlaceholderText(/search/i), "brandnew");
        await user.click(screen.getByText(/Create/i));

        expect(TagManagementSheet).toHaveBeenCalledWith(
            expect.objectContaining({ openWithCreate: "brandnew" }),
            undefined
        );
    });

    it("onChange propagates correctly when a tag is selected", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={onChange} />);

        const comboboxes = screen.getAllByRole("combobox");
        await user.click(comboboxes[0]);
        await user.click(screen.getByText("Theatre"));

        expect(onChange).toHaveBeenCalledWith(["theatre"]);
    });

    it("passes entityType to useGetFacets", () => {
        render(<TagPickerSection entityType="article" selectedSlugs={[]} onChange={vi.fn()} />);

        expect(vi.mocked(useTaxonomyModule.useGetFacets)).toHaveBeenCalledWith(
            expect.objectContaining({ entityType: "article" })
        );
    });
});
