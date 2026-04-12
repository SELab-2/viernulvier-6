import { describe, it, expect } from "vitest";
import { resolveMediaContent } from "@/lib/tiptap/resolve-media-content";

const DOC_WITH_IMAGE = {
    type: "doc",
    content: [
        {
            type: "paragraph",
            content: [
                {
                    type: "image",
                    attrs: { src: "old-url.jpg", mediaId: "id-1", alt: "Photo" },
                },
            ],
        },
    ],
};

describe("resolveMediaContent", () => {
    it("returns content unchanged when mediaMap is empty", () => {
        const result = resolveMediaContent(DOC_WITH_IMAGE, {});
        const img = result.content?.[0]?.content?.[0];
        expect(img?.attrs?.src).toBe("old-url.jpg");
    });

    it("replaces src for matching mediaId", () => {
        const result = resolveMediaContent(DOC_WITH_IMAGE, {
            "id-1": "https://cdn.example/new.jpg",
        });
        const img = result.content?.[0]?.content?.[0];
        expect(img?.attrs?.src).toBe("https://cdn.example/new.jpg");
    });

    it("leaves image unchanged when mediaId not in map", () => {
        const result = resolveMediaContent(DOC_WITH_IMAGE, {
            "other-id": "https://cdn.example/x.jpg",
        });
        const img = result.content?.[0]?.content?.[0];
        expect(img?.attrs?.src).toBe("old-url.jpg");
    });

    it("leaves image unchanged when node has no mediaId", () => {
        const doc = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "image", attrs: { src: "no-id.jpg", mediaId: null, alt: "" } },
                    ],
                },
            ],
        };
        const result = resolveMediaContent(doc, { "id-1": "https://cdn.example/new.jpg" });
        const img = result.content?.[0]?.content?.[0];
        expect(img?.attrs?.src).toBe("no-id.jpg");
    });

    it("does not mutate the original content object", () => {
        const original = JSON.parse(JSON.stringify(DOC_WITH_IMAGE));
        resolveMediaContent(DOC_WITH_IMAGE, { "id-1": "https://cdn.example/new.jpg" });
        expect(DOC_WITH_IMAGE).toEqual(original);
    });

    it("handles doc with no content array (leaf nodes)", () => {
        const doc = { type: "doc" };
        const result = resolveMediaContent(doc, { "id-1": "https://cdn.example/new.jpg" });
        expect(result).toEqual({ type: "doc" });
    });

    it("handles multiple images at different nesting depths", () => {
        const doc = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "image", attrs: { src: "a.jpg", mediaId: "id-a", alt: "" } },
                        { type: "image", attrs: { src: "b.jpg", mediaId: "id-b", alt: "" } },
                    ],
                },
            ],
        };
        const result = resolveMediaContent(doc, {
            "id-a": "https://cdn.example/a-new.jpg",
            "id-b": "https://cdn.example/b-new.jpg",
        });
        expect(result.content?.[0]?.content?.[0]?.attrs?.src).toBe("https://cdn.example/a-new.jpg");
        expect(result.content?.[0]?.content?.[1]?.attrs?.src).toBe("https://cdn.example/b-new.jpg");
    });
});
