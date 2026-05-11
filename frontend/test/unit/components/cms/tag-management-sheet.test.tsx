import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import * as hooks from "@/hooks/api/useTaxonomy";
import { TagManagementSheet } from "@/components/cms/tag-management-sheet";
import { Facet } from "@/types/models/taxonomy.types";

vi.mock("@/hooks/api/useTaxonomy");

const mockFacet: Facet = {
    slug: "discipline",
    translations: [{ languageCode: "en", label: "Discipline" }],
    tags: [
        {
            slug: "theatre",
            sortOrder: 1,
            translations: [
                { languageCode: "nl", label: "Theater", description: null },
                { languageCode: "en", label: "Theatre", description: null },
            ],
        },
    ],
};

const mockMutation = { mutateAsync: vi.fn(), isPending: false };

beforeEach(() => {
    vi.mocked(hooks.useCreateTag).mockReturnValue(
        mockMutation as unknown as ReturnType<typeof hooks.useCreateTag>
    );
    vi.mocked(hooks.useUpdateTag).mockReturnValue(
        mockMutation as unknown as ReturnType<typeof hooks.useUpdateTag>
    );
    vi.mocked(hooks.useDeleteTag).mockReturnValue(
        mockMutation as unknown as ReturnType<typeof hooks.useDeleteTag>
    );
});

afterEach(cleanup);

describe("TagManagementSheet", () => {
    it("lists tags for the facet", () => {
        render(<TagManagementSheet open={true} facet={mockFacet} onOpenChange={vi.fn()} />);
        expect(screen.getByText("Theatre")).toBeInTheDocument();
    });

    it("shows edit button per tag row", () => {
        render(<TagManagementSheet open={true} facet={mockFacet} onOpenChange={vi.fn()} />);
        expect(screen.getByRole("button", { name: /edit theatre/i })).toBeInTheDocument();
    });

    it("shows delete button per tag row", () => {
        render(<TagManagementSheet open={true} facet={mockFacet} onOpenChange={vi.fn()} />);
        expect(screen.getByRole("button", { name: /delete theatre/i })).toBeInTheDocument();
    });

    it("opens TagFormSheet when 'New tag' button is clicked", async () => {
        const user = userEvent.setup();
        render(<TagManagementSheet open={true} facet={mockFacet} onOpenChange={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /new tag/i }));
        expect(screen.getByLabelText(/NL/i)).toBeInTheDocument();
    });

    it("opens TagFormSheet pre-populated when edit button is clicked", async () => {
        const user = userEvent.setup();
        render(<TagManagementSheet open={true} facet={mockFacet} onOpenChange={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /edit theatre/i }));
        expect(screen.getByLabelText(/NL/i)).toHaveValue("Theater");
    });
});
