"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaPickerDialog } from "@/components/cms/media-picker-dialog";
import { useClearCoverMedia, useLinkMedia } from "@/hooks/api/useMedia";
import type { Location } from "@/types/models/location.types";
import type { Media } from "@/types/models/media.types";

// ── Types ───────────────────────────────────────────────────────────

type Props = {
    location: Location | null;
    onClose: () => void;
};

// ── Component ───────────────────────────────────────────────────────

export function LocationCoverEditor({ location, onClose }: Props) {
    const t = useTranslations("Cms.LocationCoverImage");
    const [pickerOpen, setPickerOpen] = useState(false);
    const linkMedia = useLinkMedia();
    const clearCover = useClearCoverMedia();

    const handleSelect = useCallback(
        async (media: Media) => {
            if (!location) return;
            try {
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
        [linkMedia, location, t]
    );

    const handleRemove = useCallback(async () => {
        if (!location) return;
        try {
            await clearCover.mutateAsync({
                entityType: "location",
                entityId: location.id,
            });
            toast.success(t("removeSuccess"));
        } catch {
            toast.error(t("removeError"));
        }
    }, [clearCover, location, t]);

    return (
        <>
            <Dialog open={!!location} onOpenChange={(open) => !open && onClose()}>
                <DialogContent aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{t("label")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {location?.coverImageUrl ? (
                            <div className="flex items-start gap-4">
                                <div className="relative aspect-video w-40 overflow-hidden rounded-md border">
                                    <Image
                                        src={location.coverImageUrl}
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPickerOpen(true)}
                            >
                                {t("add")}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {location && (
                <MediaPickerDialog
                    entityType="location"
                    entityId={location.id}
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    onSelect={handleSelect}
                />
            )}
        </>
    );
}
