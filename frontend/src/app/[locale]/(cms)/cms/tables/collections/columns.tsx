"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, Link2, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import { CmsThumbnail } from "@/components/cms/cms-thumbnail";
import { EntityTagStrip } from "@/components/shared/entity-tag-strip";
import { VisibilityBadge } from "@/components/cms/visibility-badge";
import { LocalizedText, resolveLocalized } from "@/components/ui/localized-text";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
import { CollectionRow } from "@/types/models/collection.types";

export function makeCollectionColumns(options: {
    onDelete: (row: CollectionRow) => void;
    onOpen: (row: CollectionRow) => void;
    locale: string;
    t: ReturnType<typeof useTranslations<"Cms.Collections">>;
    onOpenSpotlight?: (src: string, alt: string) => void;
}): ColumnDef<CollectionRow>[] {
    const { onDelete, onOpen, locale, t, onOpenSpotlight } = options;
    const isEn = locale === "en";

    const fieldPair = (row: CollectionRow, field: "title" | "description") => {
        const nl = row[`${field}Nl` as const] as string;
        const en = row[`${field}En` as const] as string;
        return {
            primary: isEn ? en : nl,
            fallback: isEn ? nl : en,
        };
    };

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
            key: "open-public",
            label: t("open"),
            icon: ArrowUpRight,
            onClick: (row) => {
                window.location.assign(`/${locale}/collections/${row.slug}`);
            },
        },
        {
            key: "open",
            label: t("open"),
            icon: SquarePen,
            display: ActionDisplay.Inline,
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
        {
            id: "cover",
            header: "",
            enableSorting: false,
            cell: ({ row }) => {
                const src = row.original.coverImageUrl;
                const alt =
                    (isEn ? row.original.titleEn : row.original.titleNl) ?? row.original.slug;
                return (
                    <CmsThumbnail
                        src={src}
                        alt={alt}
                        onClick={
                            src && onOpenSpotlight ? () => onOpenSpotlight(src, alt) : undefined
                        }
                    />
                );
            },
        },
        {
            id: "title",
            header: "Title",
            accessorFn: (row) => {
                const { primary, fallback } = fieldPair(row, "title");
                return resolveLocalized(primary, fallback).value;
            },
            cell: ({ row }) => {
                const { primary, fallback } = fieldPair(row.original, "title");
                return (
                    <LocalizedText
                        primary={primary}
                        fallback={fallback}
                        className="font-display text-sm tracking-tight"
                    />
                );
            },
        },
        {
            id: "description",
            header: "Description",
            accessorFn: (row) => {
                const { primary, fallback } = fieldPair(row, "description");
                return resolveLocalized(primary, fallback).value;
            },
            cell: ({ row }) => {
                const { primary, fallback } = fieldPair(row.original, "description");
                return (
                    <LocalizedText
                        primary={primary}
                        fallback={fallback}
                        className="max-w-[300px] truncate text-sm"
                    />
                );
            },
        },
        {
            accessorKey: "itemCount",
            header: "Items",
            cell: ({ getValue }) => (
                <span className="text-muted-foreground font-mono text-xs">
                    {getValue() as number}
                </span>
            ),
        },
        {
            accessorKey: "visibility",
            header: t("fieldVisibility"),
            cell: ({ row }) => <VisibilityBadge visibility={row.original.visibility} />,
        },
        {
            id: "tags",
            header: "Tags",
            enableSorting: false,
            cell: ({ row }) => (
                <EntityTagStrip
                    tags={row.original.tags}
                    locale={locale}
                    cap={3}
                    variant="compact"
                />
            ),
        },
        {
            id: "updatedAt",
            header: "Updated",
            accessorFn: (row) => formatter.format(new Date(row.updatedAt)),
            cell: ({ getValue }) => (
                <span className="text-muted-foreground font-mono text-xs">
                    {getValue() as string}
                </span>
            ),
        },
        makeActionsColumn<CollectionRow>({ actions }),
    ];
}
