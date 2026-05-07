"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import { Action, ActionDisplay } from "@/types/cms/actions";
import type { Event, EventUpdateInput } from "@/types/models/event.types";

function formatDateTime(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function makeEventFields(
    t: ReturnType<typeof useTranslations<"Cms.Productions">>
): FieldDef<Event>[] {
    return [
        { key: "id", label: t("fieldEventId"), type: "text", readOnly: true },
        { key: "startsAt", label: t("fieldEventStartsAt"), type: "text" },
        { key: "endsAt", label: t("fieldEventEndsAt"), type: "text" },
        { key: "doorsAt", label: t("fieldEventDoorsAt"), type: "text" },
        { key: "intermissionAt", label: t("fieldEventIntermissionAt"), type: "text" },
        { key: "status", label: t("fieldEventStatus"), type: "text" },
        { key: "hallIds", label: t("fieldEventHallId"), type: "hall-multiselect" },
        { key: "maxTicketsPerOrder", label: t("fieldEventMaxTickets"), type: "text" },
        { key: "vendorId", label: t("fieldEventVendorId"), type: "text" },
        { key: "boxOfficeId", label: t("fieldEventBoxOfficeId"), type: "text" },
        { key: "uitdatabankId", label: t("fieldEventUitdatabankId"), type: "text" },
    ];
}

export function toEventUpdateInput(entity: Event): EventUpdateInput {
    return {
        id: entity.id,
        productionId: entity.productionId,
        startsAt: entity.startsAt,
        status: entity.status,
        sourceId: entity.sourceId,
        endsAt: entity.endsAt,
        intermissionAt: entity.intermissionAt,
        doorsAt: entity.doorsAt,
        vendorId: entity.vendorId,
        boxOfficeId: entity.boxOfficeId,
        uitdatabankId: entity.uitdatabankId,
        maxTicketsPerOrder: entity.maxTicketsPerOrder,
        hallIds: entity.hallIds,
        createdAt: entity.createdAt,
        prices: entity.prices,
    };
}

export function makeEventColumns(options: {
    onEdit: (entity: Event) => void;
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>;
    tProductions: ReturnType<typeof useTranslations<"Cms.Productions">>;
}): ColumnDef<Event>[] {
    const { onEdit, t, tProductions } = options;

    const actions: Action<Event>[] = [
        {
            key: "edit",
            label: t("edit", { label: "event" }),
            icon: SquarePen,
            display: ActionDisplay.Inline,
            onClick: onEdit,
        },
        {
            key: "copy-id",
            label: t("copy", { key: "ID" }),
            onClick: async (e) => {
                try {
                    await navigator.clipboard.writeText(e.id);
                    toast.success(t("copied", { key: "ID" }));
                } catch {
                    toast.error(t("copyFailed"));
                }
            },
        },
        {
            key: "add-to-collection",
            render: (event, closeMenu) => (
                <CollectionPickerSubmenu
                    item={{
                        contentId: event.id,
                        contentType: "event",
                        label: formatDateTime(event.startsAt),
                        parentProductionId: event.productionId,
                    }}
                    onComplete={closeMenu}
                />
            ),
        },
    ];

    return [
        {
            accessorKey: "startsAt",
            header: tProductions("eventStartColumn"),
            cell: ({ getValue }) => formatDateTime(getValue<string>()),
        },
        {
            accessorKey: "endsAt",
            header: tProductions("eventEndColumn"),
            cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
        },
        { accessorKey: "status", header: tProductions("eventStatusColumn") },
        {
            accessorKey: "hallIds",
            header: tProductions("eventHallColumn"),
            cell: ({ getValue }) => {
                const ids = getValue<string[]>();
                return ids.length === 0 ? "—" : ids.length === 1 ? "1 hall" : `${ids.length} halls`;
            },
        },
        makeActionsColumn<Event>({ actions }),
    ];
}
