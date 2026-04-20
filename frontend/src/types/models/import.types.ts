import type {
    ImportRowStatus as ImportRowStatusResponse,
    ImportSessionStatus as ImportSessionStatusResponse,
} from "@/types/api/import.api.types";

export type ImportSessionStatus = ImportSessionStatusResponse;
export type ImportRowStatus = ImportRowStatusResponse;

export type ImportMapping = {
    columns: Record<string, string | null>;
};

export type ImportSession = {
    id: string;
    entityType: string;
    filename: string;
    originalHeaders: string[];
    mapping: ImportMapping;
    status: ImportSessionStatus;
    rowCount: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    committedAt: string | null;
    error: string | null;
};

export type ImportRow = {
    id: string;
    sessionId: string;
    rowNumber: number;
    status: ImportRowStatus;
    rawData: Record<string, unknown>;
    overrides: Record<string, unknown>;
    resolvedRefs: Record<string, unknown>;
    diff: Record<string, unknown> | null;
    warnings: unknown[];
    targetEntityId: string | null;
};

export type FieldType =
    | { kind: "string" }
    | { kind: "text" }
    | { kind: "integer" }
    | { kind: "decimal" }
    | { kind: "boolean" }
    | { kind: "date" }
    | { kind: "date_time" }
    | { kind: "foreign_key"; target: string; matchField: string };

export type FieldSpec = {
    name: string;
    label: string;
    required: boolean;
    uniqueLookup: boolean;
    fieldType: FieldType;
};

export type UploadResult = {
    sessionId: string;
    headers: string[];
    preview: Array<Record<string, unknown>>;
    rowCount: number;
};

export type ImportRowsParams = {
    page?: number;
    limit?: number;
    status?: ImportRowStatus | null;
};

export type ImportSessionsParams = {
    page?: number;
    limit?: number;
};
