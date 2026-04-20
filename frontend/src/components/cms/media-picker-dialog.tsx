"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckIcon, ImagePlusIcon, SearchIcon, UploadIcon, XIcon } from "lucide-react";

import {
    useGetEntityMedia,
    useGetInfiniteMedia,
    useUploadMedia,
    useUnlinkMedia,
} from "@/hooks/api";
import type { AttachMediaInput, Media } from "@/types/models/media.types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Types ───────────────────────────────────────────────────────────

type MediaPickerDialogProps = {
    entityType: string;
    entityId: string;
    onSelect?: (media: Media) => void;
    triggerLabel?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

type UploadMetadata = Omit<AttachMediaInput, "s3Key" | "mimeType" | "uploadToken">;

// ── Helpers ─────────────────────────────────────────────────────────

const ACCEPTED_TYPES = "image/*,video/*,audio/*,application/pdf";
const GRID_PAGE_SIZE = 20;

const mediaThumbnailUrl = (media: Media): string | null => {
    const crop = media.crops.find((c) => c.variantKind === "thumbnail");
    return crop?.url ?? media.url;
};

// ── Component ───────────────────────────────────────────────────────

export function MediaPickerDialog({
    entityType,
    entityId,
    onSelect,
    triggerLabel,
    open,
    onOpenChange,
}: MediaPickerDialogProps) {
    const t = useTranslations("Cms.Media");

    const [internalOpen, setInternalOpen] = useState(false);
    const resolvedOpen = open ?? internalOpen;
    const setResolvedOpen = onOpenChange ?? setInternalOpen;

    const [tab, setTab] = useState<"all" | "entity">("all");
    const [query, setQuery] = useState("");
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<UploadMetadata>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Queries ─────────────────────────────────────────────────────

    const searchParams = useMemo(() => ({ q: query || undefined, limit: GRID_PAGE_SIZE }), [query]);

    const {
        data: allMediaPages,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingAll,
    } = useGetInfiniteMedia(searchParams, { enabled: resolvedOpen && tab === "all" });

    const allMedia = useMemo(
        () => allMediaPages?.pages.flatMap((p) => p.data) ?? [],
        [allMediaPages]
    );

    const { data: entityMedia = [], isLoading: isLoadingEntity } = useGetEntityMedia(
        entityType,
        entityId,
        { enabled: resolvedOpen && tab === "entity" }
    );

    // ── Mutations ───────────────────────────────────────────────────

    const uploadMedia = useUploadMedia();
    const unlinkMedia = useUnlinkMedia();

    // ── Handlers ────────────────────────────────────────────────────

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        setUploadFile(file);

        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setUploadPreview(url);
        } else {
            setUploadPreview(null);
        }
    }, []);

    const clearUpload = useCallback(() => {
        setUploadFile(null);
        if (uploadPreview) {
            URL.revokeObjectURL(uploadPreview);
        }
        setUploadPreview(null);
        setMetadata({});
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [uploadPreview]);

    const handleUpload = useCallback(async () => {
        if (!uploadFile) return;

        try {
            const media = await uploadMedia.mutateAsync({
                file: uploadFile,
                entityType,
                entityId,
                metadata,
            });
            toast.success(t("uploadSuccess"));
            clearUpload();
            onSelect?.(media);
        } catch {
            toast.error(t("uploadError"));
        }
    }, [uploadFile, uploadMedia, entityType, entityId, metadata, t, clearUpload, onSelect]);

    const handleSelect = useCallback(() => {
        if (!selectedMedia) return;
        onSelect?.(selectedMedia);
        setResolvedOpen(false);
    }, [selectedMedia, onSelect, setResolvedOpen]);

    const handleDetach = useCallback(
        async (mediaId: string) => {
            try {
                await unlinkMedia.mutateAsync({ entityType, entityId, mediaId });
                toast.success(t("detachSuccess"));
            } catch {
                toast.error(t("detachError"));
            }
        },
        [unlinkMedia, entityType, entityId, t]
    );

    const updateMetadata = useCallback(
        <K extends keyof UploadMetadata>(key: K, value: UploadMetadata[K]) => {
            setMetadata((prev) => ({ ...prev, [key]: value }));
        },
        []
    );

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            setResolvedOpen(nextOpen);
            if (!nextOpen) {
                setQuery("");
                setSelectedMedia(null);
                clearUpload();
            }
        },
        [setResolvedOpen, clearUpload]
    );

    // ── Render ──────────────────────────────────────────────────────

    return (
        <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
            {onOpenChange === undefined && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <ImagePlusIcon className="mr-1.5 size-4" />
                        {triggerLabel ?? t("selectMedia")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "entity")}>
                    <TabsList>
                        <TabsTrigger value="all">{t("allMedia")}</TabsTrigger>
                        <TabsTrigger value="entity">{t("entityMedia")}</TabsTrigger>
                    </TabsList>

                    {/* ── All Media tab ────────────────────────────── */}
                    <TabsContent value="all" className="space-y-3">
                        <div className="relative">
                            <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                            <Input
                                placeholder={t("searchPlaceholder")}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        <MediaGrid
                            media={allMedia}
                            isLoading={isLoadingAll}
                            selectedId={selectedMedia?.id ?? null}
                            onSelect={setSelectedMedia}
                        />

                        {hasNextPage && (
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? <Spinner className="mr-1.5" /> : null}
                                    {t("loadMore")}
                                </Button>
                            </div>
                        )}

                        {/* ── Upload section ──────────────────────── */}
                        <div className="space-y-3 border-t pt-3">
                            <Label className="text-sm font-medium">{t("uploadNew")}</Label>

                            {!uploadFile ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED_TYPES}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <UploadIcon className="mr-1.5 size-4" />
                                        {t("chooseFile")}
                                    </Button>
                                </div>
                            ) : (
                                <UploadForm
                                    file={uploadFile}
                                    preview={uploadPreview}
                                    metadata={metadata}
                                    onUpdateMetadata={updateMetadata}
                                    onUpload={handleUpload}
                                    onCancel={clearUpload}
                                    isUploading={uploadMedia.isPending}
                                />
                            )}
                        </div>
                    </TabsContent>

                    {/* ── Entity Media tab ─────────────────────────── */}
                    <TabsContent value="entity" className="space-y-3">
                        <MediaGrid
                            media={entityMedia}
                            isLoading={isLoadingEntity}
                            selectedId={selectedMedia?.id ?? null}
                            onSelect={setSelectedMedia}
                            onDetach={handleDetach}
                        />
                        {!isLoadingEntity && entityMedia.length === 0 && (
                            <p className="text-muted-foreground text-center text-sm">
                                {t("noEntityMedia")}
                            </p>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSelect} disabled={!selectedMedia}>
                        {t("select")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── MediaGrid sub-component ─────────────────────────────────────────

type MediaGridProps = {
    media: Media[];
    isLoading: boolean;
    selectedId: string | null;
    onSelect: (media: Media) => void;
    onDetach?: (mediaId: string) => void;
};

function MediaGrid({ media, isLoading, selectedId, onSelect, onDetach }: MediaGridProps) {
    const t = useTranslations("Cms.Media");

    if (isLoading) {
        return (
            <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded" />
                ))}
            </div>
        );
    }

    if (media.length === 0) {
        return <p className="text-muted-foreground py-8 text-center text-sm">{t("noResults")}</p>;
    }

    return (
        <div className="grid max-h-64 grid-cols-4 gap-2 overflow-auto">
            {media.map((item) => {
                const url = mediaThumbnailUrl(item);
                const isSelected = item.id === selectedId;

                return (
                    <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        className={`group relative cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                            isSelected
                                ? "border-primary ring-primary/20 ring-2"
                                : "hover:border-muted-foreground/30 border-transparent"
                        }`}
                        onClick={() => onSelect(item)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelect(item);
                            }
                        }}
                    >
                        {url ? (
                            <Image
                                src={url}
                                alt={item.altTextNl ?? item.altTextEn ?? ""}
                                width={200}
                                height={200}
                                className="aspect-square w-full object-cover"
                                sizes="(max-width: 672px) 25vw, 150px"
                            />
                        ) : (
                            <div className="bg-muted flex aspect-square items-center justify-center">
                                <ImagePlusIcon className="text-muted-foreground size-6" />
                            </div>
                        )}
                        {isSelected && (
                            <div className="bg-primary absolute top-1 right-1 rounded-full p-0.5">
                                <CheckIcon className="text-primary-foreground size-3" />
                            </div>
                        )}
                        {onDetach && (
                            <button
                                type="button"
                                className="absolute top-1 left-1 hidden rounded-full bg-red-600 p-0.5 text-white group-hover:block"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDetach(item.id);
                                }}
                                aria-label={t("detach")}
                            >
                                <XIcon className="size-3" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── UploadForm sub-component ────────────────────────────────────────

type UploadFormProps = {
    file: File;
    preview: string | null;
    metadata: UploadMetadata;
    onUpdateMetadata: <K extends keyof UploadMetadata>(key: K, value: UploadMetadata[K]) => void;
    onUpload: () => void;
    onCancel: () => void;
    isUploading: boolean;
};

function UploadForm({
    file,
    preview,
    metadata,
    onUpdateMetadata,
    onUpload,
    onCancel,
    isUploading,
}: UploadFormProps) {
    const t = useTranslations("Cms.Media");

    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                {preview && (
                    <div className="relative size-20 shrink-0 overflow-hidden rounded border">
                        <Image src={preview} alt="Preview" fill className="object-cover" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                        {(file.size / 1024).toFixed(0)} KB
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <MetadataInput
                    label={t("altTextNl")}
                    value={metadata.altTextNl ?? ""}
                    onChange={(v) => onUpdateMetadata("altTextNl", v || null)}
                />
                <MetadataInput
                    label={t("altTextEn")}
                    value={metadata.altTextEn ?? ""}
                    onChange={(v) => onUpdateMetadata("altTextEn", v || null)}
                />
                <MetadataInput
                    label={t("altTextFr")}
                    value={metadata.altTextFr ?? ""}
                    onChange={(v) => onUpdateMetadata("altTextFr", v || null)}
                />
                <MetadataInput
                    label={t("creditNl")}
                    value={metadata.creditNl ?? ""}
                    onChange={(v) => onUpdateMetadata("creditNl", v || null)}
                />
                <MetadataInput
                    label={t("creditEn")}
                    value={metadata.creditEn ?? ""}
                    onChange={(v) => onUpdateMetadata("creditEn", v || null)}
                />
                <MetadataInput
                    label={t("creditFr")}
                    value={metadata.creditFr ?? ""}
                    onChange={(v) => onUpdateMetadata("creditFr", v || null)}
                />
            </div>

            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={isUploading}>
                    {t("cancel")}
                </Button>
                <Button size="sm" onClick={onUpload} disabled={isUploading}>
                    {isUploading && <Spinner className="mr-1.5" />}
                    {t("upload")}
                </Button>
            </div>
        </div>
    );
}

// ── MetadataInput sub-component ─────────────────────────────────────

type MetadataInputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

function MetadataInput({ label, value, onChange }: MetadataInputProps) {
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
