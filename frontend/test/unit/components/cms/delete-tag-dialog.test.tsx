import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { DeleteTagDialog } from "@/components/cms/delete-tag-dialog";

afterEach(cleanup);

describe("DeleteTagDialog", () => {
    it("shows usage count warning when usageCount > 0", () => {
        render(
            <DeleteTagDialog
                open={true}
                tagLabel="Theatre"
                usageCount={5}
                isDeleting={false}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText(/5 items/i)).toBeInTheDocument();
        expect(screen.getByText(/Theatre/)).toBeInTheDocument();
    });

    it("calls onConfirm when delete button is clicked", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(
            <DeleteTagDialog
                open={true}
                tagLabel="Theatre"
                usageCount={3}
                isDeleting={false}
                onConfirm={onConfirm}
                onCancel={vi.fn()}
            />
        );
        await user.click(screen.getByRole("button", { name: /delete/i }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("calls onCancel when cancel button is clicked", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(
            <DeleteTagDialog
                open={true}
                tagLabel="Theatre"
                usageCount={3}
                isDeleting={false}
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />
        );
        await user.click(screen.getByRole("button", { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("disables delete button while deleting", () => {
        render(
            <DeleteTagDialog
                open={true}
                tagLabel="Theatre"
                usageCount={1}
                isDeleting={true}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByRole("button", { name: /delet/i })).toBeDisabled();
    });
});
