"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef, OnChangeFn, Row, RowSelectionState } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { SelectionToolbar } from "../selection-toolbar";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

export function ProductionsTable() {
    const t = useTranslations("Cms.Productions");
    const { data: productions = [], isLoading: productionsLoading } = useGetProductions();
    const { data: allEvents = [], isLoading: eventsLoading } = useGetEvents();
    const updateProduction = useUpdateProduction();
    const updateEvent = useUpdateEvent();

    const [editProduction, setEditProduction] = useState<Production | null>(null);
    const [editEvent, setEditEvent] = useState<Event | null>(null);

    // Selection state: parent rows (productions) and child rows (events per production)
    const [parentSelection, setParentSelection] = useState<RowSelectionState>({});
    const [childSelection, setChildSelection] = useState<Map<string, RowSelectionState>>(new Map());

    const eventsByProduction = useMemo(() => {
        const map = new Map<string, Event[]>();
        for (const event of allEvents) {
            const list = map.get(event.productionId) ?? [];
            list.push(event);
            map.set(event.productionId, list);
        }
        return map;
    }, [allEvents]);

    // Stable per-production child selection handlers. Created once per productionId
    // and cached in a ref — avoids new function references on every selection change,
    // which would defeat MemoSubTable's memo comparator for the onRowSelectionChange check.
    const childHandlersRef = useRef<Map<string, OnChangeFn<RowSelectionState>>>(new Map());
    const getChildHandler = useCallback(
        (productionId: string): OnChangeFn<RowSelectionState> => {
            let handler = childHandlersRef.current.get(productionId);
            if (!handler) {
                handler = (updater) => {
                    setChildSelection((prev) => {
                        const current = prev.get(productionId) ?? {};
                        const next = typeof updater === "function" ? updater(current) : updater;
                        return new Map(prev).set(productionId, next);
                    });
                };
                childHandlersRef.current.set(productionId, handler);
            }
            return handler;
        },
        [] // setChildSelection setter is stable; productionId is baked into each handler closure
    );

    // Custom select column for productions: tree-selection with indeterminate support.
    const selectColumn = useMemo<ColumnDef<Production>>(
        () => ({
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllRowsSelected() ||
                        (table.getIsSomeRowsSelected() ? "indeterminate" : false)
                    }
                    onCheckedChange={(value) => {
                        table.toggleAllRowsSelected(!!value);
                        if (value) {
                            const next = new Map<string, RowSelectionState>();
                            for (const production of productions) {
                                const events = eventsByProduction.get(production.id) ?? [];
                                next.set(
                                    production.id,
                                    Object.fromEntries(events.map((e) => [e.id, true]))
                                );
                            }
                            setChildSelection(next);
                        } else {
                            setChildSelection(new Map());
                        }
                    }}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => {
                const productionId = row.original.id;
                const childSel = childSelection.get(productionId) ?? {};
                const selectedChildCount = Object.values(childSel).filter(Boolean).length;
                const isChecked = row.getIsSelected();
                const isIndeterminate = !isChecked && selectedChildCount > 0;

                return (
                    <Checkbox
                        checked={isChecked ? true : isIndeterminate ? "indeterminate" : false}
                        onCheckedChange={(value) => {
                            row.toggleSelected(!!value);
                            getChildHandler(productionId)(
                                value
                                    ? Object.fromEntries(
                                          (eventsByProduction.get(productionId) ?? []).map((e) => [
                                              e.id,
                                              true,
                                          ])
                                      )
                                    : {}
                            );
                        }}
                        aria-label="Select row"
                    />
                );
            },
            enableSorting: false,
            enableHiding: false,
        }),
        [childSelection, eventsByProduction, getChildHandler, productions]
    );

    const productionCols = useMemo(
        () => [selectColumn, ...makeProductionColumns({ onEdit: setEditProduction })],
        [selectColumn]
    );

    const eventCols = useMemo(() => makeEventColumns({ onEdit: setEditEvent }), []);

    const getEventRowId = useCallback((row: Event) => row.id, []);

    const renderEvents = useCallback(
        (row: Row<Production>) => {
            if (eventsLoading) {
                return (
                    <div className="bg-muted/30 flex items-center py-1 pr-6 pl-12">
                        <Spinner className="text-muted-foreground size-3" />
                    </div>
                );
            }
            const productionId = row.original.id;
            const events = eventsByProduction.get(productionId) ?? [];
            return (
                <MemoSubTable
                    items={events}
                    columns={eventCols}
                    rowSelection={childSelection.get(productionId)}
                    onRowSelectionChange={getChildHandler(productionId)}
                    getRowId={getEventRowId}
                />
            );
        },
        [
            childSelection,
            eventCols,
            eventsByProduction,
            eventsLoading,
            getChildHandler,
            getEventRowId,
        ]
    );

    const selectedProductionCount = Object.values(parentSelection).filter(Boolean).length;
    const selectedEventCount = Array.from(childSelection.values()).reduce(
        (sum, sel) => sum + Object.values(sel).filter(Boolean).length,
        0
    );

    const clearSelection = useCallback(() => {
        setParentSelection({});
        setChildSelection(new Map());
    }, []);

    return (
        <>
            <DataTable
                columns={productionCols}
                data={productions}
                loading={productionsLoading}
                renderSubComponent={renderEvents}
                getRowCanExpand={(row) =>
                    (eventsByProduction.get(row.original.id)?.length ?? 0) > 0
                }
                expanderLabels={{ show: t("showEvents"), hide: t("hideEvents") }}
                toolbar={
                    <SelectionToolbar
                        groups={[
                            {
                                countKey: "productionsSelected",
                                count: selectedProductionCount,
                                inlineActions: [],
                                overflowActions: [],
                            },
                            {
                                countKey: "eventsSelected",
                                count: selectedEventCount,
                                inlineActions: [],
                                overflowActions: [],
                            },
                        ]}
                        onClear={clearSelection}
                    />
                }
                rowSelection={parentSelection}
                onRowSelectionChange={setParentSelection}
            />
            <EditSheet
                open={!!editProduction}
                onOpenChange={(open) => !open && setEditProduction(null)}
                entity={editProduction}
                fields={productionFields}
                title={t("editProduction")}
                onSave={(data) => updateProduction.mutate(toProductionUpdateInput(data))}
            />
            <EditSheet
                open={!!editEvent}
                onOpenChange={(open) => !open && setEditEvent(null)}
                entity={editEvent}
                fields={eventFields}
                title={t("editEvent")}
                onSave={(data) => updateEvent.mutate(toEventUpdateInput(data))}
            />
        </>
    );
}
