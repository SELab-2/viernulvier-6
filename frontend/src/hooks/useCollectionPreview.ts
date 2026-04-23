import { usePreviewContext } from "@/contexts/PreviewContext";
import { CollectionPreviewData } from "@/types/collection-preview.types";
import { Collection } from "@/types/models/collection.types";

import { useMounted } from "./useMounted";

/**
 * Hook to get collection preview data.
 * Returns null if no preview exists.
 */
export function useCollectionPreview(id: string, sessionId?: string): CollectionPreviewData | null {
    const { getPreview } = usePreviewContext();
    const mounted = useMounted();

    if (!mounted) return null;

    const data = getPreview<CollectionPreviewData>("collection", id, sessionId);
    return data;
}

/**
 * Hook to merge collection API data with preview data.
 * Returns preview data if available, otherwise falls back to API data.
 */
export function useCollectionWithPreview(
    id: string,
    apiCollection: Collection | undefined,
    sessionId?: string
): Collection | undefined {
    const preview = useCollectionPreview(id, sessionId);
    if (preview) return preview.collection;
    return apiCollection;
}
