import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { TagFormSheet } from "@/components/cms/tag-form-sheet";

afterEach(cleanup);

const baseProps = {
    open: true,
    facetLabel: "Discipline",
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
};

describe("TagFormSheet", () => {
    it("renders NL and EN label inputs", () => {
        render(<TagFormSheet {...baseProps} />);
        expect(screen.getByLabelText(/NL/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/EN/i)).toBeInTheDocument();
    });

    it("renders with empty fields in create mode", () => {
        render(<TagFormSheet {...baseProps} />);
        expect(screen.getByLabelText(/NL/i)).toHaveValue("");
        expect(screen.getByLabelText(/EN/i)).toHaveValue("");
    });

    it("pre-populates fields in edit mode when initialValues are provided", () => {
        render(<TagFormSheet {...baseProps} initialValues={{ nl: "Theater", en: "Theatre" }} />);
        expect(screen.getByLabelText(/NL/i)).toHaveValue("Theater");
        expect(screen.getByLabelText(/EN/i)).toHaveValue("Theatre");
    });

    it("calls onSubmit with nl and en values on submit", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<TagFormSheet {...baseProps} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText(/NL/i), "Nieuwe Tag");
        await user.type(screen.getByLabelText(/EN/i), "New Tag");
        await user.click(screen.getByRole("button", { name: /save/i }));
        expect(onSubmit).toHaveBeenCalledWith({ nl: "Nieuwe Tag", en: "New Tag" });
    });

    it("does not call onSubmit when NL label is empty", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<TagFormSheet {...baseProps} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText(/EN/i), "New Tag");
        await user.click(screen.getByRole("button", { name: /save/i }));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows error message when provided", () => {
        render(<TagFormSheet {...baseProps} errorMessage="A tag with this name already exists" />);
        expect(screen.getByText("A tag with this name already exists")).toBeInTheDocument();
    });

    it("disables submit button while submitting", () => {
        render(<TagFormSheet {...baseProps} isSubmitting={true} />);
        expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });
});
