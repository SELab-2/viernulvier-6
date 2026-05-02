"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeArtistColumns, getArtistFields, toArtistUpdateInput } from "./columns";
import { useDeleteArtist, useGetArtists, useUpdateArtist } from "@/hooks/api/useArtists";
import { Artist } from "@/types/models/artist.types";

export function PerformersTable() {
    const t = useTranslations("Cms.Performers");
    const tActions = useTranslations("Cms.ActionsColumn");

    const { data: artists = [], isLoading } = useGetArtists();
    const updateArtist = useUpdateArtist();
    const deleteArtist = useDeleteArtist();

    const [editArtist, setEditArtist] = useState<Artist | null>(null);

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

    const artistFields = useMemo(() => getArtistFields(t), [t]);

    const columns = useMemo(
        () => makeArtistColumns(setEditArtist, handleDelete, tActions, t),
        [handleDelete, tActions, t]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
                <DataTable columns={columns} data={artists} loading={isLoading} />
            </div>
            <EditSheet
                open={!!editArtist}
                onOpenChange={(open) => !open && setEditArtist(null)}
                entity={editArtist as (Artist & Record<string, unknown>) | null}
                fields={artistFields}
                title={t("editPerformer")}
                onSave={(data) =>
                    updateArtist.mutateAsync(toArtistUpdateInput(data as Artist), {
                        onSuccess: () => toast.success(t("updateSuccess")),
                        onError: () => toast.error(t("updateError")),
                    })
                }
            />
        </div>
    );
}
