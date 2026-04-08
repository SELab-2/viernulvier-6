"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import { BooleanCell } from "../boolean-cell";
import type { FieldDef } from "../edit-sheet";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import { Action, ActionDisplay } from "@/types/cms/actions";
import type { Location, LocationUpdateInput } from "@/types/models/location.types";

export const locationFields: FieldDef<Location>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
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
];

export function toLocationUpdateInput(entity: Location): LocationUpdateInput {
    return {
        id: entity.id,
        sourceId: entity.sourceId,
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
    };
}

export function makeLocationColumns(options: {
    onEdit: (entity: Location) => void;
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>;
}): ColumnDef<Location>[] {
    const { onEdit, t } = options;

    const actions: Action<Location>[] = [
        {
            key: "edit",
            label: t("edit", { label: "location" }),
            icon: SquarePen,
            display: ActionDisplay.Inline,
            onClick: onEdit,
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
    ];

    return [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "code", header: "Code" },
        { accessorKey: "address", header: "Address" },
        { accessorKey: "phone1", header: "Phone" },
        {
            accessorKey: "isOwnedByViernulvier",
            header: "Owned",
            cell: ({ getValue }) => <BooleanCell value={getValue<boolean | null>()} />,
        },
        makeActionsColumn<Location>({ actions }),
    ];
}
