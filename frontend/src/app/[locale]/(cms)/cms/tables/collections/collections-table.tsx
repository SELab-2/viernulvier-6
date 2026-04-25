"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { RowSelectionState } from "@tanstack/react-table";
import { useRouter } from "@/i18n/routing";
import { DataTable } from "../data-table";
import { makeCollectionColumns } from "./columns";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { ActionBar } from "../action-bar";
import { Button } from "@/components/ui/button";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import { useDeleteCollection, useGetCollections } from "@/hooks/api";
import { toCollectionRow } from "@/mappers/collection.mapper";
import { CollectionRow } from "@/types/models/collection.types";

export function CollectionsTable() {
    const t = useTranslations("Cms.Collections");
    const locale = useLocale();
    const router = useRouter();
    const { data: collections = [], isLoading } = useGetCollections();
    const deleteCollection = useDeleteCollection();

    const [createOpen, setCreateOpen] = useState(false);
    const [spotlight, setSpotlight] = useState<{ src: string; alt: string } | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const openSpotlight = useCallback((src: string, alt: string) => setSpotlight({ src, alt }), []);

    const handleRowClick = useCallback(
        (row: CollectionRow) => router.push(`/cms/collections/${row.id}`),
        [router]
    );

    const handleOpen = useCallback(
        (row: CollectionRow) => router.push(`/cms/collections/${row.id}`),
        [router]
    );

    const rows = useMemo(() => collections.map(toCollectionRow), [collections]);

    const handleDelete = useCallback(
        (row: CollectionRow) => {
            const ok = window.confirm(t("deleteConfirm", { title: row.titleNl || row.slug }));
            if (!ok) return;

            deleteCollection.mutate(row.id, {
                onSuccess: () => toast.success(t("deleteCollection")),
                onError: () => toast.error(t("metadataError")),
            });
        },
        [deleteCollection, t]
    );

    const columns = useMemo(
        () =>
            makeCollectionColumns({
                onDelete: handleDelete,
                onOpen: handleOpen,
                locale,
                t,
                onOpenSpotlight: openSpotlight,
            }),
        [handleDelete, handleOpen, locale, t, openSpotlight]
    );

    const spotlightItems: SpotlightItem[] = spotlight
        ? [{ kind: "plain", src: spotlight.src, alt: spotlight.alt }]
        : [];

    const selectedCount = Object.values(rowSelection).filter(Boolean).length;

    if (!isLoading && rows.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="space-y-4 text-center">
                    <p className="text-muted-foreground">{t("noCollections")}</p>
                    <Button onClick={() => setCreateOpen(true)}>{t("newCollection")}</Button>
                    <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 py-2">
                <ActionBar
                    entityCounts={[{ countKey: "collectionsSelected", count: selectedCount }]}
                    actions={[]}
                    onClear={() => setRowSelection({})}
                />
                <Button onClick={() => setCreateOpen(true)}>{t("newCollection")}</Button>
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={isLoading}
                    onRowClick={handleRowClick}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => row.id}
                />
            </div>
            <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
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
