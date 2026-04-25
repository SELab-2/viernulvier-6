"use client";

import Image from "next/image";
import { Eye, Pencil, Trash2, ImageIcon } from "lucide-react";
import { Media } from "@/types/models/media.types";
import { resolveLocalized } from "@/components/ui/localized-text";

interface MediaIngestCardProps {
    media: Media;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function thumbnailUrl(media: Media): string | null {
    const crop = media.crops.find((c) => c.variantKind === "thumbnail");
    return crop?.url ?? media.url ?? null;
}

export function MediaIngestCard({ media, onView, onEdit, onDelete }: MediaIngestCardProps) {
    const url = thumbnailUrl(media);
    const alt = resolveLocalized(media.altTextNl ?? "", media.altTextEn ?? "").value;

    return (
        <div className="border-foreground/20 hover:border-foreground/40 group relative border transition-colors">
            {/* Image container */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
                {url ? (
                    <Image
                        src={url}
                        alt={alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                        <ImageIcon className="text-muted-foreground h-8 w-8" />
                    </div>
                )}

                {/* Hover overlay */}
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center gap-2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onView();
                        }}
                        className="hover:bg-primary hover:text-primary-foreground flex h-9 w-9 items-center justify-center border transition-colors"
                        type="button"
                        aria-label="View"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="hover:bg-primary hover:text-primary-foreground flex h-9 w-9 items-center justify-center border transition-colors"
                        type="button"
                        aria-label="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="hover:bg-destructive hover:text-destructive-foreground flex h-9 w-9 items-center justify-center border transition-colors"
                        type="button"
                        aria-label="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Info bar */}
            <div className="border-foreground/10 border-t px-3 py-2">
                <div className="text-foreground font-body truncate text-xs">
                    {media.s3Key.split("/").pop() ?? media.id}
                </div>
                <div className="text-muted-foreground mt-0.5 flex gap-2 font-mono text-[9px] tracking-wider uppercase">
                    <span>{media.mimeType.split("/").pop()}</span>
                    {media.width && media.height && (
                        <span>
                            {media.width}×{media.height}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
