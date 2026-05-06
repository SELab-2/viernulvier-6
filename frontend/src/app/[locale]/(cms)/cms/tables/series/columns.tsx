"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Edit, Trash2 } from "lucide-react";
import { SeriesRow } from "@/types/models/series.types";
import { makeActionsColumn } from "../actions-column";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionVariant } from "@/types/cms/actions";

interface ColumnOptions {
    onDelete: (row: SeriesRow) => void;
    onEdit: (row: SeriesRow) => void;
    t: (key: string, values?: Record<string, string | number | Date>) => string;
    onOpenSpotlight: (src: string, alt: string) => void;
}

export function makeSeriesColumns({
    onDelete,
    onEdit,
    t,
    onOpenSpotlight,
}: ColumnOptions): ColumnDef<SeriesRow>[] {
    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "coverImageUrl",
            header: "",
            cell: ({ row }) => {
                const url = row.original.coverImageUrl;
                const name = row.original.nameNl || row.original.slug;
                if (!url) return <div className="bg-muted h-10 w-10" />;
                return (
                    <div
                        className="relative h-10 w-10 cursor-zoom-in overflow-hidden"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenSpotlight(url, name);
                        }}
                    >
                        <Image src={url} alt={name} fill className="object-cover" />
                    </div>
                );
            },
        },
        {
            accessorKey: "nameNl",
            header: t("nameNl"),
            cell: ({ row }) => <span className="font-bold">{row.original.nameNl}</span>,
        },
        {
            accessorKey: "nameEn",
            header: t("nameEn"),
        },
        {
            accessorKey: "itemCount",
            header: t("items", { count: 0 }).split(" ")[1].toUpperCase(),
            cell: ({ row }) => row.original.itemCount,
        },
        {
            accessorKey: "updatedAt",
            header: "UPDATED",
            cell: ({ row }) => (
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(row.original.updatedAt).toLocaleDateString()}
                </span>
            ),
        },
        makeActionsColumn<SeriesRow>({
            actions: [
                {
                    key: "edit",
                    label: "Edit",
                    icon: Edit,
                    onClick: onEdit,
                },
                {
                    key: "delete",
                    label: "Delete",
                    icon: Trash2,
                    variant: ActionVariant.Destructive,
                    onClick: onDelete,
                },
            ],
        }),
    ];
}
