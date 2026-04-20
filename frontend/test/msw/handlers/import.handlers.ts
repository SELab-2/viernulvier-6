import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

const session: components["schemas"]["ImportSessionResponse"] = {
    id: "session-uuid-1",
    entity_type: "production",
    filename: "data.csv",
    original_headers: ["name", "date"],
    mapping: { columns: { name: null, date: null } },
    status: "mapping",
    row_count: 2,
    created_by: "user-uuid-1",
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T10:00:00Z",
    committed_at: null,
    error: null,
};

const row: components["schemas"]["ImportRowResponse"] = {
    id: "row-uuid-1",
    session_id: "session-uuid-1",
    row_number: 1,
    status: "pending",
    raw_data: { name: "Hamlet" } as unknown as Record<string, never>,
    overrides: {} as Record<string, never>,
    resolved_refs: {} as Record<string, never>,
    diff: null,
    warnings: [],
    target_entity_id: null,
};

const uploadResponse: components["schemas"]["UploadResponse"] = {
    session_id: "session-uuid-1",
    headers: ["name", "date"],
    preview: [{ name: "Hamlet" } as unknown as Record<string, never>],
    row_count: 2,
};

const fieldSpecs: components["schemas"]["FieldSpec"][] = [
    {
        name: "title",
        label: "Title",
        required: true,
        unique_lookup: false,
        field_type: { kind: "string" },
    },
];

export const importHandlers = [
    http.get(apiUrl("/import/sessions"), () => HttpResponse.json([session])),

    http.get(apiUrl(`/import/sessions/${session.id}`), () => HttpResponse.json(session)),

    http.post(apiUrl("/import/sessions"), () => HttpResponse.json(uploadResponse)),

    http.delete(
        apiUrl(`/import/sessions/${session.id}`),
        () => new HttpResponse(null, { status: 204 })
    ),

    http.get(apiUrl(`/import/sessions/${session.id}/rows`), () => HttpResponse.json([row])),

    http.patch(apiUrl(`/import/sessions/${session.id}/mapping`), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...session,
            mapping: (body as { mapping: components["schemas"]["ImportMapping"] }).mapping,
        } satisfies components["schemas"]["ImportSessionResponse"]);
    }),

    http.post(apiUrl(`/import/sessions/${session.id}/dry-run`), () =>
        HttpResponse.json({
            ...session,
            status: "dry_run_pending",
        } satisfies components["schemas"]["ImportSessionResponse"])
    ),

    http.post(apiUrl(`/import/sessions/${session.id}/commit`), () =>
        HttpResponse.json({
            ...session,
            status: "committing",
        } satisfies components["schemas"]["ImportSessionResponse"])
    ),

    http.post(apiUrl(`/import/sessions/${session.id}/rollback`), () =>
        HttpResponse.json({
            ...session,
            status: "uploaded",
        } satisfies components["schemas"]["ImportSessionResponse"])
    ),

    http.patch(apiUrl(`/import/rows/${row.id}`), async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            ...row,
            ...(body as Partial<components["schemas"]["ImportRowResponse"]>),
        } satisfies components["schemas"]["ImportRowResponse"]);
    }),

    http.post(apiUrl(`/import/rows/${row.id}/revert`), () =>
        HttpResponse.json({
            ...row,
            status: "reverted",
        } satisfies components["schemas"]["ImportRowResponse"])
    ),

    http.get(apiUrl("/import/entity-types"), () => HttpResponse.json(["production", "artist"])),

    http.get(apiUrl("/import/fields/production"), () => HttpResponse.json(fieldSpecs)),
];
