"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/cms/PageHeader";
import { MediaMasonryGrid } from "@/components/ingest/media-masonry-grid";
import { MediaUploadDialog } from "@/components/ingest/media-upload-dialog";
import { MediaEditSheet } from "@/components/ingest/media-edit-sheet";
import { ImageSpotlight } from "@/components/ui/image-spotlight";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGetInfiniteMedia, useUpdateMedia, useDeleteMedia } from "@/hooks/api/useMedia";
import { Media } from "@/types/models/media.types";
import type { SpotlightItem } from "@/components/ui/image-spotlight";

export default function IngestPage() {
    const t = useTranslations("Cms.Ingest");
    const tEditions = useTranslations("Cms.editions");
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [editMedia, setEditMedia] = useState<Media | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const [spotlightIndex, setSpotlightIndex] = useState(0);

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useGetInfiniteMedia();

    const mediaItems = data?.pages.flatMap((page) => page.data) ?? [];

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
    const deleteMedia = useDeleteMedia();

    const handleView = useCallback((_media: Media, index: number) => {
        setSpotlightIndex(index);
        setSpotlightOpen(true);
    }, []);

    const handleEdit = useCallback((media: Media) => {
        setEditMedia(media);
        setEditOpen(true);
    }, []);

    const handleSaveEdit = useCallback(
        (media: Media) => {
            updateMedia.mutate(media, {
                onSuccess: () => {
                    setEditOpen(false);
                    setEditMedia(null);
                },
            });
        },
        [updateMedia]
    );

    const handleDelete = useCallback(
        (media: Media) => {
            if (typeof window !== "undefined" && window.confirm(t("confirmDelete"))) {
                deleteMedia.mutate(media.id);
            }
        },
        [deleteMedia, t]
    );

    return (
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition5")} title={t("title")} />

            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between">
                <div className="text-muted-foreground font-mono text-[10px] tracking-[1.5px] uppercase">
                    {mediaItems.length} {t("items")}
                </div>
                <Button
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {t("upload")}
                </Button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Spinner className="text-muted-foreground h-6 w-6" />
                    </div>
                ) : mediaItems.length === 0 ? (
                    <div className="border-foreground/10 bg-foreground/[0.02] flex flex-col items-center justify-center border py-16">
                        <Upload className="text-muted-foreground mb-4 h-8 w-8" />
                        <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                            {t("noMedia")}
                        </p>
                    </div>
                ) : (
                    <>
                        <MediaMasonryGrid
                            items={mediaItems}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />

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
