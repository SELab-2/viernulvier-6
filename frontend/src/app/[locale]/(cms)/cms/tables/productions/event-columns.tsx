"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SquarePen, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import { Action, ActionDisplay } from "@/types/cms/actions";
import type { Event, EventUpdateInput, EventPrice } from "@/types/models/event.types";

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

export function EventPriceExtraContent({ entity }: { entity: Event }) {
    const t = useTranslations("Cms.Productions");
    const prices = entity.prices;

    if (!prices || prices.length === 0) {
        return (
            <div>
                <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("fieldEventPrices")}
                </span>
                <div className="border-foreground/10 bg-foreground/[0.02] mt-1.5 rounded-sm border px-3 py-2">
                    <span className="text-muted-foreground font-mono text-xs">—</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                {t("fieldEventPrices")} ({prices.length})
            </span>
            <div className="border-foreground/10 divide-foreground/[0.06] mt-1.5 divide-y rounded-sm border">
                {prices.map((price, idx) => (
                    <div key={price.id ?? idx} className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <Ticket className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                <span className="text-foreground truncate font-mono text-xs">
                                    {price.price.descriptionNl ?? price.price.type}
                                </span>
                                {price.rank.code && (
                                    <Badge
                                        variant="secondary"
                                        className="h-4 shrink-0 px-1.5 py-0 text-[10px]"
                                    >
                                        {price.rank.code}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                                {price.amountCents === 0
                                    ? t("fieldEventPriceFree")
                                    : `\u20ac${(price.amountCents / 100).toFixed(2)}`}
                            </span>
                        </div>
                        <div className="text-muted-foreground mt-1 flex gap-3 font-mono text-[10px]">
                            <span>
                                {t("fieldEventPriceType")}: {price.price.type}
                            </span>
                            <span>
                                {t("fieldEventPriceAvailable")}: {price.available}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
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
        {
            accessorKey: "prices",
            header: tProductions("eventPriceColumn"),
            cell: ({ getValue }) => {
                const prices = getValue<Event["prices"]>();
                if (!prices || prices.length === 0) return "\u2014";
                const amounts = prices.map((p) => p.amountCents / 100);
                const min = Math.min(...amounts);
                const max = Math.max(...amounts);
                if (min === 0 && max === 0) return tProductions("fieldEventPriceFree");
                const fmt = (n: number) => `\u20ac${n.toFixed(2)}`;
                if (prices.length === 1 || min === max) return fmt(min);
                return `${fmt(min)} \u2013 ${fmt(max)}`;
            },
        },
        makeActionsColumn<Event>({ actions }),
    ];
}
