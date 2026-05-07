import { describe, expect, it, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup } from "../../../../test/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../src/messages/en.json";

import type { Media } from "@/types/models/media.types";
import type { Article } from "@/types/models/article.types";

// ── Module mocks (hoisted) ───────────────────────────────────────────

const mockAttachMutateAsync = vi.fn().mockResolvedValue({});
const mockUnlinkMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockUploadMutateAsync = vi.fn().mockResolvedValue({});
const mockGetEntityMedia = vi.fn(() => ({ data: [] }));

vi.mock("@/hooks/api", () => ({
    useGetEntityMedia: (...args: Parameters<typeof mockGetEntityMedia>) =>
        mockGetEntityMedia(...args),
    useLinkMedia: () => ({ mutateAsync: mockAttachMutateAsync, isPending: false }),
    useUnlinkMedia: () => ({ mutateAsync: mockUnlinkMutateAsync, isPending: false }),
    useUploadMedia: () => ({ mutateAsync: mockUploadMutateAsync, isPending: false }),
}));

vi.mock("@/components/cms/media-picker-dialog", () => ({
    MediaPickerDialog: ({
        open,
        onOpenChange,
        onSelect,
    }: {
        open: boolean;
        onOpenChange: (v: boolean) => void;
        onSelect: (m: Media) => void;
    }) =>
        open ? (
            <div data-testid="media-picker-dialog">
                <button onClick={() => onOpenChange(false)}>Close picker</button>
                <button
                    onClick={() =>
                        onSelect({
                            id: "picked-1",
                            url: "https://cdn.example.com/picked.jpg",
                            s3Key: "picked.jpg",
                            mimeType: "image/jpeg",
                            galleryType: "cover",
                            crops: [],
                            createdAt: "2026-01-01T00:00:00Z",
                            updatedAt: "2026-01-01T00:00:00Z",
                            fileSize: null,
                            width: null,
                            height: null,
                            checksum: null,
                            altTextNl: null,
                            altTextEn: null,
                            altTextFr: null,
                            descriptionNl: null,
                            descriptionEn: null,
                            descriptionFr: null,
                            creditNl: null,
                            creditEn: null,
                            creditFr: null,
                            geoLatitude: null,
                            geoLongitude: null,
                            parentId: null,
                            derivativeType: null,
                            sourceSystem: "cms",
                            sourceUri: null,
                        } satisfies Media)
                    }
                >
                    Select media
                </button>
            </div>
        ) : null,
}));

// Import after mocks are declared so vitest hoisting applies
import { ArticleMetadataPanel } from "@/components/cms/article-metadata-panel";

// ── Fixtures ─────────────────────────────────────────────────────────

const mockArticle: Article = {
    id: "article-1",
    slug: "test-slug",
    status: "draft",
    title: "Test Article",
    content: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    publishedAt: null,
    subjectPeriodStart: null,
    subjectPeriodEnd: null,
    coverImageUrl: null,
};

const coverMedia: Media = {
    id: "cover-media-1",
    url: "https://cdn.example.com/cover.jpg",
    s3Key: "covers/cover.jpg",
    mimeType: "image/jpeg",
    galleryType: "cover",
    crops: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    fileSize: 80000,
    width: 1600,
    height: 900,
    checksum: null,
    altTextNl: "Omslagfoto",
    altTextEn: null,
    altTextFr: null,
    descriptionNl: null,
    descriptionEn: null,
    descriptionFr: null,
    creditNl: "Fotograaf X",
    creditEn: null,
    creditFr: null,
    geoLatitude: null,
    geoLongitude: null,
    parentId: null,
    derivativeType: null,
    sourceSystem: "cms",
    sourceUri: null,
};

// ── Helpers ───────────────────────────────────────────────────────────

const renderPanel = (articleOverride?: Partial<Article>) =>
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ArticleMetadataPanel
                article={{ ...mockArticle, ...articleOverride }}
                onArticleChange={vi.fn()}
            />
        </NextIntlClientProvider>
    );

// ── Tests ─────────────────────────────────────────────────────────────

describe("ArticleMetadataPanel — cover image section", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        (mockGetEntityMedia as Mock).mockReturnValue({ data: [] });
    });

    it("shows the 'Cover image' label", () => {
        renderPanel();
        expect(screen.getByText("Cover image")).toBeInTheDocument();
    });

    it("shows empty state when no cover media is set", () => {
        renderPanel();
        expect(screen.getByText("No cover image")).toBeInTheDocument();
    });

    it("shows Pick and Upload controls in the empty state", () => {
        renderPanel();
        expect(screen.getByRole("button", { name: "Pick" })).toBeInTheDocument();
        // Upload uses asChild with a <span> inside a <label>, so it has no button role
        expect(screen.getByText("Upload")).toBeInTheDocument();
    });

    it("shows the cover thumbnail and action buttons when a cover is set", () => {
        (mockGetEntityMedia as Mock).mockReturnValue({ data: [coverMedia] });

        const { container } = renderPanel();

        const img = container.querySelector("img");
        expect(img).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove cover" })).toBeInTheDocument();
    });

    it("does not show the empty-state text when a cover is set", () => {
        (mockGetEntityMedia as Mock).mockReturnValue({ data: [coverMedia] });

        renderPanel();

        expect(screen.queryByText("No cover image")).not.toBeInTheDocument();
    });

    it("opens the media picker dialog when clicking Pick", async () => {
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: "Pick" }));

        expect(screen.getByTestId("media-picker-dialog")).toBeInTheDocument();
    });

    it("opens the media picker dialog when clicking Change on an existing cover", async () => {
        (mockGetEntityMedia as Mock).mockReturnValue({ data: [coverMedia] });
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: "Change" }));

        expect(screen.getByTestId("media-picker-dialog")).toBeInTheDocument();
    });

    it("closes the media picker dialog when the picker requests close", async () => {
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: "Pick" }));
        expect(screen.getByTestId("media-picker-dialog")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Close picker" }));
        expect(screen.queryByTestId("media-picker-dialog")).not.toBeInTheDocument();
    });

    it("calls attachMedia with role=cover when a media item is selected from the picker", async () => {
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: "Pick" }));
        await user.click(screen.getByRole("button", { name: "Select media" }));

        expect(mockAttachMutateAsync).toHaveBeenCalledOnce();
        const call = mockAttachMutateAsync.mock.calls[0][0];
        expect(call.entityType).toBe("article");
        expect(call.entityId).toBe("article-1");
        expect(call.input.role).toBe("cover");
        expect(call.input.isCoverImage).toBe(true);
    });

    it("calls unlinkMedia with the correct ids when the remove button is clicked", async () => {
        (mockGetEntityMedia as Mock).mockReturnValue({ data: [coverMedia] });
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: "Remove cover" }));

        expect(mockUnlinkMutateAsync).toHaveBeenCalledOnce();
        const call = mockUnlinkMutateAsync.mock.calls[0][0];
        expect(call.entityType).toBe("article");
        expect(call.entityId).toBe("article-1");
        expect(call.mediaId).toBe("cover-media-1");
    });

    it("queries entity media with role=cover for the article id", () => {
        renderPanel();

        expect(mockGetEntityMedia).toHaveBeenCalledWith(
            "article",
            "article-1",
            expect.objectContaining({ params: expect.objectContaining({ role: "cover" }) })
        );
    });
});
