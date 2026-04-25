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
            {/* Image container — compact square thumbnail */}
            <div className="relative aspect-square w-full overflow-hidden">
                {url ? (
                    <Image
                        src={url}
                        alt={alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                ) : (
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                        <ImageIcon className="text-muted-foreground h-5 w-5" />
                    </div>
                )}

                {/* Hover overlay */}
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onView();
                        }}
                        className="hover:bg-primary hover:text-primary-foreground flex h-7 w-7 items-center justify-center border transition-colors"
                        type="button"
                        aria-label="View"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="hover:bg-primary hover:text-primary-foreground flex h-7 w-7 items-center justify-center border transition-colors"
                        type="button"
                        aria-label="Edit"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="hover:bg-destructive hover:text-destructive-foreground flex h-7 w-7 items-center justify-center border transition-colors"
                        type="button"
                        aria-label="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Compact info bar */}
            <div className="border-foreground/10 border-t px-2 py-1">
                <div className="text-foreground font-body truncate text-[10px] leading-tight">
                    {media.s3Key.split("/").pop() ?? media.id}
                </div>
                <div className="text-muted-foreground mt-0.5 flex gap-1.5 font-mono text-[8px] tracking-wider uppercase">
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
