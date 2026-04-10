"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import { Action, ActionVariant } from "@/types/cms/actions";
import { CollectionRow } from "@/types/models/collection.types";

export function makeCollectionColumns(options: {
    onDelete: (row: CollectionRow) => void;
    onOpen: (row: CollectionRow) => void;
    locale: string;
    t: ReturnType<typeof useTranslations<"Cms.Collections">>;
}): ColumnDef<CollectionRow>[] {
    const { onDelete, onOpen, locale, t } = options;

    const formatter = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });

    const actions: Action<CollectionRow>[] = [
        {
            key: "copy-link",
            label: t("copyLink"),
            icon: Link2,
            onClick: async (row) => {
                try {
                    const origin = window.location.origin;
                    await navigator.clipboard.writeText(
                        `${origin}/${locale}/collections/${row.slug}`
                    );
                    toast.success(t("linkCopied"));
                } catch {
                    toast.error(t("copyError"));
                }
            },
        },
        {
            key: "open",
            label: t("open"),
            icon: ExternalLink,
            onClick: onOpen,
        },
        {
            key: "delete",
            label: t("deleteCollection"),
            icon: Trash2,
            variant: ActionVariant.Destructive,
            onClick: onDelete,
        },
    ];

    return [
        { accessorKey: "titleNl", header: "Title (NL)" },
        { accessorKey: "descriptionNl", header: "Description (NL)" },
        { accessorKey: "itemCount", header: "Items" },
        {
            id: "updatedAt",
            header: "Updated",
            accessorFn: (row) => formatter.format(new Date(row.updatedAt)),
        },
        makeActionsColumn<CollectionRow>({ actions }),
    ];
}
