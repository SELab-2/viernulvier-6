"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { makeActionsColumn } from "../actions-column";
import { CmsThumbnail } from "@/components/cms/cms-thumbnail";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
import { Artist } from "@/types/models/artist.types";
import { FieldDef } from "../edit-sheet";

export function makeArtistColumns(
    onEdit: (artist: Artist) => void,
    onDelete: (artist: Artist) => void,
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>,
    tPerformers: ReturnType<typeof useTranslations<"Cms.Performers">>,
    locale: string
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
            key: "open-public",
            label: t("open", { label: "performer" }),
            icon: ArrowUpRight,
            onClick: (artist) => {
                window.location.assign(`/${locale}/artists/${artist.id}`);
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
                if (!url) return <CmsThumbnail src={null} alt="" />;
                return <CmsThumbnail src={url} alt={row.original.name} />;
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
