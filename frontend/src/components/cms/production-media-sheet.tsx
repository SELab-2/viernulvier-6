"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImageIcon, ImagePlusIcon, PencilIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";

import {
    useAttachMedia,
    useClearCoverMedia,
    useGetEntityMedia,
    useSetCoverMedia,
    useUnlinkMedia,
    useUpdateMedia,
    useUploadMedia,
} from "@/hooks/api";
import type { Media } from "@/types/models/media.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";

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
            groups[role].push(item);
        } else {
            groups.gallery.push(item);
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
    const attachMedia = useAttachMedia();
    const updateMedia = useUpdateMedia();
    const setCoverMedia = useSetCoverMedia();
    const clearCoverMedia = useClearCoverMedia();

    const [pickerRole, setPickerRole] = useState<MediaRole | null>(null);
    const [editingMedia, setEditingMedia] = useState<Media | null>(null);
    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const [spotlightIndex, setSpotlightIndex] = useState(0);

    const grouped = groupByRole(entityMedia);

    const spotlightItems: SpotlightItem[] = entityMedia
        .filter((m) => m.url)
        .map((m) => ({ kind: "media" as const, media: m }));

    const handleSpotlight = useCallback(
        (media: Media) => {
            const idx = spotlightItems.findIndex(
                (item) => item.kind === "media" && item.media.id === media.id
            );
            setSpotlightIndex(idx >= 0 ? idx : 0);
            setSpotlightOpen(true);
        },
        [spotlightItems, setSpotlightIndex, setSpotlightOpen]
    );

    const handleDetach = useCallback(
        async (mediaId: string) => {
            try {
                await unlinkMedia.mutateAsync({
                    entityType: "production",
                    entityId: productionId,
                    mediaId,
                });
                toast.success(t("detachSuccess"));
                if (editingMedia?.id === mediaId) setEditingMedia(null);
            } catch {
                toast.error(t("detachError"));
            }
        },
        [unlinkMedia, productionId, t, editingMedia, setEditingMedia]
    );

    const handleClearCover = useCallback(
        async (_: string) => {
            try {
                await clearCoverMedia.mutateAsync({
                    entityType: "production",
                    entityId: productionId,
                });
                toast.success(t("clearCoverSuccess"));
            } catch {
                toast.error(t("clearCoverError"));
            }
        },
        [clearCoverMedia, productionId, t]
    );

    const handlePickerSelect = useCallback(
        async (media: Media) => {
            if (!pickerRole) return;
            try {
                await attachMedia.mutateAsync({
                    entityType: "production",
                    entityId: productionId,
                    input: {
                        s3Key: media.s3Key,
                        mimeType: media.mimeType,
                        role: pickerRole,
                        isCoverImage: pickerRole === "cover",
                        altTextNl: media.altTextNl,
                        altTextEn: media.altTextEn,
                        altTextFr: media.altTextFr,
                        creditNl: media.creditNl,
                        creditEn: media.creditEn,
                        creditFr: media.creditFr,
                        fileSize: media.fileSize,
                        width: media.width,
                        height: media.height,
                        checksum: media.checksum,
                    },
                });
                toast.success(t("attachSuccess"));
            } catch {
                toast.error(t("attachError"));
            }
            setPickerRole(null);
        },
        [attachMedia, productionId, pickerRole, t, setPickerRole]
    );

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

    const handleSaveMetadata = useCallback(
        async (media: Media) => {
            try {
                await updateMedia.mutateAsync(media);
                toast.success(t("metadataSaved"));
                setEditingMedia(null);
            } catch {
                toast.error(t("metadataError"));
            }
        },
        [updateMedia, t, setEditingMedia]
    );

    const handleSetCover = useCallback(
        async (media: Media) => {
            try {
                await setCoverMedia.mutateAsync({
                    entityType: "production",
                    entityId: productionId,
                    mediaId: media.id,
                });
                toast.success(t("setCoverSuccess"));
            } catch {
                toast.error(t("setCoverError"));
            }
        },
        [setCoverMedia, productionId, t]
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
                                    onDetach={role === "cover" ? handleClearCover : handleDetach}
                                    onUpload={(file) => handleUploadForRole(file, role)}
                                    onOpenPicker={() => setPickerRole(role)}
                                    onEdit={setEditingMedia}
                                    onSpotlight={handleSpotlight}
                                    onSetCover={role === "gallery" ? handleSetCover : undefined}
                                    canUpload={role !== "cover"}
                                    isUploading={uploadMedia.isPending}
                                />
                            ))
                        )}

                        {editingMedia && (
                            <MediaMetadataForm
                                key={editingMedia.id}
                                media={editingMedia}
                                onSave={handleSaveMetadata}
                                onCancel={() => setEditingMedia(null)}
                                isSaving={updateMedia.isPending}
                            />
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

            <ImageSpotlight
                items={spotlightItems}
                index={spotlightIndex}
                onIndexChange={setSpotlightIndex}
                open={spotlightOpen}
                onOpenChange={setSpotlightOpen}
                eyebrow={productionTitle}
            />
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
    onEdit: (media: Media) => void;
    onSpotlight: (media: Media) => void;
    onSetCover?: (media: Media) => void;
    canUpload?: boolean;
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
    onEdit,
    onSpotlight,
    onSetCover,
    canUpload = true,
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
                {canUpload && (
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
                )}
            </div>

            {media.length === 0 ? (
                <div className="border-foreground/10 bg-foreground/[0.02] flex items-center justify-center rounded border border-dashed py-6">
                    <p className="text-muted-foreground text-xs">
                        {!canUpload ? t("emptyCover") : t("empty")}
                    </p>
                </div>
            ) : isSingle ? (
                <SingleMediaCard
                    media={media[0]}
                    onDetach={onDetach}
                    onEdit={onEdit}
                    onSpotlight={onSpotlight}
                />
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {media.map((item) => (
                        <MediaThumbnail
                            key={item.id}
                            media={item}
                            onDetach={onDetach}
                            onEdit={onEdit}
                            onSpotlight={onSpotlight}
                            onSetCover={onSetCover}
                        />
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
    onEdit: (media: Media) => void;
    onSpotlight: (media: Media) => void;
};

function SingleMediaCard({ media, onDetach, onEdit, onSpotlight }: SingleMediaCardProps) {
    const t = useTranslations("Cms.ProductionMedia");
    const url = mediaThumbnailUrl(media);

    return (
        <div className="group relative overflow-hidden rounded border">
            {url ? (
                <button
                    type="button"
                    className="relative block aspect-video w-full cursor-zoom-in"
                    onClick={() => onSpotlight(media)}
                    aria-label={t("viewFullSize")}
                >
                    <Image
                        src={url}
                        alt={media.altTextNl ?? media.altTextEn ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 448px) 100vw, 400px"
                    />
                </button>
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
                <div className="flex shrink-0 gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => onEdit(media)}
                        aria-label={t("editMetadata")}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7"
                        onClick={() => onDetach(media.id)}
                        aria-label={t("detach")}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── MediaThumbnail ──────────────────────────────────────────────────

type MediaThumbnailProps = {
    media: Media;
    onDetach: (mediaId: string) => void;
    onEdit: (media: Media) => void;
    onSpotlight: (media: Media) => void;
    onSetCover?: (media: Media) => void;
};

function MediaThumbnail({ media, onDetach, onEdit, onSpotlight, onSetCover }: MediaThumbnailProps) {
    const t = useTranslations("Cms.ProductionMedia");
    const url = mediaThumbnailUrl(media);

    return (
        <div className="group relative aspect-square overflow-hidden rounded border">
            {url ? (
                <button
                    type="button"
                    className="absolute inset-0 cursor-zoom-in"
                    onClick={() => onSpotlight(media)}
                    aria-label={t("viewFullSize")}
                >
                    <Image
                        src={url}
                        alt={media.altTextNl ?? media.altTextEn ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 448px) 33vw, 130px"
                    />
                </button>
            ) : (
                <div className="bg-muted flex size-full items-center justify-center">
                    <ImageIcon className="text-muted-foreground size-5" />
                </div>
            )}
            <div className="absolute top-1 right-1 hidden gap-1 group-hover:flex">
                {onSetCover && (
                    <button
                        type="button"
                        className="rounded-full bg-amber-500 p-1 text-white hover:bg-amber-600"
                        onClick={() => onSetCover(media)}
                        aria-label={t("setAsCover")}
                    >
                        <StarIcon className="size-3" />
                    </button>
                )}
                <button
                    type="button"
                    className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    onClick={() => onEdit(media)}
                    aria-label={t("editMetadata")}
                >
                    <PencilIcon className="size-3" />
                </button>
                <button
                    type="button"
                    className="rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                    onClick={() => onDetach(media.id)}
                    aria-label={t("detach")}
                >
                    <XIcon className="size-3" />
                </button>
            </div>
        </div>
    );
}

// ── MediaMetadataForm ───────────────────────────────────────────────

type MediaMetadataFormProps = {
    media: Media;
    onSave: (media: Media) => void;
    onCancel: () => void;
    isSaving: boolean;
};

function MediaMetadataForm({ media, onSave, onCancel, isSaving }: MediaMetadataFormProps) {
    const t = useTranslations("Cms.ProductionMedia");
    const [values, setValues] = useState({ ...media });

    const update = <K extends keyof Media>(key: K, value: Media[K]) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="border-foreground/10 space-y-4 rounded border p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("editMetadata")}
                </h3>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <XIcon className="size-4" />
                </button>
            </div>

            {media.url && (
                <div className="relative mx-auto aspect-video w-40 overflow-hidden rounded">
                    <Image src={media.url} alt="" fill className="object-cover" sizes="160px" />
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <MetadataField
                    label={t("altTextNl")}
                    value={values.altTextNl ?? ""}
                    onChange={(v) => update("altTextNl", v || null)}
                />
                <MetadataField
                    label={t("altTextEn")}
                    value={values.altTextEn ?? ""}
                    onChange={(v) => update("altTextEn", v || null)}
                />
                <MetadataField
                    label={t("altTextFr")}
                    value={values.altTextFr ?? ""}
                    onChange={(v) => update("altTextFr", v || null)}
                />
                <MetadataField
                    label={t("creditNl")}
                    value={values.creditNl ?? ""}
                    onChange={(v) => update("creditNl", v || null)}
                />
                <MetadataField
                    label={t("creditEn")}
                    value={values.creditEn ?? ""}
                    onChange={(v) => update("creditEn", v || null)}
                />
                <MetadataField
                    label={t("creditFr")}
                    value={values.creditFr ?? ""}
                    onChange={(v) => update("creditFr", v || null)}
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
                    {t("cancel")}
                </Button>
                <Button size="sm" onClick={() => onSave(values)} disabled={isSaving}>
                    {isSaving && <Spinner className="mr-1.5 size-3" />}
                    {t("save")}
                </Button>
            </div>
        </div>
    );
}

// ── MetadataField ───────────────────────────────────────────────────

type MetadataFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

function MetadataField({ label, value, onChange }: MetadataFieldProps) {
    return (
        <div className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-7 text-xs"
            />
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
