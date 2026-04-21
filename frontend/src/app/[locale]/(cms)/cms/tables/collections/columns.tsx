"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import { LocalizedText, resolveLocalized } from "@/components/ui/localized-text";
import { Action, ActionVariant } from "@/types/cms/actions";
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
        {
            id: "cover",
            header: "",
            enableSorting: false,
            cell: ({ row }) => {
                const src = row.original.coverImageUrl;
                if (!src) {
                    return <div className="bg-muted h-10 w-10" />;
                }
                const alt =
                    (isEn ? row.original.titleEn : row.original.titleNl) ?? row.original.slug;
                if (!onOpenSpotlight) {
                    return (
                        <Image
                            src={src}
                            alt={alt}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-cover"
                        />
                    );
                }
                return (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenSpotlight(src, alt);
                        }}
                        className="block h-10 w-10 cursor-zoom-in"
                        aria-label={alt}
                    >
                        <Image
                            src={src}
                            alt={alt}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-cover"
                        />
                    </button>
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
