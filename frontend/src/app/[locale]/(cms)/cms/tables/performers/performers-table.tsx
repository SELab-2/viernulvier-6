"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeArtistColumns, getArtistFields, toArtistUpdateInput } from "./columns";
import { useDeleteArtist, useGetArtists, useUpdateArtist } from "@/hooks/api/useArtists";
import { Artist } from "@/types/models/artist.types";
import { useGetEntityTags, useReplaceEntityTags } from "@/hooks/api/useEntityTags";
import { TagPickerSection } from "@/components/cms/tag-picker-section";

export function PerformersTable() {
    const t = useTranslations("Cms.Performers");
    const tActions = useTranslations("Cms.ActionsColumn");

    const { data: artists = [], isLoading } = useGetArtists();
    const updateArtist = useUpdateArtist();
    const deleteArtist = useDeleteArtist();
    const replaceEntityTags = useReplaceEntityTags();

    const [editArtist, setEditArtist] = useState<Artist | null>(null);
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

    const artistFields = useMemo(() => getArtistFields(t), [t]);

    const openEdit = useCallback((artist: Artist) => {
        setEditArtist(artist);
        setTagEdits(null);
    }, []);

    const columns = useMemo(
        () => makeArtistColumns(openEdit, handleDelete, tActions, t),
        [openEdit, handleDelete, tActions, t]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
                <DataTable columns={columns} data={artists} loading={isLoading} />
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
