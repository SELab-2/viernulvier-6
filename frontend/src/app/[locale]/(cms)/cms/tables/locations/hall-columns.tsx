"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import { BooleanCell } from "../boolean-cell";
import type { FieldDef } from "../edit-sheet";
import type { Hall, HallUpdateInput } from "@/types/models/hall.types";

function BooleanCell({ value }: { value: boolean | null }) {
    const t = useTranslations("Cms.EditSheet");
    return value === null ? "—" : value ? t("yes") : t("no");
}

export const hallFields: FieldDef<Hall>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "name", label: "Name", type: "text" },
    { key: "slug", label: "Slug", type: "text", readOnly: true },
    { key: "vendorId", label: "Vendor ID", type: "text" },
    { key: "boxOfficeId", label: "Box office ID", type: "text" },
    { key: "seatSelection", label: "Seat selection", type: "boolean" },
    { key: "openSeating", label: "Open seating", type: "boolean" },
    { key: "remark", label: "Remark", type: "text" },
    { key: "spaceId", label: "Space ID", type: "text", readOnly: true },
];

export function toHallUpdateInput(entity: Hall): HallUpdateInput {
    return {
        id: entity.id,
        slug: entity.slug,
        name: entity.name,
        sourceId: entity.sourceId,
        vendorId: entity.vendorId,
        boxOfficeId: entity.boxOfficeId,
        seatSelection: entity.seatSelection,
        openSeating: entity.openSeating,
        remark: entity.remark,
        spaceId: entity.spaceId,
    };
}

export function makeHallColumns(options: { onEdit: (entity: Hall) => void }): ColumnDef<Hall>[] {
    return [
        { accessorKey: "name", header: "Name" },
        {
            accessorKey: "seatSelection",
            header: "Seat selection",
            cell: ({ getValue }) => <BooleanCell value={getValue<boolean | null>()} />,
        },
        {
            accessorKey: "openSeating",
            header: "Open seating",
            cell: ({ getValue }) => <BooleanCell value={getValue<boolean | null>()} />,
        },
        makeActionsColumn<Hall>({ label: "hall", copyKey: "name", onEdit: options.onEdit }),
    ];
}
