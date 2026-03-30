"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CollectionRow } from "@/types/models/collection.types";

function CollectionActionsCell({
    row,
    onDelete,
}: {
    row: CollectionRow;
    onDelete: (row: CollectionRow) => void;
}) {
    const t = useTranslations("Cms.Collections");
    const router = useRouter();

    const copyShareableLink = async () => {
        try {
            const origin = window.location.origin;
            await navigator.clipboard.writeText(`${origin}/en/collections/${row.slug}`);
            toast.success(t("linkCopied"));
        } catch {
            toast.error(t("itemsError"));
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={copyShareableLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {t("copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/cms/collections/${row.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("open")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(row)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteCollection")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function makeCollectionColumns(options: {
    onDelete: (row: CollectionRow) => void;
}): ColumnDef<CollectionRow>[] {
    const formatter = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });

    return [
        { accessorKey: "titleNl", header: "Title (NL)" },
        { accessorKey: "descriptionNl", header: "Description (NL)" },
        { accessorKey: "itemCount", header: "Items" },
        {
            id: "updatedAt",
            header: "Updated",
            accessorFn: (row) => formatter.format(new Date(row.updatedAt)),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <CollectionActionsCell row={row.original} onDelete={options.onDelete} />
            ),
        },
    ];
}
