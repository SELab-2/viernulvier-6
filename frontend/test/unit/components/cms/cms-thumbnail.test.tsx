import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "../../../../test/utils/test-utils";

import { CmsThumbnail } from "@/components/cms/cms-thumbnail";

describe("CmsThumbnail", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders an image when a source exists", () => {
        render(<CmsThumbnail src="https://example.com/image.jpg" alt="Example image" />);
        expect(screen.getByRole("img", { name: "Example image" })).toBeInTheDocument();
    });

    it("renders the shared fallback box when no source exists", () => {
        const { container } = render(<CmsThumbnail src={null} alt="Fallback image" />);
        expect(container.querySelector(".bg-gradient-to-br")).toBeInTheDocument();
    });
});
