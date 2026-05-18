import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const stats: components["schemas"]["StatsPayload"] = {
    article_count: 12,
    artist_count: 24,
    collection_count: 5,
    event_count: 156,
    location_count: 8,
    media_count: 300,
    production_count: 42,
    newest_article: "2026-05-01",
    newest_event: "2026-05-15T00:00:00Z",
    oldest_article: "2024-01-01",
    oldest_event: "2024-01-01T00:00:00Z",
};

export const statsHandlers = [
    http.get(apiUrl("/stats"), () =>
        HttpResponse.json(stats satisfies components["schemas"]["StatsPayload"])
    ),
];
