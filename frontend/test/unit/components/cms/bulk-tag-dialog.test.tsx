import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "../../../../test/utils/test-utils";

import * as entityTagsModule from "@/hooks/api/useEntityTags";

vi.mock("@/hooks/api/useEntityTags");
vi.mock("@/components/cms/tag-picker-section", () => ({
    TagPickerSection: ({ onChange }: { onChange: (slugs: string[]) => void }) => (
        <button type="button" onClick={() => onChange(["music"])}>
            select tag
        </button>
    ),
}));

import { BulkTagDialog } from "@/components/cms/bulk-tag-dialog";

describe("BulkTagDialog", () => {
    beforeEach(() => {
        vi.mocked(entityTagsModule.useBulkAddEntityTags).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof entityTagsModule.useBulkAddEntityTags>);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("disables save until at least one tag is selected", () => {
        render(
            <BulkTagDialog
                open={true}
                onOpenChange={vi.fn()}
                entityType="article"
                entityIds={["a1", "a2"]}
            />
        );

        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });
});
