import { usePreviewContext } from "@/contexts/PreviewContext";
import { type PreviewEntityType } from "@/types/preview.types";

import { useMounted } from "./useMounted";

/**
 * Hook to merge preview data with API data.
 *
 * Returns preview data if available for the entity, otherwise falls back to API data.
 * This allows CMS editors to preview changes before saving.
 *
 * Note: Returns apiData until after hydration to prevent hydration mismatches.
 *
 * @example
 * ```tsx
 * const { data: apiArticle } = useGetArticleBySlug(slug);
 * const article = usePreviewData("article", slug, apiArticle);
 * ```
 *
 * @param entityType - Type of entity being previewed
 * @param entityId - Unique identifier (slug or id)
 * @param apiData - Data from the API (fallback)
 * @param sessionId - Optional session id for tab-isolated previews
 * @returns Preview data if available, otherwise API data
 */
export function usePreviewData<T>(
    entityType: PreviewEntityType,
    entityId: string,
    apiData: T | undefined,
    sessionId?: string
): T | undefined {
    const { getPreview } = usePreviewContext();
    const mounted = useMounted();

    // Return apiData until after hydration to prevent mismatch
    if (!mounted) {
        return apiData;
    }

    const previewData = getPreview<T>(entityType, entityId, sessionId);

    // Return preview data if it exists, otherwise fall back to API data
    return previewData ?? apiData;
}

/**
 * Hook to check if a preview exists for an entity.
 *
 * Useful for showing UI indicators (e.g., "Preview Mode" badge).
 * Returns false until after hydration to prevent hydration mismatches.
 *
 * @example
 * ```tsx
 * const isPreview = useHasPreview("article", slug);
 * ```
 */
export function useHasPreview(
    entityType: PreviewEntityType,
    entityId: string,
    sessionId?: string
): boolean {
    const { hasPreview } = usePreviewContext();
    const mounted = useMounted();

    // Return false until after hydration to prevent mismatch
    if (!mounted) {
        return false;
    }

    return hasPreview(entityType, entityId, sessionId);
}

/**
 * Hook to get preview metadata (timestamp, locale) without the full data.
 *
 * Useful for showing preview information in the UI.
 */
export function usePreviewInfo(
    entityType: PreviewEntityType,
    entityId: string,
    sessionId?: string
): { timestamp: number; locale: string } | null {
    const { getPreviewInfo } = usePreviewContext();
    return getPreviewInfo(entityType, entityId, sessionId);
}
