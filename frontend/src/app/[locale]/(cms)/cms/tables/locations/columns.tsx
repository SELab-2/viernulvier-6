"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import { BooleanCell } from "../boolean-cell";
import type { FieldDef } from "../edit-sheet";
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
}): ColumnDef<Location>[] {
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
        makeActionsColumn<Location>({
            label: "location",
            copyKey: "name",
            onEdit: (entity) => options.onEdit(toLocationRow(entity)),
        }),
    ];
}
