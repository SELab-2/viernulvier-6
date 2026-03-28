"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorToolbar } from "./editor-toolbar";

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
            StarterKit.configure({
                link: { openOnClick: false },
                code: false,
                codeBlock: false,
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: content ?? undefined,
        immediatelyRender: false,
        editable,
        onUpdate({ editor }) {
            onChange(editor.getJSON() as Record<string, unknown>);
        },
    });

    // Sync external content changes (e.g. initial fetch arriving)
    useEffect(() => {
        if (!editor) return;
        const incoming = JSON.stringify(content ?? null);
        const current = JSON.stringify(editor.getJSON());
        if (incoming !== current) {
            editor.commands.setContent(content ?? null);
        }
    }, [editor, content]);

    return (
        <div className="focus-within:ring-ring flex h-full flex-col overflow-hidden rounded-md border text-sm focus-within:ring-1">
            {editable && <EditorToolbar editor={editor} />}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                <EditorContent
                    editor={editor}
                    className="prose prose-sm dark:prose-invert max-w-none focus:outline-none [&_.tiptap]:min-h-full [&_.tiptap]:outline-none"
                />
            </div>
        </div>
    );
}
