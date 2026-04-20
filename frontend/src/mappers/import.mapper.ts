import {
    FieldSpecResponse,
    FieldTypeResponse,
    ImportMappingResponse,
    ImportRowResponse,
    ImportSessionResponse,
    UpdateMappingRequest,
    UpdateRowRequest,
    UploadResponse,
} from "@/types/api/import.api.types";
import {
    FieldSpec,
    FieldType,
    ImportMapping,
    ImportRow,
    ImportSession,
    ImportWarning,
    UploadResult,
} from "@/types/models/import.types";

import { toNullable } from "./utils";

export const mapImportMapping = (response: ImportMappingResponse): ImportMapping => ({
    columns: response.columns ?? {},
});

export const mapImportSession = (response: ImportSessionResponse): ImportSession => ({
    id: response.id,
    entityType: response.entity_type,
    filename: response.filename,
    originalHeaders: response.original_headers,
    mapping: mapImportMapping(response.mapping),
    status: response.status,
    rowCount: response.row_count,
    createdBy: response.created_by,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    committedAt: toNullable(response.committed_at),
    error: toNullable(response.error),
});

export const mapImportSessions = (responses: ImportSessionResponse[]): ImportSession[] =>
    responses.map(mapImportSession);

export const mapImportRow = (response: ImportRowResponse): ImportRow => ({
    id: response.id,
    sessionId: response.session_id,
    rowNumber: response.row_number,
    status: response.status,
    rawData: response.raw_data as Record<string, unknown>,
    overrides: response.overrides as Record<string, unknown>,
    resolvedRefs: response.resolved_refs as Record<string, unknown>,
    diff: toNullable(response.diff) as Record<string, unknown> | null,
    warnings: response.warnings as unknown as ImportWarning[],
    targetEntityId: toNullable(response.target_entity_id),
});

export const mapImportRows = (responses: ImportRowResponse[]): ImportRow[] =>
    responses.map(mapImportRow);

const mapFieldType = (response: FieldTypeResponse): FieldType => {
    switch (response.kind) {
        case "foreign_key":
            return {
                kind: "foreign_key",
                target: response.target,
                matchField: response.match_field,
            };
        default:
            return { kind: response.kind };
    }
};

export const mapFieldSpec = (response: FieldSpecResponse): FieldSpec => ({
    name: response.name,
    label: response.label,
    required: response.required,
    uniqueLookup: response.unique_lookup,
    fieldType: mapFieldType(response.field_type),
});

export const mapFieldSpecs = (responses: FieldSpecResponse[]): FieldSpec[] =>
    responses.map(mapFieldSpec);

export const mapUploadResult = (response: UploadResponse): UploadResult => ({
    sessionId: response.session_id,
    headers: response.headers,
    preview: response.preview as Array<Record<string, unknown>>,
    rowCount: response.row_count,
});

export const mapUpdateMappingRequest = (mapping: ImportMapping): UpdateMappingRequest => ({
    mapping: { columns: mapping.columns },
});

export const mapUpdateRowRequest = (input: {
    overrides?: Record<string, unknown> | null;
    resolvedRefs?: Record<string, string | null> | null;
    skip?: boolean | null;
}): UpdateRowRequest => ({
    overrides: input.overrides as Record<string, never> | null | undefined,
    resolved_refs: input.resolvedRefs,
    skip: input.skip,
});
