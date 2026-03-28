"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TiptapEditorProps {
    content: Record<string, unknown> | null;
    onChange: (json: Record<string, unknown>) => void;
    placeholder?: string;
    editable?: boolean;
}

export function TiptapEditor({
    content,
    onChange,
    placeholder,
    editable = true,
}: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder }),
        ],
        content: content ?? undefined,
        immediatelyRender: false,
        editable,
        onUpdate: ({ editor: e }) => {
            onChange(e.getJSON() as Record<string, unknown>);
        },
    });

    // Sync content when it changes externally (e.g. after initial fetch)
    useEffect(() => {
        if (!editor) return;
        const incoming = JSON.stringify(content ?? null);
        const current = JSON.stringify(editor.getJSON());
        if (incoming !== current) {
            editor.commands.setContent(content ?? null);
        }
    }, [editor, content]);

    return (
        <div className="focus-within:ring-ring min-h-48 rounded-md border px-3 py-2 text-sm focus-within:ring-1">
            <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert max-w-none"
            />
        </div>
    );
}
