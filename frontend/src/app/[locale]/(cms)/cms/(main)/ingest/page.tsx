"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Upload, Loader2, Trash2, HardDrive, Search, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/cms/PageHeader";
import { MasonryGrid, type ColumnCount } from "@/components/ingest/masonry-grid";
import { MediaIngestCard } from "@/components/ingest/media-ingest-card";
import { MediaUploadDialog } from "@/components/ingest/media-upload-dialog";
import { MediaEditSheet } from "@/components/ingest/media-edit-sheet";
import { ImageSpotlight } from "@/components/ui/image-spotlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    useGetInfiniteMedia,
    useUpdateMedia,
    useDeleteMedia,
    useCleanupOrphanedMedia,
    useReconcileMediaStorage,
} from "@/hooks/api/useMedia";
import { toast } from "sonner";
import { Media } from "@/types/models/media.types";
import type { SpotlightItem } from "@/components/ui/image-spotlight";
import { useEntityTagEditor } from "@/hooks/useEntityTagEditor";

export default function IngestPage() {
    const t = useTranslations("Cms.Ingest");
    const tEditions = useTranslations("Cms.editions");
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [editMedia, setEditMedia] = useState<Media | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const [spotlightIndex, setSpotlightIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [sort, setSort] = useState<"recent" | "oldest" | "relevance">("recent");
    const [gridColumns, setGridColumns] = useState<ColumnCount>(4);

    const searchParams = useMemo(
        () => ({ q: searchQuery || undefined, sort }),
        [searchQuery, sort]
    );

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useGetInfiniteMedia(searchParams);

    const mediaItems = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

    const spotlightItems: SpotlightItem[] = mediaItems.map((m) => ({ kind: "media", media: m }));

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1, rootMargin: "100px" }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const updateMedia = useUpdateMedia();
    const { tagSlugs, inheritedTagSlugs, setTagEdits, resetTagEdits, replaceEntityTags } =
        useEntityTagEditor("media", editMedia?.id ?? "", { enabled: !!editMedia && editOpen });
    const deleteMedia = useDeleteMedia();
    const cleanupOrphaned = useCleanupOrphanedMedia();
    const reconcileStorage = useReconcileMediaStorage();

    const handleView = useCallback(
        (media: Media) => {
            const index = mediaItems.findIndex((m) => m.id === media.id);
            setSpotlightIndex(index >= 0 ? index : 0);
            setSpotlightOpen(true);
        },
        [mediaItems]
    );

    const handleEdit = useCallback(
        (media: Media) => {
            setEditMedia(media);
            setEditOpen(true);
            resetTagEdits();
        },
        [resetTagEdits]
    );

    const handleSaveEdit = useCallback(
        async (media: Media) => {
            try {
                await Promise.all([
                    updateMedia.mutateAsync(media),
                    replaceEntityTags.mutateAsync({
                        entityType: "media",
                        entityId: media.id,
                        tagSlugs,
                    }),
                ]);
                setEditOpen(false);
                setEditMedia(null);
                resetTagEdits();
            } catch {
                toast.error(t("editSaveFailed"));
            }
        },
        [updateMedia, replaceEntityTags, tagSlugs, resetTagEdits, t]
    );

    const handleDelete = useCallback(
        (media: Media) => {
            if (typeof window !== "undefined" && window.confirm(t("confirmDelete"))) {
                deleteMedia.mutate(media.id);
            }
        },
        [deleteMedia, t]
    );

    const handleCleanup = useCallback(() => {
        if (typeof window !== "undefined" && window.confirm(t("confirmCleanup"))) {
            cleanupOrphaned.mutate(undefined, {
                onSuccess: (data) => {
                    toast.success(t("cleanupSuccess", { count: data.deleted_count }));
                },
                onError: () => {
                    toast.error(t("cleanupError"));
                },
            });
        }
    }, [cleanupOrphaned, t]);

    const handleReconcile = useCallback(() => {
        reconcileStorage.mutate(false, {
            onSuccess: (data) => {
                const missingInDb = data.missing_in_db.length;
                const missingInS3 = data.missing_in_s3.length;
                if (missingInDb === 0 && missingInS3 === 0) {
                    toast.success(t("reconcileClean"));
                    return;
                }
                const msg = [
                    missingInS3 > 0 ? t("reconcileMissingInS3", { count: missingInS3 }) : null,
                    missingInDb > 0 ? t("reconcileMissingInDb", { count: missingInDb }) : null,
                ]
                    .filter(Boolean)
                    .join(" ");
                toast(msg, {
                    action: {
                        label: t("reconcileApply"),
                        onClick: () => {
                            reconcileStorage.mutate(true, {
                                onSuccess: (applyData) => {
                                    const msgs = [
                                        applyData.deleted_missing_in_s3_count > 0
                                            ? t("reconcileDeletedDb", {
                                                  count: applyData.deleted_missing_in_s3_count,
                                              })
                                            : null,
                                        applyData.deleted_missing_in_db_count > 0
                                            ? t("reconcileDeletedS3", {
                                                  count: applyData.deleted_missing_in_db_count,
                                              })
                                            : null,
                                    ].filter(Boolean);
                                    toast.success(
                                        msgs.length > 0 ? msgs.join(" ") : t("reconcileClean")
                                    );
                                },
                                onError: () => {
                                    toast.error(t("reconcileError"));
                                },
                            });
                        },
                    },
                });
            },
            onError: () => {
                toast.error(t("reconcileError"));
            },
        });
    }, [reconcileStorage, t]);

    return (
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition5")} title={t("title")} />

            {/* Toolbar */}
            <div className="mb-4 flex items-center gap-3">
                <div className="relative w-96">
                    <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                        placeholder={t("search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 rounded-none border pl-8 font-mono text-xs"
                    />
                </div>
                <Select
                    value={sort}
                    onValueChange={(v) => setSort(v as "recent" | "oldest" | "relevance")}
                >
                    <SelectTrigger
                        size="sm"
                        className="w-[140px] rounded-none border font-mono text-[10px] tracking-wider uppercase"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                        <SelectItem value="recent">{t("sortRecent")}</SelectItem>
                        <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
                        <SelectItem value="relevance">{t("sortRelevance")}</SelectItem>
                    </SelectContent>
                </Select>
                {/* Column selector */}
                <Select
                    value={String(gridColumns)}
                    onValueChange={(v) => setGridColumns(Number(v) as ColumnCount)}
                >
                    <SelectTrigger
                        size="sm"
                        className="w-[72px] rounded-none border font-mono text-[10px] tracking-wider uppercase"
                    >
                        <LayoutGrid className="mr-1.5 h-3 w-3 shrink-0" />
                        <SelectValue>{gridColumns}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                        {[2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                                {n}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex-1" />
                <TooltipProvider>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReconcile}
                                    disabled={reconcileStorage.isPending}
                                    className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                                >
                                    <HardDrive className="mr-2 h-3.5 w-3.5" />
                                    {t("reconcile")}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("reconcileTooltip")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCleanup}
                                    disabled={cleanupOrphaned.isPending}
                                    className="hover:text-destructive-foreground hover:bg-destructive rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                                >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    {t("cleanup")}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("cleanupTooltip")}</TooltipContent>
                        </Tooltip>
                        <Button
                            size="sm"
                            onClick={() => setUploadOpen(true)}
                            className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                        >
                            <Upload className="mr-2 h-3.5 w-3.5" />
                            {t("upload")}
                        </Button>
                    </div>
                </TooltipProvider>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Spinner className="text-muted-foreground h-6 w-6" />
                    </div>
                ) : mediaItems.length === 0 ? (
                    <div className="border-border/80 bg-foreground/[0.02] flex flex-col items-center justify-center border py-16">
                        <Upload className="text-muted-foreground mb-4 h-8 w-8" />
                        <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                            {t("noMedia")}
                        </p>
                    </div>
                ) : (
                    <>
                        <MasonryGrid columns={gridColumns}>
                            {mediaItems.map((media) => (
                                <div key={media.id} className="mb-3 break-inside-avoid">
                                    <MediaIngestCard
                                        media={media}
                                        onView={() => handleView(media)}
                                        onEdit={() => handleEdit(media)}
                                        onDelete={() => handleDelete(media)}
                                    />
                                </div>
                            ))}
                        </MasonryGrid>

                        {/* Infinite scroll trigger */}
                        {hasNextPage && (
                            <div ref={loadMoreRef} className="mt-8 flex justify-center py-8">
                                {isFetchingNextPage && (
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="font-mono text-xs tracking-wider uppercase">
                                            {t("loading")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Upload dialog */}
            <MediaUploadDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                onSuccess={() => {
                    // The media queries are invalidated by the upload hook
                }}
            />

            {/* Edit sheet */}
            <MediaEditSheet
                media={editMedia}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSave={handleSaveEdit}
                isSaving={updateMedia.isPending}
                tagSlugs={tagSlugs}
                inheritedTagSlugs={inheritedTagSlugs}
                onTagsChange={(next) => setTagEdits(next)}
            />

            {/* Spotlight */}
            <ImageSpotlight
                items={spotlightItems}
                index={spotlightIndex}
                onIndexChange={setSpotlightIndex}
                open={spotlightOpen}
                onOpenChange={setSpotlightOpen}
                eyebrow={t("mediaPreview")}
            />
        </div>
    );
}
