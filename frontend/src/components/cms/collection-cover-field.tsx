"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/cms/media-picker-dialog";
import { useClearCoverMedia, useLinkMedia } from "@/hooks/api/useMedia";
import type { Collection } from "@/types/models/collection.types";
import type { Media } from "@/types/models/media.types";

// ── Types ───────────────────────────────────────────────────────────

type Props = {
    collection: Collection;
};

// ── Component ───────────────────────────────────────────────────────

export function CollectionCoverField({ collection }: Props) {
    const t = useTranslations("Cms.CollectionCoverImage");
    const [pickerOpen, setPickerOpen] = useState(false);
    const linkMedia = useLinkMedia();
    const clearCover = useClearCoverMedia();

    const handleSelect = useCallback(
        async (media: Media) => {
            try {
                await linkMedia.mutateAsync({
                    entityType: "collection",
                    entityId: collection.id,
                    input: { mediaId: media.id, role: "cover", isCoverImage: true },
                });
                toast.success(t("setSuccess"));
            } catch {
                toast.error(t("setError"));
            }
            setPickerOpen(false);
        },
        [linkMedia, collection.id, t]
    );

    const handleRemove = useCallback(async () => {
        try {
            await clearCover.mutateAsync({
                entityType: "collection",
                entityId: collection.id,
            });
            toast.success(t("removeSuccess"));
        } catch {
            toast.error(t("removeError"));
        }
    }, [clearCover, collection.id, t]);

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t("label")}</p>
            {collection.coverImageUrl ? (
                <div className="flex items-start gap-4">
                    <div className="relative aspect-video w-40 overflow-hidden rounded-md border">
                        <Image
                            src={collection.coverImageUrl}
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
                            disabled={clearCover.isPending}
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
                entityType="collection"
                entityId={collection.id}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={handleSelect}
            />
        </div>
    );
}
