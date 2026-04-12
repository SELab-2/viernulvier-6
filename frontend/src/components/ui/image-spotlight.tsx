"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { resolveLocalized } from "@/components/ui/localized-text";
import type { Media } from "@/types/models/media.types";

export type SpotlightItem =
    | { kind: "media"; media: Media }
    | {
          kind: "plain";
          src: string;
          alt?: string;
          caption?: string;
          credit?: string;
          width?: number;
          height?: number;
      };

type ImageSpotlightProps = {
    items: SpotlightItem[];
    index: number;
    onIndexChange?: (next: number) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eyebrow?: string;
};

type Resolved = {
    src: string | null;
    alt: string;
    altIsFallback: boolean;
    caption: string;
    credit: string;
    width: number | null;
    height: number | null;
    addedAt: string | null;
};

function pickLocalized(primary: string | null, fallback: string | null) {
    return resolveLocalized(primary ?? "", fallback ?? "");
}

function resolveItem(item: SpotlightItem, locale: string): Resolved {
    if (item.kind === "plain") {
        return {
            src: item.src,
            alt: item.alt ?? "",
            altIsFallback: false,
            caption: item.caption ?? "",
            credit: item.credit ?? "",
            width: item.width ?? null,
            height: item.height ?? null,
            addedAt: null,
        };
    }

    const m = item.media;
    const primaryAlt = locale === "en" ? m.altTextEn : m.altTextNl;
    const fallbackAlt = locale === "en" ? m.altTextNl : m.altTextEn;
    const altResolved = pickLocalized(primaryAlt, fallbackAlt);

    const primaryCaption = locale === "en" ? m.descriptionEn : m.descriptionNl;
    const fallbackCaption = locale === "en" ? m.descriptionNl : m.descriptionEn;

    const primaryCredit = locale === "en" ? m.creditEn : m.creditNl;
    const fallbackCredit = locale === "en" ? m.creditNl : m.creditEn;

    return {
        src: m.url,
        alt: altResolved.value,
        altIsFallback: altResolved.isFallback,
        caption: pickLocalized(primaryCaption, fallbackCaption).value,
        credit: pickLocalized(primaryCredit, fallbackCredit).value,
        width: m.width,
        height: m.height,
        addedAt: m.createdAt,
    };
}

function formatAdded(iso: string, locale: string): string {
    try {
        return new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

const EYEBROW_BTN =
    "font-mono text-[10px] tracking-[1.5px] uppercase text-foreground/80 " +
    "hover:text-foreground transition-colors inline-flex items-center gap-1 " +
    "rounded-none px-2 py-1 border border-foreground/15 bg-background/60 " +
    "backdrop-blur-sm disabled:opacity-30 disabled:pointer-events-none";

export function ImageSpotlight({
    items,
    index,
    onIndexChange,
    open,
    onOpenChange,
    eyebrow,
}: ImageSpotlightProps) {
    const locale = useLocale();
    const t = useTranslations("ImageSpotlight");
    const count = items.length;
    const safeIndex = count > 0 ? Math.min(Math.max(index, 0), count - 1) : 0;
    const current = items[safeIndex];
    const hasMany = count > 1;

    const resolved = useMemo(
        () => (current ? resolveItem(current, locale) : null),
        [current, locale]
    );

    const go = useCallback(
        (delta: number) => {
            if (!hasMany || !onIndexChange) return;
            const next = (safeIndex + delta + count) % count;
            onIndexChange(next);
        },
        [hasMany, onIndexChange, safeIndex, count]
    );

    useEffect(() => {
        if (!open || !hasMany) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                go(1);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(-1);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, hasMany, go]);

    if (!resolved || !resolved.src) return null;

    const addedLabel = resolved.addedAt ? formatAdded(resolved.addedAt, locale) : "";
    const dims = resolved.width && resolved.height ? `${resolved.width}×${resolved.height}` : "";
    const eyebrowLabel = eyebrow ?? t("archive");
    const srTitle = resolved.alt || resolved.caption || eyebrowLabel;

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                        "bg-background/80 fixed inset-0 z-50 backdrop-blur-md"
                    )}
                />
                <DialogPrimitive.Content
                    className={cn(
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 md:p-10",
                        "focus:outline-none"
                    )}
                >
                    <DialogPrimitive.Title className="sr-only">{srTitle}</DialogPrimitive.Title>

                    <DialogPrimitive.Close
                        className={cn(EYEBROW_BTN, "absolute top-6 right-6 md:top-10 md:right-10")}
                        aria-label={t("close")}
                    >
                        <X className="h-3.5 w-3.5" />
                        {t("close")}
                    </DialogPrimitive.Close>

                    {hasMany && (
                        <>
                            <button
                                type="button"
                                onClick={() => go(-1)}
                                className={cn(
                                    EYEBROW_BTN,
                                    "absolute top-1/2 left-6 -translate-y-1/2 md:left-10"
                                )}
                                aria-label={t("previousImage")}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                {t("previous")}
                            </button>
                            <button
                                type="button"
                                onClick={() => go(1)}
                                className={cn(
                                    EYEBROW_BTN,
                                    "absolute top-1/2 right-6 -translate-y-1/2 md:right-10"
                                )}
                                aria-label={t("nextImage")}
                            >
                                {t("next")}
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </>
                    )}

                    <figure className="relative flex max-h-[75vh] min-h-0 w-full max-w-[1400px] flex-1 items-center justify-center">
                        <Image
                            src={resolved.src}
                            alt={resolved.alt}
                            fill
                            sizes="(max-width: 1400px) 100vw, 1400px"
                            className="object-contain"
                            priority
                            unoptimized={resolved.src.startsWith("data:")}
                        />
                    </figure>

                    <div className="border-foreground/15 w-full max-w-[1400px] border-t pt-3">
                        <div
                            className={cn(
                                "flex flex-wrap items-baseline gap-x-3 gap-y-1",
                                "text-muted-foreground font-mono text-[10px] tracking-[1.5px] uppercase"
                            )}
                        >
                            <span className="text-foreground">{eyebrowLabel}</span>
                            {resolved.alt && (
                                <>
                                    <span className="text-foreground/30">·</span>
                                    <span
                                        className={cn(
                                            "text-foreground",
                                            resolved.altIsFallback && "text-muted-foreground italic"
                                        )}
                                    >
                                        {resolved.alt}
                                    </span>
                                </>
                            )}
                            {resolved.credit && (
                                <>
                                    <span className="text-foreground/30">·</span>
                                    <span>{resolved.credit}</span>
                                </>
                            )}
                            {dims && (
                                <>
                                    <span className="text-foreground/30">·</span>
                                    <span>{dims}</span>
                                </>
                            )}
                            {addedLabel && (
                                <>
                                    <span className="text-foreground/30">·</span>
                                    <span>{addedLabel}</span>
                                </>
                            )}
                            {hasMany && (
                                <>
                                    <span className="text-foreground/30">·</span>
                                    <span>
                                        {safeIndex + 1} / {count}
                                    </span>
                                </>
                            )}
                        </div>
                        {resolved.caption && (
                            <p className="text-foreground/90 font-body mt-2 text-sm">
                                {resolved.caption}
                            </p>
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
