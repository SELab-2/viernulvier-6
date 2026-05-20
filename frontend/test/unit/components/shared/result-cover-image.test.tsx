import { describe, expect, it, afterEach, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen, cleanup } from "../../../utils/test-utils";

const useGetEntityMediaMock = vi.fn();

vi.mock("@/hooks/api/useMedia", () => ({
    useGetEntityMedia: (...args: unknown[]) => useGetEntityMediaMock(...args),
}));

vi.mock("next/image", () => ({
    __esModule: true,
    default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-testid="result-img" src={src} alt={alt} onError={onError} />
    ),
}));

import { ResultCoverImage } from "@/components/shared/result-cover-image";

const COVER = "https://cdn.example/cover.jpg";
const FALLBACK = "https://cdn.example/fallback.jpg";

const WRAPPER = "wrapper-class";

describe("ResultCoverImage", () => {
    afterEach(() => {
        cleanup();
        useGetEntityMediaMock.mockReset();
    });

    it("renders the cover image when coverImageUrl is provided and does not fetch fallback media", () => {
        useGetEntityMediaMock.mockReturnValue({ data: undefined });

        render(
            <ResultCoverImage
                entityType="production"
                entityId="p1"
                coverImageUrl={COVER}
                alt="cover"
                sizes="180px"
                wrapperClassName={WRAPPER}
            />
        );

        const img = screen.getByTestId("result-img");
        expect(img).toHaveAttribute("src", COVER);
        expect(useGetEntityMediaMock).toHaveBeenCalledWith(
            "production",
            "p1",
            expect.objectContaining({ enabled: false })
        );
    });

    it("falls back to first linked media when coverImageUrl is null", () => {
        useGetEntityMediaMock.mockReturnValue({
            data: [{ url: FALLBACK }, { url: "https://cdn.example/other.jpg" }],
        });

        render(
            <ResultCoverImage
                entityType="production"
                entityId="p2"
                coverImageUrl={null}
                alt="cover"
                sizes="180px"
                wrapperClassName={WRAPPER}
            />
        );

        expect(screen.getByTestId("result-img")).toHaveAttribute("src", FALLBACK);
        expect(useGetEntityMediaMock).toHaveBeenCalledWith(
            "production",
            "p2",
            expect.objectContaining({ enabled: true })
        );
    });

    it("switches to fallback media when the cover image errors", () => {
        useGetEntityMediaMock.mockReturnValue({
            data: [{ url: COVER }, { url: FALLBACK }],
        });

        render(
            <ResultCoverImage
                entityType="production"
                entityId="p3"
                coverImageUrl={COVER}
                alt="cover"
                sizes="180px"
                wrapperClassName={WRAPPER}
            />
        );

        const img = screen.getByTestId("result-img");
        expect(img).toHaveAttribute("src", COVER);

        fireEvent.error(img);

        expect(screen.getByTestId("result-img")).toHaveAttribute("src", FALLBACK);
    });

    it("renders the placeholder when no cover and no linked media exist", () => {
        useGetEntityMediaMock.mockReturnValue({ data: [] });

        render(
            <ResultCoverImage
                entityType="production"
                entityId="p4"
                coverImageUrl={null}
                alt="cover"
                sizes="180px"
                wrapperClassName={WRAPPER}
                placeholderId="p4"
            />
        );

        expect(screen.queryByTestId("result-img")).toBeNull();
        expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    });
});
