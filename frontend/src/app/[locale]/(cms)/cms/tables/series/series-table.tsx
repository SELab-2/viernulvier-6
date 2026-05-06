"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { makeSeriesColumns } from "./columns";
import { CreateSeriesDialog } from "./create-series-dialog";
import { ActionBar } from "../action-bar";
import { Button } from "@/components/ui/button";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import { useDeleteSeries, useGetSeries } from "@/hooks/api/useSeries";
import { toSeriesRow } from "@/mappers/series.mapper";
import { SeriesRow, Series } from "@/types/models/series.types";
import { SeriesEditorSheet } from "@/components/cms/series-editor-sheet";

export function SeriesTable() {
    const t = useTranslations("Cms.Series");
    const { data: series = [], isLoading } = useGetSeries();
    const deleteSeries = useDeleteSeries();

    const [createOpen, setCreateOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState<Series | null>(null);
    const [spotlight, setSpotlight] = useState<{ src: string; alt: string } | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const openSpotlight = useCallback((src: string, alt: string) => setSpotlight({ src, alt }), []);

    const handleEdit = useCallback(
        (row: SeriesRow) => {
            const fullSeries = series.find((s) => s.id === row.id);
            if (fullSeries) setEditingSeries(fullSeries);
        },
        [series]
    );

    const rows = useMemo(() => series.map(toSeriesRow), [series]);

    const handleDelete = useCallback(
        (row: SeriesRow) => {
            const ok = window.confirm(t("deleteConfirm", { name: row.nameNl || row.slug }));
            if (!ok) return;

            deleteSeries.mutate(row.slug, {
                onSuccess: () => toast.success(t("deleteSuccess")),
                onError: () => toast.error(t("deleteError")),
            });
        },
        [deleteSeries, t]
    );

    const columns = useMemo(
        () =>
            makeSeriesColumns({
                onDelete: handleDelete,
                onEdit: handleEdit,
                t,
                onOpenSpotlight: openSpotlight,
            }),
        [handleDelete, handleEdit, t, openSpotlight]
    );

    const spotlightItems: SpotlightItem[] = spotlight
        ? [{ kind: "plain", src: spotlight.src, alt: spotlight.alt }]
        : [];

    const selectedCount = Object.values(rowSelection).filter(Boolean).length;

    if (!isLoading && rows.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="space-y-4 text-center">
                    <p className="text-muted-foreground">{t("noSeries")}</p>
                    <Button onClick={() => setCreateOpen(true)}>{t("newSeries")}</Button>
                    <CreateSeriesDialog open={createOpen} onOpenChange={setCreateOpen} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 py-2">
                <ActionBar
                    entityCounts={[{ countKey: "seriesSelected", count: selectedCount }]}
                    actions={[]}
                    onClear={() => setRowSelection({})}
                />
                <Button onClick={() => setCreateOpen(true)}>{t("newSeries")}</Button>
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={isLoading}
                    onRowClick={handleEdit}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => row.id}
                />
            </div>

            <CreateSeriesDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(slug) => {
                    const created = series.find((s) => s.slug === slug);
                    if (created) setEditingSeries(created);
                }}
            />

            {editingSeries && (
                <SeriesEditorSheet
                    key={editingSeries.id}
                    series={editingSeries}
                    open={!!editingSeries}
                    onOpenChange={(open) => {
                        if (!open) setEditingSeries(null);
                    }}
                />
            )}

            <ImageSpotlight
                items={spotlightItems}
                index={0}
                open={spotlight !== null}
                onOpenChange={(open) => {
                    if (!open) setSpotlight(null);
                }}
                eyebrow={t("eyebrow")}
            />
        </div>
    );
}
