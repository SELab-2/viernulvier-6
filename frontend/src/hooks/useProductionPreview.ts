import { usePreviewContext } from "@/contexts/PreviewContext";
import { ProductionPreviewData } from "@/types/production-preview.types";
import { Production } from "@/types/models/production.types";
import { Event } from "@/types/models/event.types";
import { ensureProduction } from "@/lib/production-converter";

import { useMounted } from "./useMounted";

/**
 * Hook to get production preview data including events.
 * Returns null if no preview exists.
 */
export function useProductionPreview(id: string, sessionId?: string): ProductionPreviewData | null {
    const { getPreview } = usePreviewContext();
    const mounted = useMounted();

    if (!mounted) return null;

    const data = getPreview<ProductionPreviewData>("production", id, sessionId);
    return data;
}

/**
 * Hook to merge production API data with preview data.
 * Returns preview data if available (converted to Production format),
 * otherwise falls back to API data.
 */
export function useProductionWithPreview(
    id: string,
    apiProduction: Production | undefined,
    sessionId?: string
): Production | undefined {
    const preview = useProductionPreview(id, sessionId);
    if (preview) {
        // Preview data could be ProductionRow or Production, ensure it's Production
        return ensureProduction(preview.production);
    }
    return apiProduction;
}

/**
 * Hook to get production events from preview or return empty array.
 */
export function useProductionEventsWithPreview(
    id: string,
    apiEvents: Event[] | undefined,
    sessionId?: string
): Event[] | undefined {
    const preview = useProductionPreview(id, sessionId);
    if (preview) return preview.events;
    return apiEvents;
}
