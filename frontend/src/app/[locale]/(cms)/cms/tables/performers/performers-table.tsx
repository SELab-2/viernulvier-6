"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { RowSelectionState } from "@tanstack/react-table";

import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { ActionBar } from "../action-bar";
import { SearchInput } from "@/components/cms/search-input";
import { LoadMoreSentinel } from "@/components/cms/load-more-sentinel";
import { makeArtistColumns, getArtistFields, toArtistUpdateInput } from "./columns";
import { useDeleteArtist, useGetInfiniteArtists, useUpdateArtist } from "@/hooks/api/useArtists";
import { Artist } from "@/types/models/artist.types";
import { ActionVariant } from "@/types/cms/actions";
import { useGetEntityTags, useReplaceEntityTags } from "@/hooks/api/useEntityTags";
import { TagPickerSection } from "@/components/cms/tag-picker-section";

export function PerformersTable() {
    const t = useTranslations("Cms.Performers");
    const tActions = useTranslations("Cms.ActionsColumn");
    const tActionBar = useTranslations("Cms.ActionBar");

    const searchParams = useSearchParams();
    const q = searchParams.get("q") ?? undefined;

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isLoading,
    } = useGetInfiniteArtists({ q });

    const artists = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const updateArtist = useUpdateArtist();
    const deleteArtist = useDeleteArtist();
    const replaceEntityTags = useReplaceEntityTags();

    const [editArtist, setEditArtist] = useState<Artist | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const selectedArtists = useMemo(
        () => artists.filter((a) => rowSelection[a.id]),
        [artists, rowSelection]
    );

    const [tagEdits, setTagEdits] = useState<string[] | null>(null);

    const { data: entityTags } = useGetEntityTags("artist", editArtist?.id ?? "", {
        enabled: !!editArtist,
    });

    const baseTagSlugs = useMemo(() => {
        if (!entityTags) return [];
        return entityTags.flatMap((f) => f.tags.filter((t) => !t.inherited).map((t) => t.slug));
    }, [entityTags]);

    const inheritedTagSlugs = useMemo(() => {
        if (!entityTags) return [];
        return entityTags.flatMap((f) => f.tags.filter((t) => t.inherited).map((t) => t.slug));
    }, [entityTags]);

    const tagSlugs = tagEdits ?? baseTagSlugs;

    const handleDelete = useCallback(
        (artist: Artist) => {
            const ok = window.confirm(t("deleteConfirm", { name: artist.name }));
            if (!ok) return;
            deleteArtist.mutate(artist.id, {
                onSuccess: () => toast.success(t("deleteSuccess")),
                onError: () => toast.error(t("deleteError")),
            });
        },
        [deleteArtist, t]
    );

    const handleBulkDelete = useCallback(() => {
        if (selectedArtists.length === 0) return;
        const ok = window.confirm(
            tActionBar("delete") + ` ${selectedArtists.length} performer(s)?`
        );
        if (!ok) return;
        for (const artist of selectedArtists) {
            deleteArtist.mutate(artist.id);
        }
        setRowSelection({});
    }, [selectedArtists, deleteArtist, tActionBar]);

    const artistFields = useMemo(() => getArtistFields(t), [t]);

    const openEdit = useCallback((artist: Artist) => {
        setEditArtist(artist);
        setTagEdits(null);
    }, []);

    const columns = useMemo(
        () => makeArtistColumns(openEdit, handleDelete, tActions, t),
        [openEdit, handleDelete, tActions, t]
    );

    const bulkActions = useMemo(
        () => [
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
                    entityCounts={[
                        { countKey: "performersSelected", count: selectedArtists.length },
                    ]}
                    actions={bulkActions}
                    onClear={() => setRowSelection({})}
                    search={<SearchInput placeholder={t("search")} />}
                    className="flex-1"
                />
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={columns}
                    data={artists}
                    loading={isLoading}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => row.id}
                />
                <LoadMoreSentinel hasNextPage={hasNextPage ?? false} onLoadMore={fetchNextPage} />
            </div>
            <EditSheet
                open={!!editArtist}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditArtist(null);
                        setTagEdits(null);
                    }
                }}
                entity={editArtist as (Artist & Record<string, unknown>) | null}
                fields={artistFields}
                title={t("editPerformer")}
                onSave={async (data) => {
                    try {
                        await Promise.all([
                            updateArtist.mutateAsync(toArtistUpdateInput(data as Artist)),
                            replaceEntityTags.mutateAsync({
                                entityType: "artist",
                                entityId: data.id,
                                tagSlugs,
                            }),
                        ]);
                        toast.success(t("updateSuccess"));
                    } catch {
                        toast.error(t("updateError"));
                    }
                }}
                extraContent={() => (
                    <TagPickerSection
                        entityType="artist"
                        selectedSlugs={tagSlugs}
                        inheritedSlugs={inheritedTagSlugs}
                        onChange={(next) => setTagEdits(next)}
                        compact
                    />
                )}
            />
        </div>
    );
}
