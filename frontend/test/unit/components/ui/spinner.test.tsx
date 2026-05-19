import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "../../../../test/utils/test-utils";

import { Spinner } from "@/components/ui/spinner";

describe("Spinner", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders a loading indicator with status role", () => {
        render(<Spinner />);
        const spinner = screen.getByRole("status", { name: "Loading" });
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass("animate-spin");
    });

    it("accepts and forwards additional className", () => {
        render(<Spinner className="my-custom-class" />);
        const spinner = screen.getByRole("status", { name: "Loading" });
        expect(spinner).toHaveClass("my-custom-class");
    });
});
