import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button component", () => {
    it("renders correctly with default props", () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole("button", { name: /click me/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass("bg-primary");
    });

    it("applies the destructive variant class", () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByRole("button", { name: /delete/i });
        expect(button).toHaveClass("bg-destructive");
    });

    it("can be disabled", () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole("button", { name: /disabled/i });
        expect(button).toBeDisabled();
    });

    it("handles click events", async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Clickable</Button>);

        const button = screen.getByRole("button", { name: /clickable/i });
        await user.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders as a different element using asChild", () => {
        render(
            <Button asChild>
                <a href="https://example.com">Link Button</a>
            </Button>
        );

        const link = screen.getByRole("link", { name: /link button/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "https://example.com");
        expect(link.tagName).toBe("A");
    });
});
