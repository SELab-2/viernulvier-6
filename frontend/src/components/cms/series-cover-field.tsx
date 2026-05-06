"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/cms/media-picker-dialog";
import { useGetEntityMedia, useLinkMedia, useUnlinkMedia } from "@/hooks/api/useMedia";
import type { Series } from "@/types/models/series.types";
import type { Media } from "@/types/models/media.types";

type Props = {
    series: Series;
};

export function SeriesCoverField({ series }: Props) {
    const t = useTranslations("Cms.SeriesCoverImage");
    const [pickerOpen, setPickerOpen] = useState(false);
    const { data: coverMedia = [] } = useGetEntityMedia("series", series.id, {
        params: { role: "cover" },
    });
    const cover = coverMedia[0] ?? null;
    const linkMedia = useLinkMedia();
    const unlinkMedia = useUnlinkMedia();

    const handleSelect = useCallback(
        async (media: Media) => {
            try {
                if (cover) {
                    await unlinkMedia.mutateAsync({
                        entityType: "series",
                        entityId: series.id,
                        mediaId: cover.id,
                    });
                }
                await linkMedia.mutateAsync({
                    entityType: "series",
                    entityId: series.id,
                    input: { mediaId: media.id, role: "cover", isCoverImage: true },
                });
                toast.success(t("setSuccess"));
            } catch {
                toast.error(t("setError"));
            }
            setPickerOpen(false);
        },
        [linkMedia, unlinkMedia, series.id, cover, t]
    );

    const handleRemove = useCallback(async () => {
        if (!cover) return;
        try {
            await unlinkMedia.mutateAsync({
                entityType: "series",
                entityId: series.id,
                mediaId: cover.id,
            });
            toast.success(t("removeSuccess"));
        } catch {
            toast.error(t("removeError"));
        }
    }, [unlinkMedia, series.id, cover, t]);

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t("label")}</p>
            {series.coverImageUrl ? (
                <div className="flex items-start gap-4">
                    <div className="relative aspect-video w-40 overflow-hidden rounded-md border">
                        <Image
                            src={series.coverImageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="160px"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPickerOpen(true)}
                        >
                            {t("edit")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            disabled={unlinkMedia.isPending}
                        >
                            {t("remove")}
                        </Button>
                    </div>
                </div>
            ) : (
                <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                    {t("add")}
                </Button>
            )}
            <MediaPickerDialog
                entityType="series"
                entityId={series.id}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={handleSelect}
            />
        </div>
    );
}
