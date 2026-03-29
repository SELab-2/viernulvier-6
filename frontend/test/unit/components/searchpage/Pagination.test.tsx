import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { Pagination } from "@/components/searchpage/pagination/Pagination";

describe("Pagination component", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders correctly with few pages", () => {
        render(<Pagination totalPages={5} currentPage={1} />);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        // Should not contain ellipsis
        expect(screen.queryByText("…")).not.toBeInTheDocument();
    });

    it("renders ellipsis when many pages", () => {
        render(<Pagination totalPages={10} currentPage={1} />);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("…")).toBeInTheDocument();
    });

    it("highlights the active page", () => {
        render(<Pagination totalPages={5} currentPage={3} />);

        const activeBtn = screen.getByText("3");
        expect(activeBtn).toHaveClass("bg-foreground text-background");

        const inactiveBtn = screen.getByText("1");
        expect(inactiveBtn).not.toHaveClass("bg-foreground text-background");
    });

    it("calls onPageChange when a page is clicked", async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();

        render(<Pagination totalPages={5} currentPage={1} onPageChange={onPageChange} />);

        const page2Btn = screen.getByText("2");
        await user.click(page2Btn);

        expect(onPageChange).toHaveBeenCalledWith(2);
        expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it("manages internal state when uncontrolled", async () => {
        const user = userEvent.setup();

        render(<Pagination totalPages={5} />);

        // Initial state is page 1
        const initialActiveBtn = screen.getByText("1");
        expect(initialActiveBtn).toHaveClass("bg-foreground text-background");

        // Click page 3
        const page3Btn = screen.getByText("3");
        await user.click(page3Btn);

        // State updates
        expect(page3Btn).toHaveClass("bg-foreground text-background");
        expect(initialActiveBtn).not.toHaveClass("bg-foreground text-background");
    });
});
