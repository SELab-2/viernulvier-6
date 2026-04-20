import Image from "@tiptap/extension-image";
import type { CommandProps } from "@tiptap/core";

type SetMediaImageOptions = {
    src: string;
    mediaId?: string | null;
    alt?: string;
    title?: string;
};

// Configure inline:true so images live inside paragraphs, then extend with mediaId
export const MediaImage = Image.configure({ inline: true }).extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            mediaId: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-media-id"),
                renderHTML: (attributes: Record<string, unknown>) => {
                    if (!attributes.mediaId) return {};
                    return { "data-media-id": attributes.mediaId };
                },
            },
        };
    },

    addCommands() {
        return {
            ...this.parent?.(),
            setMediaImage:
                (options: SetMediaImageOptions) =>
                ({ commands }: CommandProps) =>
                    commands.insertContent({
                        type: this.name,
                        attrs: options,
                    }),
        };
    },
});

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        mediaImage: {
            setMediaImage: (options: SetMediaImageOptions) => ReturnType;
        };
    }
}
