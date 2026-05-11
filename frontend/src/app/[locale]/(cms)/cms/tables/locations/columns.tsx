"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import { BooleanCell } from "../boolean-cell";
import type { FieldDef } from "../edit-sheet";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
import type { Location, LocationRow, LocationUpdateInput } from "@/types/models/location.types";

export const locationFields: FieldDef<LocationRow>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "slug", label: "Slug", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "street", label: "Street", type: "text" },
    { key: "number", label: "Number", type: "text" },
    { key: "postalCode", label: "Postal code", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "phone1", label: "Phone 1", type: "text" },
    { key: "phone2", label: "Phone 2", type: "text" },
    {
        key: "isOwnedByViernulvier",
        label: "Owned by Viernulvier",
        type: "boolean",
    },
    { key: "uitdatabankId", label: "UiTdatabank ID", type: "text" },
    { key: "descriptionNl", label: "Description (NL)", type: "text" },
    { key: "descriptionEn", label: "Description (EN)", type: "text" },
    { key: "historyNl", label: "History (NL)", type: "text" },
    { key: "historyEn", label: "History (EN)", type: "text" },
];

export function toLocationRow(entity: Location): LocationRow {
    const nl = entity.translations.find((t) => t.languageCode === "nl");
    const en = entity.translations.find((t) => t.languageCode === "en");
    return {
        id: entity.id,
        sourceId: entity.sourceId,
        slug: entity.slug,
        name: entity.name,
        code: entity.code,
        street: entity.street,
        number: entity.number,
        postalCode: entity.postalCode,
        city: entity.city,
        country: entity.country,
        phone1: entity.phone1,
        phone2: entity.phone2,
        isOwnedByViernulvier: entity.isOwnedByViernulvier,
        uitdatabankId: entity.uitdatabankId,
        address: entity.address,
        coverImageUrl: entity.coverImageUrl,
        descriptionNl: nl?.description ?? null,
        descriptionEn: en?.description ?? null,
        historyNl: nl?.history ?? null,
        historyEn: en?.history ?? null,
    };
}

export function toLocationUpdateInput(row: LocationRow): LocationUpdateInput {
    return {
        id: row.id,
        sourceId: row.sourceId,
        slug: row.slug,
        name: row.name,
        code: row.code,
        street: row.street,
        number: row.number,
        postalCode: row.postalCode,
        city: row.city,
        country: row.country,
        phone1: row.phone1,
        phone2: row.phone2,
        isOwnedByViernulvier: row.isOwnedByViernulvier,
        uitdatabankId: row.uitdatabankId,
        translations: [
            {
                languageCode: "nl",
                description: row.descriptionNl,
                history: row.historyNl,
            },
            {
                languageCode: "en",
                description: row.descriptionEn,
                history: row.historyEn,
            },
        ],
    };
}

export function makeLocationColumns(options: {
    onEdit: (row: LocationRow) => void;
    onDelete: (location: Location) => void;
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>;
    onOpenSpotlight?: (src: string, alt: string) => void;
}): ColumnDef<Location>[] {
    const { onEdit, onDelete, t, onOpenSpotlight } = options;

    const actions: Action<Location>[] = [
        {
            key: "edit",
            label: t("edit", { label: "location" }),
            icon: SquarePen,
            display: ActionDisplay.Inline,
            onClick: (location) => onEdit(toLocationRow(location)),
        },
        {
            key: "copy-name",
            label: t("copy", { key: "name" }),
            onClick: async (location) => {
                const value = location.name ?? "";
                try {
                    await navigator.clipboard.writeText(value);
                    toast.success(t("copied", { key: "name" }));
                } catch {
                    toast.error(t("copyFailed"));
                }
            },
        },
        {
            key: "add-to-collection",
            render: (location, closeMenu) => (
                <CollectionPickerSubmenu
                    item={{
                        contentId: location.id,
                        contentType: "location",
                        label: location.name || location.address || location.id,
                    }}
                    onComplete={closeMenu}
                />
            ),
        },
        {
            key: "delete",
            label: t("delete", { label: "location" }),
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
                const alt = row.original.name ?? row.original.id;
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
            accessorKey: "name",
            header: "Naam",
            cell: ({ getValue }) => (
                <span className="font-display max-w-[200px] text-base font-medium tracking-tight break-words">
                    {String(getValue() || "—")}
                </span>
            ),
        },
        {
            accessorKey: "code",
            header: "Code",
            cell: ({ getValue }) => (
                <code className="bg-foreground/5 text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
                    {String(getValue() || "—")}
                </code>
            ),
        },
        {
            accessorKey: "address",
            header: "Adres",
            cell: ({ getValue }) => (
                <span className="text-muted-foreground max-w-[200px] text-sm break-words">
                    {String(getValue() || "—")}
                </span>
            ),
        },
        {
            accessorKey: "phone1",
            header: "Telefoon",
            cell: ({ getValue }) => (
                <span className="font-mono text-[11px]">{String(getValue() || "—")}</span>
            ),
        },
        {
            accessorKey: "isOwnedByViernulvier",
            header: "Eigendom",
            cell: ({ getValue }) => <BooleanCell value={getValue<boolean | null>()} />,
        },
        makeActionsColumn<Location>({ actions }),
    ];
}
