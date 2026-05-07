"use client";

import { useState } from "react";
import { useEditorState } from "@tiptap/react";
import { type Editor } from "@tiptap/core";
import {
    Bold,
    Italic,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Minus,
    Link,
    Link2Off,
    Check,
    ImagePlus,
} from "lucide-react";
import { Popover } from "radix-ui";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MediaPickerDialog } from "@/components/cms/media-picker-dialog";
import { useLinkMedia } from "@/hooks/api/useMedia";
import type { Media } from "@/types/models/media.types";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    label: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", active && "bg-muted text-foreground")}
                    onClick={onClick}
                    disabled={disabled}
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

interface EditorToolbarProps {
    editor: Editor | null;
    entityType?: string;
    entityId?: string;
}

export function EditorToolbar({ editor, entityType, entityId }: EditorToolbarProps) {
    const [linkUrl, setLinkUrl] = useState("");
    const [linkOpen, setLinkOpen] = useState(false);
    const [imagePickerOpen, setImagePickerOpen] = useState(false);

    const linkMedia = useLinkMedia();

    const state = useEditorState({
        editor,
        selector: ({ editor: e }) => {
            if (!e) return null;
            return {
                bold: e.isActive("bold"),
                italic: e.isActive("italic"),
                strike: e.isActive("strike"),
                h1: e.isActive("heading", { level: 1 }),
                h2: e.isActive("heading", { level: 2 }),
                h3: e.isActive("heading", { level: 3 }),
                bulletList: e.isActive("bulletList"),
                orderedList: e.isActive("orderedList"),
                blockquote: e.isActive("blockquote"),
                link: e.isActive("link"),
            };
        },
    });

    if (!editor || !state) return null;

    const setLink = () => {
        if (linkUrl) {
            editor.chain().extendMarkRange("link").setLink({ href: linkUrl }).run();
        }
        setLinkOpen(false);
        setLinkUrl("");
    };

    const removeLink = () => {
        editor.chain().extendMarkRange("link").unsetLink().run();
        setLinkOpen(false);
    };

    const handleImageSelect = async (media: Media) => {
        if (!entityType || !entityId) return;
        try {
            await linkMedia.mutateAsync({
                entityType,
                entityId,
                input: { mediaId: media.id, role: "inline" },
            });
            editor
                .chain()
                .focus()
                .setMediaImage({
                    src: media.url ?? "",
                    mediaId: media.id,
                    alt: media.altTextNl ?? "",
                })
                .run();
            setImagePickerOpen(false);
        } catch {
            toast.error("Failed to insert image. Please try again.");
        }
    };

    const showImageButton = Boolean(entityType) && Boolean(entityId);

    return (
        <TooltipProvider delayDuration={600}>
            <div className="bg-background relative z-10 flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b px-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={state.bold}
                    label="Bold"
                >
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={state.italic}
                    label="Italic"
                >
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={state.strike}
                    label="Strikethrough"
                >
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    active={state.h1}
                    label="Heading 1"
                >
                    <Heading1 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={state.h2}
                    label="Heading 2"
                >
                    <Heading2 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={state.h3}
                    label="Heading 3"
                >
                    <Heading3 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={state.bulletList}
                    label="Bullet list"
                >
                    <List className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={state.orderedList}
                    label="Ordered list"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    active={state.blockquote}
                    label="Blockquote"
                >
                    <Quote className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    label="Horizontal rule"
                >
                    <Minus className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Link */}
                <Popover.Root
                    open={linkOpen}
                    onOpenChange={(open) => {
                        setLinkOpen(open);
                        if (open) {
                            setLinkUrl(editor.getAttributes("link").href ?? "");
                        }
                    }}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Popover.Trigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7",
                                        state.link && "bg-muted text-foreground"
                                    )}
                                    type="button"
                                    aria-label="Link"
                                    aria-pressed={state.link}
                                >
                                    {state.link ? (
                                        <Link2Off className="h-3.5 w-3.5" />
                                    ) : (
                                        <Link className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </Popover.Trigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Link</TooltipContent>
                    </Tooltip>

                    <Popover.Portal>
                        <Popover.Content
                            className="bg-popover text-popover-foreground z-[100] flex w-max items-center gap-1 rounded-md border p-2 shadow-lg"
                            side="bottom"
                            sideOffset={8}
                            align="center"
                            collisionPadding={16}
                        >
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        setLink();
                                    }
                                }}
                                placeholder="https://…"
                                className="h-7 w-56 text-xs"
                                autoFocus
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={setLink}
                                type="button"
                                aria-label="Set link"
                            >
                                <Check className="h-3.5 w-3.5" />
                            </Button>
                            {state.link && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={removeLink}
                                    type="button"
                                    aria-label="Remove link"
                                >
                                    <Link2Off className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>

                {/* Image */}
                {showImageButton && (
                    <>
                        <Separator orientation="vertical" className="mx-1 h-5" />
                        <ToolbarButton
                            onClick={() => setImagePickerOpen(true)}
                            disabled={linkMedia.isPending}
                            label="Insert image"
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                        </ToolbarButton>
                        <MediaPickerDialog
                            entityType={entityType!}
                            entityId={entityId!}
                            open={imagePickerOpen}
                            onOpenChange={setImagePickerOpen}
                            onSelect={handleImageSelect}
                        />
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}
