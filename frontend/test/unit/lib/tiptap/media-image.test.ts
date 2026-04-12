import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MediaImage } from "@/lib/tiptap/media-image";

type ContentNode = {
    type: string;
    attrs?: Record<string, unknown>;
    content?: ContentNode[];
};

function makeEditor() {
    return new Editor({
        extensions: [StarterKit, MediaImage],
        content: "<p></p>",
    });
}

describe("MediaImage extension", () => {
    let editor: Editor;
    afterEach(() => editor?.destroy());

    it("has name 'image'", () => {
        editor = makeEditor();
        expect(editor.schema.nodes.image).toBeDefined();
    });

    it("setMediaImage inserts an image node with mediaId and src", () => {
        editor = makeEditor();
        editor.commands.setMediaImage({
            src: "https://cdn.example/a.jpg",
            mediaId: "abc-123",
            alt: "Alt text",
        });

        const json = editor.getJSON() as ContentNode;
        const imageNode = json.content?.[0]?.content?.[0];
        expect(imageNode?.type).toBe("image");
        expect(imageNode?.attrs?.mediaId).toBe("abc-123");
        expect(imageNode?.attrs?.src).toBe("https://cdn.example/a.jpg");
        expect(imageNode?.attrs?.alt).toBe("Alt text");
    });

    it("defaults mediaId to null when not provided", () => {
        editor = makeEditor();
        editor.commands.setMediaImage({ src: "https://cdn.example/b.jpg" });

        const json = editor.getJSON() as ContentNode;
        const imageNode = json.content?.[0]?.content?.[0];
        // Tiptap omits attrs that equal their default from getJSON — null default means absent
        expect(imageNode?.attrs?.mediaId ?? null).toBeNull();
    });
});
