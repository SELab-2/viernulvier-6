"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/cms/media-picker-dialog";
import { useGetEntityMedia, useLinkMedia, useUnlinkMedia } from "@/hooks/api/useMedia";
import type { LocationRow } from "@/types/models/location.types";
import type { Media } from "@/types/models/media.types";

// ── Types ───────────────────────────────────────────────────────────

type Props = {
    location: LocationRow;
};

// ── Component ───────────────────────────────────────────────────────

export function LocationCoverField({ location }: Props) {
    const t = useTranslations("Cms.LocationCoverImage");
    const [pickerOpen, setPickerOpen] = useState(false);
    const { data: coverMedia = [] } = useGetEntityMedia("location", location.id, {
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
                        entityType: "location",
                        entityId: location.id,
                        mediaId: cover.id,
                    });
                }
                await linkMedia.mutateAsync({
                    entityType: "location",
                    entityId: location.id,
                    input: { mediaId: media.id, role: "cover", isCoverImage: true },
                });
                toast.success(t("setSuccess"));
            } catch {
                toast.error(t("setError"));
            }
            setPickerOpen(false);
        },
        [linkMedia, unlinkMedia, location.id, cover, t]
    );

    const handleRemove = useCallback(async () => {
        if (!cover) return;
        try {
            await unlinkMedia.mutateAsync({
                entityType: "location",
                entityId: location.id,
                mediaId: cover.id,
            });
            toast.success(t("removeSuccess"));
        } catch {
            toast.error(t("removeError"));
        }
    }, [unlinkMedia, location.id, cover, t]);

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t("label")}</p>
            {location.coverImageUrl ? (
                <div className="space-y-2">
                    <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                        <Image
                            src={location.coverImageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="400px"
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
                entityType="location"
                entityId={location.id}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={handleSelect}
            />
        </div>
    );
}
