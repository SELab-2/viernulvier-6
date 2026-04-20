import { describe, expect, it } from "vitest";

import {
    mapFieldSpec,
    mapImportMapping,
    mapImportRow,
    mapImportSession,
    mapUpdateMappingRequest,
    mapUpdateRowRequest,
    mapUploadResult,
} from "@/mappers/import.mapper";
import type { components } from "@/types/api/generated";

const baseSession: components["schemas"]["ImportSessionResponse"] = {
    id: "session-uuid-1",
    entity_type: "production",
    filename: "data.csv",
    original_headers: ["name", "date"],
    mapping: { columns: { name: "title", date: null } },
    status: "mapping",
    row_count: 42,
    created_by: "user-uuid-1",
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T11:00:00Z",
    committed_at: null,
    error: null,
};

const baseRow: components["schemas"]["ImportRowResponse"] = {
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

describe("mapImportMapping", () => {
    it("maps columns from response", () => {
        const result = mapImportMapping({ columns: { name: "title", date: null } });
        expect(result.columns).toEqual({ name: "title", date: null });
    });

    it("defaults columns to empty object when undefined", () => {
        const result = mapImportMapping({});
        expect(result.columns).toEqual({});
    });
});

describe("mapImportSession", () => {
    it("maps all camelCase fields correctly", () => {
        const result = mapImportSession(baseSession);
        expect(result.id).toBe("session-uuid-1");
        expect(result.entityType).toBe("production");
        expect(result.filename).toBe("data.csv");
        expect(result.originalHeaders).toEqual(["name", "date"]);
        expect(result.mapping.columns).toEqual({ name: "title", date: null });
        expect(result.status).toBe("mapping");
        expect(result.rowCount).toBe(42);
        expect(result.createdBy).toBe("user-uuid-1");
        expect(result.createdAt).toBe("2026-04-20T10:00:00Z");
        expect(result.updatedAt).toBe("2026-04-20T11:00:00Z");
        expect(result.committedAt).toBeNull();
        expect(result.error).toBeNull();
    });

    it("normalizes undefined committedAt to null", () => {
        const result = mapImportSession({ ...baseSession, committed_at: undefined });
        expect(result.committedAt).toBeNull();
    });

    it("maps a committed session with committedAt set", () => {
        const result = mapImportSession({
            ...baseSession,
            status: "committed",
            committed_at: "2026-04-20T12:00:00Z",
        });
        expect(result.committedAt).toBe("2026-04-20T12:00:00Z");
        expect(result.status).toBe("committed");
    });

    it("maps error field to null when absent", () => {
        const result = mapImportSession({ ...baseSession, error: undefined });
        expect(result.error).toBeNull();
    });
});

describe("mapImportRow", () => {
    it("maps all camelCase fields correctly", () => {
        const result = mapImportRow(baseRow);
        expect(result.id).toBe("row-uuid-1");
        expect(result.sessionId).toBe("session-uuid-1");
        expect(result.rowNumber).toBe(1);
        expect(result.status).toBe("pending");
        expect(result.rawData).toEqual({ name: "Hamlet" });
        expect(result.overrides).toEqual({});
        expect(result.resolvedRefs).toEqual({});
        expect(result.diff).toBeNull();
        expect(result.warnings).toEqual([]);
        expect(result.targetEntityId).toBeNull();
    });

    it("maps diff when present", () => {
        const result = mapImportRow({
            ...baseRow,
            diff: { title: "changed" } as unknown as Record<string, never>,
        });
        expect(result.diff).toEqual({ title: "changed" });
    });

    it("normalizes undefined target_entity_id to null", () => {
        const result = mapImportRow({ ...baseRow, target_entity_id: undefined });
        expect(result.targetEntityId).toBeNull();
    });
});

describe("mapFieldSpec", () => {
    it("maps a simple string field", () => {
        const result = mapFieldSpec({
            name: "title",
            label: "Title",
            required: true,
            unique_lookup: false,
            field_type: { kind: "string" },
        });
        expect(result.name).toBe("title");
        expect(result.label).toBe("Title");
        expect(result.required).toBe(true);
        expect(result.uniqueLookup).toBe(false);
        expect(result.fieldType).toEqual({ kind: "string" });
    });

    it("maps a foreign_key field with camelCase matchField", () => {
        const result = mapFieldSpec({
            name: "location_id",
            label: "Location",
            required: false,
            unique_lookup: true,
            field_type: { kind: "foreign_key", target: "location", match_field: "name" },
        });
        expect(result.fieldType).toEqual({
            kind: "foreign_key",
            target: "location",
            matchField: "name",
        });
    });
});

describe("mapUploadResult", () => {
    it("maps all fields correctly", () => {
        const result = mapUploadResult({
            session_id: "session-uuid-2",
            headers: ["col1", "col2"],
            preview: [{ col1: "a" } as unknown as Record<string, never>],
            row_count: 10,
        });
        expect(result.sessionId).toBe("session-uuid-2");
        expect(result.headers).toEqual(["col1", "col2"]);
        expect(result.preview).toEqual([{ col1: "a" }]);
        expect(result.rowCount).toBe(10);
    });
});

describe("mapUpdateMappingRequest", () => {
    it("round-trips mapping columns", () => {
        const mapping = { columns: { name: "title", date: null } };
        const result = mapUpdateMappingRequest(mapping);
        expect(result.mapping.columns).toEqual({ name: "title", date: null });
    });
});

describe("mapUpdateRowRequest", () => {
    it("maps camelCase resolvedRefs to snake_case", () => {
        const result = mapUpdateRowRequest({
            resolvedRefs: { location: "loc-uuid-1" },
            skip: false,
        });
        expect(result.resolved_refs).toEqual({ location: "loc-uuid-1" });
        expect(result.skip).toBe(false);
    });

    it("passes skip: true", () => {
        const result = mapUpdateRowRequest({ skip: true });
        expect(result.skip).toBe(true);
    });
});
