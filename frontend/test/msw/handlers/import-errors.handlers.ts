import { http, HttpResponse } from "msw";

import type {
    ImportErrorResponse,
    ImportErrorsListResponse,
} from "@/types/api/import-error.api.types";
import { apiUrl } from "../../utils/env";

const unresolvedError: ImportErrorResponse = {
    id: "11111111-1111-7111-8111-111111111111",
    created_at: "2026-04-01T08:00:00Z",
    updated_at: "2026-04-01T08:00:00Z",
    last_seen_at: "2026-04-01T08:15:00Z",
    resolved_at: null,
    run_id: "22222222-2222-7222-8222-222222222222",
    severity: "error",
    entity: "media",
    source_id: 404,
    error_kind: "missing_required_field",
    field: "download_url",
    relation: null,
    relation_source_id: null,
    message: "media is missing required field download_url",
    payload: null,
};

const secondPageError: ImportErrorResponse = {
    id: "33333333-3333-7333-8333-333333333333",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
    last_seen_at: "2026-04-01T09:15:00Z",
    resolved_at: null,
    run_id: "44444444-4444-7444-8444-444444444444",
    severity: "warning",
    entity: "media_variant",
    source_id: null,
    error_kind: "unexpected_field_value",
    field: "crop",
    relation: "media",
    relation_source_id: 404,
    message: "failed to download crop",
    payload: { value: "crop failed", fallback: "media_without_crop_variant" },
};

const resolvedError: ImportErrorResponse = {
    id: "55555555-5555-7555-8555-555555555555",
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
    last_seen_at: "2026-04-01T10:15:00Z",
    resolved_at: "2026-04-01T11:00:00Z",
    run_id: "66666666-6666-7666-8666-666666666666",
    severity: "warning",
    entity: "event",
    source_id: 12,
    error_kind: "missing_optional_relation",
    field: null,
    relation: "hall",
    relation_source_id: 99,
    message: "event references missing optional hall source_id 99",
    payload: null,
};

export const importErrorHandlers = [
    http.get(apiUrl("/import-errors"), ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");
        const resolved = url.searchParams.get("resolved") === "true";

        if (resolved) {
            return HttpResponse.json({
                data: [resolvedError],
                next_cursor: null,
            } satisfies ImportErrorsListResponse);
        }

        if (cursor === "page2") {
            return HttpResponse.json({
                data: [secondPageError],
                next_cursor: null,
            } satisfies ImportErrorsListResponse);
        }

        return HttpResponse.json({
            data: [unresolvedError],
            next_cursor: "page2",
        } satisfies ImportErrorsListResponse);
    }),
];
