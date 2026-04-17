"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { MediaImage } from "@/lib/tiptap/media-image";
import { resolveMediaContent } from "@/lib/tiptap/resolve-media-content";

interface TiptapRendererProps {
    content: Record<string, unknown> | null;
    mediaMap?: Record<string, string>;
}

export function TiptapRenderer({ content, mediaMap = {} }: TiptapRendererProps) {
    const resolvedContent = useMemo(
        () => (content ? resolveMediaContent(content, mediaMap) : null),
        [content, mediaMap]
    );

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: { openOnClick: true },
                code: false,
                codeBlock: false,
            }),
            MediaImage,
        ],
        content: resolvedContent ?? undefined,
        editable: false,
        immediatelyRender: false,
    });

    // Sync when article data arrives after initial render
    useEffect(() => {
        if (!editor) return;
        const incoming = JSON.stringify(resolvedContent ?? null);
        const current = JSON.stringify(editor.getJSON());
        if (incoming !== current) {
            editor.commands.setContent(resolvedContent ?? null);
        }
    }, [editor, resolvedContent]);

    // Update editor content when prop changes (for live preview)
    useEffect(() => {
        if (editor && content) {
            editor.commands.setContent(content);
        }
    }, [editor, content]);

    if (!content) return null;

    return (
        <EditorContent
            editor={editor}
            className="prose prose-lg dark:prose-invert font-body text-foreground [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_blockquote]:border-foreground [&_blockquote]:font-display [&_blockquote]:text-muted-foreground [&_a]:text-foreground [&_hr]:border-foreground/20 max-w-none leading-[1.8] [&_.tiptap]:outline-none [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-[3px] [&_blockquote]:pl-5 [&_blockquote]:italic [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-[28px] [&_h1]:leading-[1.15] [&_h1]:font-bold [&_h1]:tracking-[-0.02em] sm:[&_h1]:text-[36px] [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[22px] [&_h2]:leading-[1.2] [&_h2]:font-bold [&_h2]:tracking-[-0.02em] sm:[&_h2]:text-[28px] [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-[18px] [&_h3]:leading-[1.25] [&_h3]:font-bold sm:[&_h3]:text-[22px] [&_hr]:my-8 [&_img]:max-w-full [&_img]:rounded [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-[15px] [&_p]:leading-[1.8] sm:[&_p]:text-[16px] [&_ul]:list-disc [&_ul]:pl-6"
        />
    );
}
