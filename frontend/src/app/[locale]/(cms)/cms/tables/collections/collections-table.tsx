"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Tags, Trash2 } from "lucide-react";
import { RowSelectionState } from "@tanstack/react-table";
import { useRouter } from "@/i18n/routing";
import { DataTable } from "../data-table";
import { makeCollectionColumns } from "./columns";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { ActionBar } from "../action-bar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import { BulkTagDialog } from "@/components/cms/bulk-tag-dialog";
import { useDeleteCollection, useGetInfiniteCollections } from "@/hooks/api";
import { toCollectionRow } from "@/mappers/collection.mapper";
import { CollectionRow } from "@/types/models/collection.types";
import { ActionVariant } from "@/types/cms/actions";

export function CollectionsTable() {
    const t = useTranslations("Cms.Collections");
    const tActionBar = useTranslations("Cms.ActionBar");
    const locale = useLocale();
    const router = useRouter();
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useGetInfiniteCollections({ limit: 50 });

    const collections = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const rows = useMemo(() => collections.map(toCollectionRow), [collections]);

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { threshold: 0.1, rootMargin: "100px" }
        );
        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [loadMore]);

    const deleteCollection = useDeleteCollection();
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
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
    const selectedCollections = useMemo(
        () => rows.filter((collection) => rowSelection[collection.id]),
        [rows, rowSelection]
    );

    const handleBulkDelete = useCallback(() => {
        if (selectedCollections.length === 0) return;
        const ok = window.confirm(
            tActionBar("delete") + ` ${selectedCollections.length} collection(s)?`
        );
        if (!ok) return;
        for (const collection of selectedCollections) {
            deleteCollection.mutate(collection.id);
        }
        setRowSelection({});
    }, [selectedCollections, deleteCollection, tActionBar]);

    const bulkActions = useMemo(
        () => [
            {
                key: "bulk-tags",
                label: tActionBar("bulkEdit"),
                icon: <Tags className="h-3.5 w-3.5" />,
                onClick: () => setBulkTagDialogOpen(true),
            },
            {
                key: "bulk-delete",
                label: tActionBar("delete"),
                icon: <Trash2 className="h-3.5 w-3.5" />,
                variant: ActionVariant.Destructive,
                onClick: handleBulkDelete,
            },
        ],
        [tActionBar, handleBulkDelete]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex items-center gap-2">
                <ActionBar
                    entityCounts={[{ countKey: "collectionsSelected", count: selectedCount }]}
                    actions={bulkActions}
                    onClear={() => setRowSelection({})}
                    className="flex-1"
                />
                <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("newCollection")}
                </Button>
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
                {hasNextPage && (
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                        <Spinner className="text-muted-foreground h-5 w-5" />
                    </div>
                )}
            </div>
            <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
            <BulkTagDialog
                open={bulkTagDialogOpen}
                onOpenChange={setBulkTagDialogOpen}
                entityType="collection"
                entityIds={selectedCollections.map((collection) => collection.id)}
                onApplied={() => setRowSelection({})}
            />
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
