"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { DataTable } from "../data-table";
import { makeCollectionColumns } from "./columns";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteCollection, useGetCollections } from "@/hooks/api";
import { toCollectionRow } from "@/mappers/collection.mapper";
import { CollectionRow } from "@/types/models/collection.types";

export function CollectionsTable() {
    const t = useTranslations("Cms.Collections");
    const router = useRouter();
    const { data: collections = [], isLoading } = useGetCollections();
    const deleteCollection = useDeleteCollection();

    const [createOpen, setCreateOpen] = useState(false);

    const handleRowClick = useCallback(
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
        () => makeCollectionColumns({ onDelete: handleDelete }),
        [handleDelete]
    );

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
        <div className="p-4">
            <DataTable
                columns={columns}
                data={rows}
                loading={isLoading}
                onRowClick={handleRowClick}
                toolbar={
                    <div className="flex items-center justify-end">
                        <Button onClick={() => setCreateOpen(true)}>{t("newCollection")}</Button>
                    </div>
                }
            />
            <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
    );
}
