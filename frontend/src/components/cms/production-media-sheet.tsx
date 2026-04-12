"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImageIcon, ImagePlusIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";

import { useGetEntityMedia, useUnlinkMedia, useUploadMedia } from "@/hooks/api";
import type { Media } from "@/types/models/media.types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

import { MediaPickerDialog } from "./media-picker-dialog";

// ── Types ───────────────────────────────────────────────────────────

type ProductionMediaSheetProps = {
    productionId: string;
    productionTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const MEDIA_ROLES = ["cover", "poster", "gallery"] as const;
type MediaRole = (typeof MEDIA_ROLES)[number];

// ── Helpers ─────────────────────────────────────────────────────────

const mediaThumbnailUrl = (media: Media): string | null => {
    const crop = media.crops.find((c) => c.variantKind === "thumbnail");
    return crop?.url ?? media.url;
};

const groupByRole = (media: Media[]): Record<MediaRole, Media[]> => {
    const groups: Record<MediaRole, Media[]> = { cover: [], poster: [], gallery: [] };

    for (const item of media) {
        const role = item.galleryType as MediaRole | null;
        if (role && role in groups) {
            groups[role] = [...groups[role], item];
        } else {
            // Media without a role goes to gallery
            groups.gallery = [...groups.gallery, item];
        }
    }

    return groups;
};

// ── Component ───────────────────────────────────────────────────────

export function ProductionMediaSheet({
    productionId,
    productionTitle,
    open,
    onOpenChange,
}: ProductionMediaSheetProps) {
    const t = useTranslations("Cms.ProductionMedia");

    const { data: entityMedia = [], isLoading } = useGetEntityMedia("production", productionId, {
        enabled: open,
    });

    const unlinkMedia = useUnlinkMedia();
    const uploadMedia = useUploadMedia();

    const [pickerRole, setPickerRole] = useState<MediaRole | null>(null);

    const grouped = groupByRole(entityMedia);

    const handleDetach = useCallback(
        async (mediaId: string) => {
            try {
                await unlinkMedia.mutateAsync({
                    entityType: "production",
                    entityId: productionId,
                    mediaId,
                });
                toast.success(t("detachSuccess"));
            } catch {
                toast.error(t("detachError"));
            }
        },
        [unlinkMedia, productionId, t]
    );

    const handlePickerSelect = useCallback(() => {
        setPickerRole(null);
        toast.success(t("attachSuccess"));
    }, [t]);

    const handleUploadForRole = useCallback(
        async (file: File, role: MediaRole) => {
            try {
                await uploadMedia.mutateAsync({
                    file,
                    entityType: "production",
                    entityId: productionId,
                    metadata: {
                        role,
                        isCoverImage: role === "cover",
                    },
                });
                toast.success(t("uploadSuccess"));
            } catch {
                toast.error(t("uploadError"));
            }
        },
        [uploadMedia, productionId, t]
    );

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="border-foreground/20 flex flex-col gap-0 overflow-y-auto border-l p-0 sm:max-w-lg">
                    <SheetHeader className="border-foreground/10 border-b px-6 pt-6 pb-4">
                        <div className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2px] uppercase">
                            {t("editMode")}
                        </div>
                        <SheetTitle className="font-display text-2xl font-bold tracking-tight">
                            {t("title")}
                        </SheetTitle>
                        <SheetDescription className="font-body text-muted-foreground text-sm">
                            {productionTitle}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-col gap-6 px-6 py-6">
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            MEDIA_ROLES.map((role) => (
                                <RoleSection
                                    key={role}
                                    role={role}
                                    media={grouped[role]}
                                    onDetach={handleDetach}
                                    onUpload={(file) => handleUploadForRole(file, role)}
                                    onOpenPicker={() => setPickerRole(role)}
                                    isUploading={uploadMedia.isPending}
                                />
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {pickerRole && (
                <MediaPickerDialog
                    entityType="production"
                    entityId={productionId}
                    open={true}
                    onOpenChange={(nextOpen) => {
                        if (!nextOpen) setPickerRole(null);
                    }}
                    onSelect={handlePickerSelect}
                />
            )}
        </>
    );
}

// ── RoleSection ─────────────────────────────────────────────────────

type RoleSectionProps = {
    role: MediaRole;
    media: Media[];
    onDetach: (mediaId: string) => void;
    onUpload: (file: File) => void;
    onOpenPicker: () => void;
    isUploading: boolean;
};

const ROLE_ICONS: Record<MediaRole, typeof ImageIcon> = {
    cover: StarIcon,
    poster: ImageIcon,
    gallery: ImagePlusIcon,
};

function RoleSection({
    role,
    media,
    onDetach,
    onUpload,
    onOpenPicker,
    isUploading,
}: RoleSectionProps) {
    const t = useTranslations("Cms.ProductionMedia");
    const Icon = ROLE_ICONS[role];

    const handleFileInput = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = "";
        },
        [onUpload]
    );

    const isSingle = role === "cover" || role === "poster";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground size-4" />
                    <h3 className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                        {t(`roles.${role}`)}
                    </h3>
                    <span className="text-muted-foreground/60 text-xs">({media.length})</span>
                </div>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onOpenPicker}
                    >
                        {t("browse")}
                    </Button>
                    <label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInput}
                            className="hidden"
                            disabled={isUploading}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            asChild
                            disabled={isUploading}
                        >
                            <span>
                                {isUploading && <Spinner className="mr-1 size-3" />}
                                {t("upload")}
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            {media.length === 0 ? (
                <div className="border-foreground/10 bg-foreground/[0.02] flex items-center justify-center rounded border border-dashed py-6">
                    <p className="text-muted-foreground text-xs">{t("empty")}</p>
                </div>
            ) : isSingle ? (
                <SingleMediaCard media={media[0]} onDetach={onDetach} />
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {media.map((item) => (
                        <MediaThumbnail key={item.id} media={item} onDetach={onDetach} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── SingleMediaCard ─────────────────────────────────────────────────

type SingleMediaCardProps = {
    media: Media;
    onDetach: (mediaId: string) => void;
};

function SingleMediaCard({ media, onDetach }: SingleMediaCardProps) {
    const t = useTranslations("Cms.ProductionMedia");
    const url = mediaThumbnailUrl(media);

    return (
        <div className="group relative overflow-hidden rounded border">
            {url ? (
                <div className="relative aspect-video">
                    <Image
                        src={url}
                        alt={media.altTextNl ?? media.altTextEn ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 448px) 100vw, 400px"
                    />
                </div>
            ) : (
                <div className="bg-muted flex aspect-video items-center justify-center">
                    <ImageIcon className="text-muted-foreground size-8" />
                </div>
            )}
            <div className="flex items-center justify-between border-t px-3 py-2">
                <div className="min-w-0">
                    {media.altTextNl && <p className="truncate text-xs">{media.altTextNl}</p>}
                    {media.creditNl && (
                        <p className="text-muted-foreground truncate text-[10px]">
                            {media.creditNl}
                        </p>
                    )}
                    {!media.altTextNl && !media.creditNl && (
                        <p className="text-muted-foreground text-[10px]">{media.mimeType}</p>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 shrink-0"
                    onClick={() => onDetach(media.id)}
                    aria-label={t("detach")}
                >
                    <Trash2Icon className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}

// ── MediaThumbnail ──────────────────────────────────────────────────

type MediaThumbnailProps = {
    media: Media;
    onDetach: (mediaId: string) => void;
};

function MediaThumbnail({ media, onDetach }: MediaThumbnailProps) {
    const t = useTranslations("Cms.ProductionMedia");
    const url = mediaThumbnailUrl(media);

    return (
        <div className="group relative aspect-square overflow-hidden rounded border">
            {url ? (
                <Image
                    src={url}
                    alt={media.altTextNl ?? media.altTextEn ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 33vw, 130px"
                />
            ) : (
                <div className="bg-muted flex size-full items-center justify-center">
                    <ImageIcon className="text-muted-foreground size-5" />
                </div>
            )}
            <button
                type="button"
                className="absolute top-1 right-1 hidden rounded-full bg-red-600 p-1 text-white group-hover:block"
                onClick={() => onDetach(media.id)}
                aria-label={t("detach")}
            >
                <XIcon className="size-3" />
            </button>
        </div>
    );
}

// ── LoadingSkeleton ─────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            {MEDIA_ROLES.map((role) => (
                <div key={role} className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="aspect-video w-full rounded" />
                </div>
            ))}
        </div>
    );
}
