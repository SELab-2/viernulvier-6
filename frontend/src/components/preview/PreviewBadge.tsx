"use client";

import { useTranslations } from "next-intl";

import { usePreviewContext } from "@/contexts/PreviewContext";
import { useMounted } from "@/hooks/useMounted";
import { type PreviewEntityType } from "@/types/preview.types";

interface PreviewBadgeProps {
    entityType: PreviewEntityType;
    entityId: string;
}

/**
 * Subtle preview indicator for vintage styling.
 * Shows a minimal mono-text label in the dateline bar.
 */
export function PreviewBadge({ entityType, entityId }: PreviewBadgeProps) {
    const t = useTranslations("Preview");
    const { hasPreview, clearPreviewFor } = usePreviewContext();
    const mounted = useMounted();

    if (!mounted) return null;

    const isPreview = hasPreview(entityType, entityId);

    if (!isPreview) return null;

    return (
        <span
            className="border-foreground hover:bg-foreground hover:text-background cursor-pointer border px-1.5 py-0.5 font-mono text-[8px] tracking-[1.1px] uppercase transition-colors"
            onClick={() => clearPreviewFor(entityType, entityId)}
            title={t("exitPreview")}
        >
            {t("previewMode")}
        </span>
    );
}
