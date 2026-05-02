"use client";

import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { ImageIcon, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { makeActionsColumn } from "../actions-column";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
import { Artist } from "@/types/models/artist.types";
import { FieldDef } from "../edit-sheet";

export function makeArtistColumns(
    onEdit: (artist: Artist) => void,
    onDelete: (artist: Artist) => void,
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>,
    tPerformers: ReturnType<typeof useTranslations<"Cms.Performers">>
): ColumnDef<Artist>[] {
    const actions: Action<Artist>[] = [
        {
            key: "edit",
            label: tPerformers("editPerformer"),
            icon: SquarePen,
            display: ActionDisplay.Inline,
            onClick: onEdit,
        },
        {
            key: "copy-slug",
            label: t("copy", { key: "slug" }),
            onClick: async (artist) => {
                try {
                    await navigator.clipboard.writeText(artist.slug);
                    toast.success(t("copied", { key: "slug" }));
                } catch {
                    toast.error(t("copyFailed"));
                }
            },
        },
        {
            key: "delete",
            label: tPerformers("deletePerformer"),
            icon: Trash2,
            variant: ActionVariant.Destructive,
            onClick: onDelete,
        },
    ];

    return [
        {
            id: "cover",
            header: "",
            cell: ({ row }) => {
                const url = row.original.coverImageUrl;
                if (!url) return <ImageIcon className="text-muted-foreground size-4" />;
                return (
                    <div className="relative size-10 overflow-hidden rounded">
                        <Image src={url} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                );
            },
            size: 52,
        },
        {
            accessorKey: "name",
            header: tPerformers("nameColumn"),
            cell: ({ row }) => (
                <span className="font-display text-sm tracking-tight">{row.original.name}</span>
            ),
        },
        {
            accessorKey: "slug",
            header: tPerformers("slugColumn"),
            cell: ({ row }) => (
                <span className="text-muted-foreground font-mono text-xs">{row.original.slug}</span>
            ),
        },
        makeActionsColumn({ actions }),
    ];
}

export function getArtistFields(
    tPerformers: ReturnType<typeof useTranslations<"Cms.Performers">>
): FieldDef<Artist & Record<string, unknown>>[] {
    return [
        { key: "name", label: tPerformers("nameField"), type: "text" },
        { key: "slug", label: tPerformers("slugField"), type: "text", readOnly: true },
    ];
}

export function toArtistUpdateInput(data: Artist): { id: string; name: string; slug: string } {
    return { id: data.id, name: data.name, slug: data.slug };
}
